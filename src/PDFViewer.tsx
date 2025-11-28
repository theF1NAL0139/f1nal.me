import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Maximize, Minimize, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Grid, X, BookOpen, Eye, EyeOff 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Document, Page, pdfjs } from 'react-pdf';

// Настройка воркера
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

// --- SMART PAGE COMPONENT ---
const VISUAL_PADDING = 50; 
const SmartPage = ({ 
    pageNumber, 
    width, 
    targetScale,
    direction
}: { 
    pageNumber: number, 
    width: number, 
    targetScale: number,
    direction: number
}) => {
    const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('A');
    const [stateA, setStateA] = useState({ page: pageNumber, scale: targetScale });
    const [stateB, setStateB] = useState({ page: pageNumber, scale: targetScale });
    const isPendingRef = useRef(false);

    useEffect(() => {
        const activeState = activeSlot === 'A' ? stateA : stateB;
        if (pageNumber !== activeState.page || targetScale !== activeState.scale) {
            isPendingRef.current = true;
            if (activeSlot === 'A') {
                setStateB({ page: pageNumber, scale: targetScale });
            } else {
                setStateA({ page: pageNumber, scale: targetScale });
            }
        }
    }, [pageNumber, targetScale, activeSlot, stateA, stateB]);

    const handleRenderSuccess = useCallback(() => {
        if (!isPendingRef.current) return;
        if (activeSlot === 'A' && stateB.page === pageNumber && stateB.scale === targetScale) {
            setActiveSlot('B');
            isPendingRef.current = false;
        } 
        else if (activeSlot === 'B' && stateA.page === pageNumber && stateA.scale === targetScale) {
            setActiveSlot('A');
            isPendingRef.current = false;
        }
    }, [activeSlot, stateA, stateB, pageNumber, targetScale]);

    const getSlotStyles = (slotName: 'A' | 'B') => {
        const isActive = activeSlot === slotName;
        const isPageChange = stateA.page !== stateB.page;
        
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

        if (isPageChange) {
            const xOffset = direction === 1 ? '50px' : '-50px';
            return { ...baseStyle, transform: `translateX(${xOffset})` };
        } else {
            return { ...baseStyle, transform: 'translateX(0px)' };
        }
    };

    return (
        <div className="relative bg-white shadow-sm overflow-hidden" style={{ width, minHeight: width * 1.414 }}>
            <div style={getSlotStyles('A')}>
                <Page 
                    pageNumber={stateA.page} width={width} scale={stateA.scale}
                    onRenderSuccess={handleRenderSuccess} loading={null}
                    renderTextLayer={false} renderAnnotationLayer={false}
                />
            </div>
            <div style={getSlotStyles('B')}>
                <Page 
                    pageNumber={stateB.page} width={width} scale={stateB.scale}
                    onRenderSuccess={handleRenderSuccess} loading={null}
                    renderTextLayer={false} renderAnnotationLayer={false}
                />
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
interface PDFViewerProps {
    pdfUrl: string;
    fileName?: string; 
}

const PDFViewer = ({ pdfUrl, fileName }: PDFViewerProps) => {
    useEffect(() => {
        const styleSheet = document.createElement("style");
        styleSheet.innerText = PDF_STYLES;
        document.head.appendChild(styleSheet);
        return () => { document.head.removeChild(styleSheet); };
    }, []);

    // --- ЛОГИКА ОПРЕДЕЛЕНИЯ ИМЕНИ ФАЙЛА ---
    const displayFileName = useMemo(() => {
        if (fileName) return fileName; 
        try {
            const cleanUrl = pdfUrl.split('?')[0];
            const nameFromUrl = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
            return decodeURIComponent(nameFromUrl) || "Document.pdf";
        } catch (e) {
            return "Document.pdf";
        }
    }, [fileName, pdfUrl]);

    const containerRef = useRef<HTMLDivElement>(null);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageIndex, setPageIndex] = useState(0); 

    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    const getDevicePixelRatio = () => typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    const [scale, setScale] = useState(1);
    
    // Изначально ставим заглушку, реальное значение выставится в useEffect
    const [pdfRenderScale, setPdfRenderScale] = useState(1); 
    const [position, setPosition] = useState({ x: 0, y: 0 });
    
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isGridView, setIsGridView] = useState(false);
    const [showUI, setShowUI] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [direction, setDirection] = useState(1);
    
    const dragStartRef = useRef({ x: 0, y: 0 });
    const positionRef = useRef({ x: 0, y: 0 }); 
    const qualityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- SETUP & UTILS ---
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            
            if (mobile) {
                setShowUI(false);
                // [FIX 1] Ограничиваем качество рендера для мобильных (макс 1.5), 
                // чтобы избежать вылетов памяти (OOM) на iOS
                setPdfRenderScale(Math.min(window.devicePixelRatio, 1.5));
            } else {
                // Для десктопа оставляем высокое качество
                setPdfRenderScale(window.devicePixelRatio * 2);
            }
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;
        const updateSize = () => {
            if (containerRef.current) {
                setContainerSize({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
        };
        const observer = new ResizeObserver(updateSize);
        observer.observe(containerRef.current);
        updateSize();
        return () => observer.disconnect();
    }, [isFullscreen]); 

    useEffect(() => {
        positionRef.current = position;
    }, [position]);

    const currentPages = useMemo(() => {
        if (!numPages) return [];
        if (isMobile) return [pageIndex + 1];
        if (pageIndex === 0) return [1];
        const left = pageIndex * 2;
        const right = left + 1;
        return right <= numPages ? [left, right] : [left];
    }, [pageIndex, numPages, isMobile]);

    const pdfPageWidth = useMemo(() => {
        const width = containerSize.width || 800;
        const height = containerSize.height || 600;
        
        const padding = isFullscreen ? 0 : 32;
        const availableWidth = width - padding;
        const availableHeight = height - (isFullscreen ? 10 : 40); 

        const PAGE_ASPECT = 1.414;
        const heightConstrainedWidth = availableHeight / PAGE_ASPECT;

        if (isMobile) {
            return Math.min(availableWidth, heightConstrainedWidth);
        }

        if ((pageIndex === 0 && !isMobile) || currentPages.length === 2) {
            const widthConstrainedWidth = (availableWidth - 20) / 2;
            return Math.min(widthConstrainedWidth, heightConstrainedWidth);
        }

        return Math.min(availableWidth, heightConstrainedWidth);

    }, [containerSize, isMobile, pageIndex, currentPages, isFullscreen]);

    // --- BOUNDARY LOGIC ---
    const getBounds = () => {
        if (!containerRef.current) return { maxX: 0, maxY: 0 };
        
        const contentWidth = isMobile || currentPages.length === 1 
            ? pdfPageWidth * scale 
            : (pdfPageWidth * 2.1 + 20) * scale;
            
        const contentHeight = (pdfPageWidth * 1.414) * scale;

        const containerW = containerSize.width;
        const containerH = containerSize.height;

        const xOverflow = contentWidth - containerW;
        const yOverflow = contentHeight - containerH;

        const maxX = xOverflow > 0 ? (xOverflow / 2) + VISUAL_PADDING : 0;
        const maxY = yOverflow > 0 ? (yOverflow / 2) + VISUAL_PADDING : 0;

        return { maxX, maxY };
    };

    // --- MOUSE HANDLERS ---
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragStartRef.current = { 
            x: e.clientX - positionRef.current.x, 
            y: e.clientY - positionRef.current.y 
        };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();

        let newX = e.clientX - dragStartRef.current.x;
        let newY = e.clientY - dragStartRef.current.y;

        const { maxX, maxY } = getBounds();

        const applyResistance = (pos: number, limit: number) => {
            if (pos > limit) return limit + (pos - limit) / 3;
            if (pos < -limit) return -limit + (pos - (-limit)) / 3;
            return pos;
        };

        newX = applyResistance(newX, maxX);
        newY = applyResistance(newY, maxY);

        setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        const { maxX, maxY } = getBounds();
        
        const clampedX = Math.min(Math.max(positionRef.current.x, -maxX), maxX);
        const clampedY = Math.min(Math.max(positionRef.current.y, -maxY), maxY);

        if (clampedX !== positionRef.current.x || clampedY !== positionRef.current.y) {
            setPosition({ x: clampedX, y: clampedY });
        }
    };

    // --- ZOOM & WHEEL ---
    const updateQualitySmart = (newVisualScale: number) => {
        // [FIX 2] На мобильных устройствах не повышаем качество рендера при зуме,
        // чтобы не перегружать память новыми тяжелыми канвасами.
        if (isMobile) return;

        if (qualityTimeoutRef.current) clearTimeout(qualityTimeoutRef.current);
        qualityTimeoutRef.current = setTimeout(() => {
            const dpr = getDevicePixelRatio();
            const neededScale = newVisualScale * dpr;
            if (neededScale > pdfRenderScale || neededScale < pdfRenderScale / 2) {
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
    }, [scale, position, pdfRenderScale, isMobile]); // added isMobile dep

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        el.addEventListener('wheel', handleWheel as any, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel as any);
    }, [handleWheel]);

    const resetTransform = () => {
        setScale(1); 
        setPosition({ x: 0, y: 0 });
        
        // [FIX 3] При сбросе зума (смена страницы) возвращаем безопасный scale для мобильных
        const baseScale = isMobile 
            ? Math.min(getDevicePixelRatio(), 1.5) 
            : getDevicePixelRatio() * 2;
            
        setPdfRenderScale(baseScale);
    };

    // --- FULLSCREEN LOGIC ---
    const toggleFullscreen = async () => {
        const container = containerRef.current;
        if (!container) return;

        if (!isFullscreen) {
            try {
                if (container.requestFullscreen) {
                    await container.requestFullscreen();
                } else if ((container as any).webkitRequestFullscreen) {
                    await (container as any).webkitRequestFullscreen();
                } else if ((container as any).mozRequestFullScreen) {
                    await (container as any).mozRequestFullScreen();
                } else if ((container as any).msRequestFullscreen) {
                    await (container as any).msRequestFullscreen();
                }
            } catch (err) {
                console.log("Native fullscreen not supported, using CSS fallback");
            }
            setIsFullscreen(true);
        } else {
            try {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if ((document as any).webkitExitFullscreen) {
                    await (document as any).webkitExitFullscreen();
                } else if ((document as any).mozCancelFullScreen) {
                    await (document as any).mozCancelFullScreen();
                } else if ((document as any).msExitFullscreen) {
                    await (document as any).msExitFullscreen();
                }
            } catch (err) {
                // Ignore errors
            }
            setIsFullscreen(false);
        }
        
        setTimeout(resetTransform, 150);
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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isGridView) return;
            if (e.key === 'ArrowRight') nextPage();
            if (e.key === 'ArrowLeft') prevPage();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pageIndex, numPages, isGridView]);

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
                        <BookOpen size={16} className="text-neutral-700 shrink-0"/>
                        <span 
                            className="font-medium text-xs sm:text-sm text-neutral-800 truncate max-w-[120px] sm:max-w-[300px]"
                            title={displayFileName}
                        >
                            {displayFileName}
                        </span>
                        
                        <div className="w-px h-4 bg-neutral-300 shrink-0"></div>
                        <span className="text-xs font-bold text-neutral-500 font-mono shrink-0">
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
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
    key={pageIndex} 
    initial={{ opacity: 0, x: direction === 1 ? 60 : -60 }}
    animate={{ 
        opacity: 1, 
        x: position.x, 
        y: position.y, 
        scale 
    }}
    exit={{ opacity: 0, x: direction === 1 ? -60 : 60 }} // На мобилках exit может вызывать пик памяти
    transition={{
        // ИЗМЕНЕНО: Упрощаем анимацию для мобильных, делаем её быстрее и без "пружины"
        x: isDragging ? { type: "tween", duration: 0 } : (isMobile ? { duration: 0.2 } : { type: "spring", stiffness: 300, damping: 30, mass: 0.8 }),
        y: isDragging ? { type: "tween", duration: 0 } : (isMobile ? { duration: 0.2 } : { type: "spring", stiffness: 300, damping: 30, mass: 0.8 }),
        scale: { duration: 0.2 },
        opacity: { duration: 0.2 }
    }}
                        className="flex origin-center will-change-transform absolute inset-0 flex items-center justify-center"
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
                            {currentPages[0] && (
                                <SmartPage 
                                    key="slot-1" pageNumber={currentPages[0]} width={pdfPageWidth} 
                                    targetScale={pdfRenderScale} direction={direction}
                                />
                            )}
                            {!isMobile && currentPages[1] && (
                                <SmartPage 
                                    key="slot-2" pageNumber={currentPages[1]} width={pdfPageWidth} 
                                    targetScale={pdfRenderScale} direction={direction}
                                />
                            )}
                        </Document>
                    </motion.div>
                </AnimatePresence>
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
                                                pageNumber={index + 1} width={200} renderMode="canvas" 
                                                renderTextLayer={false} renderAnnotationLayer={false}
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