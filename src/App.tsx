import React, { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo } from 'react';
import { 
  Routes, 
  Route, 
  Link, 
  useLocation, 
  useNavigate 
} from 'react-router-dom';
import { 
  Play, Volume2, Volume1, VolumeX, Maximize, ArrowUp, ArrowLeft, ArrowRight,
  Brush, Dices, FlaskConical  
} from 'lucide-react';
import { motion, AnimatePresence, type SVGMotionProps } from 'framer-motion';

// Предполагается, что PDFViewer существует
import PDFViewer from './PDFViewer'; 

// =========================================
// HOOKS
// =========================================

// Scroll to top on route change
const ScrollToTopOnNavigate = () => {
    const { pathname } = useLocation();
    useEffect(() => {
        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
        const start = window.scrollY;
        const duration = 800;
        const startTime = performance.now();

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutCubic(progress);
            window.scrollTo(0, start * (1 - eased));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [pathname]);
    return null;
};

const useScrollLock = (lock: boolean) => {
  useLayoutEffect(() => {
    if (!lock) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.classList.add('scroll-locked');
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.classList.remove('scroll-locked');
      window.scrollTo(0, scrollY);
    };
  }, [lock]);
};

const useContentProtection = () => {
  useEffect(() => {
    const preventDefault = (e: Event) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && ['c', 's', 'u', 'p', 'i'].includes(e.key.toLowerCase()))) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('dragstart', preventDefault);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('dragstart', preventDefault);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
};

const useIntroAnimation = () => {
  useEffect(() => {
    const visited = sessionStorage.getItem('has_visited_site');
    if (visited) {
      document.documentElement.classList.add('is-visited');
    } else {
      document.documentElement.classList.add('is-animating');
      setTimeout(() => {
        document.documentElement.classList.add('is-visited');
        document.documentElement.classList.remove('is-animating');
      }, 100);
      sessionStorage.setItem('has_visited_site', 'true');
    }
  }, []);
};

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 1024);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    return isMobile;
};

// =========================================
// UI COMPONENTS
// =========================================

const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const checkScroll = () => setIsVisible(window.scrollY > 300);
    window.addEventListener('scroll', checkScroll, { passive: true });
    return () => window.removeEventListener('scroll', checkScroll);
  }, []);

  const scrollToTop = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          onClick={scrollToTop}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          whileTap={{ scale: 0.95 }} 
          whileHover={{ scale: 1.1 }} 
          style={{ bottom: 'calc(40px + env(safe-area-inset-bottom))' }}
          className="fixed right-5 lg:right-10 z-[10005] w-[52px] h-[52px] rounded-full flex items-center justify-center backdrop-blur-[10px] bg-white/40 border border-white/40 shadow-lg hover:bg-white/60"
        >
          <ArrowUp size={24} className="text-black/80" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

const Path = (props: SVGMotionProps<SVGPathElement>) => (
  <motion.path fill="transparent" strokeWidth="3" stroke="black" strokeLinecap="round" {...props} />
);

const MenuToggle = ({ toggle, isOpen }: { toggle: () => void, isOpen: boolean }) => (
  <button onClick={toggle} className="outline-none border-none cursor-pointer bg-transparent p-2 z-[10002] relative flex items-center justify-center">
    <svg width="23" height="23" viewBox="0 0 23 23">
      <Path variants={{ closed: { d: "M 2 2.5 L 20 2.5" }, open: { d: "M 3 16.5 L 17 2.5" } }} animate={isOpen ? "open" : "closed"} />
      <Path d="M 2 9.423 L 20 9.423" variants={{ closed: { opacity: 1 }, open: { opacity: 0 } }} transition={{ duration: 0.1 }} animate={isOpen ? "open" : "closed"} />
      <Path variants={{ closed: { d: "M 2 16.346 L 20 16.346" }, open: { d: "M 3 2.5 L 17 16.346" } }} animate={isOpen ? "open" : "closed"} />
    </svg>
  </button>
);

const MobileMenuOverlay = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    useScrollLock(isOpen);
    const location = useLocation();

    const menuItems = [
        { label: 'Work', href: '/' },
        { label: 'Reel', href: '/reel' },
        { label: 'Play', href: '/play' },
        { label: 'About', href: '/info' },
    ];

    const menuVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.3 } },
        exit: { opacity: 0, transition: { duration: 0.3 } }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.nav
                    initial="hidden" animate="visible" exit="exit" variants={menuVariants}
                    className="fixed inset-0 top-0 left-0 w-full h-[100dvh] flex flex-col items-center justify-center z-[9999]"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', touchAction: 'none' }}
                >
                    <div className="flex flex-col items-center gap-6">
                        {menuItems.map((item, index) => {
                            const isActive = location.pathname === item.href;
                            return (
                                <Link
                                    key={item.label}
                                    to={item.href}
                                    onClick={onClose}
                                    className={`text-[30px] no-underline cursor-pointer leading-tight transition-colors duration-300 ${isActive ? 'text-black font-normal' : 'text-[#777] font-[250]'}`}
                                    style={{ fontFamily: "'Funnel Display', sans-serif" }}
                                >
                                    <motion.span
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.05 + (index * 0.05), duration: 0.2 }}
                                    >
                                        {item.label}
                                    </motion.span>
                                </Link>
                            );
                        })}
                    </div>
                </motion.nav>
            )}
        </AnimatePresence>
    );
};

