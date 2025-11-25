import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { Play, Volume2, VolumeX, Maximize, ArrowUp, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// =========================================
// GLOBAL STYLES (Встроены для превью)
// =========================================
const GLOBAL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Funnel+Display:wght@400;500;600&display=swap');

/* Tailwind Base Reset (Simulated for preview) */
*, ::before, ::after { box-sizing: border-box; border-width: 0; border-style: solid; border-color: #e5e7eb; }
html { line-height: 1.5; -webkit-text-size-adjust: 100%; tab-size: 4; font-family: ui-sans-serif, system-ui, sans-serif; }
body { margin: 0; line-height: inherit; }

/* 1. Полное скрытие скроллбара при сохранении прокрутки */
html {
  overflow-y: scroll;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none;  /* IE 10+ */
}
html::-webkit-scrollbar { 
    width: 0px;
    background: transparent; /* Chrome/Safari/Webkit */
    display: none;
}

body {
  font-family: 'Funnel Display', sans-serif;
  background-color: #F7F7F7;
  color: #000;
  overflow-x: hidden;
}

html.is-animating body { opacity: 0; }
html.is-visited body { opacity: 1; transition: opacity 0.5s ease; }

.masonry-item {
  will-change: transform, opacity;
  backface-visibility: hidden;
}
`;

// =========================================
// UTILITIES
// =========================================

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

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const checkScroll = () => setIsVisible((window.scrollY || document.documentElement.scrollTop) > 300);
    window.addEventListener('scroll', checkScroll, { passive: true });
    return () => window.removeEventListener('scroll', checkScroll);
  }, []);

  return (
    <button 
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed bottom-10 right-10 w-[50px] h-[50px] bg-black rounded-full flex items-center justify-center z-50 transition-all duration-400 ease-out shadow-lg hover:-translate-y-1 hover:bg-[#1a1a1a] ${isVisible ? 'opacity-100 visible translate-y-0 scale-100' : 'opacity-0 invisible translate-y-5 scale-90'}`}
    >
      <ArrowUp size={24} stroke="white" strokeWidth={2} />
    </button>
  );
};

// =========================================
// COMPONENTS
// =========================================

