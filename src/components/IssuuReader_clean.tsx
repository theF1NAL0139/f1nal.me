// =============================================
// IssuuReader_clean.tsx   (pdf.js 3.9.179 READY)
// =============================================
import React from "react";
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
} from "pdfjs-dist";

// --- ВАЖНО ---
// pdf.worker.min.js в версии 3.9.179 ИМЕННО ТАКОЙ путь.
// Можно заменить на локальный /pdf.worker.min.js
GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.9.179/pdf.worker.min.js";

type PdfPageData = {
  id: number;
  image: string;
  width: number;
  height: number;
};

// =======================================================
// БЕЛЫЙ КРОП (обложка)
// =======================================================
const trimWhite = (canvas: HTMLCanvasElement, tolerance = 245) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const w = canvas.width;
  const h = canvas.height;
  const data = ctx.getImageData(0, 0, w, h).data;

  let left = w,
    right = 0,
    top = h,
    bottom = 0,
    found = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a === 0) continue;

      const max = Math.max(r, g, b);

      if (max < tolerance) {
        found = true;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }

  if (!found) return canvas;

  const pad = Math.round(Math.min(w, h) * 0.01);

  left = Math.max(0, left - pad);
  top = Math.max(0, top - pad);
  right = Math.min(w - 1, right + pad);
  bottom = Math.min(h - 1, bottom + pad);

  const cw = right - left + 1;
  const ch = bottom - top + 1;

  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;

  const outCtx = out.getContext("2d");
  if (!outCtx) return canvas;

  outCtx.drawImage(canvas, left, top, cw, ch, 0, 0, cw, ch);

  return out;
};

// =======================================================
// ГЛАВНЫЙ КОМПОНЕНТ
// =======================================================
export default function IssuuReader({ pdfUrl }: { pdfUrl: string }) {
  const [pages, setPages] = React.useState<PdfPageData[]>([]);
  const [index, setIndex] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setErr(null);
        setLoading(true);

        const pdf: PDFDocumentProxy = await getDocument(pdfUrl).promise;

        const num = pdf.numPages;
        const out: PdfPageData[] = [];

        for (let i = 1; i <= num; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2 });

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          if (!ctx) continue;

          // --- ВАЖНО --- pdf.js 3.x НЕ ИСПОЛЬЗУЕТ параметр canvas
          await page.render({
            canvasContext: ctx,
            viewport,
          }).promise;

          let finalCanvas = canvas;

          // кропим только обложки
          if (i === 1 || i === num) {
            finalCanvas = trimWhite(finalCanvas, 245);
          }

          out.push({
            id: i,
            image: finalCanvas.toDataURL("image/jpeg", 0.95),
            width: finalCanvas.width,
            height: finalCanvas.height,
          });
        }

        if (!cancelled) {
          setPages(out);
          setIndex(0);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) setErr("Ошибка загрузки PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  if (loading)
    return (
      <div className="w-full py-10 text-center text-sm text-neutral-500">
        Загрузка...
      </div>
    );

  if (err || pages.length === 0)
    return (
      <div className="w-full py-10 text-center text-sm text-red-500">
        {err ?? "Нет страниц"}
      </div>
    );

  const page = pages[index];

  return (
    <div className="w-full flex flex-col items-center gap-4">

      {/* Страница */}
      <div className="w-full max-w-[900px] bg-white shadow rounded-xl overflow-hidden">
        <img src={page.image} className="w-full h-auto object-contain" />
      </div>

      {/* Навигация */}
      <div className="flex items-center gap-4 text-sm">
        <button
          onClick={() => setIndex(i => Math.max(0, i - 1))}
          disabled={index === 0}
          className="px-3 py-1 border rounded disabled:opacity-40"
        >
          ◀
        </button>

        <span>
          Стр. {index + 1} / {pages.length}
        </span>

        <button
          onClick={() => setIndex(i => Math.min(pages.length - 1, i + 1))}
          disabled={index === pages.length - 1}
          className="px-3 py-1 border rounded disabled:opacity-40"
        >
          ▶
        </button>
      </div>
    </div>
  );
}
