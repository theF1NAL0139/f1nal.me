import React, { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo } from 'react';
import { 
  Routes, 
  Route, 
  Link, 
  useLocation, 
  useNavigate 
} from 'react-router-dom';
import { 
  Play, Volume2, Volume1, VolumeX, Maximize, ArrowUp, 
  Brush, Dices, FlaskConical, Loader2,
  Building2, Briefcase, Activity
} from 'lucide-react';
import { motion, AnimatePresence, useInView, type SVGMotionProps } from 'framer-motion';

// Предполагается, что PDFViewer существует
import PDFViewer from './PDFViewer'; 

// SYNCHRONIZATION CONFIG
const ANIM_DURATION = 1; 
const ANIM_EASE = [0.19, 1, 0.22, 1] as const; 

// ... (Остальные константы и хуки без изменений: getPageTransition, AnimBlock, ScrollToTopOnNavigate, useScrollLock, useContentProtection, useIntroAnimation, useIsMobile) ...
// ДЛЯ КРАТКОСТИ Я ИХ ПРОПУСКАЮ, ОНИ ОСТАЮТСЯ КАК БЫЛИ В ПРОШЛОЙ ВЕРСИИ
// ВСТАВЬТЕ СЮДА ВЕСЬ КОД ОТ const getPageTransition ДО const Footer ВКЛЮЧИТЕЛЬНО

const getPageTransition = () => ({
    initial: { opacity: 0, y: 80 }, 
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
    transition: { 
        duration: ANIM_DURATION, 
        ease: ANIM_EASE, 
        delay: 0.25 
    }
});

const AnimBlock = ({ src, className = "" }: any) => (
    <motion.div 
        className={`relative overflow-hidden rounded-[0px] bg-[#f5f5f5] ${className}`} 
        initial={{ opacity: 0, y: 50 }} 
        whileInView={{ opacity: 1, y: 0 }} 
        viewport={{ once: true, amount: 0.1 }} 
        transition={{ duration: 0.5, ease: "easeOut" }}
    >
        <video 
            src={src} 
            autoPlay 
            loop
            muted 
            playsInline 
            className="w-full h-full object-cover block"
        />
    </motion.div>
);

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

