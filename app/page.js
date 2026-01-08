"use client";
import {useState, useRef, useEffect, useCallback} from 'react';
import {
    Send, Upload, FileText, Loader2, Bot, User, Trash2, Sparkles, 
    ChevronRight, Moon, Sun, PanelLeftClose, PanelLeftOpen, X, 
    Search, Brain, PenTool, GripVertical, Copy, Check, ArrowDown, 
    MessageSquare, Square, Activity, Command, AlertTriangle, RefreshCw
} from 'lucide-react';
import { useChat } from 'ai/react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import 'highlight.js/styles/atom-one-dark.css';
import { ingestDocument, resetMemory, checkOllamaStatus } from './actions';
import { Toaster, toast } from 'sonner';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import PdfViewer from '@/components/PdfViewer'; // Import du nouveau composant

// --- Composant CodeBlock ---
const CodeBlock = ({ children, className, ...props }) => {
    const [isCopied, setIsCopied] = useState(false);
    
    const getTextFromChildren = (children) => {
        let text = "";
        if (typeof children === "string") return children;
        if (Array.isArray(children)) return children.map(getTextFromChildren).join("");
        if (children?.props?.children) return getTextFromChildren(children.props.children);
        return "";
    };

    const handleCopy = async () => {
        const text = getTextFromChildren(children);
        if (!text) return;
        
        try {
            await navigator.clipboard.writeText(text);
            setIsCopied(true);
            toast.success("Code copié !");
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            toast.error("Erreur lors de la copie");
        }
    };

    return (
        <div className="relative group my-4 rounded-xl overflow-hidden border border-slate-700/50 shadow-lg">
            <div className="flex items-center justify-between px-4 py-2 bg-[#282c34] border-b border-slate-700">
                <span className="text-xs text-slate-400 font-mono">
                    {className?.replace('language-', '') || 'code'}
                </span>
                <button 
                    onClick={handleCopy}
                    className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    title="Copier le code"
                >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
            </div>
            <div className="overflow-auto bg-[#1e1e1e] max-h-[500px]">
                <pre {...props} className="m-0 p-4 text-xs font-mono leading-relaxed text-slate-300">
                    {children}
                </pre>
            </div>
        </div>
    );
};

// --- Composant Modal Raccourcis ---
const ShortcutsModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const shortcuts = [
        { key: "⌘ + B", desc: "Ouvrir / Fermer la barre latérale" },
        { key: "⌘ + K", desc: "Réinitialiser la conversation" },
        { key: "Esc", desc: "Arrêter la génération / Fermer" },
        { key: "?", desc: "Ouvrir ce menu d'aide" },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <Command className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Raccourcis Clavier</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-2">
                    {shortcuts.map((s, i) => (
                        <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
                            <span className="text-sm text-slate-600 dark:text-slate-300">{s.desc}</span>
                            <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-mono text-slate-500 dark:text-slate-400 min-w-[3rem] text-center shadow-sm">
                                {s.key}
                            </kbd>
                        </div>
                    ))}
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 text-center text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800">
                    Appuyez sur <kbd className="font-bold">Esc</kbd> pour fermer
                </div>
            </div>
        </div>
    );
};

// --- Composant Erreur Ollama ---
const OllamaErrorScreen = ({ onRetry }) => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-950">
        <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Ollama est déconnecté</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
            Impossible de communiquer avec le moteur d'IA local. Assurez-vous qu'Ollama est lancé sur votre machine.
        </p>
        <div className="flex flex-col gap-4 w-full max-w-xs">
            <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-left">
                <p className="text-xs font-mono text-slate-500 mb-2">Dans votre terminal :</p>
                <code className="block bg-black text-emerald-400 p-2 rounded text-sm font-mono">ollama serve</code>
            </div>
            <button 
                onClick={onRetry}
                className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
                <RefreshCw className="w-4 h-4" />
                Réessayer la connexion
            </button>
        </div>
    </div>
);