const Header = ({ currentPage, navigate }: { currentPage: string, navigate: (page: string) => void }) => {
  const [menuActive, setMenuActive] = useState(false);
  const [animStart, setAnimStart] = useState(false);

  useEffect(() => { setTimeout(() => setAnimStart(true), 500); }, []);
  const handleNav = (page: string) => { setMenuActive(false); navigate(page); };

  const navLinkClasses = (page: string) => 
    `text-[22px] text-[#777] font-normal relative transition-colors duration-300 hover:text-black hover:-translate-y-1.5 inline-block transform transition-transform cursor-pointer 
    after:content-[''] after:absolute after:w-full after:h-[1px] after:bottom-0 after:left-0 after:bg-black after:scale-x-0 after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left
    ${currentPage === page ? 'text-black' : ''}`;

  return (
    <>
      <header className={`relative w-full pt-[30px] pb-[10px] bg-transparent z-[100] transition-all duration-[1500ms] ease-[cubic-bezier(0.19,1,0.22,1)] ${animStart ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-[30px]'}`}>
        <div className="flex items-center justify-between max-w-[1400px] mx-auto px-5 lg:px-10">
          <div className="block transition-transform duration-400 hover:-translate-y-1.5">
            <a onClick={() => handleNav('home')} className="cursor-pointer block">
              <img src="img/logo.svg" alt="Logo" className="h-[75px] w-auto block" onError={(e) => (e.currentTarget.src = 'https://placehold.co/150x75/transparent/000?text=LOGO')} />
            </a>
          </div>
          <nav className="hidden lg:block">
            <ul className="flex gap-10 list-none m-0 p-0">
              <li><a onClick={() => handleNav('home')} className={navLinkClasses('home')}>Work</a></li>
              <li><a onClick={() => handleNav('reel')} className={navLinkClasses('reel')}>Reel</a></li>
              <li><a onClick={() => handleNav('play')} className={navLinkClasses('play')}>Play</a></li>
              <li><a onClick={() => handleNav('info')} className={navLinkClasses('info')}>About</a></li>
            </ul>
          </nav>
          <button className="block lg:hidden bg-none border-none cursor-pointer z-[110]" onClick={() => setMenuActive(!menuActive)}>
            <div className="w-[25px] h-[2px] bg-black my-1.5"></div>
            <div className="w-[25px] h-[2px] bg-black my-1.5"></div>
            <div className="w-[25px] h-[2px] bg-black my-1.5"></div>
          </button>
        </div>
      </header>
      <div className={`fixed inset-0 bg-[#F7F7F7] z-[100] flex flex-col items-center justify-center transition-opacity duration-300 pointer-events-none opacity-0 lg:hidden ${menuActive ? 'opacity-100 pointer-events-auto' : ''}`}>
        <ul className="flex flex-col gap-10 text-center list-none p-0">
          {['home', 'reel', 'play', 'info'].map((item) => (
            <li key={item}>
              <a onClick={() => handleNav(item)} className="text-[32px] text-black capitalize cursor-pointer">{item === 'info' ? 'About' : item}</a>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

const Footer = () => (
  <motion.footer 
    className="pt-20 pb-10"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 1.0, duration: 0.8 }}
  >
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-[30px] gap-8 lg:gap-0">
      <div className="flex gap-[30px]">
        {['Behance', 'LinkedIn', 'Instagram'].map((link) => (
          <a key={link} href="#" target="_blank" rel="noreferrer" className="text-[20px] text-black relative pb-0.5 transition-all duration-300 hover:-translate-y-1.5 inline-block">
            {link}
          </a>
        ))}
      </div>
      <div className="text-[20px] text-black hover:-translate-y-1.5 transition-transform duration-300">
        <a href="mailto:shmarov.oleg@gmail.com">shmarov.oleg@gmail.com</a>
      </div>
    </div>
    <div className="w-full h-[1px] bg-black/15 mb-[30px]"></div>
    <div className="flex justify-between">
      <div className="text-[20px] text-black opacity-50">2025 | Oleg Shmarov®</div>
    </div>
  </motion.footer>
);

const VideoPlayer = ({ src, poster }: { src: string, poster?: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [uiHidden, setUiHidden] = useState(false);
  let inactivityTimeout: any = null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setUiHidden(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const toggleFullscreen = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    if ((videoRef.current as any).webkitEnterFullscreen) {
        (videoRef.current as any).webkitEnterFullscreen();
    } else if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100 || 0);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    videoRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * videoRef.current.duration;
  };

  const handleActivity = () => {
    setUiHidden(false);
    if (isPlaying) {
      clearTimeout(inactivityTimeout);
      inactivityTimeout = setTimeout(() => setUiHidden(true), 3000);
    }
  };

  return (
    <div 
      className={`group relative w-full aspect-video bg-black rounded-[18px] overflow-hidden shadow-lg cursor-default ${uiHidden ? 'cursor-none' : ''}`}
      ref={containerRef} onMouseMove={handleActivity} onClick={handleActivity} onDoubleClick={() => toggleFullscreen()}
    >
      <video 
        ref={videoRef} 
        className={`w-full h-full object-cover block transition-all duration-700 ${isPlaying ? 'opacity-100 blur-0' : 'opacity-30 blur-[10px]'}`}
        playsInline muted={isMuted} poster={poster} onClick={togglePlay} onTimeUpdate={handleTimeUpdate}
      >
        <source src={src} type="video/mp4" />
      </video>
      <div 
        className={`absolute inset-0 flex justify-center items-center bg-black/50 transition-all duration-300 z-10 ${isPlaying ? 'opacity-0 invisible' : 'opacity-100 visible'}`}
        onClick={togglePlay}
      >
        <button className="w-[100px] h-[100px] lg:w-[150px] lg:h-[150px] bg-white rounded-full flex items-center justify-center border-none cursor-pointer transition-transform hover:scale-110 shadow-[0_0_0_0_rgba(255,255,255,0.4)] animate-[pulse_2s_infinite]">
          <div className="pl-1.5"><Play fill="black" stroke="none" size={32} /></div>
        </button>
      </div>
      <div 
        className={`absolute bottom-0 left-0 w-full px-5 py-4 lg:px-8 lg:py-5 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300 flex items-center gap-5 z-20 ${uiHidden ? 'opacity-0' : 'opacity-100'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-grow h-5 flex items-center cursor-pointer group/seek" onMouseDown={handleSeek}>
          <div className="w-full h-1 bg-white/30 rounded-sm relative transition-all group-hover/seek:h-1.5">
            <div className="h-full bg-white rounded-sm relative" style={{ width: `${progress}%` }}>
              <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 transition-transform group-hover/seek:scale-100"></div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-white">
          <button className="opacity-80 hover:opacity-100 hover:scale-110 transition-all" onClick={toggleMute}>{isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}</button>
          <button className="opacity-80 hover:opacity-100 hover:scale-110 transition-all" onClick={(e) => toggleFullscreen(e)}><Maximize size={24} /></button>
        </div>
      </div>
    </div>
  );
};

// --- PAGE: HOME (WORK) ---
interface Project {
    id: string | number;
    title: string;
    category: string;
    video: string;
    img: string;
    link: string;
    isExternal?: boolean;
}

// --- КАРТОЧКА ПРОЕКТА ---
const ProjectCard = ({ project, navigate }: { project: any, navigate: (page: string) => void }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const isMobile = useIsMobile();

    // Логика для Мобильных: Play если в зоне видимости
    useEffect(() => {
        if (!isMobile || !videoRef.current || !containerRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        videoRef.current?.play().catch(() => {});
                        setIsHovered(true); // Скрываем картинку, показываем видео
                    } else {
                        videoRef.current?.pause();
                        setIsHovered(false);
                    }
                });
            },
            { threshold: 0.6 } // Срабатывает когда 60% карточки видно
        );

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [isMobile]);

    // Логика для Десктопа: Hover
    const handleMouseEnter = () => {
        if (isMobile) return;
        setIsHovered(true);
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => {
                    // Игнорируем ошибки автоплея
                });
            }
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
        if (!project.isExternal) {
            e.preventDefault();
            navigate(project.link);
        }
    };

    return (
        <a 
            href={project.isExternal ? project.link : undefined} 
            onClick={handleClick} 
            className="block w-full h-full"
        >
            <div 
                ref={containerRef}
                className="relative w-full rounded-[18px] overflow-hidden bg-black cursor-pointer group shadow-lg transform-gpu"
                style={{ minHeight: '400px' }} // ВЫСОТА УВЕЛИЧЕНА
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {/* Видео слой (Снизу) */}
                <div className="absolute inset-0 z-0">
                    <video 
                        ref={videoRef}
                        playsInline 
                        loop 
                        muted
                        className="w-full h-full object-cover block opacity-80 transition-opacity duration-500"
                    >
                        <source src={project.video} type="video/mp4" />
                    </video>
                </div>

                {/* Картинка слой (Сверху) - исчезает если isHovered=true */}
                <div 
                    className="absolute inset-0 z-10 transition-opacity duration-500 ease-in-out"
                    style={{ opacity: isHovered ? 0 : 1 }}
                >
                    <img 
                        src={project.img} 
                        alt={project.title} 
                        className="w-full h-full object-cover block"
                        loading="lazy" 
                        onError={(e) => e.currentTarget.style.display = 'none'}
                    />
                </div>

                {/* Текст (Скрыт по умолчанию на Desktop, виден на Mobile) */}
                <div className="absolute bottom-0 left-0 p-8 z-20 text-white pointer-events-none transition-opacity duration-500 lg:opacity-0 lg:group-hover:opacity-100">
                    <h3 className="text-[32px] lg:text-[38px] font-bold leading-none mb-1 drop-shadow-md">{project.title}</h3>
                    <p className="text-[16px] opacity-90 font-normal drop-shadow-md">{project.category}</p>
                </div>
            </div>
        </a>
    );
};

// --- WORK PAGE ---
const WorkPage = ({ navigate }: { navigate: (page: string) => void }) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement[]>([]);
  
  const initialProjects: Project[] = [
    { id: 1, title: 'Elf Bar', category: 'Commercial', video: 'vid/elf_preview.mp4', img: 'img/preview1.png', link: 'elfbar' },
    { id: 2, title: 'Football Dynamics', category: 'Personal', video: 'https://vpolitov.com/wp-content/uploads/2025/02/FD_thumbnail_01.mp4', img: 'https://vpolitov.com/wp-content/uploads/2025/01/fd_thumbnail_01.png', link: 'football-dynamics' },
    { id: 3, title: 'Puma Running AW24', category: 'Inertia Studios', video: 'https://vpolitov.com/wp-content/uploads/2025/02/Puma_thumbnail_01.mp4', img: 'https://vpolitov.com/wp-content/uploads/2025/01/magmax_thumbnail.png', link: 'puma-magmax' },
    { id: 4, title: 'SBER Creative Frame', category: 'Combine', video: 'https://vpolitov.com/wp-content/uploads/2025/03/SBER_CF_1-2.mp4', img: 'https://vpolitov.com/wp-content/uploads/2025/03/SB_thumbnail_03.png', link: 'sber-creative-frame' }
  ];
  
  const [projects, setProjects] = useState<any[]>(initialProjects);
  const [layoutReady, setLayoutReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchProject = async (id: number) => {
        const htmlPath = `project_${id}.html`;
        try {
            const response = await fetch(htmlPath);
            if (response.ok) {
                const text = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'text/html');
                const title = doc.title || `Project ${id}`;
                const categoryMeta = doc.querySelector('meta[name="category"]');
                const category = categoryMeta ? categoryMeta.getAttribute('content') || 'Work' : 'Work';
                return {
                    id: `auto-${id}`,
                    title: title,
                    category: category,
                    img: `img/project_${id}.jpg`,
                    video: `vid/project_${id}.mp4`,
                    link: htmlPath,
                    isExternal: true
                };
            }
        } catch {}
        return null;
    };

    // Строгая последовательная загрузка: если нет проекта N, прерываем
    const loadSequence = async () => {
        const maxChecks = 10; 
        for (let i = 5; i <= 5 + maxChecks; i++) {
            if (!isMounted) break;
            
            const project = await fetchProject(i);
            if (project) {
                setProjects(prev => {
                    if (prev.some(p => p.id === project.id)) return prev;
                    return [...prev, project];
                });
                await new Promise(r => setTimeout(r, 100)); 
            } else {
                // 2. Если проект N не существует, прекращаем поиск
                break;
            }
        }
    };

    loadSequence();

    return () => { isMounted = false; };
  }, []);

  const calculateLayout = useCallback(() => {
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
    if (!layoutReady) setTimeout(() => setLayoutReady(true), 100);
  }, [layoutReady]);

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
    <div className="max-w-[1400px] mx-auto px-5 lg:px-10 w-full">
        <div className="relative w-full mb-[120px]" ref={gridRef} style={{ opacity: layoutReady ? 1 : 0 }}>
            <AnimatePresence>
                {layoutReady && projects.map((p, i) => (
                    <motion.div
                        key={p.id}
                        className="masonry-item lg:absolute w-full lg:w-[calc(50%-11px)] mb-6 lg:mb-0"
                        initial={{ opacity: 0, y: 50 }} // Снизу
                        animate={{ opacity: 1, y: 0 }} // Вверх
                        transition={{ 
                            duration: 0.5, 
                            ease: "easeOut",
                            delay: 0.4 + (i * 0.2) // 0.4s старт, 0.2s шаг
                        }}
                        whileHover={{ scale: 1.02, transition: { duration: 0.4 } }}
                    >
                        <ProjectCard project={p} navigate={navigate} />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
        {layoutReady && <Footer />}
    </div>
  );
};

// --- PLAY PAGE ---
const PlayPage = () => {
  const [images, setImages] = useState<string[]>([]);
  const [modalSrc, setModalSrc] = useState<string | null>(null);
  
  useEffect(() => {
    let isMounted = true;
    const checkBatch = async (start: number, end: number) => {
        for (let i = start; i <= end; i++) {
            if (!isMounted) break;
            const src = `imgs/img_${i}.jpg`;
            const exists = await new Promise<boolean>((resolve) => {
                const img = new Image();
                img.onload = () => resolve(true);
                img.onerror = () => resolve(false);
                img.src = src;
            });

            if (exists) {
                setImages(prev => {
                    if (prev.includes(src)) return prev;
                    const unique = new Set([...prev, src]);
                    return Array.from(unique).sort((a, b) => parseInt(a.match(/\d+/)?.[0]||'0') - parseInt(b.match(/\d+/)?.[0]||'0'));
                });
            } else {
                // 2. Stop checking immediately if image missing
                break;
            }
        }
    };
    checkBatch(1, 30);
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto px-5 lg:px-10 w-full">
        <motion.div 
            className="flex flex-wrap justify-between items-end mb-[60px] gap-10"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
        >
            <div className="flex-1">
                <h1 className="text-[36px] lg:text-[48px] font-semibold leading-[1.1] mb-2.5 tracking-tight">Playground</h1>
                <div className="text-[16px] text-[#888] mt-2.5">Experiments & Styleframes</div>
            </div>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[30px] mb-[100px]">
            <AnimatePresence>
            {images.map((src, i) => (
                <motion.div 
                    key={src} 
                    className="relative rounded-[18px] overflow-hidden bg-black cursor-pointer"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 + (i * 0.1) }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setModalSrc(src)}
                >
                    {/* 4. Картинка всегда заполняет карточку */}
                    <img src={src} alt={`Experiment ${i}`} className="w-full h-auto block object-contain" />
                </motion.div>
            ))}
            </AnimatePresence>
        </div>
        {modalSrc && (
            <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[10000] flex items-center justify-center" onClick={() => setModalSrc(null)}>
                <img src={modalSrc} alt="Full size" className="max-w-[85%] max-h-[85vh] object-contain rounded-xl" onClick={(e) => e.stopPropagation()} />
            </div>
        )}
        <Footer />
    </div>
  );
};

// --- REEL PAGE ---
const ReelPage = () => (
    <motion.div 
        className="w-full"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="max-w-[1400px] mx-auto px-5 lg:px-10 w-full">
        <motion.div 
            className="flex flex-wrap justify-between items-end mb-[60px] gap-10"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="flex-1 min-w-[300px]">
            <h1 className="text-[36px] lg:text-[48px] font-semibold leading-[1.1] mb-2.5 tracking-tight">Showreel 2022</h1>
            <div className="text-[16px] text-[#888] mt-2.5">Selected Works</div>
          </div>
        </motion.div>
      </div>
      <div className="w-full max-w-[1400px] mx-auto px-5 lg:px-10 mb-[100px]">
        <VideoPlayer src="https://video.f1nal.me/showreel2022.mp4" poster="img/preview1.png" />
      </div>
      <div className="max-w-[1400px] mx-auto px-5 lg:px-10 w-full"><Footer /></div>
    </motion.div>
);

// --- ABOUT PAGE ---
const AboutPage = () => (
    <motion.div 
        className="max-w-[1400px] mx-auto px-5 lg:px-10 w-full"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
    >
        <div className="flex flex-col lg:flex-row justify-between items-start gap-[60px] mb-[60px]">
            <div className="flex-none w-full lg:w-[40%] max-w-[500px]">
                <img src="img/me.png" alt="Vladimir Politov" className="w-full h-auto rounded-[18px] grayscale hover:grayscale-0 transition-all duration-500" onError={(e) => e.currentTarget.src = 'https://placehold.co/500x600/ccc/000?text=Vladimir'} />
            </div>
            <div className="flex-1 pt-5">
                <div className="text-[18px] lg:text-[24px] leading-[1.5]">
                    <p className="mb-6">Hi! My name is Vladimir Politov. I am a 3D artist and motion designer with a deep interest in animation and visual development.</p>
                    <p className="mb-6">My career began in the television industry, where I worked with large companies performing a wide range of tasks that gave me valuable experience and versatile skills.</p>
                    <p>Now I work on freelance projects and cooperate with leading studios to create projects of various sizes and complexities.</p>
                </div>
            </div>
        </div>
        <div className="w-full h-[1px] bg-black/15 my-[60px]" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[60px] mb-[80px]">
            <div>
                <div className="mb-10">
                    <h3 className="text-[18px] font-bold underline uppercase tracking-wider mb-4">Software</h3>
                    <p className="text-[18px] leading-relaxed text-[#222]">Cinema 4D, Redshift, Adobe Creative Suite, Houdini (beginner).</p>
                </div>
                <div className="mb-10">
                    <h3 className="text-[18px] font-bold underline uppercase tracking-wider mb-4">Social Media</h3>
                    <div className="flex gap-5">
                        {['Instagram', 'Behance', 'LinkedIn'].map(l => (
                            <a key={l} href="#" className="text-[18px] hover:opacity-60 transition-opacity">{l}</a>
                        ))}
                    </div>
                </div>
            </div>
            <div>
                <div className="mb-10">
                    <h3 className="text-[18px] font-bold underline uppercase tracking-wider mb-4">Awards</h3>
                    <ul className="list-none p-0 space-y-4">
                        <li className="text-[18px] text-[#222]">Promax Awards 2021 - Best internal marketing - Gold // TNT Design Showreel</li>
                        <li className="text-[18px] text-[#222]">World Brand Design Awards 2023 / UK - Bronze // Gravix glue</li>
                        <li className="text-[18px] text-[#222]">Dieline Awards 2023 / USA - Silver // Gravix glue</li>
                    </ul>
                </div>
                <div className="mb-10">
                    <h3 className="text-[18px] font-bold underline uppercase tracking-wider mb-4">For work inquiries, please contact at:</h3>
                    <p className="text-[18px]"><a href="mailto:politovcg@gmail.com" className="hover:opacity-60 transition-opacity">politovcg@gmail.com</a></p>
                </div>
            </div>
        </div>
        <Footer />
    </motion.div>
);

// --- OTHER PAGES (UNCHANGED) ---
const ProjectPage = ({ title, meta, desc, video, gallery, credits, prev, next, navigate }: any) => {
    return (
        <div className="w-full">
            <div className="max-w-[1400px] mx-auto px-5 lg:px-10 w-full">
                <div className="flex flex-wrap justify-between items-end mb-[60px] gap-10">
                    <div className="flex-1 min-w-[300px]">
                        <h1 className="text-[36px] lg:text-[48px] font-semibold leading-[1.1] mb-2.5 tracking-tight text-black">{title}</h1>
                        <div className="text-[16px] text-[#888] mt-2.5">{meta}</div>
                    </div>
                    <div className="flex-none w-full lg:w-[45%] min-w-[300px]">
                        <p className="text-[16px] leading-[1.6] text-black" dangerouslySetInnerHTML={{__html: desc}} />
                    </div>
                </div>
            </div>
            {video && (
                <div className="w-full max-w-[1400px] mx-auto px-5 lg:px-10 mb-[100px]">
                    <VideoPlayer src={video.src} poster={video.poster} />
                </div>
            )}
            <div className="max-w-[1400px] mx-auto px-5 lg:px-10 w-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px] mb-[100px]">
                    {gallery.map((item: any, i: number) => (
                        <div key={i} className={`relative overflow-hidden rounded-[18px] ${item.full ? 'col-span-1 lg:col-span-2' : ''}`}>
                            {item.video ? (
                                <video autoPlay loop muted playsInline className="w-full h-auto block rounded-[18px]"><source src={item.video} type="video/mp4"/></video>
                            ) : (
                                <img src={item.img} alt="Gallery" className="w-full h-auto block rounded-[18px]" />
                            )}
                        </div>
                    ))}
                </div>
                <div className="text-[20px] text-[#555] leading-[1.8] mb-[80px] max-w-[700px]">
                    {credits.map((line: string, i: number) => <p key={i} dangerouslySetInnerHTML={{__html: line}} />)}
                </div>
                <div className="border-t border-black/10 pt-10 mb-20 flex justify-between text-[20px] font-medium">
                    <a onClick={() => navigate(prev.link)} className="flex items-center gap-2.5 opacity-100 hover:opacity-60 hover:-translate-y-0.5 transition-all cursor-pointer">
                        <ArrowLeft size={18} /> {prev.label}
                    </a>
                    <a onClick={() => navigate(next.link)} className="flex items-center gap-2.5 opacity-100 hover:opacity-60 hover:-translate-y-0.5 transition-all cursor-pointer">
                        {next.label} <ArrowRight size={18} />
                    </a>
                </div>
                <Footer />
            </div>
        </div>
    );
};

const ElfBar = ({ navigate }: any) => (
    <ProjectPage 
        navigate={navigate}
        title="ELF BAR Promotion Video"
        meta="Commercial / 2022"
        desc="A promotional video for Elf Bar, showcasing the sleek design and vibrant flavors of their disposable vapes."
        video={{ src: 'https://video.f1nal.me/elfbar.mp4', poster: 'img/preview1.png' }}
        gallery={[{ img: 'https://placehold.co/700x700/111/FFF?text=Elf+Bar+Flavor+1' }, { img: 'https://placehold.co/700x700/222/FFF?text=Elf+Bar+Flavor+2' }, { img: 'https://placehold.co/1400x788/333/FFF?text=Wide+Shot+Render', full: true }]}
        credits={['<strong>Client:</strong> Elf Bar', '<strong>Role:</strong> 3D Motion Design']}
        prev={{ label: 'SBER Creative Frame', link: 'sber-creative-frame' }}
        next={{ label: 'Football Dynamics', link: 'football-dynamics' }}
    />
);

const FootballDynamics = ({ navigate }: any) => (
    <ProjectPage 
        navigate={navigate}
        title="Football Dynamics"
        meta="Personal Project / 2025"
        desc="An exploration of motion and energy within the context of sports."
        gallery={[{ video: 'https://vpolitov.com/wp-content/uploads/2025/02/FD_thumbnail_01.mp4', full: true }, { img: 'https://vpolitov.com/wp-content/uploads/2025/01/fd_thumbnail_01.png' }]}
        credits={['<strong>Design & Animation:</strong> Oleg Shmarov']}
        prev={{ label: 'ELF BAR', link: 'elfbar' }}
        next={{ label: 'Puma Running AW24', link: 'puma-magmax' }}
    />
);

const Puma = ({ navigate }: any) => (
    <ProjectPage 
        navigate={navigate}
        title="Puma Running AW24"
        meta="Studio: Inertia Studios / 2024"
        desc="Highlighting the technology behind Puma's new MagMax series."
        gallery={[{ video: 'https://vpolitov.com/wp-content/uploads/2025/02/Puma_thumbnail_01.mp4', full: true }, { img: 'https://vpolitov.com/wp-content/uploads/2025/01/magmax_thumbnail.png' }]}
        credits={['<strong>Studio:</strong> Inertia Studios', '<strong>Role:</strong> 3D Motion Designer', '<strong>Client:</strong> Puma']}
        prev={{ label: 'Football Dynamics', link: 'football-dynamics' }}
        next={{ label: 'SBER Creative Frame', link: 'sber-creative-frame' }}
    />
);

const Sber = ({ navigate }: any) => (
    <ProjectPage 
        navigate={navigate}
        title="SBER Creative Frame"
        meta="Combine"
        desc="In 2020, Sber completely changed its positioning, removing the 'bank' label."
        gallery={[{ video: 'https://vpolitov.com/wp-content/uploads/2025/03/SBER_CF_1-2.mp4', full: true }, { img: 'https://vpolitov.com/wp-content/uploads/2025/03/SB_thumbnail_03.png' }]}
        credits={['<strong>Art Direction & Design:</strong> Oleg Shmarov']}
        prev={{ label: 'Puma Running AW24', link: 'puma-magmax' }}
        next={{ label: 'ELF BAR', link: 'elfbar' }}
    />
);

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  
  const renderPage = () => {
    switch(currentPage) {
      case 'home': return <WorkPage navigate={setCurrentPage} />;
      case 'reel': return <ReelPage />;
      case 'play': return <PlayPage />;
      case 'info': return <AboutPage />;
      case 'elfbar': return <ElfBar navigate={setCurrentPage} />;
      case 'football-dynamics': return <FootballDynamics navigate={setCurrentPage} />;
      case 'puma-magmax': return <Puma navigate={setCurrentPage} />;
      case 'sber-creative-frame': return <Sber navigate={setCurrentPage} />;
      default: return <WorkPage navigate={setCurrentPage} />;
    }
  };

  useEffect(() => { window.scrollTo(0, 0); }, [currentPage]);
  useIntroAnimation();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLES }} />
      <div className="min-h-screen w-full flex flex-col">
        <Header currentPage={currentPage} navigate={setCurrentPage} />
        <main id="content-holder" className="flex-grow pt-[60px] relative">
             {/* 3. Анимация переходов между страницами */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentPage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="w-full flex-grow"
                >
                    {renderPage()}
                </motion.div>
            </AnimatePresence>
        </main>
        <ScrollToTop />
      </div>
    </>
  );
}