const Header = ({ isMenuOpen, onToggleMenu }: { isMenuOpen: boolean, onToggleMenu: () => void }) => {
  const [animStart, setAnimStart] = useState(false);
  const location = useLocation();

  useEffect(() => { setTimeout(() => setAnimStart(true), 500); }, []);
  
  const navLinkClasses = (path: string) => {
    const isActive = location.pathname === path;
    return `text-[22px] text-[#777] font-normal relative transition-colors duration-300 hover:text-black hover:-translate-y-1.5 inline-block transform transition-transform cursor-pointer 
    before:content-[''] before:absolute before:w-full before:h-[60px] before:top-[-15px] before:left-0
    after:content-[''] after:absolute after:w-full after:h-[1px] after:bottom-0 after:left-0 after:bg-black after:scale-x-0 after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left
    ${isActive ? 'text-black' : ''}`;
  }

  return (
    <header className={`relative w-full pt-[40px] pb-[10px] bg-transparent z-[10001] transition-all duration-[1500ms] ease-[cubic-bezier(0.19,1,0.22,1)] ${animStart ? 'opacity-100 translate-y-0' : 'opacity-5 -translate-y-[120px]'}`}>
      <div className="flex items-center justify-between max-w-[1440px] mx-auto px-5 lg:px-10 relative">
        <div className="block transition-transform duration-300 ease-in-out hover:-translate-y-1.5 z-[10002] relative">
          <Link to="/" className="cursor-pointer block">
            <img src="img/logo.svg" alt="Logo" className="h-[75px] w-auto block" onError={(e) => (e.currentTarget.src = '')} />
          </Link>
        </div>
        <nav className="hidden lg:block">
          <ul className="flex gap-8 list-none m-0 p-0">
            <li><Link to="/" className={navLinkClasses('/')}>Work</Link></li>
            <li><Link to="/reel" className={navLinkClasses('/reel')}>Reel</Link></li>
            <li><Link to="/play" className={navLinkClasses('/play')}>Play</Link></li>
            <li><Link to="/info" className={navLinkClasses('/info')}>About</Link></li>
          </ul>
        </nav>
        <div className="lg:hidden z-[10002]">
            <MenuToggle toggle={onToggleMenu} isOpen={isMenuOpen} />
        </div>
      </div>
    </header>
  );
};

const Footer = ({ forceVisible = false }: { forceVisible?: boolean }) => {
  const footerContent = (
      <>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-[15px] gap-1 lg:gap-0">
          <div className="flex gap-[25px]">
            {['Behance', 'LinkedIn', 'Instagram'].map(net => (
                <a key={net} href={`https://www.${net.toLowerCase()}.com/`} target="_blank" rel="noreferrer" 
                   className="text-[20px] text-black relative pb-0.5 transition-all duration-300 hover:-translate-y-1.5 inline-block">
                    {net}
                </a>
            ))}
          </div>
          <div className="text-[20px] text-black hover:-translate-y-1.5 transition-transform duration-300">
            <a href="mailto:shmarov.oleg@gmail.com">shmarov.oleg@gmail.com</a>
          </div>
        </div>
        <div className="w-full h-[1px] bg-black/15 mb-[15px]"></div>
        <div className="flex justify-between">
          <div className="text-[20px] text-black opacity-50">2025 | Oleg Shmarov®</div>
        </div>
      </>
  );
  const containerClasses = "pt-10 pb-0 overflow-hidden relative"; 
  if (forceVisible) return <div className={containerClasses}>{footerContent}</div>;

  return (
      <motion.footer 
        className={containerClasses}
        initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
      >
        <motion.div variants={{ hidden: { y: "100%" }, visible: { y: "0%", transition: { duration: 1.0, ease: [0.22, 1, 0.36, 1] } } }}>
            {footerContent}
        </motion.div>
      </motion.footer>
  );
};

// =========================================
// COMPLEX COMPONENTS (Video, Modal)
// =========================================

const ImageModalOverlay = ({ src, onClose }: { src: string | null, onClose: () => void }) => {
    const isMobile = useIsMobile();
    useScrollLock(!!src && isMobile);
    const isVideo = useMemo(() => src?.toLowerCase().endsWith('.mp4'), [src]);
    const [isPlaying, setIsPlaying] = useState(false);

    return (
        <AnimatePresence>
            {src && (
              <motion.div 
                className="fixed inset-0 z-[10000] flex items-center justify-center" 
                onClick={onClose}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
              >
                <motion.div 
                  className="fix-safari-radius relative max-w-[90vw] max-h-[90vh] flex items-center justify-center overflow-hidden"
                  initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.1, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {isVideo ? (
                    <video 
                      src={src} autoPlay loop muted playsInline
                      onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onClick={onClose}
                      className={`max-w-full max-h-[85vh] object-contain shadow-2xl cursor-pointer transition-all duration-500 ease-out ${!isPlaying ? 'blur-[8px] scale-105' : 'blur-0 scale-100'}`}
                    />
                  ) : (
                    <img src={src} alt="Full size" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl cursor-pointer hover:opacity-95 transition-opacity" onClick={onClose} />
                  )}
                </motion.div>
              </motion.div>
            )}
        </AnimatePresence>
    );
};

