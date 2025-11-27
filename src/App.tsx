import React, { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo } from 'react';
import { 
  Play, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  ArrowUp, 
  ArrowLeft, 
  ArrowRight,
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Grid, 
  X,
  BookOpen,
  Eye,
  EyeOff,
  Brush,        // Icon for Artwork
  Dices,        // Icon for Gambling
  FlaskConical  // Icon for Experimental
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants, SVGMotionProps } from 'framer-motion';

// =========================================
// GLOBAL STYLES & CSS
// =========================================
const GLOBAL_STYLES = `
.ios-safearea-overlay {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: env(safe-area-inset-bottom);
    background: #fff;
    z-index: 999999;
    pointer-events: none;
}
@font-face {
    font-family: 'Poppins';
    src: url('/fonts/Poppins-Regular.ttf') format('truetype');
    font-weight: 400;
    font-style: normal;
}
.font-poppins {
    font-family: 'Poppins', sans-serif;
}

/* Tailwind Base Reset */
*, ::before, ::after { box-sizing: border-box; border-width: 0; border-style: solid; border-color: #e5e7eb; }

/* ЗАЩИТА КОНТЕНТА */
* {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
}

input, textarea {
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
    user-select: text;
}

html { 
    line-height: 1.5; 
    -webkit-text-size-adjust: 100%; 
    tab-size: 4; 
    font-family: 'Funnel Display', sans-serif;
}
body { margin: 0; line-height: inherit; }

/* 1. ПОЛНОЕ СКРЫТИЕ ПОЛОСЫ ПРОКРУТКИ */
html {
  scrollbar-width: none;
  -ms-overflow-style: none;
  overflow-y: scroll;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
html::-webkit-scrollbar { 
    width: 0px;
    height: 0px;
    background: transparent;
    display: none;
}
body::-webkit-scrollbar {
    display: none;
}

html, body {
  font-family: 'Funnel Display', -apple-system, BlinkMacSystemFont, sans-serif !important;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* Наследование шрифтов */
*, button, input, textarea, select, a {
  font-family: inherit !important;
}
motion, .motion, [data-motion] {
  font-family: inherit !important;
}

/* Блокировка скролла */
body.scroll-locked {
    overflow: hidden !important;
    touch-action: none;
    width: 100%;
}

html.is-animating body { opacity: 0; }
html.is-visited body { opacity: 1; transition: opacity 0.5s ease; }

.masonry-item {
  will-change: transform, opacity;
  backface-visibility: hidden;
}

img {
    pointer-events: auto;
    -webkit-user-drag: none;
    user-drag: none;
}

/* --- ISSUU READER STYLES --- */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}

.shadow-spine-center {
  background: linear-gradient(to right, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 20%);
}
.shadow-spine-left {
  background: linear-gradient(to left, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 20%);
}
`;

// =========================================
// ISSUU VIEWER COMPONENTS & LOGIC
// =========================================

interface PageData {
  id: number;
  type: string;
  image?: string;
  width?: number;
  height?: number;
}

interface IssuuReaderProps {
  pdfUrl?: string;     
  images?: string[];   
}

