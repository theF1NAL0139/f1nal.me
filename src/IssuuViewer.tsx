import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  pdfUrl?: string;     // Опция 1: Ссылка на PDF (обрабатывается в браузере)
  images?: string[];   // Опция 2: Готовый массив ссылок на картинки (пре-рендер)
}

// Расширяем интерфейс window для pdfjsLib
declare global {
  interface Window {
    pdfjsLib: any;
  }
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

    /* Тени для реализма разворота */
    .shadow-spine-center {
      background: linear-gradient(to right, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 15%);
    }
    .shadow-spine-left {
      background: linear-gradient(to left, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 15%);
    }
  `}</style>
);

// --- Hook для ПОЛУЧЕНИЯ СТРАНИЦ (PDF или Картинки) ---
const usePagesSource = (pdfUrl?: string, images?: string[]) => {
    const [pages, setPages] = useState<PageData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // 1. Если переданы готовые картинки — используем их (быстро, качественно)
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

        // 2. Если передан PDF — обрабатываем
        if (pdfUrl) {
            const loadPdf = async () => {
                setIsLoading(true);
                setError(null);
                
                try {
                    const pdfjsVersion = '3.11.174';
                    const cdnBaseUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}`;

                    if (!window.pdfjsLib) {
                        await new Promise((resolve, reject) => {
                            const script = document.createElement('script');
                            script.src = `${cdnBaseUrl}/pdf.min.js`;
                            script.onload = resolve;
                            script.onerror = () => reject(new Error("Failed to load PDF.js script"));
                            document.head.appendChild(script);
                        });
                    }

                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${cdnBaseUrl}/pdf.worker.min.js`;

                    const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
                    const pdf = await loadingTask.promise;
                    const numPages = pdf.numPages;
                    const pagesData: PageData[] = [];

                    for (let i = 1; i <= numPages; i++) {
                        const page = await pdf.getPage(i);
                        
                        // УВЕЛИЧЕНО КАЧЕСТВО: Scale 3.0 для четкости при зуме
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

                            const imgUrl = canvas.toDataURL('image/jpeg', 0.9); 

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
                    console.error("Error loading PDF:", e);
                    setError(e.message || "Не удалось загрузить PDF файл.");
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
      {/* Тень от корешка */}
      {showSpineShadow && (
        <div className={`absolute inset-y-0 ${isLeft ? 'right-0 shadow-spine-left' : 'left-0 shadow-spine-center'} w-8 z-10 pointer-events-none opacity-40`} />
      )}

      <img 
        src={data.image} 
        alt={`Page ${data.id}`} 
        className="w-full h-full object-contain" 
        loading="lazy"
        draggable={false}
      />
      
      {/* Номер страницы */}
      <div className="absolute bottom-2 text-[10px] text-gray-400 font-sans select-none bg-white/50 px-2 rounded">
        {data.id}
      </div>
    </div>
  );
});

// --- Кнопка управления ---
interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const GlassButton = ({ onClick, disabled, children, className = "", title }: GlassButtonProps) => (
  <button 
    onClick={onClick} 
    disabled={disabled}
    title={title}
    className={`
      p-2 lg:p-3 rounded-full 
      bg-white/60 backdrop-blur-xl 
      border border-white/50 
      shadow-[0_4px_12px_rgba(0,0,0,0.05)] 
      text-neutral-700 
      hover:bg-white hover:scale-110 hover:shadow-lg 
      active:scale-95 
      disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none
      transition-all duration-300 ease-out
      flex items-center justify-center
      z-50
      ${className}
    `}
  >
    {children}
  </button>
);

// --- Основной компонент ---
const IssuuReader: React.FC<IssuuReaderProps> = ({ pdfUrl, images }) => {
  const { pages, isLoading, error } = usePagesSource(pdfUrl, images);
  const totalPages = pages.length;

  const [currentIndex, setCurrentIndex] = useState(0); 
  const [scale, setScale] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGridView, setIsGridView] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isRestoring, setIsRestoring] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewAreaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
      setScale(1);
      setPanPosition({x: 0, y: 0});
  }, [currentIndex]);

  // --- Логика Навигации (Исправлена под обложки) ---
  const nextPage = () => {
    if (isLoading) return;
    if (isMobile) {
      if (currentIndex < totalPages - 1) setCurrentIndex(c => c + 1);
    } else {
      // Desktop:
      // 0 (Cover) -> 1 (Pages 1-2 internally, usually labeled 2-3)
      // 1 (Spread) -> 3
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
      // Desktop:
      // 1 (Spread) -> 0 (Cover)
      // 3 (Spread) -> 1
      if (currentIndex === 1) {
         setCurrentIndex(0);
      } else {
         const prev = currentIndex - 2;
         if (prev >= 1) setCurrentIndex(prev);
      }
    }
  };

  // --- Zoom / Pan Logic ---
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (!viewAreaRef.current) return;
        const rect = viewAreaRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - rect.width / 2;
        const mouseY = e.clientY - rect.top - rect.height / 2;
        const delta = e.deltaY * -0.01;
        const newScale = Math.min(Math.max(scale + delta, 1), 4);
        if (newScale === scale) return;
        const scaleRatio = newScale / scale;
        const newX = mouseX - (mouseX - panPosition.x) * scaleRatio;
        const newY = mouseY - (mouseY - panPosition.y) * scaleRatio;
        setIsRestoring(false);
        setScale(newScale);
        setPanPosition({ x: newX, y: newY });
        if (newScale <= 1) setPanPosition({x:0, y:0});
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
      if (e.key === 'Escape') { setIsFullscreen(false); setIsGridView(false); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isLoading]);

  const checkBounds = useCallback(() => {
    if (!contentRef.current || !viewAreaRef.current) return;
    if (scale <= 1) { setIsRestoring(true); setPanPosition({ x: 0, y: 0 }); return; }
    const containerRect = viewAreaRef.current.getBoundingClientRect();
    const contentWidth = contentRef.current.offsetWidth * scale;
    const contentHeight = contentRef.current.offsetHeight * scale;
    const maxOffsetX = Math.max(0, (contentWidth - containerRect.width) / 2);
    const maxOffsetY = Math.max(0, (contentHeight - containerRect.height) / 2);
    let newX = panPosition.x; let newY = panPosition.y;
    if (newX > maxOffsetX) newX = maxOffsetX; if (newX < -maxOffsetX) newX = -maxOffsetX;
    if (newY > maxOffsetY) newY = maxOffsetY; if (newY < -maxOffsetY) newY = -maxOffsetY;
    if (newX !== panPosition.x || newY !== panPosition.y) { setIsRestoring(true); setPanPosition({ x: newX, y: newY }); }
  }, [scale, panPosition]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isLoading) return;
    if (scale > 1) { setIsDragging(true); setIsRestoring(false); setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y }); e.preventDefault(); }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) { e.preventDefault(); setPanPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); }
  };
  const handleMouseUp = () => { setIsDragging(false); checkBounds(); };

  // --- Рендеринг видимых страниц ---
  const cursorStyle = scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default';
  const transitionStyle = isDragging ? 'none' : (isRestoring ? 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'transform 0.1s ease-out');

  const visiblePages = useMemo(() => {
    if (isLoading || pages.length === 0) return [null, null];
    
    // Mobile: 1 page
    if (isMobile) return [pages[currentIndex]];

    // Desktop:
    // Index 0: [null, Page0] (Cover on Right)
    if (currentIndex === 0) return [null, pages[0]];
    
    // Index 1+: [Page1, Page2] (Spread)
    return [pages[currentIndex], pages[currentIndex + 1] || null];
  }, [isMobile, currentIndex, pages, isLoading]);

  const pageWidth = isMobile ? 'calc(100vw - 40px)' : '400px';
  // Аспект страницы: если картинки нестандартные, можно поменять здесь
  const aspectRatio = '1 / 1.414'; 

  // Рассчет для блокировки кнопки Next
  // Если Desktop: последний индекс это либо (Total-1) если нечетное, либо (Total-2)
  const maxPagesIndex = isMobile ? totalPages - 1 : (totalPages % 2 === 0 ? totalPages - 2 : totalPages - 1);
  // Но если страниц 4 (0,1,2,3). Cover(0). Spread(1,2). Back(3).
  // 0 -> 1 -> 3. Max index is 3.

  return (
    <>
      <GlobalStyles />
      <div 
        ref={containerRef}
        className={`flex flex-col bg-[#f5f5f5] overflow-hidden relative transition-all duration-500 font-sans ${isFullscreen ? 'h-screen w-screen fixed inset-0 z-[10000]' : 'w-full rounded-[2rem] shadow-2xl border border-white'}`}
        style={{ 
            height: isFullscreen ? '100vh' : (isMobile ? '65vh' : '720px'),
            backgroundImage: 'radial-gradient(circle at 50% 50%, #ffffff 0%, #f3f4f6 100%)' 
        }}
      >
        {/* Header Controls */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20 pointer-events-none">
          <div className="bg-white/80 backdrop-blur-md border border-white/50 px-4 py-2 rounded-full shadow-sm pointer-events-auto flex items-center gap-3">
            <div className="bg-neutral-900 text-white p-1.5 rounded-full"><BookOpen size={14} /></div>
            <span className="font-medium text-sm text-neutral-800 tracking-wide hidden sm:inline">
                {images ? 'Preview Mode' : 'PDF Viewer'}
            </span>
            <div className="w-px h-4 bg-neutral-300 mx-1"></div>
            <span className="text-xs font-bold text-neutral-500">
               {isLoading ? "..." : isMobile ? `${currentIndex + 1} / ${totalPages}` : 
                 (currentIndex === 0 ? `Cover / ${totalPages}` : `${currentIndex}-${Math.min(currentIndex + 1, totalPages)} / ${totalPages}`)
               }
            </span>
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <GlassButton onClick={() => setIsGridView(true)} title="Pages" disabled={isLoading}><Grid size={18} /></GlassButton>
            <GlassButton onClick={() => document.fullscreenElement ? document.exitFullscreen() : containerRef.current?.requestFullscreen().then(()=>setIsFullscreen(true)).catch(()=>{})} title="Fullscreen">
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </GlassButton>
          </div>
        </div>

        {/* --- View Area --- */}
        <div 
          ref={viewAreaRef}
          className={`flex-1 relative overflow-hidden flex items-center justify-center p-4 ${cursorStyle}`}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        >
          {error ? (
              <div className="text-red-500 text-center text-sm md:text-lg p-6 bg-white rounded-xl shadow-lg border border-red-200 max-w-md">
                  <p className="font-bold mb-2">Ошибка</p>
                  <p>{error}</p>
              </div>
          ) : isLoading ? (
              <div className="text-center text-neutral-500">
                  <div className="w-10 h-10 rounded-full border-4 border-neutral-300 border-t-neutral-800 animate-spin mb-4 mx-auto"></div>
                  <p className="text-sm font-medium tracking-widest uppercase">Загрузка...</p>
              </div>
          ) : (
            <div 
              ref={contentRef}
              className="relative will-change-transform flex justify-center items-center shadow-2xl transition-shadow duration-300"
              style={{ 
                transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${scale})`,
                transition: transitionStyle,
                width: isMobile ? pageWidth : `calc(${pageWidth} * 2)`,
                aspectRatio: isMobile ? aspectRatio : '1.414 / 1', 
              }}
            >
              {/* Left Slot (Desktop Only) */}
              <div className={`relative h-full ${isMobile ? 'hidden' : 'w-1/2'} bg-transparent flex items-center justify-end`}>
                {visiblePages[0] ? (
                  <PageContent key={`left-${visiblePages[0].id}`} data={visiblePages[0]!} isLeft={true} />
                ) : (
                  // Пустое место (для обложки слева пусто)
                  <div className="w-full h-full bg-transparent" /> 
                )}
                
                {/* Зона клика "Назад" */}
                {scale <= 1 && (currentIndex > 0) && (
                  <div onClick={prevPage} className="absolute inset-y-0 left-0 w-1/3 cursor-pointer z-30 hover:bg-gradient-to-r hover:from-black/5 hover:to-transparent transition-all" title="Назад" />
                )}
              </div>

              {/* Right Slot (Or Main Mobile Slot) */}
              <div className={`relative h-full ${isMobile ? 'w-full shadow-lg' : 'w-1/2'} bg-transparent flex items-center justify-start`}>
                  {visiblePages[1] ? (
                    <PageContent key={`right-${visiblePages[1].id}`} data={visiblePages[1]!} isLeft={false} />
                  ) : (
                     // Если страницы нет (конец), показываем пустоту или заднюю обложку (если логика приведет сюда)
                     // УБРАНА НАДПИСЬ "КОНЕЦ"
                     <div className="w-full h-full bg-transparent" />
                  )}

                  {/* Зона клика "Вперед" */}
                  {scale <= 1 && (
                    <div 
                        onClick={() => {
                            if (isMobile) {
                                if (currentIndex < totalPages - 1) nextPage();
                            } else {
                                // На десктопе разрешаем клик, если есть куда идти
                                if (currentIndex + (currentIndex === 0 ? 1 : 2) < totalPages) nextPage();
                            }
                        }} 
                        className={`absolute inset-y-0 right-0 w-1/3 z-30 transition-all ${
                            (isMobile ? currentIndex < totalPages - 1 : currentIndex + 1 < totalPages) 
                            ? 'cursor-pointer hover:bg-gradient-to-l hover:from-black/5 hover:to-transparent' 
                            : 'cursor-default'
                        }`} 
                        title="Вперед" 
                    />
                  )}
              </div>
            </div>
          )}
        </div>

        {/* --- Footer Controls --- */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-4 z-20 pointer-events-none">
          <div className="bg-white/80 backdrop-blur-xl border border-white/60 p-2 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.1)] flex items-center gap-2 pointer-events-auto">
            <GlassButton onClick={prevPage} disabled={currentIndex === 0 || isLoading} className="w-10 h-10"><ChevronLeft size={20} /></GlassButton>
            <div className="w-px h-6 bg-neutral-300/50 mx-1"></div>
            <GlassButton onClick={() => { setIsRestoring(true); setScale(s => Math.max(s - 0.5, 1.0)); }} className="w-10 h-10 border-none shadow-none bg-transparent hover:bg-neutral-100" disabled={isLoading}><ZoomOut size={18} /></GlassButton>
            <span className="w-10 text-center text-xs font-bold text-neutral-600 select-none min-w-[40px]">{Math.round(scale * 100)}%</span>
            <GlassButton onClick={() => { setIsRestoring(true); setScale(s => Math.min(s + 0.5, 4.0)); }} className="w-10 h-10 border-none shadow-none bg-transparent hover:bg-neutral-100" disabled={isLoading}><ZoomIn size={18} /></GlassButton>
            <div className="w-px h-6 bg-neutral-300/50 mx-1"></div>
            <GlassButton onClick={nextPage} disabled={isMobile ? currentIndex >= totalPages - 1 : currentIndex >= totalPages - 2} className="w-10 h-10"><ChevronRight size={20} /></GlassButton>
          </div>
        </div>

        {/* --- Grid Overlay --- */}
        {isGridView && (
          <div className="absolute inset-0 bg-white/95 z-40 backdrop-blur-sm flex flex-col p-6 animate-fade-in no-scrollbar">
            <div className="flex justify-between items-center mb-6 max-w-6xl mx-auto w-full">
              <h3 className="text-2xl font-light text-neutral-800">Все страницы</h3>
              <GlassButton onClick={() => setIsGridView(false)}><X size={20} /></GlassButton>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-6xl mx-auto pb-20">
                {pages.map((page, idx) => (
                  <div key={page.id} onClick={() => { setCurrentIndex(idx === 0 ? 0 : (idx % 2 !== 0 ? idx : idx - 1)); setIsGridView(false); }} className={`cursor-pointer group relative aspect-[1/1.414] transition-all hover:-translate-y-1`}>
                    <div className="w-full h-full bg-white rounded-lg shadow-md overflow-hidden relative border border-neutral-200 group-hover:ring-2 ring-neutral-400">
                      {page.image ? (
                        <img src={page.image} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">Loading...</div>
                      )}
                    </div>
                    <div className="mt-2 text-center text-xs text-neutral-500 font-medium">{idx + 1}</div>
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