const VideoPlayer = ({ src, poster }: { src: string, poster?: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0); 
  const [progress, setProgress] = useState(0);
  const [uiHidden, setUiHidden] = useState(false);
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState(0);

  useEffect(() => {
     if(videoRef.current) setVolume(videoRef.current.muted ? 0 : videoRef.current.volume);
     return () => { if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current); };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
        handleActivity();
    } else {
        videoRef.current.pause();
        setIsPlaying(false);
        setUiHidden(false);
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const newMuted = !videoRef.current.muted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
    if (!newMuted && volume === 0) { videoRef.current.volume = 1; setVolume(1); }
    else if (newMuted) { setVolume(0); }
  };
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setVolume(val);
      if (videoRef.current) {
          videoRef.current.volume = val;
          videoRef.current.muted = val === 0;
          setIsMuted(val === 0);
      }
  };

  const toggleFullscreen = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    if (containerRef.current && !document.fullscreenElement) {
        containerRef.current.requestFullscreen?.();
    } else {
        document.exitFullscreen?.();
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && !isDragging) {
        setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100 || 0);
    }
  };

  const calculateProgress = (clientX: number) => {
      if (!progressBarRef.current || !videoRef.current) return { time: 0, percent: 0, x: 0 };
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width)); 
      const percent = x / rect.width;
      return { time: percent * videoRef.current.duration, percent: percent * 100, x };
  };

  const handleMouseMove = useCallback((e: MouseEvent | React.MouseEvent) => {
      if (!progressBarRef.current) return;
      const { time, percent, x } = calculateProgress(e.clientX);
      
      const m = Math.floor(time / 60);
      const s = Math.floor(time % 60);
      setHoverTime(`${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`);
      setTooltipPos(x);

      if (isDragging && videoRef.current) {
          videoRef.current.currentTime = time;
          setProgress(percent);
      }
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsDragging(true);
      if(videoRef.current) videoRef.current.pause(); 
      handleMouseMove(e); 
  };

  useEffect(() => {
      const handleGlobalMouseUp = () => {
          if (isDragging) {
              setIsDragging(false);
              if (isPlaying && videoRef.current) videoRef.current.play(); 
          }
      };
      if (isDragging) {
          window.addEventListener('mousemove', handleMouseMove as any);
          window.addEventListener('mouseup', handleGlobalMouseUp);
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove as any);
          window.removeEventListener('mouseup', handleGlobalMouseUp);
      }
  }, [isDragging, isPlaying, handleMouseMove]);
  
  const handleActivity = () => {
    setUiHidden(false);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (isPlaying) hideTimeoutRef.current = setTimeout(() => setUiHidden(true), 3000);
  };
  
  const handleMouseLeave = () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (isPlaying && !isDragging) setUiHidden(true);
      setIsVolumeHovered(false);
  };
  
  const VolumeIcon = volume === 0 || isMuted ? VolumeX : (volume < 0.5 ? Volume1 : Volume2);

  return (
    <div 
      className={`group fix-safari-radius relative w-full aspect-video bg-black rounded-[18px] shadow-lg cursor-default ${uiHidden ? 'cursor-none' : ''}`}
      ref={containerRef} onMouseMove={handleActivity} onMouseLeave={handleMouseLeave} onClick={handleActivity} onDoubleClick={() => toggleFullscreen()}
    >
      <video 
        ref={videoRef} className={`w-full h-full object-cover block transition-all duration-500 ${!isPlaying ? 'video-blur' : 'video-clear'}`}
        playsInline muted={isMuted} poster={poster} onClick={togglePlay} onTimeUpdate={handleTimeUpdate}
      >
        <source src={src} type="video/mp4" />
      </video>
      
      <div className={`absolute inset-0 flex justify-center items-center bg-black/5 transition-all duration-300 z-10 ${isPlaying ? 'opacity-0 invisible' : 'opacity-100 visible'}`} onClick={togglePlay}>
        <div className="relative flex items-center justify-center">
            <button className="w-[100px] h-[100px] lg:w-[130px] lg:h-[130px] bg-white rounded-full flex items-center justify-center border-none cursor-pointer transition-transform duration-500 hover:scale-105 shadow-[0_0_50px_rgba(255,255,255,0.3)] relative z-20">
                <div className="pl-1.5"><Play fill="black" stroke="none" size={42} /></div>
            </button>
        </div>
      </div>

      <div className={`absolute bottom-0 left-0 w-full px-5 py-4 lg:px-8 lg:py-5 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300 flex items-center gap-5 z-20 ${uiHidden ? 'opacity-0' : 'opacity-100'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex-grow h-5 flex items-center cursor-pointer group/seek relative" ref={progressBarRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseLeave={() => setHoverTime(null)}>
          <AnimatePresence>
             {(hoverTime || isDragging) && (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-8 bg-white/90 text-black text-[12px] font-bold px-1.5 py-0.5 rounded pointer-events-none transform -translate-x-1/2" style={{ left: tooltipPos }}>{hoverTime}</motion.div>
             )}
          </AnimatePresence>
          <div className="w-full h-1 bg-white/30 rounded-sm relative transition-all group-hover/seek:h-1.5 overflow-hidden">
            <div className="h-full bg-white rounded-sm relative" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="absolute h-3 w-3 bg-white rounded-full shadow-md top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-100 ease-out" style={{ left: `${progress}%`, marginLeft: '-6px', transform: (isDragging || hoverTime) ? 'translateY(-50%) scale(1)' : 'translateY(-50%) scale(0)' }}></div>
        </div>

        <div className="flex items-center gap-4 text-white relative">
          <div className="relative flex items-center justify-center group/vol" onMouseEnter={() => setIsVolumeHovered(true)} onMouseLeave={() => setIsVolumeHovered(false)}>
              <div className={`absolute bottom-[140%] left-1/2 -translate-x-1/2 w-8 h-24 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center transition-all duration-300 origin-bottom ${isVolumeHovered ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-90 invisible'}`}>
                  <input type="range" min="0" max="1" step="0.05" value={volume} onChange={handleVolumeChange} className="volume-slider w-16 h-1 absolute -rotate-90 origin-center cursor-pointer" />
              </div>
              <button className="opacity-80 hover:opacity-100 hover:scale-110 transition-all z-20 relative" onClick={toggleMute}><VolumeIcon size={24} /></button>
          </div>
          <button className="opacity-80 hover:opacity-100 hover:scale-110 transition-all" onClick={(e) => toggleFullscreen(e)}><Maximize size={24} /></button>
        </div>
      </div>
    </div>
  );
};

// =========================================
// PAGES
// =========================================

const ProjectCard = ({ project }: { project: any }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const isMobile = useIsMobile();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isMobile || !videoRef.current || !containerRef.current) return;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        videoRef.current?.play().catch(() => {});
                        setIsHovered(true);
                    } else {
                        videoRef.current?.pause();
                        setIsHovered(false);
                    }
                });
            }, { threshold: 0.6 }
        );
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [isMobile]);

    const handleMouseEnter = () => {
        if (isMobile) return;
        setIsHovered(true);
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => {});
        }
    };

    const handleMouseLeave = () => {
        if (isMobile) return;
        setIsHovered(false);
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (project.isExternal) {
            window.location.href = project.link;
        } else {
            navigate('/' + project.link);
        }
    };

    return (
        <a href={project.isExternal ? project.link : '/' + project.link} onClick={handleClick} className="block w-full h-full">
            <div 
                ref={containerRef}
                className="relative w-full rounded-[18px] overflow-hidden bg-black cursor-pointer group shadow-lg transform-gpu"
                style={{ minHeight: '380px' }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className="absolute inset-0 z-0">
                    <img src={project.img} alt="" className="w-full h-full object-cover block opacity-100" loading="lazy" />
                </div>
                <div className="absolute inset-0 z-10 transition-opacity duration-0 ease-in-out" style={{ opacity: isHovered ? 1 : 0 }}>
                    <video poster={project.img} ref={videoRef} playsInline loop muted preload="auto" className="w-full h-full object-cover block">
                        <source src={project.video} type="video/mp4" />
                    </video>
                </div>
                <div className="absolute bottom-0 left-0 p-8 z-30 text-white pointer-events-none transition-opacity duration-500 lg:opacity-0 lg:group-hover:opacity-100">
                    <h3 className="text-[32px] lg:text-[32px] font-bold leading-none mb-1 drop-shadow-md">{project.title}</h3>
                    <p className="text-[20px] opacity-70 font-normal drop-shadow-md">{project.category}</p>
                </div>
            </div>
        </a>
    );
};