// ... (UI Components: ScrollToTopButton, MenuToggle, MobileMenuOverlay, Header, Footer) ...
// ВСТАВЬТЕ СЮДА КОД UI КОМПОНЕНТОВ

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
  <motion.path fill="transparent" strokeWidth="2" stroke="black" strokeLinecap="round" {...props} />
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
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', touchAction: 'none' }}
                >
                    <div className="flex flex-col items-center gap-6">
                        {menuItems.map((item, index) => {
                            const isActive = location.pathname === item.href;
                            return (
                                <Link
                                    key={item.label}
                                    to={item.href}
                                    onClick={onClose}
                                    className={`text-[30px] no-underline cursor-pointer leading-tight transition-colors duration-300 ${isActive ? 'text-black font-regular' : 'text-[#777] font-[250]'}`}
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

  useEffect(() => { setTimeout(() => setAnimStart(true), 100); }, []);
  
  const navLinkClasses = (path: string) => {
    const isActive = location.pathname === path;
    return `text-[22px] text-[#777] font-normal relative transition-colors duration-300 hover:text-black hover:-translate-y-1.5 inline-block transform transition-transform cursor-pointer 
    before:content-[''] before:absolute before:w-full before:h-[60px] before:top-[-15px] before:left-0
    after:content-[''] after:absolute after:w-full after:h-[1px] after:bottom-0 after:left-0 after:bg-black after:scale-x-0 after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left
    ${isActive ? 'text-black font-bold ' : ''}`; 
  }

  return (
    <header className={`relative w-full pt-[40px] pb-[0px] bg-transparent z-[10001] transition-all duration-[1500ms] ease-[cubic-bezier(0.19,1,0.22,1)] ${animStart ? 'opacity-100 translate-y-0' : 'opacity-5 -translate-y-[120px]'}`}>
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
           {[
    { name: 'Behance', url: 'https://www.behance.net/f1nal' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/in/f1nal/' },
    { name: 'Instagram', url: 'https://www.instagram.com/f1nal' }
].map((item) => (
    <a key={item.name} href={item.url} target="_blank" rel="noreferrer" 
       className="text-[20px] text-black relative pb-0.5 transition-all duration-300 hover:-translate-y-1.5 inline-block">
        {item.name}
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
  const containerClasses = "pt-0 pb-10 overflow-hidden relative"; 
  if (forceVisible) return <div className={containerClasses}>{footerContent}</div>;
  

  return (
      <motion.footer 
        className={containerClasses}
        initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }}
      >
        <motion.div variants={{ hidden: { y: "400%" }, visible: { y: "0%", transition: { duration: 1.5, ease: [0.22, 1, 0.36, 1] } } }}>
            {footerContent}
        </motion.div>
      </motion.footer>
  );
};

// ... (COMPLEX COMPONENTS: ImageModalOverlay, VideoPlayer) ...
// ВСТАВЬТЕ СЮДА КОД ImageModalOverlay И VideoPlayer

const ImageModalOverlay = ({ src, onClose }: { src: string | null, onClose: () => void }) => {
    useScrollLock(!!src);
    const isVideo = useMemo(() => src?.toLowerCase().endsWith('.mp4'), [src]);
    const [isPlaying, setIsPlaying] = useState(false);

    return (
        <AnimatePresence>
            {src && (
              <motion.div 
                className="fixed inset-0 z-[10050] flex items-center justify-center" 
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
                    <img src={src} alt="Full size" className="max-w-full max-h-[85vh] object-contain rounded-none shadow-2xl cursor-pointer transition-opacity" onClick={onClose} />
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
    
    // 1. Стандартный выход из полноэкранного режима
    if (document.fullscreenElement) {
        document.exitFullscreen?.();
        return;
    }

    // 2. Специфичный метод для iOS (работает только на самом элементе video)
    if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
        (videoRef.current as any).webkitEnterFullscreen();
        return;
    }

    // 3. Стандартный вход в полноэкранный режим для Desktop/Android
    if (containerRef.current && containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
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
      className={`group fix-safari-radius relative w-full aspect-video rounded-full shadow-lg cursor-default ${uiHidden ? 'cursor-none' : ''}`}
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

      <div className={`absolute bottom-0 left-0 w-full px-5 py-4 lg:px-4 lg:py-5 bg-gradient-to-t from-black/60 to-transparent transition-opacity duration-300 flex items-center gap-5 z-20 ${uiHidden ? 'opacity-0' : 'opacity-90'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex-grow h-5 flex items-center cursor-pointer group/seek relative" ref={progressBarRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseLeave={() => setHoverTime(null)}>
          <AnimatePresence>
             {(hoverTime || isDragging) && (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-8 bg-white/90 text-black text-[12px] font-bold px-1.5 py-0.5 rounded pointer-events-full transform -translate-x-1/2" style={{ left: tooltipPos }}>{hoverTime}</motion.div>
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

// ... (PAGES COMPONENTS: ProjectCard, WorkPage) ...
// ВСТАВЬТЕ СЮДА КОД ProjectCard И WorkPage

const ProjectCard = ({ project }: { project: any }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const isMobile = useIsMobile();
    const navigate = useNavigate();

    // MOBILE: Auto Play logic with Intersection Observer
    useEffect(() => {
        if (!isMobile || !videoRef.current || !containerRef.current) return;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) videoRef.current?.play().catch(() => {});
                    else videoRef.current?.pause();
                });
            }, { threshold: 0.6 }
        );
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [isMobile]);
	
	useEffect(() => {
    if (videoRef.current) {
        videoRef.current.load();
    }
}, []);

    // DESKTOP: Hover Logic
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

    const videoClass = isMobile
        ? "opacity-100 brightness-75"            // ← мобильная версия: всегда затемнённое
        : (isHovered ? "opacity-100 brightness-75" : "opacity-0");


    return (
        <a href={project.isExternal ? project.link : '/' + project.link} onClick={handleClick} className="block w-full h-full">
            <div 
    ref={containerRef}
    className="relative w-full rounded-[18px] overflow-hidden bg-black cursor-pointer group 
               shadow-lg transform-gpu min-h-[280px] md:min-h-[380px]"
    onMouseEnter={handleMouseEnter}
    onMouseLeave={handleMouseLeave}
>
                {/* Static Image (Bottom Layer) */}
{!isMobile && (
    <div className="absolute inset-0 z-0">
        <img src={project.img} className="w-full h-full object-cover block" />
    </div>
)}

                
                {/* Video Layer (Top Layer) */}
                <div className={`absolute inset-0 z-10 transition-all duration-300 ease-in-out ${videoClass}`}>
                    <video
    poster={project.img}
    ref={videoRef}
    playsInline
    loop
    muted
    preload="auto"
    className="w-full h-full object-cover block"
>
    <source src={project.video} type="video/mp4" />
</video>
                </div>

                <div className={`absolute bottom-0 left-0 p-8 z-30 text-white pointer-events-none transition-opacity duration-500 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <h3 className="text-[32px] lg:text-[32px] font-bold leading-none mb-1 drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]">
                    {project.title}
                    </h3>
                    <p className="text-[20px] opacity-80 font-normal drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]">
                    {project.category}
                    </p>
                </div>
            </div>
        </a>
    );
};

const WorkPage = () => {
  const gridRef = useRef<HTMLDivElement>(null);
  const initialProjects = [
    { id: 1, title: 'Elf Bar', category: 'Personal', video: 'vid/elf_preview.mp4', img: 'img/preview2.png', link: 'elfbar' },
    { id: 2, title: 'Radio ostrov', category: 'Comercial', video: 'vid/radioO_preview.mp4', img: 'img/radioO_preview.png', link: 'radiostrov' },
	{ id: 3, title: 'LKT group', category: 'Comercial', video: 'vid/lkt_preview.mp4', img: 'img/previewLKT.jpg', link: 'lkt' },
	{ id: 4, title: 'PSO short animation', category: 'Personal', video: 'work/pso/anim_1.mp4', img: 'work/pso/img_1.png', link: 'pso' },
	{ id: 5, title: 'Price auto', category: 'Comercial', video: 'work/priceauto/price_auto_preview.mp4', img: 'work/priceauto/pa_preview.png', link: 'priceauto' },
	{ id: 6, title: 'Stroy prosto', category: 'Comercial', video: 'work/stroyprosto/StroyProsto_preview.mp4', img: 'work/stroyprosto/stroyprosto.jpg', link: 'stroyprosto' },
  ];
  
  const [projects, setProjects] = useState<any[]>(initialProjects);

  // Dynamic Loading Logic
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

  const startDelay = 0.25;

  return (
    <div className="max-w-[1440px] mx-auto px-5 lg:px-10 w-full mt-[20px]">
        <div className="relative w-full mb-[40px]" ref={gridRef}>
            <AnimatePresence>
                {projects.map((p, i) => (
                    <motion.div
                        key={p.id}
                        className="masonry-item lg:absolute w-full lg:w-[calc(50%-11px)] mb-6 lg:mb-0"
                        initial={{ opacity: 0, y: 50 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ 
                            duration: ANIM_DURATION, 
                            ease: ANIM_EASE, 
                            delay: startDelay + (i * 0.1), 
                            scale: { duration: 0.3 }
                        }}
                        whileHover={{ scale: 1.02, transition: { duration: 0.3 } }} >
                        <ProjectCard project={p} />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
        <Footer />
    </div>
  );
};

// =========================================
// NEW COMPONENT: VISION OS LIQUID SKELETON
// =========================================
const LiquidGlassSkeleton = () => (
    <div className="absolute inset-0 w-full h-full bg-[#f0f0f0]/50 backdrop-blur-md overflow-hidden z-20">
        <motion.div
            className="absolute inset-0 -translate-x-full"
            style={{
                background: "linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.6) 50%, transparent 70%)",
                transform: "skewX(-20deg)"
            }}
            animate={{ translateX: ["-150%", "150%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
    </div>
);

// =========================================
// UPDATED LAZY MEDIA COMPONENT (With Skeleton)
// =========================================
const LazyMediaItem = ({ item, isMobile, onClick }: any) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "200px" }); 
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <motion.div 
            ref={ref}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.4 }}
            className="relative rounded-[0px] overflow-hidden bg-black/5 w-full cursor-pointer min-h-[150px]"
            onClick={onClick}
            whileHover={!isMobile ? { scale: 1.02, filter: "brightness(1.1)", zIndex: 10 } : {}}
        >
            <AnimatePresence>
                {!isLoaded && (
                    <motion.div
                        className="absolute inset-0 z-20"
                        exit={{ opacity: 0, transition: { duration: 0.5 } }}
                    >
                        <LiquidGlassSkeleton />
                    </motion.div>
                )}
            </AnimatePresence>

            {isInView && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: isLoaded ? 1 : 0 }} 
                    transition={{ duration: 0.5 }}
                    className="w-full h-full"
                >
                    {item.type === 'video' ? (
                        <video 
                            src={item.src} 
                            autoPlay loop muted playsInline 
                            className="w-full h-auto object-contain block"
                            onLoadedData={() => setIsLoaded(true)}
                        />
                    ) : (
                        <img 
                            src={item.src} 
                            className="w-full h-auto object-contain block" 
                            loading="lazy" 
                            alt=""
                            onLoad={() => setIsLoaded(true)}
                        />
                    )}
                </motion.div>
            )}
        </motion.div>
    );
};

// =========================================
// UPDATED PLAY PAGE (DEDUPLICATION FIX)
// =========================================
const PlayPage = ({ onOpenImage }: { onOpenImage: (src: string) => void }) => {
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false); 
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

    const loadMediaSequence = async () => {
        // ИЗМЕНЕНИЕ 1: Порядок важен! Ставим приоритетные форматы выше.
        // Если найдется anim_1.mp4, то img_1.jpg будет проигнорирован.
        const paths = [
            // Artwork
            { prefix: 'anim/Artwork/anim_', ext: 'mp4', type: 'video', cat: 'artwork' },
            { prefix: 'imgs/Artwork/img_', ext: 'jpg', type: 'image', cat: 'artwork' },
            { prefix: 'imgs/Artwork/img_', ext: 'png', type: 'image', cat: 'artwork' },
            
            // Gambling
            { prefix: 'anim/Gambling/anim_', ext: 'mp4', type: 'video', cat: 'gambling' },
            { prefix: 'imgs/Gambling/img_', ext: 'jpg', type: 'image', cat: 'gambling' },
            { prefix: 'imgs/Gambling/img_', ext: 'png', type: 'image', cat: 'gambling' },
            
            // Experimental
            { prefix: 'anim/Experimental/anim_', ext: 'mp4', type: 'video', cat: 'experimental' },
            { prefix: 'imgs/Experimental/img_', ext: 'jpg', type: 'image', cat: 'experimental' },
            { prefix: 'imgs/Experimental/img_', ext: 'png', type: 'image', cat: 'experimental' }, 
        ];

        const BATCH_SIZE = 10; 
        
        for (let i = 1; i <= 60; i += BATCH_SIZE) {
            if (!isMounted) return;
            
            // Даем браузеру отрисовать кадр
            await new Promise(resolve => requestAnimationFrame(resolve));

            const checks = [];
            for (let j = i; j < i + BATCH_SIZE && j <= 60; j++) {
                for (const p of paths) {
                    const src = `${p.prefix}${j}.${p.ext}`;
                    // ID все еще уникален для файла, но для проверки дублей мы будем использовать другое
                    const id = `${p.cat}-${p.type}-${j}-${p.ext}`;
                    checks.push(
                        checkFile(src, p.type as any).then(exists => 
                            exists ? { id, src, type: p.type, category: p.cat, sortIndex: j } : null
                        )
                    );
                }
            }

            const results = await Promise.all(checks);
            const validItems = results.filter(Boolean);

            if (validItems.length > 0 && isMounted) {
                setMediaItems(prev => {
                    // ИЗМЕНЕНИЕ 2: Логика дедупликации
                    // Мы создаем Set ключей вида "категория-номер" (например: "experimental-1")
                    const occupiedSlots = new Set(prev.map(item => `${item.category}-${item.sortIndex}`));
                    
                    const newUniqueItems = [];

                    for (const item of validItems) {
                        const slotKey = `${item.category}-${item.sortIndex}`;
                        
                        // Если слот под этот номер в этой категории еще не занят — добавляем
                        if (!occupiedSlots.has(slotKey)) {
                            newUniqueItems.push(item);
                            occupiedSlots.add(slotKey); // Занимаем слот, чтобы дубликаты (png после jpg) не прошли
                        }
                    }

                    if (newUniqueItems.length === 0) return prev;
                    
                    const updated = [...prev, ...newUniqueItems];
                    return updated.sort((a, b) => a.sortIndex - b.sortIndex);
                });
            }

            if (i === 1 && isMounted) setIsReady(true);
        }
        if (isMounted) setIsReady(true);
    };
	
    loadMediaSequence();
    return () => { isMounted = false; };
  }, []);

  const toggleFilter = (f: string) => {
      setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  }
  
  const columns = useMemo(() => {
    const filtered = activeFilters.length ? mediaItems.filter(i => activeFilters.includes(i.category)) : mediaItems;
    if (isMobile) return [filtered];
    const cols: any[][] = [[], [], []];
    filtered.forEach((item, index) => {
        cols[index % 3].push(item);
    });
    return cols;
  }, [mediaItems, activeFilters, isMobile]);

  const FilterBtn = ({ label, icon: Icon, val }: any) => {
    const isActive = activeFilters.includes(val);
    return (
      <motion.button 
        layout onClick={() => toggleFilter(val)} 
        className="relative group px-[14px] py-[9px] lg:px-5 lg:py-2.5 rounded-full isolate overflow-hidden outline-none flex items-center gap-2 lg:gap-2.5"
        style={{
            background: isActive ? 'rgba(5, 5, 5, 0.85)' : 'rgba(255, 255, 255, 0.5)',
            boxShadow: isActive ? '0 10px 30px -10px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.1)' : '0 4px 20px -5px rgba(0,0,0,0.05), inset 0 0 0 1px rgba(0,0,0,0.05)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        }}
        whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95, y: 0 }}
      >
          <motion.div className="absolute inset-0 -z-10 transition-opacity duration-500" initial={false} animate={{ opacity: isActive ? 1 : 0 }} style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0) 100%)' }} />
          <motion.div className="flex items-center gap-2 relative z-10" animate={{ color: isActive ? "#ffffff" : "#444444" }}>
              <Icon strokeWidth={2.5} className="w-[14px] h-[14px] lg:w-4 lg:h-4" /> <span className="text-[14px] lg:text-sm">{label}</span>
          </motion.div>
      </motion.button>
    );
  };

  return (
    <motion.div className="max-w-[1440px] mx-auto px-5 lg:px-10 w-full" {...getPageTransition()}>
        <div className="flex flex-col lg:flex-row justify-between items-end mb-[40px] gap-6">
            <div className="w-full lg:w-auto">
                <h1 className="text-[36px] lg:text-[48px] font-semibold leading-[1.1]">Playground</h1>
                <div className="text-[20px] opacity-80 mt-2">Experiments & Styleframes</div>
            </div>
            <div className="w-full lg:w-auto pb-2">
                <motion.div layout className="flex gap-2.5 flex-wrap mt-4 w-full p-1">
                    <FilterBtn label="Artwork" icon={Brush} val="artwork" />
                    <FilterBtn label="Gambling" icon={Dices} val="gambling" />
                    <FilterBtn label="Experimental" icon={FlaskConical} val="experimental" />
                </motion.div>
            </div>
        </div>
        
        <div className="relative min-h-screen mb-[80px]">
            <AnimatePresence>
                {!isReady && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.5 }}
                        className="absolute inset-0 z-10 flex flex-col items-center pt-20"
                    >
                         <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                            <Loader2 size={48} className="text-black/20" />
                         </motion.div>
                         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-4 text-sm font-mono text-black/40 uppercase tracking-widest">
                            Loading Playground...
                         </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={`flex gap-[20px] w-full items-start ${isMobile ? 'flex-col' : 'flex-row'}`}>
                {columns.map((colItems, colIndex) => (
                    <div key={colIndex} className="flex-1 flex flex-col gap-[20px] w-full">
                         {colItems.map((item: any) => (
                             <LazyMediaItem 
                                key={item.id} 
                                item={item} 
                                isMobile={isMobile} 
                                onClick={() => { if(!isMobile) onOpenImage(item.src) }} 
                             />
                         ))}
                    </div>
                ))}
            </div>
        </div>
        <Footer />
    </motion.div>
  );
};