export default function Home() {
    const [file, setFile] = useState(null);
    const [fileUrl, setFileUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [ollamaStatus, setOllamaStatus] = useState(null);
    const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
    
    // Split View & Mobile Tabs
    const [splitRatio, setSplitRatio] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const [mobileTab, setMobileTab] = useState('chat');
    const splitContainerRef = useRef(null);

    // Scroll & Loading States
    const [showScrollButton, setShowScrollButton] = useState(false);
    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);

    const { messages, input, handleInputChange, handleSubmit, isLoading, error, setMessages, setInput, stop } = useChat({
        api: '/api/chat',
        onError: (e) => {
            console.error(e);
            toast.error("Erreur lors de la génération de la réponse");
        }
    });

    // --- Raccourcis Clavier ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
                e.preventDefault();
                setIsSidebarOpen(prev => !prev);
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                handleReset();
            }
            if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                e.preventDefault();
                setIsShortcutsOpen(true);
            }
            if (e.key === 'Escape') {
                if (isShortcutsOpen) {
                    setIsShortcutsOpen(false);
                } else if (isLoading) {
                    e.preventDefault();
                    stop();
                    toast.info("Génération arrêtée");
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isLoading, stop, isShortcutsOpen]);

    // --- Health Check Ollama ---
    const checkOllama = async () => {
        const status = await checkOllamaStatus();
        setOllamaStatus(status);
        return status;
    };

    useEffect(() => {
        checkOllama();
        const interval = setInterval(checkOllama, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
    };

    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom();
        }
    }, [messages, isLoading]);

    const handleScroll = () => {
        if (!chatContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollButton(!isNearBottom);
    };

    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging || !splitContainerRef.current) return;
        const containerRect = splitContainerRef.current.getBoundingClientRect();
        const newRatio = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        if (newRatio > 20 && newRatio < 80) setSplitRatio(newRatio);
    }, [isDragging]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;
        
        const loadingToast = toast.loading("Analyse des strates du document...");
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const result = await ingestDocument(formData);

            if (result.success) {
                toast.success("Document indexé avec succès !", { id: loadingToast });
                const url = URL.createObjectURL(file);
                setFileUrl(url);
                if (window.innerWidth < 1024) setMobileTab('chat');
                
                // Confettis !
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#10b981', '#34d399', '#059669']
                });

            } else {
                console.error("Erreur serveur:", result);
                toast.error(`Erreur: ${result.details || result.error}`, { id: loadingToast });
            }
        } catch (e) {
            console.error("Erreur client:", e);
            toast.error(`Erreur critique : ${e.message}`, { id: loadingToast });
        } finally {
            setUploading(false);
        }
    };

    const handleReset = async () => {
        if (!confirm("Voulez-vous vraiment tout effacer ?")) return;

        try {
            await resetMemory();
            setFile(null);
            setFileUrl(null);
            setMessages([]); 
            toast.success("Mémoire effacée");
            const fileInput = document.getElementById('file-upload');
            if (fileInput) fileInput.value = "";
        } catch (e) {
            console.error("Erreur lors du reset:", e);
            toast.error("Erreur lors de la réinitialisation");
        }
    };

    const suggestions = [
        "Fais-moi un résumé du document",
        "Quels sont les points clés ?",
        "Explique-moi le concept principal",
        "Y a-t-il des exemples de code ?"
    ];

    return (
        <div className={`flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 overflow-hidden`}>
            <Toaster position="bottom-right" theme={darkMode ? 'dark' : 'light'} />
            
            <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />

            {/* SIDEBAR */}
            <aside 
                className={`${isSidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full lg:w-0 lg:translate-x-0'} fixed lg:relative inset-y-0 left-0 z-30 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col overflow-hidden shadow-2xl lg:shadow-none flex-shrink-0`}
            >
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between min-w-[320px]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-900 dark:bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-slate-900/20 dark:shadow-emerald-500/20">
                            <span className="text-white font-bold text-lg">S</span>
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">STRATE</h1>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 p-6 overflow-y-auto min-w-[320px]">
                    {/* Status Ollama */}
                    <div className="mb-6 flex items-center gap-2 text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                        <div className={`w-2 h-2 rounded-full ${ollamaStatus === true ? 'bg-emerald-500 animate-pulse' : ollamaStatus === false ? 'bg-red-500' : 'bg-slate-400'}`} />
                        <span className="text-slate-600 dark:text-slate-300">
                            {ollamaStatus === true ? 'Ollama Connecté' : ollamaStatus === false ? 'Ollama Déconnecté' : 'Vérification...'}
                        </span>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Document</h2>
                        
                        <AnimatePresence mode="wait">
                            {!file ? (
                                <motion.div 
                                    key="upload"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 dark:border-slate-700 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all group">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-500 transition-colors mb-2" />
                                            <p className="text-xs text-slate-500 dark:text-slate-400 text-center px-2"><span className="font-semibold">Cliquez</span> ou glissez un PDF</p>
                                        </div>
                                        <input id="file-upload" type="file" accept=".pdf" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
                                    </label>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="file"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 relative group"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-medium truncate text-slate-700 dark:text-slate-200">{file.name}</p>
                                            <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                                        </div>
                                    </div>
                                    
                                    {!fileUrl ? (
                                        <button
                                            onClick={handleUpload}
                                            disabled={uploading}
                                            className="w-full py-2 bg-slate-900 dark:bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
                                        >
                                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyser"}
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                            Indexé et prêt
                                        </div>
                                    )}

                                    <button 
                                        onClick={handleReset}
                                        className="absolute -top-2 -right-2 bg-white dark:bg-slate-700 text-slate-400 hover:text-red-500 p-1.5 rounded-full shadow-sm border border-slate-100 dark:border-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Supprimer le fichier"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div>
                        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Paramètres</h2>
                        <button 
                            onClick={() => setDarkMode(!darkMode)}
                            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                            <span className="flex items-center gap-2">
                                {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                Mode {darkMode ? 'Sombre' : 'Clair'}
                            </span>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${darkMode ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${darkMode ? 'left-6' : 'left-1'}`} />
                            </div>
                        </button>
                    </div>
                </div>
                
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 min-w-[320px] flex justify-between items-center text-xs text-slate-400">
                    <span>Strate v1.0 • Local AI</span>
                    <button 
                        onClick={() => setIsShortcutsOpen(true)}
                        className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        title="Raccourcis Clavier (⌘K)"
                    >
                        <Command className="w-4 h-4" />
                    </button>
                </div>
            </aside>

            {/* Overlay Mobile pour la sidebar */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col h-full relative overflow-hidden">
                
                {/* Header */}
                <header className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 bg-white dark:bg-slate-900 z-10 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
                            title={isSidebarOpen ? "Fermer (⌘B)" : "Ouvrir (⌘B)"}
                        >
                            {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
                        </button>
                        <span className={`font-medium text-slate-700 dark:text-slate-200 ${isSidebarOpen ? 'lg:hidden' : ''}`}>Strate</span>
                    </div>
                    
                    {/* Mobile Tabs Control */}
                    {fileUrl && (
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg lg:hidden">
                            <button 
                                onClick={() => setMobileTab('document')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${mobileTab === 'document' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
                            >
                                Document
                            </button>
                            <button 
                                onClick={() => setMobileTab('chat')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${mobileTab === 'chat' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
                            >
                                Chat
                            </button>
                        </div>
                    )}
                </header>

                {/* OLLAMA ERROR STATE */}
                {ollamaStatus === false ? (
                    <OllamaErrorScreen onRetry={checkOllama} />
                ) : (
                    /* Split View Container */
                    <div className="flex-1 flex overflow-hidden relative" ref={splitContainerRef}>
                        
                        {/* PDF Viewer */}
                        {fileUrl && (
                            <div 
                                className={`
                                    bg-slate-200 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 relative
                                    ${mobileTab === 'document' ? 'block w-full' : 'hidden'} 
                                    lg:block
                                `}
                                style={{ width: window.innerWidth >= 1024 ? `${splitRatio}%` : '100%' }}
                            >
                                {/* Utilisation du composant PdfViewer */}
                                <PdfViewer url={fileUrl} />
                                
                                {isDragging && <div className="absolute inset-0 z-50 bg-transparent" />}
                            </div>
                        )}

                        {/* Resizer Handle */}
                        {fileUrl && (
                            <div
                                className="hidden lg:flex w-4 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 cursor-col-resize items-center justify-center absolute z-30 h-full transition-colors group"
                                style={{ left: `calc(${splitRatio}% - 8px)` }}
                                onMouseDown={handleMouseDown}
                            >
                                <div className="w-1 h-8 bg-slate-300 dark:bg-slate-600 rounded-full group-hover:bg-emerald-500 transition-colors flex items-center justify-center">
                                    <GripVertical className="w-3 h-3 text-white opacity-0 group-hover:opacity-100" />
                                </div>
                            </div>
                        )}

                        {/* Chat Area */}
                        <div 
                            className={`
                                flex-1 flex flex-col bg-white dark:bg-slate-900 relative h-full
                                ${mobileTab === 'chat' ? 'block w-full' : 'hidden'} 
                                lg:flex
                            `}
                            style={{ width: (fileUrl && window.innerWidth >= 1024) ? `${100 - splitRatio}%` : '100%' }}
                        >
                            
                            {/* Messages Wrapper */}
                            <div className="flex-1 relative overflow-hidden flex flex-col">
                                <div 
                                    className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth"
                                    ref={chatContainerRef}
                                    onScroll={handleScroll}
                                >
                                    {messages.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 animate-in fade-in zoom-in-95 duration-500">
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6">
                                                <Sparkles className="w-8 h-8 text-emerald-500" />
                                            </div>
                                            <p className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-2">Bonjour !</p>
                                            <p className="text-sm text-slate-400 mb-8 text-center max-w-xs">Je suis prêt à analyser vos documents. Uploadez un PDF pour commencer.</p>
                                            
                                            {fileUrl && (
                                                <div className="grid grid-cols-1 gap-3 w-full max-w-md">
                                                    {suggestions.map((s, i) => (
                                                        <button 
                                                            key={i}
                                                            onClick={() => setInput(s)}
                                                            className="text-left text-sm p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md rounded-xl transition-all group"
                                                        >
                                                            <span className="group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{s}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {messages.map((msg, i) => (
                                        <div key={i} className={`flex gap-4 group ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-900 dark:bg-emerald-600' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700'}`}>
                                                {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                                            </div>
                                            
                                            <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm overflow-hidden ${
                                                msg.role === 'user' 
                                                    ? 'bg-slate-900 dark:bg-emerald-600 text-white rounded-tr-sm' 
                                                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-sm'
                                            }`}>
                                                <div className={`prose prose-sm max-w-none dark:prose-invert ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                                                    <ReactMarkdown 
                                                        rehypePlugins={[rehypeHighlight]}
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            pre: ({node, ...props}) => <CodeBlock {...props} />,
                                                            code: ({node, inline, className, children, ...props}) => {
                                                                return !inline ? (
                                                                    <code className={className} {...props}>{children}</code>
                                                                ) : (
                                                                    <code className={`${msg.role === 'user' ? 'bg-white/10 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200'} px-1.5 py-0.5 rounded-md text-xs font-mono font-medium border border-transparent`} {...props}>
                                                                        {children}
                                                                    </code>
                                                                )
                                                            },
                                                            p: ({node, children}) => {
                                                                const isLastMessage = i === messages.length - 1;
                                                                const isAssistant = msg.role === 'assistant';
                                                                const isLoadingState = isLoading && isLastMessage && isAssistant;
                                                                return <p className={isLoadingState ? "cursor-blink" : ""}>{children}</p>
                                                            }
                                                        }}
                                                    >
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                                        <div className="flex gap-4 animate-in fade-in duration-300">
                                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                                                <Bot className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 animate-pulse">
                                                    <Search className="w-3 h-3" />
                                                    <span>Recherche dans le document...</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 animate-pulse delay-700">
                                                    <Brain className="w-3 h-3" />
                                                    <span>Analyse du contexte...</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 animate-pulse delay-1000">
                                                    <PenTool className="w-3 h-3" />
                                                    <span>Rédaction de la réponse...</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Bouton Scroll to Bottom */}
                                {showScrollButton && (
                                    <button
                                        onClick={scrollToBottom}
                                        className="absolute bottom-4 right-6 p-2 bg-slate-900 dark:bg-emerald-600 text-white rounded-full shadow-lg hover:scale-110 transition-transform animate-in fade-in slide-in-from-bottom-2 z-20"
                                        title="Retour en bas"
                                    >
                                        <ArrowDown className="w-5 h-5" />
                                    </button>
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
                                <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
                                    <textarea
                                        value={input}
                                        onChange={handleInputChange}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSubmit(e);
                                            }
                                        }}
                                        placeholder="Posez votre question..."
                                        className="flex-1 bg-transparent border-none rounded-lg px-3 py-2 focus:ring-0 outline-none resize-none min-h-[44px] max-h-[150px] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 text-sm"
                                        rows={1}
                                        style={{ height: 'auto', minHeight: '44px' }}
                                    />
                                    
                                    {isLoading ? (
                                        <button
                                            type="button"
                                            onClick={stop}
                                            className="p-2.5 rounded-lg mb-0.5 bg-red-500 text-white hover:bg-red-600 hover:shadow-md active:scale-95 transition-all duration-200"
                                            title="Arrêter (Esc)"
                                        >
                                            <Square className="w-4 h-4 fill-current" />
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            disabled={!input.trim()}
                                            className={`p-2.5 rounded-lg mb-0.5 transition-all duration-200 ${
                                                !input.trim() 
                                                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400' 
                                                    : 'bg-slate-900 dark:bg-emerald-600 text-white hover:shadow-md active:scale-95'
                                            }`}
                                            title="Envoyer"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    )}
                                </form>
                                <p className="text-center text-[10px] text-slate-400 mt-2">Strate AI peut faire des erreurs.</p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}