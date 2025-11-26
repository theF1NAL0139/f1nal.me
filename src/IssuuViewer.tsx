import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Minimize, 
  Grid, 
  X,
  BookOpen
} from 'lucide-react';

// --- Типы ---
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

// --- Глобальные стили ---
const GlobalStyles = () => (
  <style>{`
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

    /* Тени для реализма разворота - МЕНЕЕ АГРЕССИВНЫЕ */
    .shadow-spine-center {
      background: linear-gradient(to right, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 20%);
    }
    .shadow-spine-left {
      background: linear-gradient(to left, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 20%);
    }
  `}</style>
);

// --- Hook для ПОЛУЧЕНИЯ СТРАНИЦ ---
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

// --- Компонент страницы ---
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

// --- Кнопка (Glassmorphism) ---
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

// --- ОСНОВНОЙ КОМПОНЕНТ ---
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
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
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
          // Попытка использовать Native API
          try {
              if (containerRef.current?.requestFullscreen) {
                  await containerRef.current.requestFullscreen();
              } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
                  await (containerRef.current as any).webkitRequestFullscreen();
              }
          } catch (err) {
              console.warn("Fullscreen API not enabled or failed, falling back to CSS");
          }
          // В любом случае включаем CSS fullscreen
          setIsFullscreen(true);
      } else {
          // Выход из полноэкранного режима
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
    
    if (isMobile) return [pages[currentIndex]]; // Возвращаем 1 страницу для мобилки

    if (currentIndex === 0) return [null, pages[0]];
    
    return [pages[currentIndex], pages[currentIndex + 1] || null];
  }, [isMobile, currentIndex, pages, isLoading]);

  const maxPagesIndex = useMemo(() => {
      if (isLoading || totalPages === 0) return 0;
      if (isMobile) return totalPages - 1;
      return totalPages % 2 === 0 ? totalPages - 1 : Math.max(0, totalPages - 2);
  }, [isMobile, totalPages, isLoading]);

  return (
    <>
      <GlobalStyles />
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
          
          <div className="flex gap-2 pointer-events-auto">
            <GlassButton onClick={() => setIsGridView(true)}><Grid size={18} /></GlassButton>
            <GlassButton onClick={toggleFullscreen}>
               {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
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
          {/* Крупные стрелки навигации */}
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
              {/* Левая сторона (Desktop: Левая страница. Mobile: СКРЫТО) */}
              <div className={`relative h-full ${isMobile ? 'hidden' : 'w-1/2'} bg-transparent flex items-center justify-end`}>
                {!isMobile && visiblePages[0] ? (
                  <PageContent key={`L-${visiblePages[0].id}`} data={visiblePages[0]!} isLeft={true} />
                ) : (
                  !isMobile && <div className="w-full h-full" /> 
                )}
              </div>

              {/* Правая сторона (Desktop: Правая страница. Mobile: ЕДИНСТВЕННАЯ страница) */}
              <div className={`relative h-full ${isMobile ? 'w-full shadow-lg' : 'w-1/2'} bg-transparent flex items-center justify-start`}>
                  {/* ИСПРАВЛЕНИЕ: На мобильном рендерим visiblePages[0], на десктопе visiblePages[1] */}
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

        {/* Footer Controls */}
        <div className="absolute bottom-6 w-full flex justify-center pointer-events-none z-20">
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
    </>
  );
};

export default IssuuReader;