const ReelPage = () => (
    <>
        <motion.div 
            className="w-full" 
            {...getPageTransition()}
        >
            <div className="max-w-[1440px] mx-auto px-5 lg:px-10 w-full mb-[40px] flex flex-col items-start text-left">
                <h1 className="text-[36px] lg:text-[48px] font-semibold leading-[1.1]">Showreel</h1>
                <div className="text-[20px] opacity-80 mt-2">Selected Works</div>
            </div>

            <div className="w-full max-w-[1440px] mx-auto px-5 lg:px-10 mb-[80px]">
                <VideoPlayer src="https://video.f1nal.me/showreel2022.mp4" poster="img/preview1.png" />
            </div>
        </motion.div>

        <div className="max-w-[1440px] mx-auto px-5 lg:px-10 w-full">
            <Footer />
        </div>
    </>
);


// =========================================
// NEW COMPONENT: EXPERIENCE TIMELINE
// =========================================

const TimelineItem = ({ data, isLast }: { data: any, isLast: boolean }) => {
    const Icon = data.icon;

    return (
        <motion.div 
            className="relative flex gap-6 group cursor-default"
            initial="initial"
            whileHover="hover"
            variants={{
                initial: { opacity: 0.8 },
                hover: { opacity: 1 }
            }}
        >
            <div className="flex flex-col items-center relative shrink-0">
                {!isLast && (
                    <div className="absolute top-[20px] bottom-[-20px] w-[2px] bg-black/10 z-0"></div>
                )}
                {!isLast && (
                    <motion.div 
                        className="absolute top-[20px] w-[2px] bg-black z-1 origin-top"
                        variants={{
                            initial: { height: "0%" },
                            hover: { height: "calc(90%)", transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
                        }}
                    />
                )}

                <motion.div 
                    className="relative z-10 w-12 h-12 rounded-full bg-white border-2 border-black/10 flex items-center justify-center overflow-hidden transition-colors duration-300 group-hover:border-black"
                    variants={{
                        initial: { scale: 1 },
                        hover: { scale: 1.2, transition: { type: "spring", stiffness: 300, damping: 20 } }
                    }}
                >
                    <motion.div
                         variants={{
                            initial: { rotate: 0, scale: 1 },
                            hover: { rotate: [0, -10, 10, 0], scale: 1.05, transition: { duration: 0.5, ease: "easeInOut" } }
                        }}
                    >
                        <Icon size={20} className="text-black opacity-70 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                </motion.div>
            </div>

            <motion.div 
                className="pb-4 pt-1"
                variants={{
                    initial: { x: 0 },
                    hover: { x: 6, transition: { duration: 0.3, ease: "easeOut" } }
                }}
            >
                <h4 className="text-[18px] font-semibold text-black mb-1">{data.company}</h4>
                
                <div className="mb-3">
                    <div className="text-[20px] font-bold leading-tight">{data.role}</div>
                    <div className="text-[16px] text-black/50 font-medium mt-1">{data.period}</div>
                </div>

                <p className="text-[17px] leading-[1.6] opacity-80 font-light whitespace-pre-line">
                    {data.description}
                </p>
            </motion.div>
        </motion.div>
    );
};

const ExperienceTimeline = () => {
    const experienceData = [
        {
            id: 1,
            company: "Linkomtrade LLC",
            role: "Design, 3D Visualization, Catalog Layout",
            period: "2024-2025",
            description: "3D visualization of models (assembly lines, industrial equipment). Website design and development, social media content. Creation of layouts for catalogs and booklets.",
            icon: Building2
        },
        {
            id: 2,
            company: "Pilot LLC (ROI Media)",
            role: "Motion Designer",
            period: "2023 — 2024",
            description: "Creation of static and animated graphics. Integration of AI into projects. Developing creatives and participating in the research and implementation of new projects and ideas.",
            icon: Activity
        },
        {
            id: 3,
            company: "Freelance / Private Practice",
            role: "Creator",
            period: "2013 — 2020",
            description: "Over 10 years of experience in full-cycle video production and content creation for advertising.",
            icon: Briefcase
        }
    ];

    return (
        <div className="w-full">
            <h3 className="text-[20px] font-semibold underline mb-8">Experience</h3>
            <div className="flex flex-col">
                {experienceData.map((item, index) => (
                    <TimelineItem key={item.id} data={item} isLast={index === experienceData.length - 1} />
                ))}
            </div>
        </div>
    );
};

const AboutPage = () => (
    <motion.div 
        className="max-w-[1440px] mx-auto px-5 lg:px-10 w-full mt-[20px]"
        {...getPageTransition()}
    >
        <div className="flex flex-col lg:flex-row justify-between items-start gap-[100px] mb-[2px]">
            <div className="w-full lg:w-[200%] max-w-[480px]"><img src="img/me.png" alt="Oleg" className="w-full rounded-[12px] grayscale hover:grayscale-0 transition-all" /></div>
            <div className="text-[19px] leading-[1.8] font-light leading-[1.1] opacity-80">
                <p className="mb-1">Hi! My name is Oleg Shmarov. I am a 3D Artist and Motion Designer dedicated to creating immersive visual experiences.

I bring over 10 years of expertise in full-cycle video production and design.<p className="mb-1">My journey has taken me from freelance content creation for diverse brands to managing design teams and developing creatives for high-traffic media projects and bring complex concepts to life.</p>

<p className="mb-1">Today, I focus on 3D visualization of industrial equipment and comprehensive web design, combining technical precision with creative direction to bring complex concepts to life.</p></p>

            </div>
        </div>
        <div className="w-full h-[1px] bg-black/15 my-[40px]" />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[50px] lg:gap-[100px] mb-[40px] items-start">
            <div>
                <div className="mb-12"><h3 className="text-[20px] font-semibold underline mb-4">Software</h3><p className="text-[20px] font-light leading-[2.0] opacity-80">Cinema 4D, Redshift, Adobe Creative Suite</p><p className="text-[20px] font-light leading-[2.0] opacity-80">Figma, Unreal Engine, Marvelous Designer</p></div>
                <div className="mb-10">
                    <h3 className="text-[20px] font-semibold underline mb-4">Awards</h3>
                    <ul className="text-[20px] font-light leading-[2.0] opacity-80 flex flex-col gap-2">
                        <li>
                            <a href="/pdfs/design_pro.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors border-b border-black/20 hover:border-black pb-1">
                                Motion-design PRO 2.0
                            </a>
                        </li>
                        <li>
                            <a href="/pdfs/design.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors border-b border-black/20 hover:border-black pb-1">
                                Motion-design 2.0
                            </a>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="lg:pl-10 relative top-[-2px]">
                <ExperienceTimeline />
            </div>
        </div>
        <Footer />
    </motion.div>
);

// --- PROJECT TEMPLATE ---
const ProjectPage = ({ title, meta, desc, video, gallery, credits, prev, next, children, bottomSpacing = "mb-[40px]" }: any) => {
    return (
        <motion.div 
            initial={{opacity:0, y: 150}} 
            animate={{opacity:1, y: 0}} 
            exit={{opacity:0}} 
            transition={{
                duration: ANIM_DURATION, 
                ease: ANIM_EASE, 
                delay: 0.25 
            }} 
            className="w-full"
        >
            <div className="max-w-[1440px] mx-auto px-5 lg:px-10 w-full">
                <div className="flex flex-wrap justify-between items-start mb-[30px] gap-10">
                    <div className="flex-1 min-w-[300px]">
                        <h1 className="text-[36px] lg:text-[48px] font-semibold leading-[1.1] mb-2.5 opacity-90">{title}</h1>
                        <div className="text-[20px] opacity-80 mt-2.5 font-regular">{meta}</div>
                    </div>
                    <div className="flex-none w-full lg:w-[50%] min-w-[300px] mt-2 opacity-80">
                        <p className="text-[16px] leading-[1.8] text-black font-poppins" dangerouslySetInnerHTML={{__html: desc}} />
                    </div>
                </div>
            </div>
            {video && (
                <div className={`w-full max-w-[1440px] mx-auto px-5 lg:px-10 ${bottomSpacing}`}>
                    <VideoPlayer src={video.src} poster={video.poster} />
                </div>
            )}
            <div className="max-w-[1440px] mx-auto px-5 lg:px-10 w-full">
                {gallery?.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px] mb-[100px] ">
                        {gallery.map((item: any, i: number) => (
                            <div key={i} className={`relative overflow-hidden rounded-[0px] ${item.full ? 'col-span-1 lg:col-span-2' : ''}`}>
                                {item.video ? <video autoPlay loop muted playsInline className="w-full h-auto block rounded-[0x]"><source src={item.video} type="video/mp4"/></video> : <img src={item.img} className="w-full h-auto block rounded-[0px]" />}
                            </div>
                        ))}
                    </div>
                )}
                {children && <div className="w-full mb-[50px] flex justify-center">{children}</div>}
                
				{/* --- CREDITS SECTION --- */}
<div className="text-[20px] opacity-80 leading-[1.8] mb-[80px] max-w-[700px] ">
    <div className="mb-20 font-semibold text-[32px] leading-none opacity-80">
        Credits
    </div> 
    
    {credits.map((line: string, i: number) => (
        <p key={i} dangerouslySetInnerHTML={{__html: line}} />
    ))}
</div>


                <div className="pt-7 mb-28 flex justify-between text-[20px] sm:text-[22px] lg:text-[30px] font-medium opacity-80">
    <Link to={'/' + prev.link} className="flex items-center gap-2.5 opacity-100 hover:opacity-60 hover:-translate-y-0.5 transition-all">
        ← {prev.label}
    </Link>
    <Link to={'/' + next.link} className="flex items-center gap-2.5 opacity-100 hover:opacity-60 hover:-translate-y-0.5 transition-all">
        {next.label} 
        →
    </Link>
</div>
                <Footer />
            </div>
        </motion.div>
    );
};