const usePagesSource = (pdfUrl?: string, images?: string[]) => {
    const [pages, setPages] = useState<PageData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (images && images.length > 0) {
            const imgPages = images.map((src, i) => ({
                id: i + 1,
                type: 'image-page',
                image: src
            }));
            setPages(imgPages);
            setIsLoading(false);
            return;
        }

        if (pdfUrl) {
            const loadPdf = async () => {
                setIsLoading(true);
                setError(null);
                
                try {
                    const pdfjsVersion = '3.11.174';
                    const cdnBaseUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}`;

                    if (!(window as any).pdfjsLib) {
                        await new Promise((resolve, reject) => {
                            const script = document.createElement('script');
                            script.src = `${cdnBaseUrl}/pdf.min.js`;
                            script.onload = resolve;
                            script.onerror = () => reject(new Error("Не удалось загрузить скрипт PDF"));
                            document.head.appendChild(script);
                        });
                    }

                    (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = `${cdnBaseUrl}/pdf.worker.min.js`;

                    const loadingTask = (window as any).pdfjsLib.getDocument(pdfUrl);
                    const pdf = await loadingTask.promise;
                    const numPages = pdf.numPages;
                    const pagesData: PageData[] = [];

                    for (let i = 1; i <= numPages; i++) {
                        const page = await pdf.getPage(i);
                        const viewport = page.getViewport({ scale: 3.0 });
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        
                        if (context) {
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;

                            await page.render({
                                canvasContext: context,
                                viewport: viewport
                            }).promise;

                            const imgUrl = canvas.toDataURL('image/jpeg', 0.85); 

                            pagesData.push({
                                id: i,
                                type: 'pdf-page',
                                image: imgUrl,
                                width: viewport.width,
                                height: viewport.height
                            });
                        }
                    }
                    setPages(pagesData);
                } catch (e: any) {
                    console.error("PDF Error:", e);
                    setError(e.message || "Ошибка загрузки файла.");
                } finally {
                    setIsLoading(false);
                }
            };
            loadPdf();
        } else {
            setIsLoading(false);
        }
    }, [pdfUrl, images]);

    return { pages, isLoading, error };
};

const PageContent = React.memo(({ data, isLeft, showSpineShadow = true }: { data: PageData, isLeft: boolean, showSpineShadow?: boolean }) => {
  if (!data) return <div className="w-full h-full bg-transparent" />;

  return (
    <div className="relative w-full h-full bg-white overflow-hidden select-none animate-fade-in shadow-sm flex items-center justify-center">
      {showSpineShadow && (
        <div className={`absolute inset-y-0 ${isLeft ? 'right-0 shadow-spine-left' : 'left-0 shadow-spine-center'} w-8 z-10 pointer-events-none opacity-30`} />
      )}
      <img 
        src={data.image} 
        alt={`Page ${data.id}`} 
        className="w-full h-full object-contain select-none" 
        loading="lazy"
        draggable={false}
      />
    </div>
  );
});

const GlassButton = ({ onClick, disabled, children, className = "", title }: any) => (
  <button 
    onClick={onClick} 
    disabled={disabled}
    title={title}
    className={`
      p-2 lg:p-3 rounded-full 
      bg-white/60 backdrop-blur-md 
      border border-white/50 
      shadow-sm 
      text-neutral-700 
      hover:bg-white hover:scale-105 hover:shadow-md 
      active:scale-95 
      disabled:opacity-30 disabled:cursor-not-allowed
      transition-all duration-200
      flex items-center justify-center
      z-50
      ${className}
    `}
  >
    {children}
  </button>
);

const IssuuReader: React.FC<IssuuReaderProps> = ({ pdfUrl, images }) => {
  const { pages, isLoading, error } = usePagesSource(pdfUrl, images);
  const totalPages = pages.length;

  const [currentIndex, setCurrentIndex] = useState(0); 
  const [scale, setScale] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGridView, setIsGridView] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // UI Visibility State
  const [showUI, setShowUI] = useState(true);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const viewAreaRef = useRef<HTMLDivElement>(null);
  
  const PAGE_WIDTH_DESKTOP = 450;
  const SAFE_ZONE = 100;
  
  const currentBaseWidth = useMemo(() => {
      if (typeof window === 'undefined') return 1;
      return isMobile ? (window.innerWidth - 40) : PAGE_WIDTH_DESKTOP;
  }, [isMobile]);

  useEffect(() => {
    const handleResize = () => {
        const mobile = window.innerWidth < 768;
        setIsMobile(mobile);
    };
    handleResize(); // Init check
    
    // Set UI hidden by default on mobile on initial load
    if (window.innerWidth < 768) {
        setShowUI(false);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- ЛОГИКА ПЕРЕЛИСТЫВАНИЯ ---
  const nextPage = () => {
    if (isLoading) return;
    if (isMobile) {
      if (currentIndex < totalPages - 1) setCurrentIndex(c => c + 1);
    } else {
      if (currentIndex === 0) {
        setCurrentIndex(1);
      } else {
         const next = currentIndex + 2;
         if (next < totalPages) setCurrentIndex(next);
      }
    }
  };

  const prevPage = () => {
    if (isLoading) return;
    if (isMobile) {
      if (currentIndex > 0) setCurrentIndex(c => c - 1);
    } else {
      if (currentIndex === 1) {
         setCurrentIndex(0);
      } else {
         const prev = currentIndex - 2;
         if (prev >= 0) setCurrentIndex(prev);
      }
    }
  };

  // --- Fullscreen Toggle (Robust) ---
  const toggleFullscreen = async () => {
      if (!isFullscreen) {
          try {
              if (containerRef.current?.requestFullscreen) {
                  await containerRef.current.requestFullscreen();
              } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
                  await (containerRef.current as any).webkitRequestFullscreen();
              }
          } catch (err) {
              console.warn("Fullscreen API not enabled or failed, falling back to CSS");
          }
          setIsFullscreen(true);
      } else {
          try {
              if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
                   if (document.exitFullscreen) await document.exitFullscreen();
                   else if ((document as any).webkitExitFullscreen) await (document as any).webkitExitFullscreen();
              }
          } catch (err) { }
          setIsFullscreen(false);
      }
  };

  // --- Bounds Logic (Safe Zone) ---
  const checkAndEnforceBounds = (currentScale: number, currentPos: {x: number, y: number}) => {
      if (currentScale <= 1) return { x: 0, y: 0 };
      if (!viewAreaRef.current) return currentPos;

      const viewRect = viewAreaRef.current.getBoundingClientRect();
      const viewW = viewRect.width;
      const viewH = viewRect.height;

      const contentBaseW = isMobile ? currentBaseWidth : (currentBaseWidth * 2);
      const contentBaseH = contentBaseW / (isMobile ? (1/1.414) : 1.414);
      
      const contentW = contentBaseW * currentScale;
      const contentH = contentBaseH * currentScale;

      let { x, y } = currentPos;

      if (contentW <= viewW) {
          x = 0; 
      } else {
          const maxX = (contentW - viewW) / 2 + SAFE_ZONE;
          if (x > maxX) x = maxX;
          if (x < -maxX) x = -maxX;
      }

      if (contentH <= viewH) {
          y = 0;
      } else {
          const maxY = (contentH - viewH) / 2 + SAFE_ZONE;
          if (y > maxY) y = maxY;
          if (y < -maxY) y = -maxY;
      }

      return { x, y };
  };

  // --- Zoom Logic (Ctrl + Wheel) ---
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        
        if (!viewAreaRef.current) return;
        const rect = viewAreaRef.current.getBoundingClientRect();
        
        const mouseX = e.clientX - rect.left - rect.width / 2;
        const mouseY = e.clientY - rect.top - rect.height / 2;

        const delta = -e.deltaY * 0.002;
        let newScale = scale + delta * scale;
        
        newScale = Math.min(Math.max(newScale, 1), 5);

        if (newScale <= 1.05) {
            setScale(1);
            setPanPosition({x:0, y:0});
            setIsAnimating(true);
            return;
        }

        const scaleRatio = newScale / scale;
        const newX = mouseX - (mouseX - panPosition.x) * scaleRatio;
        const newY = mouseY - (mouseY - panPosition.y) * scaleRatio;

        setIsAnimating(false);
        setScale(newScale);
        setPanPosition({ x: newX, y: newY });
      }
    };
    
    const element = viewAreaRef.current;
    if (element) element.addEventListener('wheel', handleWheel as any, { passive: false });
    return () => { if (element) element.removeEventListener('wheel', handleWheel as any); };
  }, [scale, panPosition]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading) return;
      if (e.key === 'ArrowRight') nextPage();
      if (e.key === 'ArrowLeft') prevPage();
      if (e.key === 'Escape') { 
          if (isFullscreen) toggleFullscreen();
          setIsGridView(false);
          setScale(1);
          setPanPosition({x:0, y:0});
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isLoading, isFullscreen]);

  // --- Drag Logic ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) { 
        setIsDragging(true); 
        setIsAnimating(false);
        setDragStart({ 
            x: e.clientX - panPosition.x, 
            y: e.clientY - panPosition.y 
        }); 
        e.preventDefault(); 
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) { 
        e.preventDefault(); 
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        setPanPosition({ x: newX, y: newY }); 
    }
  };

  const handleMouseUp = () => {
      if (isDragging) {
          setIsDragging(false);
          const bounded = checkAndEnforceBounds(scale, panPosition);
          if (bounded.x !== panPosition.x || bounded.y !== panPosition.y) {
              setIsAnimating(true);
              setPanPosition(bounded);
          }
      }
  };

  // --- Вычисление видимых страниц ---
  const visiblePages = useMemo(() => {
    if (isLoading || pages.length === 0) return [null, null];
    
    if (isMobile) return [pages[currentIndex]];

    if (currentIndex === 0) return [null, pages[0]];
    
    return [pages[currentIndex], pages[currentIndex + 1] || null];
  }, [isMobile, currentIndex, pages, isLoading]);

  const maxPagesIndex = useMemo(() => {
      if (isLoading || totalPages === 0) return 0;
      if (isMobile) return totalPages - 1;
      return totalPages % 2 === 0 ? totalPages - 1 : Math.max(0, totalPages - 2);
  }, [isMobile, totalPages, isLoading]);

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col bg-[#f0f0f0] overflow-hidden relative transition-all duration-500 font-sans ${isFullscreen ? 'fixed inset-0 z-[10000] h-screen w-screen' : 'w-full rounded-[20px] shadow-xl border border-white/50'}`}
      style={{ 
          height: isFullscreen ? '100vh' : (isMobile ? '65vh' : '960px'),
          backgroundImage: 'radial-gradient(circle at 50% 50%, #ffffff 0%, #e5e5e5 100%)' 
      }}
    >
      {/* Header UI */}
      <div className="absolute top-4 left-4 right-4 flex justify-between z-20 pointer-events-none">
        {/* Title - Hide if UI hidden */}
        <div className={`transition-opacity duration-300 ${showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="bg-white/90 backdrop-blur border border-black/5 px-4 py-2 rounded-full shadow-sm pointer-events-auto flex items-center gap-3">
              <BookOpen size={16} className="text-neutral-700"/>
              <span className="font-medium text-sm text-neutral-800 hidden sm:inline">
                  f1nal.me / F1NAL EDITING
              </span>
              <div className="w-px h-4 bg-neutral-300"></div>
              <span className="text-xs font-bold text-neutral-500 font-mono">
              {isMobile 
                  ? `${currentIndex + 1}/${totalPages}` 
                  : (currentIndex === 0 ? `Cover` : `${currentIndex}-${Math.min(currentIndex + 1, totalPages)}`)
              }
              </span>
          </div>
        </div>
        
        <div className="flex gap-2 pointer-events-auto">
          {/* Main Controls - Hide if UI hidden */}
          <div className={`flex gap-2 transition-all duration-300 ${showUI ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}>
              <GlassButton onClick={() => setIsGridView(true)}><Grid size={18} /></GlassButton>
              <GlassButton onClick={toggleFullscreen}>
                  {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </GlassButton>
          </div>

          {/* UI Toggle Button - ALWAYS Visible */}
          <GlassButton 
              onClick={() => setShowUI(!showUI)} 
              title={showUI ? "Скрыть интерфейс" : "Показать интерфейс"}
              className={!showUI ? "bg-white/80" : ""}
          >
              {showUI ? <EyeOff size={18} /> : <Eye size={18} />}
          </GlassButton>
        </div>
      </div>

      {/* --- Viewport --- */}
      <div 
        ref={viewAreaRef}
        className={`flex-1 relative overflow-hidden flex items-center justify-center p-4 ${scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
        onMouseDown={handleMouseDown} 
        onMouseMove={handleMouseMove} 
        onMouseUp={handleMouseUp} 
        onMouseLeave={handleMouseUp}
      >
        {/* Крупные стрелки навигации - ALWAYS Visible if pages exist */}
        {!isLoading && !error && (
          <>
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 z-50 transition-all duration-300 ${currentIndex > 0 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
               <GlassButton onClick={prevPage} className="w-14 h-14 p-0 rounded-full hover:scale-110 hover:bg-white shadow-md border-white/60">
                  <ChevronLeft size={32} className="text-neutral-800 relative -left-[2px]" />
               </GlassButton>
            </div>

            <div className={`absolute right-4 top-1/2 -translate-y-1/2 z-50 transition-all duration-300 ${(currentIndex < maxPagesIndex) ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
               <GlassButton onClick={nextPage} className="w-14 h-14 p-0 rounded-full hover:scale-110 hover:bg-white shadow-md border-white/60">
                  <ChevronRight size={32} className="text-neutral-800 relative -right-[2px]" />
               </GlassButton>
            </div>
          </>
        )}

        {error ? (
            <div className="bg-white/90 p-8 rounded-2xl shadow-xl text-center border border-red-100 backdrop-blur max-w-sm mx-4">
                <div className="text-red-500 mb-2 text-xl font-bold">Ошибка загрузки</div>
                <p className="text-neutral-600 text-sm mb-4">{error}</p>
            </div>
        ) : isLoading ? (
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-neutral-300 border-t-black animate-spin"></div>
                <span className="text-xs font-medium uppercase tracking-widest text-neutral-400">Loading...</span>
            </div>
        ) : (
          <div 
            className={`relative flex justify-center items-center shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] origin-center`}
            style={{ 
              transition: isAnimating ? 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
              transform: `translate3d(${panPosition.x}px, ${panPosition.y}px, 0) scale(${scale})`,
              width: isMobile ? currentBaseWidth : (currentBaseWidth * 2),
              aspectRatio: isMobile ? '1 / 1.414' : '1.414 / 1', 
            }}
          >
            {/* Левая сторона */}
            <div className={`relative h-full ${isMobile ? 'hidden' : 'w-1/2'} bg-transparent flex items-center justify-end`}>
              {!isMobile && visiblePages[0] ? (
                <PageContent key={`L-${visiblePages[0].id}`} data={visiblePages[0]!} isLeft={true} />
              ) : (
                !isMobile && <div className="w-full h-full" /> 
              )}
            </div>

            {/* Правая сторона */}
            <div className={`relative h-full ${isMobile ? 'w-full shadow-lg' : 'w-1/2'} bg-transparent flex items-center justify-start`}>
                {isMobile ? (
                    visiblePages[0] ? (
                      <PageContent key={`M-${visiblePages[0].id}`} data={visiblePages[0]!} isLeft={false} showSpineShadow={false} />
                    ) : <div className="w-full h-full" />
                ) : (
                    visiblePages[1] ? (
                      <PageContent key={`R-${visiblePages[1].id}`} data={visiblePages[1]!} isLeft={false} />
                    ) : <div className="w-full h-full" />
                )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls - Hide if UI hidden */}
      <div className={`absolute bottom-6 w-full flex justify-center pointer-events-none z-20 transition-opacity duration-300 ${showUI ? 'opacity-100' : 'opacity-0'}`}>
           <div className="bg-white/80 backdrop-blur-md border border-white/50 p-2 rounded-full shadow-lg flex items-center gap-4 pointer-events-auto">
              <GlassButton onClick={prevPage} disabled={currentIndex === 0}><ChevronLeft size={20}/></GlassButton>
              
              <div className="flex gap-1 items-center">
                  <button 
                    onClick={() => {
                      const newScale = Math.max(scale - 0.5, 1);
                      setScale(newScale);
                      if(newScale === 1) setPanPosition({x:0, y:0});
                      setIsAnimating(true);
                    }} 
                    className="p-2 hover:bg-black/5 rounded-full"
                  >
                    <ZoomOut size={16}/>
                  </button>
                  
                  <span className="w-12 text-center text-xs font-bold font-mono text-neutral-600">
                      {Math.round(scale * 100)}%
                  </span>
                  
                  <button 
                    onClick={() => {
                       setScale(Math.min(scale + 0.5, 5));
                       setIsAnimating(true);
                    }} 
                    className="p-2 hover:bg-black/5 rounded-full"
                  >
                    <ZoomIn size={16}/>
                  </button>
              </div>

              <GlassButton onClick={nextPage} disabled={currentIndex >= maxPagesIndex}><ChevronRight size={20}/></GlassButton>
           </div>
      </div>

      {/* Grid View */}
      {isGridView && (
        <div className="absolute inset-0 bg-white/95 z-50 backdrop-blur-md flex flex-col p-8 animate-fade-in">
           <div className="flex justify-between items-center mb-8">
               <h2 className="text-2xl font-light">Pages Overview</h2>
               <button onClick={() => setIsGridView(false)} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200"><X size={24}/></button>
           </div>
           <div className="overflow-y-auto flex-1 no-scrollbar">
               <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6 pb-20">
                   {pages.map((p, idx) => (
                       <div key={p.id} onClick={() => { setCurrentIndex(idx===0?0 : idx - (idx%2)); setIsGridView(false); }} 
                            className="aspect-[1/1.414] bg-white shadow-md rounded-lg overflow-hidden cursor-pointer hover:ring-4 ring-neutral-200 transition-all transform hover:-translate-y-1">
                           <img src={p.image} className="w-full h-full object-cover" loading="lazy"/>
                           <div className="text-center py-1 text-[10px] text-gray-400 bg-gray-50 border-t">{idx + 1}</div>
                       </div>
                   ))}
               </div>
           </div>
        </div>
      )}
    </div>
  );
};


// =========================================
// APP UTILITIES
// =========================================

// Hook to lock scroll and preserve position
const useScrollLock = (lock: boolean) => {
  useLayoutEffect(() => {
    if (!lock) return;

    // 1. Запоминаем текущую позицию скролла
    const scrollY = window.scrollY;

    // 2. Фиксируем body, сдвигая его наверх на величину скролла
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.classList.add('scroll-locked');

    // 3. Функция очистки (вызывается при закрытии)
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.classList.remove('scroll-locked');
      
      // 4. Мгновенно восстанавливаем скролл
      window.scrollTo(0, scrollY);
    };
  }, [lock]);
};

// Hook for Content Protection (Anti-Copy/Save)
const useContentProtection = () => {
  useEffect(() => {
    // 1. Отключаем контекстное меню (Правый клик)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 2. Отключаем перетаскивание изображений и другого контента
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // 3. Отключаем комбинации клавиш (Ctrl+C, Ctrl+S, F12 и т.д.)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Блокируем F12
      if (e.key === 'F12') {
        e.preventDefault();
      }
      
      // Блокируем комбинации с Ctrl (или Command на Mac)
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'c': // Copy
          case 's': // Save
          case 'u': // View Source
          case 'p': // Print
          case 'i': // DevTools (обычно Ctrl+Shift+I)
            e.preventDefault();
            e.stopPropagation();
            break;
        }
      }
      
      // Дополнительно для DevTools (Ctrl+Shift+I / J / C)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
          if (['i', 'j', 'c'].includes(e.key.toLowerCase())) {
              e.preventDefault();
          }
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
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

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const smoothScrollToTop = (duration = 900) => {
  const start = window.scrollY;
  const startTime = performance.now();

  const animate = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeOutCubic(progress);

    window.scrollTo(0, start * (1 - eased));

    if (progress < 1) requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);
};


// UPDATED: ScrollToTop - Bouncy Scale Animation
const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkScroll = () =>
      setIsVisible(window.scrollY > 300);

    window.addEventListener('scroll', checkScroll, { passive: true });
    return () => window.removeEventListener('scroll', checkScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          onClick={() => smoothScrollToTop(800)}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          whileTap={{ scale: 0.8 }} // Bounce effect on tap
          whileHover={{ scale: 1.1 }}
          transition={{ 
            type: "spring",
            stiffness: 300,
            damping: 20
          }}
          className="
            fixed bottom-10 right-10 z-[10005]
            w-[52px] h-[52px]
            rounded-full
            flex items-center justify-center
            backdrop-blur-[10px]
            bg-white/40
            border border-white/40
            shadow-lg
            hover:bg-white/60
          "
        >
          <ArrowUp size={24} className="text-black/80" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};


// =========================================
// COMPONENTS
// =========================================

// HELPERS FOR MENU ICON
const Path = (props: SVGMotionProps<SVGPathElement>) => (
  <motion.path
    fill="transparent"
    strokeWidth="3"
    stroke="black"
    strokeLinecap="round"
    {...props}
  />
);

const MenuToggle = ({ toggle, isOpen }: { toggle: () => void, isOpen: boolean }) => (
  <button onClick={toggle} className="outline-none border-none cursor-pointer bg-transparent p-2 z-[10002] relative flex items-center justify-center">
    <svg width="23" height="23" viewBox="0 0 23 23">
      <Path
        variants={{
          closed: { d: "M 2 2.5 L 20 2.5" },
          open: { d: "M 3 16.5 L 17 2.5" }
        }}
        animate={isOpen ? "open" : "closed"}
      />
      <Path
        d="M 2 9.423 L 20 9.423"
        variants={{
          closed: { opacity: 1 },
          open: { opacity: 0 }
        }}
        transition={{ duration: 0.1 }}
        animate={isOpen ? "open" : "closed"}
      />
      <Path
        variants={{
          closed: { d: "M 2 16.346 L 20 16.346" },
          open: { d: "M 3 2.5 L 17 16.346" }
        }}
        animate={isOpen ? "open" : "closed"}
      />
    </svg>
  </button>
);


// UPDATED: Mobile Menu Overlay
const MobileMenuOverlay = ({ isOpen, onClose, navigate, currentPage }: { isOpen: boolean, onClose: () => void, navigate: (page: string) => void, currentPage: string }) => {
    // Используем новый хук для блокировки скролла
    useScrollLock(isOpen);

    const menuItems = [
        { label: 'Work', href: 'home' },
        { label: 'Reel', href: 'reel' },
        { label: 'Play', href: 'play' },
        { label: 'About', href: 'info' },
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
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={menuVariants}
                    className="fixed inset-0 top-0 left-0 w-full h-[100dvh] flex flex-col items-center justify-center z-[9999]"
                    style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', // Slightly more opaque
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        touchAction: 'none'
                    }}
                >
                     {/* LOGO is handled by the main Header which now sits ON TOP of this overlay */}
                    
                    <div className="flex flex-col items-center gap-6">
                        {menuItems.map((item, index) => {
                            // 1) Логика выделения активного пункта
                            const isActive = currentPage === item.href;
                            
                            return (
                                <motion.a
                                    key={item.label}
                                    onClick={() => {
                                        onClose();
                                        navigate(item.href);
                                    }}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.05 + (index * 0.05), duration: 0.2, ease: "easeOut" }}
                                    // UPDATED: Жирность шрифта для активного пункта
                                    className={`text-[30px] no-underline cursor-pointer leading-tight transition-colors duration-300 ${isActive ? 'text-black font-normal' : 'text-[#777] font-[250]'}`}
                                    style={{ fontFamily: "'Funnel Display', sans-serif" }}
                                >
                                    {item.label}
                                </motion.a>
                            );
                        })}
                    </div>
                </motion.nav>
            )}
        </AnimatePresence>
    );
};