const WorkPage = () => {
  const gridRef = useRef<HTMLDivElement>(null);
  const initialProjects = [
    { id: 1, title: 'Elf Bar', category: 'Personal', video: 'vid/elf_preview.mp4', img: 'img/preview2.png', link: 'elfbar' },
    { id: 2, title: 'Football Dynamics', category: 'Personal', video: 'https://vpolitov.com/wp-content/uploads/2025/02/FD_thumbnail_01.mp4', img: 'https://vpolitov.com/wp-content/uploads/2025/01/fd_thumbnail_01.png', link: 'football-dynamics' },
    { id: 3, title: 'Puma Running AW24', category: 'Inertia Studios', video: 'https://vpolitov.com/wp-content/uploads/2025/02/Puma_thumbnail_01.mp4', img: 'https://vpolitov.com/wp-content/uploads/2025/01/magmax_thumbnail.png', link: 'puma-magmax' },
    { id: 4, title: 'SBER Creative Frame', category: 'Combine', video: 'https://vpolitov.com/wp-content/uploads/2025/03/SBER_CF_1-2.mp4', img: 'https://vpolitov.com/wp-content/uploads/2025/03/SB_thumbnail_03.png', link: 'sber-creative-frame' },
	{ id: 5, title: 'LKT group', category: 'Comercial', video: 'vid/lkt_preview.mp4', img: 'img/previewLKT.jpg', link: 'Lkt' }
  ];
  
  const [projects, setProjects] = useState<any[]>(initialProjects);

  // Dynamic Loading Logic (kept from original)
  useEffect(() => {
    let isMounted = true;
    const fetchProject = async (id: number) => {
        try {
            const response = await fetch(`project_${id}.html`);
            if (response.ok) {
                const text = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'text/html');
                const categoryMeta = doc.querySelector('meta[name="category"]');
                if (!categoryMeta) return null; 
                return {
                    id: `auto-${id}`,
                    title: doc.title || `Project ${id}`,
                    category: categoryMeta.getAttribute('content') || 'Work',
                    img: `img/project_${id}.jpg`,
                    video: `vid/project_${id}.mp4`,
                    link: `project_${id}.html`,
                    isExternal: true
                };
            }
        } catch {}
        return null;
    };
    const loadSequence = async () => {
        for (let i = 5; i <= 15; i++) {
            if (!isMounted) break;
            const project = await fetchProject(i);
            if (project) {
                setProjects(prev => prev.some(p => p.id === project.id) ? prev : [...prev, project]);
                await new Promise(r => setTimeout(r, 200)); 
            } else break;
        }
    };
    loadSequence();
    return () => { isMounted = false; };
  }, []);

  const calculateLayout = useCallback(() => {
    window.requestAnimationFrame(() => {
        if (!gridRef.current) return;
        const isDesktop = window.innerWidth > 1024;
        const items = Array.from(gridRef.current.children) as HTMLElement[];
        let leftH = 0, rightH = 0;
        const gap = 22;
        const colWidth = (gridRef.current.offsetWidth - gap) / 2;
        
        items.forEach((item) => {
          if (isDesktop) {
            item.style.width = `${colWidth}px`;
            item.style.position = 'absolute';
            if (leftH <= rightH) { item.style.left = '0px'; item.style.top = `${leftH}px`; leftH += item.offsetHeight + gap; } 
            else { item.style.left = `${colWidth + gap}px`; item.style.top = `${rightH}px`; rightH += item.offsetHeight + gap; }
          } else {
            item.style.position = 'relative'; item.style.top = 'auto'; item.style.left = 'auto'; item.style.width = '100%';
          }
        });
        
        if (isDesktop) gridRef.current.style.height = `${Math.max(leftH, rightH)}px`;
        else gridRef.current.style.height = 'auto';
    });
  }, []);

  useLayoutEffect(() => {
    calculateLayout();
    window.addEventListener('resize', calculateLayout);
    const imgs = document.querySelectorAll('.masonry-item img');
    if (imgs.length === 0) calculateLayout();
    else {
        let loaded = 0;
        const check = () => { loaded++; if(loaded >= imgs.length) calculateLayout(); }
        imgs.forEach(img => {
            if((img as HTMLImageElement).complete) check();
            else { img.addEventListener('load', check); img.addEventListener('error', check); }
        });
    }
    return () => window.removeEventListener('resize', calculateLayout);
  }, [projects, calculateLayout]);

  return (
    <div className="max-w-[1440px] mx-auto px-5 lg:px-10 w-full">
        <div className="relative w-full mb-[60px]" ref={gridRef}>
            <AnimatePresence>
                {projects.map((p, i) => (
                    <motion.div
                        key={p.id}
                        className="masonry-item lg:absolute w-full lg:w-[calc(50%-11px)] mb-6 lg:mb-0"
                        initial={{ opacity: 0, y: 50 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 + (i * 0.15) }}
                        whileHover={{ scale: 1.02, transition: { duration: 0.4 } }}
                    >
                        <ProjectCard project={p} />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
        <Footer />
    </div>
  );
};

const PlayPage = ({ onOpenImage }: { onOpenImage: (src: string) => void }) => {
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const isMobile = useIsMobile();
  
  useEffect(() => {
    let isMounted = true;
    const checkFile = (src: string, type: 'video'|'image'): Promise<boolean> => {
        if(type === 'image') {
            return new Promise(r => { const img = new Image(); img.onload = () => r(true); img.onerror = () => r(false); img.src = src; });
        } else {
            return fetch(src, { method: 'HEAD' }).then(res => (res.ok && res.headers.get('content-type')?.startsWith('video')) || false).catch(() => false);
        }
    };

    const loadMedia = async () => {
        const paths = [
            { prefix: 'imgs/Artwork/img_', ext: 'jpg', type: 'image', cat: 'artwork' },
            { prefix: 'anim/Artwork/anim_', ext: 'mp4', type: 'video', cat: 'artwork' },
            { prefix: 'anim/Artwork/anim_', ext: 'png', type: 'image', cat: 'artwork' },
            { prefix: 'imgs/Gambling/img_', ext: 'jpg', type: 'image', cat: 'gambling' },
            { prefix: 'anim/Gambling/anim_', ext: 'mp4', type: 'video', cat: 'gambling' },
            { prefix: 'imgs/Experimental/img_', ext: 'jpg', type: 'image', cat: 'experimental' },
            { prefix: 'anim/Experimental/anim_', ext: 'mp4', type: 'video', cat: 'experimental' },
            { prefix: 'anim/Experimental/anim_', ext: 'png', type: 'image', cat: 'experimental' },
        ];

        for (const p of paths) {
            for (let i = 1; i <= 15; i++) {
                const src = `${p.prefix}${i}.${p.ext}`;
                checkFile(src, p.type as any).then(exists => {
                    if (exists && isMounted) {
                        setMediaItems(prev => {
                             const newItem = { id: `${p.cat}-${p.type}-${i}-${p.ext}`, src, type: p.type, category: p.cat };
                             const unique = [...prev, newItem].filter((v,i,a) => a.findIndex(t => t.src === v.src) === i);
                             return unique.sort((a,b) => (parseInt(a.src.match(/\d+/)?.[0]||'0') - parseInt(b.src.match(/\d+/)?.[0]||'0')));
                        });
                    }
                });
            }
        }
    };
    loadMedia();
    return () => { isMounted = false; };
  }, []);

  const toggleFilter = (f: string) => setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  const filtered = activeFilters.length ? mediaItems.filter(i => activeFilters.includes(i.category)) : mediaItems;

  const FilterBtn = ({ label, icon: Icon, val }: any) => (
      <button onClick={() => toggleFilter(val)} className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${activeFilters.includes(val) ? 'bg-black text-white' : 'bg-white text-gray-500'}`}>
          <Icon size={16} /> <span className="text-sm">{label}</span>
      </button>
  );

  return (
    <div className="max-w-[1440px] mx-auto px-5 lg:px-10 w-full">
        <motion.div className="flex flex-col lg:flex-row justify-between items-end mb-[30px] gap-6" initial={{opacity:0,y:50}} animate={{opacity:1,y:0}} transition={{delay:0.3}}>
            <div><h1 className="text-[36px] lg:text-[48px] font-semibold leading-[1.1]">Playground</h1><div className="text-[#888] mt-2">Experiments & Styleframes</div></div>
            <div className="flex gap-3 flex-wrap">
                <FilterBtn label="Artwork" icon={Brush} val="artwork" />
                <FilterBtn label="Gambling" icon={Dices} val="gambling" />
                <FilterBtn label="Experimental" icon={FlaskConical} val="experimental" />
            </div>
        </motion.div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[20px] mb-[80px]">
            <AnimatePresence mode="popLayout">
                {filtered.map((item) => (
                    <motion.div key={item.id} layout initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                        className="relative rounded-[18px] overflow-hidden bg-black aspect-square cursor-pointer"
                        onClick={() => !isMobile && onOpenImage(item.src)}
                    >
                        {item.type === 'video' ? <video src={item.src} autoPlay loop muted playsInline className="w-full h-full object-cover pointer-events-none" /> : <img src={item.src} className="w-full h-full object-cover" />}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
        <Footer />
    </div>
  );
};

const ReelPage = () => (
    <motion.div className="w-full" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10 w-full mb-[30px]">
        <h1 className="text-[36px] lg:text-[48px] font-semibold leading-[1.1]">Showreel</h1>
        <div className="text-[#888] mt-2.5">Selected Works</div>
      </div>
      <div className="w-full max-w-[1440px] mx-auto px-5 lg:px-10 mb-[80px]">
        <VideoPlayer src="https://video.f1nal.me/showreel2022.mp4" poster="img/preview1.png" />
      </div>
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10 w-full"><Footer forceVisible={true} /></div>
    </motion.div>
);

const AboutPage = () => (
    <motion.div className="max-w-[1440px] mx-auto px-5 lg:px-10 w-full" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
        <div className="flex flex-col lg:flex-row justify-between items-start gap-[50px] mb-[40px]">
            <div className="w-full lg:w-[40%] max-w-[500px]"><img src="img/me.png" alt="Oleg" className="w-full rounded-[18px] grayscale hover:grayscale-0 transition-all" /></div>
            <div className="text-[18px] leading-[1.5]">
                <p className="mb-3">Hi! My name is Oleg Shmarov. I am a 3D artist and motion designer...</p>
                <p className="mb-3">My career began in the television industry...</p>
                <p>Now I work on freelance projects...</p>
            </div>
        </div>
        <div className="w-full h-[1px] bg-black/15 my-[40px]" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[50px] mb-[40px]">
            <div>
                <div className="mb-10"><h3 className="text-[18px] font-bold underline mb-1">Software</h3><p className="text-[18px]">Cinema 4D, Redshift, Adobe Creative Suite</p></div>
                <div className="mb-10"><h3 className="text-[18px] font-bold underline mb-1">Awards</h3><ul className="text-[18px]"><li>Promax Awards 2021 - Gold</li><li>World Brand Design Awards 2023 - Bronze</li></ul></div>
            </div>
            <div>
                <h3 className="text-[18px] font-bold underline mb-1">Contact</h3>
                <p className="text-[18px]"><a href="mailto:shmarov.oleg@gmail.com">shmarov.oleg@gmail.com</a></p>
            </div>
        </div>
        <Footer />
    </motion.div>
);

// --- PROJECT TEMPLATE ---
const ProjectPage = ({ title, meta, desc, video, gallery, credits, prev, next, children }: any) => {
    return (
        <motion.div initial={{opacity:0, y: 50}} animate={{opacity:1, y: 0}} exit={{opacity:0}} transition={{duration:0.5}} className="w-full">
            <div className="max-w-[1440px] mx-auto px-5 lg:px-10 w-full">
                <div className="flex flex-wrap justify-between items-start mb-[30px] gap-10">
                    <div className="flex-1 min-w-[300px]">
                        <h1 className="text-[36px] lg:text-[48px] font-semibold leading-[1.1] mb-2.5">{title}</h1>
                        <div className="text-[16px] text-[#888] mt-2.5">{meta}</div>
                    </div>
                    {/* APPLIED POPPINS FONT HERE */}
                    <div className="flex-none w-full lg:w-[45%] min-w-[300px]">
                        <p className="text-[16px] leading-[1.6] text-black font-poppins" dangerouslySetInnerHTML={{__html: desc}} />
                    </div>
                </div>
            </div>
            {video && (
                <div className="w-full max-w-[1440px] mx-auto px-5 lg:px-10 mb-[100px]">
                    <VideoPlayer src={video.src} poster={video.poster} />
                </div>
            )}
            <div className="max-w-[1440px] mx-auto px-5 lg:px-10 w-full">
                {gallery?.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px] mb-[100px]">
                        {gallery.map((item: any, i: number) => (
                            <div key={i} className={`relative overflow-hidden rounded-[18px] ${item.full ? 'col-span-1 lg:col-span-2' : ''}`}>
                                {item.video ? <video autoPlay loop muted playsInline className="w-full h-auto block rounded-[18px]"><source src={item.video} type="video/mp4"/></video> : <img src={item.img} className="w-full h-auto block rounded-[18px]" />}
                            </div>
                        ))}
                    </div>
                )}
                {children && <div className="w-full mb-[100px] flex justify-center">{children}</div>}
                
                <div className="text-[20px] text-[#555] leading-[1.8] mb-[80px] max-w-[700px]">
                    {credits.map((line: string, i: number) => <p key={i} dangerouslySetInnerHTML={{__html: line}} />)}
                </div>

                <div className="pt-10 mb-40 flex justify-between text-[16px] sm:text-[18px] lg:text-[30px] font-medium">
                    <Link to={'/' + prev.link} className="flex items-center gap-2.5 opacity-100 hover:opacity-60 hover:-translate-y-0.5 transition-all">
                        <ArrowLeft size={22} /> {prev.label}
                    </Link>
                    <Link to={'/' + next.link} className="flex items-center gap-2.5 opacity-100 hover:opacity-60 hover:-translate-y-0.5 transition-all">
                        {next.label} <ArrowRight size={22} />
                    </Link>
                </div>
                <Footer />
            </div>
        </motion.div>
    );
};

// --- PROJECTS ---
const ImageBlock = ({ src, alt, className = "", onClick }: any) => (
    <motion.div className={`relative overflow-hidden rounded-[18px] bg-[#f5f5f5] ${onClick ? 'cursor-pointer' : ''} ${className}`} onClick={onClick} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-15%" }} transition={{ duration: 0.6 }}>
        <img src={src} alt={alt} loading="lazy" className="w-full h-full object-cover block transition-transform duration-700 hover:scale-[1.02]" />
    </motion.div>
);

const ElfBar = ({ onOpenImage }: { onOpenImage: (src: string) => void }) => (
    <ProjectPage 
        title="Elf Bar Promotion" meta="Personal / 2022" 
        desc="A promotional video for Elf Bar..."
        video={{ src: 'https://video.f1nal.me/elfbar.mp4', poster: 'work/elfbar/img_13.png' }}
        gallery={[]} 
        credits={['<strong>Client:</strong> Elf Bar', '<strong>Role:</strong> 3D Motion Design']}
        prev={{ label: 'LKT group', link: 'Lkt' }} next={{ label: 'Football Dynamics', link: 'football-dynamics' }}
    >
        <div className="flex flex-col gap-2 lg:gap-8 w-full mb-[60px]">
            <ImageBlock src="work/elfbar/img_1.png" alt="Elf Bar Hero" onClick={() => onOpenImage('work/elfbar/img_1.png')} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <ImageBlock src="work/elfbar/img_2.png" alt="Close Up" onClick={() => onOpenImage('work/elfbar/img_2.png')} />
                <ImageBlock src="work/elfbar/img_3.png" alt="Taste Profile" onClick={() => onOpenImage('work/elfbar/img_3.png')} />
            </div>
            {/* ... Other images ... */}
            <ImageBlock src="work/elfbar/img_4.png" alt="Wide Shot" onClick={() => onOpenImage('work/elfbar/img_4.png')} />
        </div>
    </ProjectPage>
);

const FootballDynamics = () => (
    <ProjectPage 
        title="Football Dynamics" meta="Personal Project / 2025"
        desc="An exploration of motion and energy within the context of sports."
        gallery={[{ video: 'https://vpolitov.com/wp-content/uploads/2025/02/FD_thumbnail_01.mp4', full: true }, { img: 'https://vpolitov.com/wp-content/uploads/2025/01/fd_thumbnail_01.png' }, { img: 'https://placehold.co/1400x788/EEE/31343C?text=Dynamics+Wide+Shot', full: true }]}
        credits={['<strong>Design & Animation:</strong> Oleg Shmarov']}
        prev={{ label: 'ELF BAR', link: 'elfbar' }} next={{ label: 'Puma Running AW24', link: 'puma-magmax' }}
    />
);

const Puma = () => (
    <ProjectPage 
        title="Puma Running AW24" meta="Studio: Inertia Studios / 2024"
        desc="Highlighting the technology behind Puma's new MagMax series."
        gallery={[{ video: 'https://vpolitov.com/wp-content/uploads/2025/02/Puma_thumbnail_01.mp4', full: true }, { img: 'https://vpolitov.com/wp-content/uploads/2025/01/magmax_thumbnail.png' }, { img: 'https://placehold.co/1400x788/EEE/31343C?text=Campaign+Wide+View', full: true }]}
        credits={['<strong>Studio:</strong> Inertia Studios', '<strong>Client:</strong> Puma']}
        prev={{ label: 'Football Dynamics', link: 'football-dynamics' }} next={{ label: 'SBER Creative Frame', link: 'sber-creative-frame' }}
    />
);

const Sber = () => (
    <ProjectPage 
        title="SBER Creative Frame" meta="Combine"
        desc="In 2020, Sber completely changed its positioning..."
        video={{ src: 'https://vpolitov.com/wp-content/uploads/2025/03/SBER_CF_1-2.mp4', poster: 'https://vpolitov.com/wp-content/uploads/2025/03/SB_thumbnail_03.png' }}
        gallery={[{ img: 'https://vpolitov.com/wp-content/uploads/2025/02/sh_002_v01-0-00-01-08_1.jpg' }, { img: 'https://placehold.co/1400x788/EEE/31343C?text=Wide+Shot+Render', full: true }]}
        credits={['<strong>Art Direction:</strong> Oleg Shmarov']}
        prev={{ label: 'Puma Running AW24', link: 'puma-magmax' }} next={{ label: 'LKT group', link: 'Lkt' }}
    />
);

const Lkt = () => (
    <ProjectPage 
        title="LKT group" meta="Comercial / 2024" 
        desc="LKT GROUP develops and implements comprehensive industrial solutions..."
        gallery={[]} credits={['<strong>Client:</strong> LKT Company']}
        prev={{ label: 'SBER Creative Frame', link: 'sber-creative-frame' }} next={{ label: 'Elf Bar', link: 'elfbar' }}
    >
        <div className="flex flex-col gap-6 lg:gap-8 w-full mb-[60px]">
			<PDFViewer pdfUrl="./LKT_WERKE_RU.pdf" />
			<PDFViewer pdfUrl="./GOLDENDIE_RU.pdf" />
			<PDFViewer pdfUrl="./GOLDENMILL_RU.pdf" />
        </div>
    </ProjectPage>
);

// =========================================
// MAIN APP COMPONENT
// =========================================
export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [playModalSrc, setPlayModalSrc] = useState<string | null>(null);
  
  useContentProtection(); 
  useIntroAnimation();

  const isBlurActive = isMenuOpen || !!playModalSrc;

  useEffect(() => {
    document.title = "F1NAL EDITING - OLEG SHMAROV - 3D ARTIST";
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement || document.createElement('link');
    link.type = 'image/webp'; link.rel = 'icon'; link.href = 'img/favicon.webp';
    document.head.appendChild(link);
  }, []);

  return (
    <>
      <ScrollToTopOnNavigate />
      <MobileMenuOverlay isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <ImageModalOverlay src={playModalSrc} onClose={() => setPlayModalSrc(null)} />
	  
	  <div className="ios-safearea-overlay"></div>

      <div className="min-h-screen w-full flex flex-col bg-transparent">
        <div className="relative z-[10005]">
             <Header isMenuOpen={isMenuOpen} onToggleMenu={() => setIsMenuOpen(!isMenuOpen)} />
        </div>

        <div id="content-holder" className="flex-grow pt-[40px] relative flex flex-col"
            style={{
                filter: isBlurActive ? 'blur(4px)' : 'none',
                backgroundColor: isBlurActive ? 'rgba(255, 255, 255, 1)' : 'transparent', 
                transition: 'filter 0.3s ease, background-color 0.3s ease',
                pointerEvents: isBlurActive ? 'none' : 'auto'
            }}
        >
            <AnimatePresence mode="wait">
                <Routes>
                    <Route path="/" element={<WorkPage />} />
                    <Route path="/reel" element={<ReelPage />} />
                    <Route path="/play" element={<PlayPage onOpenImage={setPlayModalSrc} />} />
                    <Route path="/info" element={<AboutPage />} />
                    
                    {/* PROJECTS ROUTES */}
                    <Route path="/elfbar" element={<ElfBar onOpenImage={setPlayModalSrc} />} />
                    <Route path="/football-dynamics" element={<FootballDynamics />} />
                    <Route path="/puma-magmax" element={<Puma />} />
                    <Route path="/sber-creative-frame" element={<Sber />} />
                    <Route path="/Lkt" element={<Lkt />} />

                    {/* Fallback */}
                    <Route path="*" element={<WorkPage />} />
                </Routes>
            </AnimatePresence>
        </div>
        <ScrollToTopButton />
      </div>
    </>
  );
}