// --- PROJECTS ---
// FIX: Updated ImageBlock for earlier trigger and faster animation
const ImageBlock = ({ src, alt, className = "", onClick }: any) => (
    <motion.div 
        className={`relative overflow-hidden rounded-[0px] bg-[#f5f5f5] ${onClick ? 'cursor-pointer' : ''} ${className}`} 
        onClick={onClick} 
        initial={{ opacity: 0, y: 50 }}  // Reduced y from 150 to 50
        whileInView={{ opacity: 1, y: 0 }} 
        viewport={{ once: true, amount: 0.1 }} // Changed margin to amount so it triggers as soon as 10% is visible
        transition={{ duration: 0.5, ease: "easeOut" }} // Reduced duration slightly
    >
        <img src={src} alt={alt} loading="lazy" className="w-full h-full object-cover block transition-transform duration-700 hover:scale-[1.02]" />
    </motion.div>
);

const ElfBar = ({ onOpenImage }: { onOpenImage: (src: string) => void }) => (
    <ProjectPage 
        title="Elf Bar Promotion" meta="Personal / 2022" 
        desc="A promotional video for Elf Bar, showcasing the sleek design and vibrant flavors of their disposable vapes. The project involved 3D modeling, texturing, and fluid simulations to visualize the smooth airflow and rich taste profile."
        video={{ src: 'https://video.f1nal.me/elfbar.mp4', poster: 'work/elfbar/img_18.png' }}
        gallery={[]} 
        credits={['<strong>Client:</strong> Elf Bar', '<strong>Role:</strong> 3D Motion Design', '<strong>Tools:</strong> Cinema 4d, Adobe Suite']}
        prev={{ label: 'LKT group', link: 'lkt' }} next={{ label: 'RadioOstrov', link: 'radiostrov' }}
    >
        <div className="flex flex-col gap-2 lg:gap-0 w-full mb-[0px]">
		    <div className="grid grid-cols-1 lg:grid-cols-1 gap-0 lg:gap-0">
            <ImageBlock src="work/elfbar/img_1.png" alt="Elf Bar Hero" onClick={() => onOpenImage('work/elfbar/img_1.png')} />
			<AnimBlock src="work/elfbar/anim_1.mp4" />
			<ImageBlock src="work/elfbar/img_19.png" alt="Elf Bar Hero" onClick={() => onOpenImage('work/elfbar/img_19.png')} />
			<ImageBlock src="work/elfbar/storyboard.jpg" alt="Close Up" onClick={() => onOpenImage('work/elfbar/storyboard.jpg')} /> 
		</div>
		
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-0 pb-[0px]">
                <ImageBlock src="work/elfbar/img_2.png" alt="Close Up" onClick={() => onOpenImage('work/elfbar/img_2.png')} />
                <ImageBlock src="work/elfbar/img_3.png" alt="Taste Profile" onClick={() => onOpenImage('work/elfbar/img_3.png')} />
				<ImageBlock src="work/elfbar/dev1.png" alt="Taste Profile" onClick={() => onOpenImage('work/elfbar/dev1.png')} />
				<ImageBlock src="work/elfbar/dev2.png" alt="Taste Profile" onClick={() => onOpenImage('work/elfbar/dev2.png')} />
				<ImageBlock src="work/elfbar/img_4.png" alt="Taste Profile" onClick={() => onOpenImage('work/elfbar/img_4.png')} />
				<ImageBlock src="work/elfbar/img_5.png" alt="Taste Profile" onClick={() => onOpenImage('work/elfbar/img_5.png')} />
            </div>
			
			<div className="grid grid-cols-3 lg:grid-cols-3 gap-0 lg:gap-0">
			<ImageBlock src="work/elfbar/img_6.png" alt="Close Up" onClick={() => onOpenImage('work/elfbar/img_6.png')} />
				<ImageBlock src="work/elfbar/img_8.png" alt="Taste Profile" onClick={() => onOpenImage('work/elfbar/img_8.png')} />
				<ImageBlock src="work/elfbar/img_9.png" alt="Taste Profile" onClick={() => onOpenImage('work/elfbar/img_9.png')} />
			</div>
			
			<AnimBlock src="work/elfbar/anim_2.mp4" />
			
            <ImageBlock src="work/elfbar/img_10.png" alt="Wide Shot" onClick={() => onOpenImage('work/elfbar/img_10.png')} />
			<ImageBlock src="work/elfbar/dev3.jpg" alt="Wide Shot" onClick={() => onOpenImage('work/elfbar/dev3.jpg')} />
			
			<div className="grid grid-cols-4 lg:grid-cols-2 gap-0 lg:gap-0">
			<ImageBlock src="work/elfbar/img_11.png" alt="Close Up" onClick={() => onOpenImage('work/elfbar/img_11.png')} />
                <ImageBlock src="work/elfbar/img_12.png" alt="Taste Profile" onClick={() => onOpenImage('work/elfbar/img_12.png')} />
				<ImageBlock src="work/elfbar/img_13.png" alt="Taste Profile" onClick={() => onOpenImage('work/elfbar/img_13.png')} />
				<ImageBlock src="work/elfbar/img_14.png" alt="Taste Profile" onClick={() => onOpenImage('work/elfbar/img_14.png')} />
				<ImageBlock src="work/elfbar/img_15.png" alt="Taste Profile" onClick={() => onOpenImage('work/elfbar/img_15.png')} />
				<ImageBlock src="work/elfbar/img_16.png" alt="Taste Profile" onClick={() => onOpenImage('work/elfbar/img_16.png')} />
				<ImageBlock src="work/elfbar/img_17.png" alt="Taste Profile" onClick={() => onOpenImage('work/elfbar/img_17.png')} />
				<ImageBlock src="work/elfbar/img_18.png" alt="Taste Profile" onClick={() => onOpenImage('work/elfbar/img_18.png')} />
		    </div>
			<AnimBlock src="work/elfbar/anim_3.mp4" />
			<div className="grid grid-cols-2 lg:grid-cols-1 gap-0 lg:gap-0">
                <ImageBlock src="work/elfbar/img_22.jpg" alt="Taste Profile" onClick={() => onOpenImage('work/elfbar/img_22.jpg')} />
				<ImageBlock src="work/elfbar/img_20.jpg" alt="Taste Profile" onClick={() => onOpenImage('work/elfbar/img_20.jpg')} />
			</div>
			
        </div>
    </ProjectPage>
);