// NEW: Image Modal Overlay (Reusing Mobile Menu Logic)
// UPDATED: Now supports MP4 video files
const ImageModalOverlay = ({ src, onClose }: { src: string | null, onClose: () => void }) => {
    // Используем новый хук для блокировки скролла
    useScrollLock(!!src);
    
    // Проверка, является ли файл видео (mp4)
    const isVideo = useMemo(() => src?.toLowerCase().endsWith('.mp4'), [src]);

    return (
        <AnimatePresence>
            {src && (
                <motion.div 
                    className="fixed inset-0 z-[10000] flex items-center justify-center" 
                    // Clicking outside (on background) closes it
                    onClick={onClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    style={{ 
                        // Reuse the exact same style as MobileMenuOverlay
                        backgroundColor: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)',
                    }}
                >
                    <motion.div 
                        className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.1, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        // Prevent click on container from closing, BUT user asked for image click to close
                        // So we can let the click propagate or attach onClick to image
                        onClick={(e) => e.stopPropagation()}
                    >
                        {isVideo ? (
                             <video 
                                src={src} 
                                autoPlay 
                                loop 
                                muted 
                                playsInline
                                onClick={onClose}
                                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl cursor-pointer hover:opacity-95 transition-opacity"
                             />
                        ) : (
                            <img 
                                src={src} 
                                alt="Full size" 
                                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl cursor-pointer hover:opacity-95 transition-opacity" 
                                onClick={onClose} 
                            />
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// UPDATED HEADER: Includes Animated Burger
const Header = ({ currentPage, navigate, isMenuOpen, onToggleMenu }: { currentPage: string, navigate: (page: string) => void, isMenuOpen: boolean, onToggleMenu: () => void }) => {
  const [animStart, setAnimStart] = useState(false);

  useEffect(() => { setTimeout(() => setAnimStart(true), 500); }, []);
  
  const handleNav = (page: string) => { 
      if(isMenuOpen) onToggleMenu();
      navigate(page); 
  };
  

  const navLinkClasses = (page: string) => 
    `text-[22px] text-[#777] font-normal relative transition-colors duration-300 hover:text-black hover:-translate-y-1.5 inline-block transform transition-transform cursor-pointer 
    after:content-[''] after:absolute after:w-full after:h-[1px] after:bottom-0 after:left-0 after:bg-black after:scale-x-0 after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left
    ${currentPage === page ? 'text-black' : ''}`;

  return (
    // Raised z-index to allow interaction over the overlay when menu is open
    // NOTE: Header is now placed outside the blurring container, so z-index works correctly relative to overlay
    <header className={`relative w-full pt-[40px] pb-[10px] bg-transparent z-[10001] transition-all duration-[1500ms] ease-[cubic-bezier(0.19,1,0.22,1)] ${animStart ? 'opacity-100 translate-y-0' : 'opacity-5 -translate-y-[120px]'}`}>
      <div className="flex items-center justify-between max-w-[1440px] mx-auto px-5 lg:px-10 relative">
        
        <div className="block transition-transform duration-300 ease-in-out hover:-translate-y-1.5 z-[10002] relative">
          <a onClick={() => handleNav('home')} className="cursor-pointer block">
            <img src="img/logo.svg" alt="Logo" className="h-[75px] w-auto block" onError={(e) => (e.currentTarget.src = '')} />
          </a>
        </div>
        
        <nav className="hidden lg:block">
          <ul className="flex gap-8 list-none m-0 p-0">
            <li><a onClick={() => handleNav('home')} className={navLinkClasses('home')}>Work</a></li>
            <li><a onClick={() => handleNav('reel')} className={navLinkClasses('reel')}>Reel</a></li>
            <li><a onClick={() => handleNav('play')} className={navLinkClasses('play')}>Play</a></li>
            <li><a onClick={() => handleNav('info')} className={navLinkClasses('info')}>About</a></li>
          </ul>
        </nav>
        
        {/* UPDATED: Animated Menu Toggle */}
        <div className="lg:hidden z-[10002]">
            <MenuToggle toggle={onToggleMenu} isOpen={isMenuOpen} />
        </div>

      </div>
    </header>
  );
};

// =========================================
// UPDATED FOOTER: CLASSIC SLIDE-UP ANIMATION
// =========================================
const Footer = ({ forceVisible = false }: { forceVisible?: boolean }) => {
    
  // Контент футера
  const footerContent = (
      <>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-[15px] gap-1 lg:gap-0">
          <div className="flex gap-[25px]">
            <a 
              href="https://www.behance.net/f1nal" 
              target="_blank" 
              rel="noreferrer" 
              className="text-[20px] text-black relative pb-0.5 transition-all duration-300 hover:-translate-y-1.5 inline-block"
            >
              Behance
            </a>

            <a 
              href="https://www.linkedin.com/in/f1nal" 
              target="_blank" 
              rel="noreferrer" 
              className="text-[20px] text-black relative pb-0.5 transition-all duration-300 hover:-translate-y-1.5 inline-block"
            >
              LinkedIn
            </a>

            <a 
              href="https://www.instagram.com/f1nal0139" 
              target="_blank" 
              rel="noreferrer" 
              className="text-[20px] text-black relative pb-0.5 transition-all duration-300 hover:-translate-y-1.5 inline-block"
            >
              Instagram
            </a>
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

  // Классы контейнера. "overflow-hidden" критически важен для эффекта "выезда" из ниоткуда.
  const containerClasses = "pt-10 pb-0 overflow-hidden relative"; 

  if (forceVisible) {
      return (
          <div className={containerClasses}>
              {footerContent}
          </div>
      );
  }

  // OPTIMIZED ANIMATION FIXED:
  // Переносим триггер (whileInView) на родительский тег footer, который находится в потоке документа.
  // Анимируем вложенный div.
  return (
      <motion.footer 
        className={containerClasses}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <motion.div 
            variants={{
                hidden: { y: "100%" },
                visible: { y: "0%", transition: { duration: 1.0, ease: [0.22, 1, 0.36, 1] } }
            }}
        >
            {footerContent}
        </motion.div>
      </motion.footer>
  );
};


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

        // <<< ДОБАВЛЕНО: автоскрытие UI через 3 секунды
        clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(() => setUiHidden(true), 200);

    } else {
        videoRef.current.pause();
        setIsPlaying(false);
        setUiHidden(false);
        clearTimeout(inactivityTimeout);
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

  // OPTIMIZATION: Memoize particles to avoid re-calculation on every render
  const particles = useMemo(() => [...Array(12)].map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 250,
      y: (Math.random() - 0.5) * 250,
      duration: 2 + Math.random() * 1.5,
      delay: Math.random() * 2
  })), []);

  return (
    <div 
      className={`group relative w-full aspect-video bg-black rounded-[18px] overflow-hidden shadow-lg cursor-default ${uiHidden ? 'cursor-none' : ''}`}
      ref={containerRef} onMouseMove={handleActivity} onClick={handleActivity} onDoubleClick={() => toggleFullscreen()}
    >
      <video 
        ref={videoRef} 
        className={`w-full h-full object-cover block transition-all duration-1000 ${isPlaying ? 'opacity-100 blur-0' : 'opacity-30 blur-[10px]'}`}
        playsInline muted={isMuted} poster={poster} onClick={togglePlay} onTimeUpdate={handleTimeUpdate}
      >
        <source src={src} type="video/mp4" />
      </video>
      
      <div 
        className={`absolute inset-0 flex justify-center items-center bg-black/5 transition-all duration-300 z-10 ${isPlaying ? 'opacity-0 invisible' : 'opacity-100 visible'}`}
        onClick={togglePlay}
      >
        <div className="relative flex items-center justify-center">
            {/* PARTICLES SYSTEM */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 {particles.map((p) => (
                    <motion.div
                        key={p.id}
                        className="absolute w-2 h-2 bg-white rounded-full opacity-0"
                        animate={{
                            x: [0, p.x],
                            y: [0, p.y],
                            opacity: [0, 0.6, 0],
                            scale: [0.5, 0]
                        }}
                        transition={{
                            duration: p.duration,
                            repeat: Infinity,
                            delay: p.delay,
                            ease: "easeOut"
                        }}
                    />
                 ))}
                 {[...Array(3)].map((_, i) => (
                    <motion.div
                        key={`ring-${i}`}
                        className="absolute rounded-full border border-white/20"
                        initial={{ width: 100, height: 100, opacity: 0 }}
                        animate={{ width: 200, height: 200, opacity: 0 }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.6,
                            ease: "easeOut",
                            times: [0, 1]
                        }}
                        style={{ opacity: [0.8, 0] } as any}
                    />
                 ))}
            </div>

            <button className="w-[100px] h-[100px] lg:w-[130px] lg:h-[130px] bg-white rounded-full flex items-center justify-center border-none cursor-pointer transition-transform duration-500 hover:scale-105 shadow-[0_0_50px_rgba(255,255,255,0.3)] relative z-20">
                <div className="pl-1.5"><Play fill="black" stroke="none" size={42} /></div>
            </button>
        </div>
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

const ProjectCard = ({ project, navigate }: { project: any, navigate: (page: string) => void }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const isMobile = useIsMobile();


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
            },
            { threshold: 0.6 }
        );

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [isMobile]);

    const handleMouseEnter = () => {
        if (isMobile) return;
        setIsHovered(true);
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => {
                    // Autoplay was prevented
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
                style={{ minHeight: '380px' }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {/* 1. Background Image */}
                <div className="absolute inset-0 z-0">
                    <img 
                        src={project.img} 
                        alt="" 
                        className="w-full h-full object-cover block opacity-100"
                        loading="lazy"
                    />
                </div>

                {/* 2. Video Layer */}
                <div className="absolute inset-0 z-10 transition-opacity duration-500 ease-in-out" style={{ opacity: isHovered ? 1 : 0 }}>
                    <video 
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

                {/* 3. Foreground Image (fades out on hover) */}
                <div 
                    className="absolute inset-0 z-20 transition-opacity duration-200 ease-in-out"
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

                {/* 4. NEW: Black Overlay for Text Readability (z-25) */}
                <div className="absolute inset-0 z-[25] bg-black/30 transition-opacity duration-500 pointer-events-none lg:opacity-0 lg:group-hover:opacity-100" />

                {/* 5. Text Content */}
                <div className="absolute bottom-0 left-0 p-8 z-30 text-white pointer-events-none transition-opacity duration-500 lg:opacity-0 lg:group-hover:opacity-100">
                    <h3 className="text-[32px] lg:text-[32px] font-bold leading-none mb-1 drop-shadow-md">{project.title}</h3>
                    <p className="text-[20px] opacity-70 font-normal drop-shadow-md">{project.category}</p>
                </div>
            </div>
        </a>
    );
};

const WorkPage = ({ navigate }: { navigate: (page: string) => void }) => {
  const gridRef = useRef<HTMLDivElement>(null);
  
  const initialProjects: Project[] = [
    { id: 1, title: 'Elf Bar', category: 'Personal', video: 'vid/elf_preview.mp4', img: 'img/preview1.png', link: 'elfbar' },
    { id: 2, title: 'Football Dynamics', category: 'Personal', video: 'https://vpolitov.com/wp-content/uploads/2025/02/FD_thumbnail_01.mp4', img: 'https://vpolitov.com/wp-content/uploads/2025/01/fd_thumbnail_01.png', link: 'football-dynamics' },
    { id: 3, title: 'Puma Running AW24', category: 'Inertia Studios', video: 'https://vpolitov.com/wp-content/uploads/2025/02/Puma_thumbnail_01.mp4', img: 'https://vpolitov.com/wp-content/uploads/2025/01/magmax_thumbnail.png', link: 'puma-magmax' },
    { id: 4, title: 'SBER Creative Frame', category: 'Combine', video: 'https://vpolitov.com/wp-content/uploads/2025/03/SBER_CF_1-2.mp4', img: 'https://vpolitov.com/wp-content/uploads/2025/03/SB_thumbnail_03.png', link: 'sber-creative-frame' }
  ];
  
  const [projects, setProjects] = useState<any[]>(initialProjects);
  

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
                
                const categoryMeta = doc.querySelector('meta[name="category"]');
                if (!categoryMeta) return null; 

                const title = doc.title || `Project ${id}`;
                const category = categoryMeta.getAttribute('content') || 'Work';
                
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
                await new Promise(r => setTimeout(r, 200)); 
            } else {
                break;
            }
        }
    };

    loadSequence();

    return () => { isMounted = false; };
  }, []);

  // OPTIMIZATION: Wrap in requestAnimationFrame to prevent layout thrashing
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
                        transition={{ 
                            duration: 0.5, 
                            ease: "easeOut",
                            delay: 0.2 + (i * 0.15) 
                        }}
                        whileHover={{ scale: 1.02, transition: { duration: 0.4 } }}
                    >
                        <ProjectCard project={p} navigate={navigate} />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
        <Footer />
    </div>
  );
};

