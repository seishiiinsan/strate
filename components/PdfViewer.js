"use client";
import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configuration du worker (essentiel pour react-pdf)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PdfViewer({ url }) {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [loading, setLoading] = useState(true);
    const containerRef = useRef(null);

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
        setLoading(false);
    }

    // Ajuster le zoom pour fitter la largeur au chargement
    useEffect(() => {
        if (containerRef.current) {
            const width = containerRef.current.offsetWidth;
            // Estimation grossière : une page A4 fait ~600px de large à scale 1
            // On veut que ça prenne 90% de la largeur
            setScale(Math.min(1.2, (width * 0.9) / 600)); 
        }
    }, [url]);

    // Calcul de la progression
    const progress = numPages ? (pageNumber / numPages) * 100 : 0;

    return (
        <div className="flex flex-col h-full bg-slate-200 dark:bg-slate-900 relative">
            
            {/* Barre de progression réelle */}
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-300 dark:bg-slate-800 z-20">
                <div 
                    className="h-full bg-emerald-500 transition-all duration-300 ease-out" 
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Toolbar Flottante */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-slate-900/90 text-white px-4 py-2 rounded-full shadow-xl backdrop-blur-sm transition-opacity hover:opacity-100 opacity-80">
                <button 
                    onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                    disabled={pageNumber <= 1}
                    className="p-1 hover:bg-white/20 rounded disabled:opacity-30"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                
                <span className="text-xs font-medium min-w-[3rem] text-center">
                    {pageNumber} / {numPages || '--'}
                </span>

                <button 
                    onClick={() => setPageNumber(p => Math.min(numPages || 1, p + 1))}
                    disabled={pageNumber >= (numPages || 1)}
                    className="p-1 hover:bg-white/20 rounded disabled:opacity-30"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>

                <div className="w-px h-4 bg-white/20 mx-1" />

                <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1 hover:bg-white/20 rounded">
                    <ZoomOut className="w-3 h-3" />
                </button>
                <button onClick={() => setScale(s => Math.min(2.0, s + 0.1))} className="p-1 hover:bg-white/20 rounded">
                    <ZoomIn className="w-3 h-3" />
                </button>
            </div>

            {/* Zone de rendu PDF */}
            <div 
                className="flex-1 overflow-auto flex justify-center p-8" 
                ref={containerRef}
            >
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
                        <span className="text-sm text-slate-500">Chargement du PDF...</span>
                    </div>
                )}

                <Document
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={null}
                    className="shadow-2xl"
                >
                    <Page 
                        pageNumber={pageNumber} 
                        scale={scale} 
                        renderTextLayer={false} 
                        renderAnnotationLayer={false}
                        className="rounded-lg overflow-hidden bg-white"
                        loading={null}
                    />
                </Document>
            </div>
        </div>
    );
}