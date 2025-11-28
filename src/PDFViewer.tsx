import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Maximize, Minimize, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Grid, X, BookOpen, Eye, EyeOff 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Document, Page, pdfjs } from 'react-pdf';

// Настройка воркера (обязательно для React-PDF)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

// --- GLOBAL STYLES ---
const PDF_STYLES = `
.react-pdf__Page__canvas {
    display: block;
    user-select: none;
    pointer-events: none;
    width: 100% !important; 
    height: auto !important;
}
.react-pdf__Page__textContent, 
.react-pdf__Page__annotations {
    display: none !important;
}
.pdf-container::-webkit-scrollbar {
    display: none;
}
.pdf-container {
    scrollbar-width: none;
}
`;

// --- UI COMPONENTS ---
const GlassButton = ({ onClick, disabled, children, className = "", title }: any) => (
  <button 
    onClick={onClick} disabled={disabled} title={title}
    className={`p-2 lg:p-3 rounded-full bg-white/60 backdrop-blur-md border border-white/50 shadow-sm text-neutral-700 hover:bg-white hover:scale-105 hover:shadow-md active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center z-50 ${className}`}
  >
    {children}
  </button>
);

// --- SMART PAGE COMPONENT (THE CORE MAGIC) ---
// Реализует Double Buffering: держит старую страницу видимой, пока новая грузится в фоне.
const SmartPage = ({ 
    pageNumber, 
    width, 
    targetScale,
    direction // 1 (Next) или -1 (Prev)
}: { 
    pageNumber: number, 
    width: number, 
    targetScale: number,
    direction: number
}) => {
    const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('A');
    
    // Состояние слотов: какая страница и с каким качеством там сейчас живет
    const [stateA, setStateA] = useState({ page: pageNumber, scale: targetScale });
    const [stateB, setStateB] = useState({ page: pageNumber, scale: targetScale });

    // Реф, чтобы не переключать слоты, если рендер не был инициирован сменой пропсов
    const isPendingRef = useRef(false);

    // 1. При изменении пропсов (новая страница или новое качество) грузим в НЕАКТИВНЫЙ слот
    useEffect(() => {
        const activeState = activeSlot === 'A' ? stateA : stateB;
        
        // Если пропсы отличаются от того, что сейчас на экране
        if (pageNumber !== activeState.page || targetScale !== activeState.scale) {
            isPendingRef.current = true;
            if (activeSlot === 'A') {
                setStateB({ page: pageNumber, scale: targetScale });
            } else {
                setStateA({ page: pageNumber, scale: targetScale });
            }
        }
    }, [pageNumber, targetScale, activeSlot, stateA, stateB]);

    // 2. Callback вызывается react-pdf когда рендеринг в Canvas завершен
    const handleRenderSuccess = useCallback(() => {
        if (!isPendingRef.current) return;

        // Если скрытый слот загрузил нужные данные -> делаем его активным
        if (activeSlot === 'A' && stateB.page === pageNumber && stateB.scale === targetScale) {
            setActiveSlot('B');
            isPendingRef.current = false;
        } 
        else if (activeSlot === 'B' && stateA.page === pageNumber && stateA.scale === targetScale) {
            setActiveSlot('A');
            isPendingRef.current = false;
        }
    }, [activeSlot, stateA, stateB, pageNumber, targetScale]);

    // Генерация классов для анимации (Fade + Slide)
    const getSlotStyles = (slotName: 'A' | 'B') => {
        const isActive = activeSlot === slotName;
        const isPageChange = stateA.page !== stateB.page;
        
        // Базовые стили
        const baseStyle: React.CSSProperties = {
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'white',
            transition: 'opacity 0.5s ease-out, transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
            willChange: 'opacity, transform',
            zIndex: isActive ? 10 : 1,
            opacity: isActive ? 1 : 0,
        };

        if (isActive) {
            return { ...baseStyle, transform: 'translateX(0px)' };
        }

        // Логика для скрытого слота (откуда он выезжает?)
        if (isPageChange) {
            // Если листаем вперед, новая страница выезжает справа (50px), иначе слева (-50px)
            // Старая страница остается на месте (0px), просто исчезает opacity
            const xOffset = direction === 1 ? '50px' : '-50px';
            return { ...baseStyle, transform: `translateX(${xOffset})` };
        } else {
            // Если это просто смена качества (зум), сдвига нет, только opacity
            return { ...baseStyle, transform: 'translateX(0px)' };
        }
    };

    return (
        <div className="relative bg-white shadow-sm overflow-hidden" style={{ width, minHeight: width * 1.414 }}>
            {/* SLOT A */}
            <div style={getSlotStyles('A')}>
                <Page 
                    pageNumber={stateA.page} 
                    width={width} 
                    scale={stateA.scale}
                    onRenderSuccess={handleRenderSuccess}
                    loading={null}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                />
            </div>

            {/* SLOT B */}
            <div style={getSlotStyles('B')}>
                <Page 
                    pageNumber={stateB.page} 
                    width={width} 
                    scale={stateB.scale}
                    onRenderSuccess={handleRenderSuccess}
                    loading={null}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                />
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const PDFViewer = ({ pdfUrl }: { pdfUrl: string }) => {
    // Inject Styles
    useEffect(() => {
        const styleSheet = document.createElement("style");
        styleSheet.innerText = PDF_STYLES;
        document.head.appendChild(styleSheet);
        return () => { document.head.removeChild(styleSheet); };
    }, []);

    const containerRef = useRef<HTMLDivElement>(null);

    // PDF Info
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageIndex, setPageIndex] = useState(0); 

    // Transform State
    const getDevicePixelRatio = () => typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    const [scale, setScale] = useState(1);
    const [pdfRenderScale, setPdfRenderScale] = useState(getDevicePixelRatio() * 2); // Start High Quality
    const [position, setPosition] = useState({ x: 0, y: 0 });
    
    // UI State
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isGridView, setIsGridView] = useState(false);
    const [showUI, setShowUI] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [direction, setDirection] = useState(1); // 1 = Forward, -1 = Backward
    
    const dragStartRef = useRef({ x: 0, y: 0 });
    const qualityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // --- INITIAL SETUP ---
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if(mobile) setShowUI(false);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // --- SMART ZOOM LOGIC ---
    const updateQualitySmart = (newVisualScale: number) => {
        if (qualityTimeoutRef.current) clearTimeout(qualityTimeoutRef.current);
        
        qualityTimeoutRef.current = setTimeout(() => {
            const dpr = getDevicePixelRatio();
            const neededScale = newVisualScale * dpr;

            // Гистерезис: обновляем качество только если текущее стало мыльным 
            // или слишком избыточным (для экономии памяти)
            if (neededScale > pdfRenderScale || neededScale < pdfRenderScale / 2) {
                // Ставим с запасом 20%, чтобы при микро-зуме не перерисовывать снова
                setPdfRenderScale(Math.max(neededScale * 1.2, dpr)); 
            }
        }, 600);
    };

    const handleWheel = useCallback((e: React.WheelEvent | WheelEvent) => {
        if (!e.ctrlKey) return; 
        e.preventDefault(); e.stopPropagation();

        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const mouseX = (e as any).clientX - rect.left;
        const mouseY = (e as any).clientY - rect.top;

        const delta = -(e.deltaY * 0.002); 
        const targetScale = Math.min(Math.max(scale + delta * scale, 0.5), 4);

        const contentX = (mouseX - position.x - (rect.width / 2)) / scale;
        const contentY = (mouseY - position.y - (rect.height / 2)) / scale;

        const newX = mouseX - (contentX * targetScale) - (rect.width / 2);
        const newY = mouseY - (contentY * targetScale) - (rect.height / 2);

        setScale(targetScale);
        setPosition({ x: newX, y: newY });
        
        updateQualitySmart(targetScale);

    }, [scale, position, pdfRenderScale]);

    // Attach passive: false listener
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        el.addEventListener('wheel', handleWheel as any, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel as any);
    }, [handleWheel]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    };
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        setPosition({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
    };
    const handleMouseUp = () => setIsDragging(false);

    const resetTransform = () => {
        setScale(1); setPosition({ x: 0, y: 0 });
        setPdfRenderScale(getDevicePixelRatio() * 2);
    };

    const toggleFullscreen = async () => { 
        if (!isFullscreen) { containerRef.current?.requestFullscreen?.(); setIsFullscreen(true); } 
        else { document.exitFullscreen?.(); setIsFullscreen(false); }
        setTimeout(resetTransform, 100);
    };

    // --- NAVIGATION ---
    const maxIndex = useMemo(() => {
        if (!numPages) return 0;
        return isMobile ? numPages - 1 : Math.ceil((numPages - 1) / 2); 
    }, [numPages, isMobile]);

    const nextPage = () => { 
        if (pageIndex < maxIndex) { 
            setDirection(1); 
            setPageIndex(p => p + 1); 
            resetTransform(); 
        }
    };
    const prevPage = () => { 
        if (pageIndex > 0) { 
            setDirection(-1); 
            setPageIndex(p => p - 1); 
            resetTransform(); 
        }
    };

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isGridView) return;
            if (e.key === 'ArrowRight') nextPage();
            if (e.key === 'ArrowLeft') prevPage();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pageIndex, numPages, isGridView]);

    // Calculating current pages to show
    const currentPages = useMemo(() => {
        if (!numPages) return [];
        if (isMobile) return [pageIndex + 1];
        if (pageIndex === 0) return [1];
        const left = pageIndex * 2;
        const right = left + 1;
        return right <= numPages ? [left, right] : [left];
    }, [pageIndex, numPages, isMobile]);

    // Calculating layout metrics
    const viewAreaWidth = containerRef.current?.offsetWidth || 1000;
    const padding = isFullscreen ? 0 : 32;
    const baseWidth = viewAreaWidth - padding;
    
    const pdfPageWidth = useMemo(() => {
        if (isMobile) return baseWidth;
        if ((pageIndex === 0 && !isMobile) || currentPages.length === 2) return (baseWidth - 20) / 2;
        return baseWidth;
    }, [baseWidth, isMobile, pageIndex, currentPages]);

    return (
        <div 
            ref={containerRef}
            className={`flex flex-col bg-[#f0f0f0] overflow-hidden relative transition-all duration-500 font-sans pdf-container ${isFullscreen ? 'fixed inset-0 z-[10000] h-screen w-screen' : 'w-full rounded-[20px] shadow-xl border border-white/50'}`}
            style={{ 
                height: isFullscreen ? '100vh' : (isMobile ? '65vh' : '1000px'),
                backgroundImage: 'radial-gradient(circle at 50% 50%, #ffffff 0%, #e5e5e5 100%)',
                cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        >
             {/* --- HEADER --- */}
            <div className="absolute top-4 left-4 right-4 flex justify-between z-20 pointer-events-none">
                <div className={`transition-opacity duration-300 ${showUI ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="bg-white/90 backdrop-blur border border-black/5 px-4 py-2 rounded-full shadow-sm pointer-events-auto flex items-center gap-3">
                        <BookOpen size={16} className="text-neutral-700"/>
                        <span className="font-medium text-sm text-neutral-800 hidden sm:inline">PDF Viewer</span>
                        <div className="w-px h-4 bg-neutral-300"></div>
                        <span className="text-xs font-bold text-neutral-500 font-mono">
                            {currentPages.length > 1 ? `${currentPages[0]}-${currentPages[1]}` : currentPages[0] || 1} / {numPages || '-'}
                        </span>
                    </div>
                </div>

                <div className="flex gap-2 pointer-events-auto">
                    <div className={`flex gap-2 transition-all duration-300 ${showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        <GlassButton onClick={() => setIsGridView(true)}><Grid size={18} /></GlassButton>
                        <GlassButton onClick={toggleFullscreen}>
                            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                        </GlassButton>
                    </div>
                    <GlassButton onClick={() => setShowUI(!showUI)} className={!showUI ? "bg-white/80" : ""}>
                        {showUI ? <EyeOff size={18} /> : <Eye size={18} />}
                    </GlassButton>
                </div>
            </div>

            {/* --- CONTENT AREA --- */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center w-full h-full">
                
                {numPages && (
                    <>
                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 z-30 transition-all ${pageIndex > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <GlassButton onClick={(e: any) => { e.stopPropagation(); prevPage(); }} className="w-14 h-14 p-0 rounded-full hover:scale-110"><ChevronLeft size={32}/></GlassButton>
                        </div>
                        <div className={`absolute right-4 top-1/2 -translate-y-1/2 z-30 transition-all ${pageIndex < maxIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <GlassButton onClick={(e: any) => { e.stopPropagation(); nextPage(); }} className="w-14 h-14 p-0 rounded-full hover:scale-110"><ChevronRight size={32}/></GlassButton>
                        </div>
                    </>
                )}

                {/* ZOOM LAYER (TRANSFORM) */}
                <motion.div 
                    className="flex shadow-2xl origin-center will-change-transform"
                    style={{ x: position.x, y: position.y, scale: scale }}
                    transition={{ duration: isDragging ? 0 : 0.3, ease: "easeOut" }}
                >
                    <Document
                        file={pdfUrl}
                        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                        loading={
                            <div className="flex items-center gap-2 p-10">
                                <div className="w-8 h-8 rounded-full border-2 border-neutral-300 border-t-black animate-spin"/>
                            </div>
                        }
                        className="flex justify-center gap-2"
                    >
                        {/* Мы используем СТАБИЛЬНЫЕ КЛЮЧИ (slot-1, slot-2) вместо номеров страниц.
                           Это критично для SmartPage: компонент не должен пересоздаваться, 
                           он должен просто получить новые пропсы и запустить анимацию внутри себя.
                        */}
                        
                        {/* SLOT 1 (Left or Mobile) */}
                        {currentPages[0] && (
                             <SmartPage 
                                key="slot-1" 
                                pageNumber={currentPages[0]}
                                width={pdfPageWidth}
                                targetScale={pdfRenderScale}
                                direction={direction}
                            />
                        )}

                        {/* SLOT 2 (Right - Desktop only) */}
                        {!isMobile && currentPages[1] && (
                             <SmartPage 
                                key="slot-2"
                                pageNumber={currentPages[1]}
                                width={pdfPageWidth}
                                targetScale={pdfRenderScale}
                                direction={direction}
                            />
                        )}
                    </Document>
                </motion.div>
            </div>

            {/* --- CONTROLS --- */}
            <div className={`absolute bottom-6 w-full flex justify-center pointer-events-none z-20 transition-opacity duration-300 ${showUI ? 'opacity-100' : 'opacity-0'}`}>
                <div className="bg-white/80 backdrop-blur-md border border-white/50 p-2 rounded-full shadow-lg flex items-center gap-4 pointer-events-auto">
                    <GlassButton onClick={prevPage} disabled={pageIndex === 0}><ChevronLeft size={20}/></GlassButton>
                    <div className="flex gap-1 items-center px-2">
                        <button onClick={() => {
                            const newScale = Math.max(0.5, scale - 0.5);
                            setScale(newScale);
                            updateQualitySmart(newScale);
                        }} className="p-2 hover:bg-black/5 rounded-full"><ZoomOut size={16}/></button>
                        
                        <span className="w-12 text-center text-xs font-bold font-mono text-neutral-600">
                            {Math.round(scale * 100)}%
                        </span>
                        
                        <button onClick={() => {
                            const newScale = Math.min(4, scale + 0.5);
                            setScale(newScale);
                            updateQualitySmart(newScale);
                        }} className="p-2 hover:bg-black/5 rounded-full"><ZoomIn size={16}/></button>
                    </div>
                    <GlassButton onClick={nextPage} disabled={pageIndex === maxIndex}><ChevronRight size={20}/></GlassButton>
                </div>
            </div>

            {/* --- GRID VIEW OVERLAY --- */}
             <AnimatePresence>
                {isGridView && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                        className="absolute inset-0 bg-[#f5f5f5]/95 backdrop-blur z-50 flex flex-col p-8"
                    >
                         <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-light">Pages Overview</h2>
                            <button onClick={() => setIsGridView(false)} className="p-2 bg-white rounded-full hover:shadow-md transition-all"><X size={24}/></button>
                        </div>
                        <div className="overflow-y-auto flex-1 pb-10">
                             <Document file={pdfUrl} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6">
                                {Array.from(new Array(numPages), (_el, index) => (
                                    <div 
                                        key={`thumb-${index + 1}`} className="cursor-pointer group relative"
                                        onClick={() => {
                                            if (isMobile) setPageIndex(index);
                                            else setPageIndex(index === 0 ? 0 : Math.ceil(index / 2));
                                            setIsGridView(false);
                                        }}
                                    >
                                        <div className="rounded-lg overflow-hidden shadow-sm group-hover:shadow-xl group-hover:scale-105 transition-all border border-black/5 bg-white">
                                            <Page 
                                                pageNumber={index + 1} 
                                                width={200} 
                                                renderMode="canvas" 
                                                renderTextLayer={false} 
                                                renderAnnotationLayer={false}
                                            />
                                        </div>
                                        <div className="text-center mt-2 text-xs font-mono text-neutral-500">{index + 1}</div>
                                    </div>
                                ))}
                             </Document>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PDFViewer;