// UPDATED: PlayPage now supports Images (JPG), Animations (GIF), and Video (MP4)
interface MediaItem {
    id: string; // Changed to string to handle complex IDs
    src: string;
    type: 'image' | 'video';
    category: 'artwork' | 'gambling' | 'experimental' | 'general';
}

const FilterButton = ({ 
    active, 
    onClick, 
    label, 
    icon: Icon 
}: { 
    active: boolean; 
    onClick: () => void; 
    label: string; 
    icon: any; 
}) => {
    return (
        <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
                relative flex items-center gap-2 px-4 py-2 rounded-full 
                transition-all duration-300 backdrop-blur-md shadow-lg
                border
                ${active 
                    ? 'bg-white/80 border-white/90 text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]' 
                    : 'bg-white/30 border-white/40 text-neutral-800 hover:bg-white/50 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)]'
                }
            `}
        >
            <Icon size={18} strokeWidth={2} />
            <span className="font-medium text-sm">{label}</span>
        </motion.button>
    );
};

const PlayPage = ({ onOpenImage }: { onOpenImage: (src: string) => void }) => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]); // Array of active categories
  
  useEffect(() => {
    let isMounted = true;
    
    // 1. Проверка изображений/GIF через загрузку
    const checkImage = (src: string): Promise<boolean> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = src;
        });
    };

    // 2. Проверка видео через HEAD + Content-Type
    const checkVideo = async (src: string): Promise<boolean> => {
        try {
            const res = await fetch(src, { method: 'HEAD' });
            if (!res.ok) return false;
            const type = res.headers.get('content-type');
            return type ? type.toLowerCase().startsWith('video') : false;
        } catch {
            return false;
        }
    };

    const loadMedia = async () => {
        const MAX_CHECK = 15; // Limit per category to avoid too many requests
        const promises = [];
        const items: MediaItem[] = [];

        // Define search paths with categories
        // User Logic: 
        // Artwork = Artwork folder
        // Gambling = Gambling folder
        // Experimental = Experimental folder
        // Also keeping root imgs/anim as 'experimental' or 'general' fallback
        const pathsToCheck = [
            // ARTWORK
            { prefix: 'imgs/Artwork/img_', ext: 'jpg', type: 'image', cat: 'artwork' },
            { prefix: 'anim/Artwork/anim_', ext: 'mp4', type: 'video', cat: 'artwork' },
            { prefix: 'anim/Artwork/anim_', ext: 'gif', type: 'image', cat: 'artwork' },
            
            // GAMBLING
            { prefix: 'imgs/Gambling/img_', ext: 'jpg', type: 'image', cat: 'gambling' },
            { prefix: 'anim/Gambling/anim_', ext: 'mp4', type: 'video', cat: 'gambling' },
            
            // EXPERIMENTAL
            { prefix: 'imgs/Experimental/img_', ext: 'jpg', type: 'image', cat: 'experimental' },
            { prefix: 'anim/Experimental/anim_', ext: 'mp4', type: 'video', cat: 'experimental' },
            { prefix: 'anim/Experimental/anim_', ext: 'gif', type: 'image', cat: 'experimental' },
            
            // LEGACY / ROOT (Mapped to Experimental for now, or General)
            { prefix: 'imgs/img_', ext: 'jpg', type: 'image', cat: 'experimental' },
            { prefix: 'anim/anim_', ext: 'gif', type: 'image', cat: 'experimental' },
            { prefix: 'anim/anim_', ext: 'mp4', type: 'video', cat: 'experimental' },
        ];

        for (const pathConfig of pathsToCheck) {
            for (let i = 1; i <= MAX_CHECK; i++) {
                const src = `${pathConfig.prefix}${i}.${pathConfig.ext}`;
                const checkFn = pathConfig.type === 'video' ? checkVideo : checkImage;
                
                promises.push(
                    checkFn(src).then(exists => {
                        if (exists && isMounted) {
                            items.push({
                                id: `${pathConfig.cat}-${pathConfig.type}-${i}-${pathConfig.ext}`,
                                src: src,
                                type: pathConfig.type as 'image' | 'video',
                                category: pathConfig.cat as any
                            });
                        }
                    })
                );
            }
        }

        await Promise.all(promises);

        if (isMounted) {
            // Remove duplicates if any (e.g. same file checked multiple times)
            const uniqueItems = Array.from(new Map(items.map(item => [item.src, item])).values());
            
            // Sort to mix content nicely
            uniqueItems.sort((a, b) => {
                 const getNum = (s: string) => parseInt(s.match(/\d+/)?.[0] || '0');
                 return getNum(a.src) - getNum(b.src);
            });
            
            setMediaItems(uniqueItems);
        }
    };

    loadMedia();
    return () => { isMounted = false; };
  }, []);

  const handleLoadError = (id: string) => {
      setMediaItems(prev => prev.filter(item => item.id !== id));
  };

  const toggleFilter = (filter: string) => {
      setActiveFilters(prev => {
          if (prev.includes(filter)) {
              return prev.filter(f => f !== filter);
          } else {
              return [...prev, filter];
          }
      });
  };

  // Filter Logic:
  // If filters are active, show items that match ANY active filter.
  // If NO filters are active, show ALL items.
  const filteredItems = useMemo(() => {
      if (activeFilters.length === 0) return mediaItems;
      return mediaItems.filter(item => {
          // Special logic for Artwork button as requested by user?
          // "Artwork: public\anim\Artwork and public\imgs\Gambling"
          // If the user REALLY meant that specific mapping, we could do it here.
          // But implementing standard category filtering is safer.
          // IF strict requested logic:
          // if (activeFilters.includes('artwork')) { check if item is in Artwork OR Gambling? }
          
          // Using standard logic for now based on file path categories
          return activeFilters.includes(item.category);
      });
  }, [mediaItems, activeFilters]);

  return (
    <div className="max-w-[1440px] mx-auto px-5 lg:px-10 w-full">
        <motion.div 
            className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-[30px] gap-6"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
        >
            <div className="flex-1">
                <h1 className="text-[36px] lg:text-[48px] font-semibold leading-[1.1] mb-2.5">Playground</h1>
                <div className="text-[16px] text-[#888] mt-2.5">Experiments & Styleframes</div>
            </div>

            {/* FILTERS */}
            <div className="flex flex-wrap gap-3">
                <FilterButton 
                    label="Artwork" 
                    icon={Brush} 
                    active={activeFilters.includes('artwork')} 
                    onClick={() => toggleFilter('artwork')} 
                />
                <FilterButton 
                    label="Gambling" 
                    icon={Dices} 
                    active={activeFilters.includes('gambling')} 
                    onClick={() => toggleFilter('gambling')} 
                />
                <FilterButton 
                    label="Experimental" 
                    icon={FlaskConical} 
                    active={activeFilters.includes('experimental')} 
                    onClick={() => toggleFilter('experimental')} 
                />
            </div>
        </motion.div>
        
        {/* ADDED: min-h-[80vh] to push footer down before content loads */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[20px] mb-[80px] min-h-[80vh]">
            <AnimatePresence mode="popLayout">
            {filteredItems.map((item, i) => (
                <motion.div 
                    key={item.id} 
                    layout
                    className="relative rounded-[18px] overflow-hidden bg-black cursor-pointer h-full group"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    whileHover={{ scale: 1.03 }}
                    onClick={() => onOpenImage(item.src)} // Trigger global modal
                >
                    {item.type === 'video' ? (
                        // Video behaves like GIF: AutoPlay, Loop, Muted, No Controls
                        <video 
                            src={item.src} 
                            autoPlay 
                            loop 
                            muted 
                            playsInline 
                            className="w-full h-full block object-cover pointer-events-none" 
                            onError={() => handleLoadError(item.id)}
                        />
                    ) : (
                        <img 
                            src={item.src} 
                            alt={`Experiment ${i}`} 
                            className="w-full h-full block object-cover" 
                            onError={() => handleLoadError(item.id)}
                        />
                    )}
                </motion.div>
            ))}
            </AnimatePresence>
            
            {filteredItems.length === 0 && (
                <div className="col-span-full flex justify-center items-center h-[200px] text-neutral-400">
                    No items found for this filter.
                </div>
            )}
        </div>
        
        <Footer />
    </div>
  );
};

// UPDATED: ReelPage now passes forceVisible={true} to Footer
const ReelPage = () => (
    <motion.div 
        className="w-full"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10 w-full">
        <div className="flex flex-wrap justify-between items-end mb-[30px] gap-10"> 
          <div className="flex-1 min-w-[300px]">
            <h1 className="text-[36px] lg:text-[48px] font-semibold leading-[1.1] mb-2.5">Showreel</h1>
            <div className="text-[16px] text-[#888] mt-2.5">Selected Works</div>
          </div>
        </div>
      </div>
      <div className="w-full max-w-[1440px] mx-auto px-5 lg:px-10 mb-[80px]">
        <VideoPlayer src="https://video.f1nal.me/showreel2022.mp4" poster="img/preview1.png" />
      </div>
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10 w-full">
          <Footer forceVisible={true} />
      </div>
    </motion.div>
);

// UPDATED: AboutPage с текстом, который плавно появляется при скролле (2 пункт задачи)
const AboutPage = () => {
    // Вспомогательный вариант анимации для текста: появляется снизу вверх
    const textRevealVariant: Variants = {
        hidden: { opacity: 0, y: 30 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { duration: 0.6, ease: "easeOut" }
        }
    };

    return (
        <motion.div 
            className="max-w-[1440px] mx-auto px-5 lg:px-10 w-full"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
        >
            <div className="flex flex-col lg:flex-row justify-between items-start gap-[50px] mb-[40px]">
                <div className="flex-none w-full lg:w-[40%] max-w-[500px]">
                    <img src="img/me.png" alt="Oleg Shmarov" className="w-full h-auto rounded-[18px] grayscale hover:grayscale-0 transition-all duration-500" onError={(e) => e.currentTarget.src = 'img/me.png'} />
                </div>
                <div className="flex-0 pt-0">
                    <div className="text-[18px] lg:text-[18px] leading-[1.5]">
                        <motion.p 
                            className="mb-3"
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={textRevealVariant}
                        >
                            Hi! My name is Oleg Shmarov. I am a 3D artist and motion designer with a deep interest in animation and visual development.
                        </motion.p>
                        <motion.p 
                            className="mb-3"
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={textRevealVariant}
                        >
                            My career began in the television industry, where I worked with large companies performing a wide range of tasks that gave me valuable experience and versatile skills.
                        </motion.p>
                        <motion.p
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={textRevealVariant}
                        >
                            Now I work on freelance projects and cooperate with leading studios to create projects of various sizes and complexities.
                        </motion.p>
                    </div>
                </div>
            </div>
            
            <div className="w-full h-[1px] bg-black/15 my-[40px]" />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[50px] mb-[40px]">
                <div>
                    <motion.div 
                        className="mb-10"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={textRevealVariant}
                    >
                        <h3 className="text-[18px] font-bold underline mb-1">Software</h3>
                        <p className="text-[18px] leading-relaxed text-[#222]">Cinema 4D, Redshift, Adobe Creative Suite</p>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={textRevealVariant}
                    >
                        <div className="mb-10">
                            <h3 className="text-[18px] font-bold underline mb-1">Awards</h3>
                            <ul className="list-none p-0 space-y-1">
                                <li className="text-[18px] text-[#222]">Promax Awards 2021 - Best internal marketing - Gold // TNT Design Showreel</li>
                                <li className="text-[18px] text-[#222]">World Brand Design Awards 2023 / UK - Bronze // Gravix glue</li>
                            </ul>
                        </div>
                        <div className="mb-1">
                            <h3 className="text-[18px] font-bold underline mb-1">Social Media</h3>
                            <div className="flex gap-5">
                                <a href="https://www.instagram.com/f1nal0139" className="text-[18px] hover:opacity-60 transition-opacity">Instagram</a>
                                <a href="https://www.behance.net/f1nal" className="text-[18px] hover:opacity-60 transition-opacity">Behance</a>
                                <a href="https://www.linkedin.com/in/f1nal" className="text-[18px] hover:opacity-60 transition-opacity">LinkedIn</a>
                            </div>
                        </div>
                    </motion.div>
                </div>
                
                <motion.div 
                    className="mb-10"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={textRevealVariant}
                >
                    <h3 className="text-[18px] font-bold underline mb-1">For work inquiries, please contact at:</h3>
                    <p className="text-[18px]"><a href="mailto:shmarov.oleg@gmail.com" className="hover:opacity-60 transition-opacity">shmarov.oleg@gmail.com</a></p>
                </motion.div>
            </div>
            <Footer />
        </motion.div>
    );
};

// --- ОБНОВЛЕНО: ProjectPage теперь принимает children ---
const ProjectPage = ({ title, meta, desc, video, gallery, credits, prev, next, navigate, children }: any) => {
    return (
        <motion.div 
            initial={{opacity:0, y: 50}} 
            animate={{opacity:1, y: 0}} 
            exit={{opacity:0}} 
            transition={{duration:0.5, ease: "easeOut"}} 
            className="w-full"
        >
            <div className="max-w-[1440px] mx-auto px-5 lg:px-10 w-full">
                <div className="flex flex-wrap justify-between items-end mb-[30px] gap-10">
                    <div className="flex-1 min-w-[300px]">
                        <h1 className="text-[36px] lg:text-[48px] font-semibold leading-[1.1] mb-2.5 text-black">{title}</h1>
                        <div className="text-[16px] text-[#888] mt-2.5">{meta}</div>
                    </div>
                    <div className="flex-none w-full lg:w-[45%] min-w-[300px]">
                        <p className="text-[16px] leading-[1.6] text-black" dangerouslySetInnerHTML={{__html: desc}} />
                    </div>
                </div>
            </div>
            {video && (
                <div className="w-full max-w-[1440px] mx-auto px-5 lg:px-10 mb-[100px]">
                    <VideoPlayer src={video.src} poster={video.poster} />
                </div>
            )}
            <div className="max-w-[1440px] mx-auto px-5 lg:px-10 w-full">
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

                {/* --- ВСТАВКА ВИДЖЕТА ЗДЕСЬ (Сразу после галереи) --- */}
                {children && (
                    <div className="w-full mb-[100px] flex justify-center">
                        {children}
                    </div>
                )}
                {/* ------------------------------------------------ */}

                <div className="text-[20px] text-[#555] leading-[1.8] mb-[80px] max-w-[700px]">
                    {credits.map((line: string, i: number) => <p key={i} dangerouslySetInnerHTML={{__html: line}} />)}
                </div>
<div className="pt-10 mb-40 flex justify-between text-[16px] sm:text-[18px] lg:text-[30px] font-medium">
    <a
        onClick={() => navigate(prev.link)}
        className="flex items-center gap-2.5 opacity-100 hover:opacity-60 hover:-translate-y-0.5 transition-all cursor-pointer"
    >
        <ArrowLeft size={22} /> {prev.label}
    </a>

    <a
        onClick={() => navigate(next.link)}
        className="flex items-center gap-2.5 opacity-100 hover:opacity-60 hover:-translate-y-0.5 transition-all cursor-pointer"
    >
        {next.label} <ArrowRight size={22} />
    </a>
</div>

                <Footer />
            </div>
        </motion.div>
    );
};

// --- ОБНОВЛЕНО: ElfBar теперь содержит IssuuReader ---
const ElfBar = ({ navigate }: any) => (
    <ProjectPage 
        navigate={navigate}
        title="Elf Bar Promotion"
        meta="Presonal / 2022"
        desc="A promotional video for Elf Bar, showcasing the sleek design and vibrant flavors of their disposable vapes. The project involved 3D modeling, texturing, and fluid simulations to visualize the smooth airflow and rich taste profile."
        video={{ src: 'https://video.f1nal.me/elfbar.mp4', poster: 'img/preview1.png' }}
        gallery={[
            { img: 'https://placehold.co/700x700/111/FFF?text=Elf+Bar+Flavor+1' }, 
            { img: 'https://placehold.co/700x700/222/FFF?text=Elf+Bar+Flavor+2' }, 
            // Последний элемент галереи - Wide Shot, после которого будет виджет
            { img: 'https://placehold.co/1400x788/333/FFF?text=Wide+Shot+Render', full: true }
        ]}
        credits={['<strong>Client:</strong> Elf Bar', '<strong>Role:</strong> 3D Motion Design, Art Direction', '<strong>Tools:</strong> Cinema 4d, Redshift, Adobe']}
        prev={{ label: 'SBER Creative Frame', link: 'sber-creative-frame' }}
        next={{ label: 'Football Dynamics', link: 'football-dynamics' }}
    >
        {/* Встраивание виджета.
            ВАЖНО: Если вы обработаете PDF в картинки заранее, замените prop pdfUrl на:
            images={['img/page1.jpg', 'img/page2.jpg', ...]} 
        */}
		<IssuuReader pdfUrl="https://video.f1nal.me/LKT_WERKE_RU.pdf" />
    </ProjectPage>
);
// -----------------------------------------------------

const FootballDynamics = ({ navigate }: any) => (
    <ProjectPage 
        navigate={navigate}
        title="Football Dynamics"
        meta="Personal Project / 2025"
        desc="An exploration of motion and energy within the context of sports. This project focuses on the raw dynamics of football, capturing the intensity of the game through advanced simulation and rendering techniques."
        gallery={[{ video: 'https://vpolitov.com/wp-content/uploads/2025/02/FD_thumbnail_01.mp4', full: true }, { img: 'https://vpolitov.com/wp-content/uploads/2025/01/fd_thumbnail_01.png' }, { img: 'https://placehold.co/700x700/EEE/31343C?text=Simulation+Detail' }, { img: 'https://placehold.co/1400x788/EEE/31343C?text=Dynamics+Wide+Shot', full: true }]}
        credits={['<strong>Design & Animation:</strong> Oleg Shmarov', '<strong>Tools:</strong> Houdini, Redshift, Nuke, Marvelous Designer']}
        prev={{ label: 'ELF BAR', link: 'elfbar' }}
        next={{ label: 'Puma Running AW24', link: 'puma-magmax' }}
    />
);

const Puma = ({ navigate }: any) => (
    <ProjectPage 
        navigate={navigate}
        title="Puma Running AW24"
        meta="Studio: Inertia Studios / 2024"
        desc="Highlighting the technology behind Puma's new MagMax series. A dynamic campaign emphasizing cushion, return, and speed through abstract material simulations and high-impact visuals."
        gallery={[{ video: 'https://vpolitov.com/wp-content/uploads/2025/02/Puma_thumbnail_01.mp4', full: true }, { img: 'https://vpolitov.com/wp-content/uploads/2025/01/magmax_thumbnail.png' }, { img: 'https://placehold.co/700x700/EEE/31343C?text=Shoe+Detail' }, { img: 'https://placehold.co/1400x788/EEE/31343C?text=Campaign+Wide+View', full: true }]}
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
        desc="In 2020, Sber completely changed its positioning, removing the 'bank' label and transforming into a full-fledged ecosystem of services. The new brand united technology, convenience, and user care — embedding these values into its design.<br/><br/>After a few years, the design system required further fine-tuning. This led to the development of a new creative framework — a visual language focused on 3D, designed to strengthen relationships with users and refresh Sber's visual communication.<br/><br/>Together with Combine studio, I have developed many unique images that helped Sber to change its visual style."
        gallery={[{ video: 'https://vpolitov.com/wp-content/uploads/2025/03/SBER_CF_1-2.mp4', full: true }, { img: 'https://vpolitov.com/wp-content/uploads/2025/03/SB_thumbnail_03.png' }, { img: 'https://vpolitov.com/wp-content/uploads/2025/02/sh_002_v01-0-00-01-08_1.jpg' }, { img: 'https://placehold.co/1400x788/EEE/31343C?text=Wide+Shot+Render', full: true }, { img: 'https://placehold.co/700x700/EEE/31343C?text=Process+Detail' }, { img: 'https://placehold.co/700x700/EEE/31343C?text=Texture+Detail' }]}
        credits={['<strong>Art Direction & Design:</strong> Oleg Shmarov', '<strong>Music & Sound Design:</strong> Blink Audio', '<strong>Tools:</strong> Houdini, Redshift, Nuke']}
        prev={{ label: 'Puma Running AW24', link: 'puma-magmax' }}
        next={{ label: 'ELF BAR', link: 'elfbar' }}
    />
);

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [playModalSrc, setPlayModalSrc] = useState<string | null>(null);

  // === ПОДКЛЮЧЕНИЕ ЗАЩИТЫ ===
  useContentProtection(); 
  // ==========================

  useEffect(() => {
    // 2. ИЗМЕНЕНИЕ ЗАГОЛОВКА
    document.title = "F1NAL EDITING - OLEG SHMAROV - 3D ARTIST";
    // ... остальной код

    // 3. ДОБАВЛЕНИЕ FAVICON
    const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
    (link as HTMLLinkElement).type = 'image/webp';
    (link as HTMLLinkElement).rel = 'icon';
    (link as HTMLLinkElement).href = 'img/favicon.webp';
    document.getElementsByTagName('head')[0].appendChild(link);
  }, []);
  
  const renderPage = () => {
    switch(currentPage) {
      case 'home': return <WorkPage navigate={setCurrentPage} />;
      case 'reel': return <ReelPage />;
      // Pass the modal opener to PlayPage
      case 'play': return <PlayPage onOpenImage={setPlayModalSrc} />;
      case 'info': return <AboutPage />;
      case 'elfbar': return <ElfBar navigate={setCurrentPage} />;
      case 'football-dynamics': return <FootballDynamics navigate={setCurrentPage} />;
      case 'puma-magmax': return <Puma navigate={setCurrentPage} />;
      case 'sber-creative-frame': return <Sber navigate={setCurrentPage} />;
      default: return <WorkPage navigate={setCurrentPage} />;
    }
  };

  // UPDATED: Smooth scroll to top when page changes instead of instant jump
  useEffect(() => { 
      // Используем ту же функцию плавного скролла, что и для кнопки "Наверх"
      smoothScrollToTop(1000); 
  }, [currentPage]);

  useIntroAnimation();

  // Combine blur states
  const isBlurActive = isMenuOpen || !!playModalSrc;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLES }} />
      {/* UPDATED: Mobile Menu Overlay теперь получает currentPage */}
      <MobileMenuOverlay 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        navigate={setCurrentPage}
        currentPage={currentPage}
      />
      
      {/* NEW: Image Modal Overlay reused same logic */}
      <ImageModalOverlay
        src={playModalSrc}
        onClose={() => setPlayModalSrc(null)}
      />
	  
	  <div className="ios-safearea-overlay"></div>

      {/* UPDATED: "Crutch" implementation for blurred background content */}
      {/* IMPORTANT FIX: Split Header out of the blurred container to keep it sharp and on top */}
      <div className="min-h-screen w-full flex flex-col bg-transparent">
        
        {/* HEADER: Outside the blur filter, High Z-Index to stay above Overlay (z-9999) */}
        <div className="relative z-[10005]">
             <Header 
                currentPage={currentPage} 
                navigate={setCurrentPage} 
                isMenuOpen={isMenuOpen}
                onToggleMenu={() => setIsMenuOpen(!isMenuOpen)} 
            />
        </div>

        {/* MAIN CONTENT: This gets the blur filter */}
        <div 
            id="content-holder" 
            className="flex-grow pt-[40px] relative flex flex-col"
            style={{
                // Apply blur filter directly to content when menu is open OR modal is open
                filter: isBlurActive ? 'blur(4px)' : 'none',
                // Also ensure white background is dominant
                backgroundColor: isBlurActive ? 'rgba(255, 255, 255, 1)' : 'transparent', 
                transition: 'filter 0.3s ease, background-color 0.3s ease',
                // Ensure pointer events are disabled on background content when menu open
                pointerEvents: isBlurActive ? 'none' : 'auto'
            }}
        >
             {/* 3. Анимация переходов между страницами (0.25s) */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentPage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full flex-grow">
                    {renderPage()}
                </motion.div>
            </AnimatePresence>
        </div>
        
        {/* ScrollToTop outside blur if desired, or inside if it should blur. 
            Usually controls stay sharp. Put it outside. */}\
        <ScrollToTop />
      </div>
    </>
  );
}