const Radiostrov = ({ onOpenImage }: { onOpenImage: (src: string) => void }) => (
    <ProjectPage 
        title="RadioOstrov" 
        meta="Comercial / 2022"
        desc="RadioOstrov’s transition into video format. I focused on developing a versatile branding system that seamlessly integrates a new logo, broadcast motion graphics, and dynamic openers. By utilizing 3D visualization, I added depth and volume to the graphics, elevating the viewer experience for both educational and entertainment segments."
        video={{ src: 'https://video.f1nal.me/radioO.mp4', poster: '/img/radioO_preview.png' }}
        credits={['<strong>Client:</strong> Elf Bar', '<strong>Role:</strong> 3D Motion Design, SFX', '<strong>Tools:</strong> Cinema 4d, Redshift, Adobe Suite']}
        prev={{ label: 'Elf Bar', link: 'elfbar' }} 
        next={{ label: 'LKT group', link: 'lkt' }} 
    >
        <div className="flex flex-col gap-6 lg:gap-8 w-full mb-[60px]">
            {/* Секция с картинками */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-6 lg:gap-8">
                <ImageBlock src="work/radiostrov/img_1.jpg" alt="RadioOstrov 1" onClick={() => onOpenImage('work/radiostrov/img_1.jpg')} />
                <ImageBlock src="work/radiostrov/img_2.jpg" alt="RadioOstrov 2" onClick={() => onOpenImage('work/radiostrov/img_2.jpg')} />
            </div>

            <div className="grid grid-cols-2 gap-6 lg:gap-8">
			    <ImageBlock src="work/radiostrov/img_1.png" alt="RadioOstrov 3" onClick={() => onOpenImage('work/radiostrov/img_1.png')} />
			    <ImageBlock src="work/radiostrov/img_2.png" alt="RadioOstrov 3" onClick={() => onOpenImage('work/radiostrov/img_2.png')} />
                <ImageBlock src="work/radiostrov/img_3.png" alt="RadioOstrov 3" onClick={() => onOpenImage('work/radiostrov/img_3.png')} />
                <ImageBlock src="work/radiostrov/img_4.png" alt="RadioOstrov 4" onClick={() => onOpenImage('work/radiostrov/img_4.png')} />
				<ImageBlock src="work/radiostrov/img_5.png" alt="RadioOstrov 3" onClick={() => onOpenImage('work/radiostrov/img_5.png')} />
				<ImageBlock src="work/radiostrov/img_6.png" alt="RadioOstrov 3" onClick={() => onOpenImage('work/radiostrov/img_6.png')} />
            </div>

            {/* Новая анимация (Video loop) */}
            <AnimBlock src="work/radiostrov/anim_1.mp4" />
			<AnimBlock src="work/radiostrov/anim_2.mp4" />
			<AnimBlock src="work/radiostrov/anim_3.mp4" />
			<AnimBlock src="work/radiostrov/anim_4.mp4" />
			<AnimBlock src="work/radiostrov/anim_5.mp4" />
			<AnimBlock src="work/radiostrov/anim_6.mp4" />
			<AnimBlock src="work/radiostrov/anim_7.mp4" />
			<AnimBlock src="work/radiostrov/anim_8.mp4" />
			<AnimBlock src="work/radiostrov/anim_9.mp4" />
        </div>
    </ProjectPage>
);

// FIX: Added prop destructuring to fix Lkt image clicks
const Lkt = ({ onOpenImage }: { onOpenImage: (src: string) => void }) => (
    <ProjectPage 
        title="LKT group" meta="Comercial / 2024" 
        desc="For LKT Group, an international leader in industrial supply, my goal was to develop a seamless brand consistency across digital and print media. This project integrates photorealistic 3D visualizations of production lines with user-friendly web interfaces and detailed catalog layouts. It demonstrates my ability to merge technical precision with creative design to support global sales in sectors ranging from food processing to mining."
        gallery={[]} credits={['<strong>Client:</strong> LKT Company']}
        prev={{ label: 'RadioOstrov', link: 'radiostrov' }} next={{ label: 'PSO short animation', link: 'pso' }}
    >
	<div className="grid grid-cols-1 lg:grid-cols-1 gap-6 lg:gap-8">
                
                
            </div>
        <div className="flex flex-col gap-6 lg:gap-8 w-full mb-[60px]">
		   <ImageBlock src="work/lkt/img_1.png" alt="RadioOstrov 1" onClick={() => onOpenImage('work/lkt/img_1.png')} />
		    <PDFViewer pdfUrl="/pdfs/AWI_RU.pdf" />
			<PDFViewer pdfUrl="/pdfs/LKT_WERKE_RU.pdf" />
			<PDFViewer pdfUrl="/pdfs/GOLDENDIE_RU.pdf" />
			<PDFViewer pdfUrl="/pdfs/GOLDENMILL_RU.pdf" />
        </div>
    </ProjectPage>
);

const Pso = ({ onOpenImage }: { onOpenImage: (src: string) => void }) => (
    <ProjectPage 
        title="PSO short animation" 
        meta="Comercial / 2022"
        desc="A 3D-driven promotional scene recreating a fully detailed football stadium environment.
The project involved building the entire location from scratch — from the structural elements of the stands to the fine details of the goal net and pitch surface.
Work included complex 3D modeling, texturing, lighting setup, and character animation to bring a realistic sports atmosphere to life. Advanced lighting simulations were used to visualize both daytime and nighttime scenarios, emphasizing stadium illumination, material behavior, and overall mood."
        video={{ src: 'https://video.f1nal.me/pso.mp4', poster: 'work/pso/img_1.png' }}
        credits={['<strong>Client:</strong> Elf Bar', '<strong>Role:</strong> 3D Motion Design, SFX', '<strong>Tools:</strong> Cinema 4d, Redshift, Adobe Suite']}
        prev={{ label: 'LKT group', link: 'lkt' }} 
        next={{ label: 'Price auto', link: 'priceauto' }} 
    >
        <div className="flex flex-col gap-6 lg:gap-8 w-full mb-[60px]">
            {/* Секция с картинками */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-6 lg:gap-8">
                <ImageBlock src="work/pso/img_1.png" alt="RadioOstrov 1" onClick={() => onOpenImage('work/pso/img_1.png')} />
                <ImageBlock src="work/pso/img_2.jpg" alt="RadioOstrov 2" onClick={() => onOpenImage('work/pso/img_2.jpg')} />
            </div>
			<AnimBlock src="work/pso/anim_6.mp4" />
			<AnimBlock src="work/pso/anim_7.mp4" />
            <div className="grid grid-cols-2 gap-6 lg:gap-8">
                <ImageBlock src="work/pso/img_3.png" alt="RadioOstrov 3" onClick={() => onOpenImage('work/pso/img_3.png')} />
                <ImageBlock src="work/pso/img_4.png" alt="RadioOstrov 4" onClick={() => onOpenImage('work/pso/img_4.png')} />
            </div>

            {/* Новая анимация (Video loop) */}
            <AnimBlock src="work/pso/anim_2.mp4" />
			<AnimBlock src="work/pso/anim_3.mp4" />
			<AnimBlock src="work/pso/anim_4.mp4" />
			<AnimBlock src="work/pso/anim_5.mp4" />

        </div>
    </ProjectPage>
);

const Priceauto = ({ onOpenImage }: { onOpenImage: (src: string) => void }) => (
    <ProjectPage 
        title="Priceauto Intro" 
        meta="Comercial / 2022"
        desc="A sharp 3D intro created for Price Auto — a company specializing in custom car imports.
The animation features a dynamic reveal of the brand emblem with stylized katana elements, bold textures, and precise camera motion.

The project includes 3D modeling, texturing, lighting, and timeline-based animation in Cinema 4D.
The final sequence delivers a strong, memorable visual identity suitable for promo content and brand presentations."
        video={{ src: 'https://video.f1nal.me/price_auto_intro.mp4', poster: 'work/priceauto/pa_preview.png' }}
        credits={['<strong>Client:</strong> Price Auto', '<strong>Role:</strong> 3D Motion Design, SFX', '<strong>Tools:</strong> Cinema 4d, Redshift, Adobe Suite']}
        prev={{ label: 'PSO short animation', link: 'pso' }} 
        next={{ label: 'Stroy prosto', link: 'stroyprosto' }} 
    >
        <div className="flex flex-col gap-6 lg:gap-8 w-full mb-[60px]">
            {/* Секция с картинками */}

            {/* Секция с картинками */}
			
            <div className="grid grid-cols-2 lg:grid-cols-2 gap-6 lg:gap-8">	
                <ImageBlock src="work/priceauto/img_1.png" alt="RadioOstrov 1" onClick={() => onOpenImage('work/priceauto/img_1.png')} />
                <ImageBlock src="work/priceauto/img_2.png" alt="RadioOstrov 2" onClick={() => onOpenImage('work/priceauto/img_2.png')} />
				<ImageBlock src="work/priceauto/img_3.png" alt="RadioOstrov 2" onClick={() => onOpenImage('work/priceauto/img_3.png')} />
				<ImageBlock src="work/priceauto/img_4.png" alt="RadioOstrov 2" onClick={() => onOpenImage('work/priceauto/img_4.png')} />
            </div>

            {/* Новая анимация (Video loop) */}
            <AnimBlock src="work/priceauto/anim_1.mp4" />
			<AnimBlock src="work/priceauto/anim_2.mp4" />

        </div>
    </ProjectPage>
);

const Stroyprosto = ({ onOpenImage }: { onOpenImage: (src: string) => void }) => (
    <ProjectPage 
        title="Stroy prosto" 
        meta="Comercial / 2022"
        desc="A promotional 3D video created for СтройПросто, a construction company specializing in countryside house development.
The animation showcases a full 3D assembly of a modern house — from the foundation and rising structures to the completed exterior — supported by realistic materials, lighting, and smoke-based reveal effects.

The project includes architectural 3D modeling, texturing, lighting, and cinematic rendering designed to highlight the company’s product: turnkey homes with modern design and accessible mortgage options.
The final video serves as a clean, informative promo piece, combining realism, clarity, and brand-focused visuals for use in advertising and social media."
        video={{ src: 'https://video.f1nal.me/StroyProsto.mp4', poster: 'work/stroyprosto/stroyprosto.jpg' }}
        credits={['<strong>Client:</strong> Price Auto', '<strong>Role:</strong> 3D Motion Design, SFX', '<strong>Tools:</strong> Cinema 4d, Redshift, Adobe Suite']}
        prev={{ label: 'Price auto', link: 'priceauto' }} 
        next={{ label: 'Elf Bar', link: 'elfbar' }} 
    >
        <div className="flex flex-col gap-6 lg:gap-8 w-full mb-[60px]">
            {/* Секция с картинками */}
            
            {/* Секция с картинками */}
            <div className="grid grid-cols-2 lg:grid-cols-2 gap-6 lg:gap-8">
                <ImageBlock src="work/stroyprosto/img_1.jpg" alt="" onClick={() => onOpenImage('work/stroyprosto/img_1.jpg')} />
				<ImageBlock src="work/stroyprosto/img_1.png" alt="" onClick={() => onOpenImage('work/stroyprosto/img_1.png')} />
				<ImageBlock src="work/stroyprosto/img_2.png" alt="" onClick={() => onOpenImage('work/stroyprosto/img_2.png')} />
				<ImageBlock src="work/stroyprosto/img_3.png" alt="" onClick={() => onOpenImage('work/stroyprosto/img_3.png')} />
            </div>

            {/* Новая анимация (Video loop) */}
            <AnimBlock src="work/stroyprosto/anim_1.mp4" />

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

  // После загрузки компонента App, считаем, что сайт "загружен"
  useEffect(() => {
     // NOTE: hasIntitialLoaded logic removed as it was unused
  }, []);

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
					<Route path="/radiostrov" element={<Radiostrov onOpenImage={setPlayModalSrc} />} />
                    <Route path="/lkt" element={<Lkt onOpenImage={setPlayModalSrc} />} />
					<Route path="/pso" element={<Pso onOpenImage={setPlayModalSrc} />} />
					<Route path="/priceauto" element={<Priceauto onOpenImage={setPlayModalSrc} />} />
					<Route path="/stroyprosto" element={<Stroyprosto onOpenImage={setPlayModalSrc} />} />

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