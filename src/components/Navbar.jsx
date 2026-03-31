import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const menuItems = [
    { name: "Apply", view: "apply", highlight: true },
    { name: "Swarm", view: "swarm" },
    { name: "Decision", view: "decision" },
    { name: "Graph", view: "mesh" },
    { name: "Compare", view: "compare" },
    { name: "Merchant", view: "shopkeeper" },
];

export function Navbar({ onNavigate, lang, onToggleLang }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <header className="fixed top-0 left-0 right-0 z-[100] bg-zinc-950 border-b border-zinc-800/60">
            <nav className="mx-auto max-w-5xl px-5 md:px-8">
                <div className="flex items-center justify-between h-14">
                    {/* Logo */}
                    <div
                        className="flex items-center gap-2 cursor-pointer select-none"
                        onClick={() => onNavigate && onNavigate('home')}
                    >
                        <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                            <path d="M16 4L28 26H4L16 4Z" stroke="#10b981" strokeWidth="2.5" fill="none" />
                            <circle cx="16" cy="4" r="2.5" fill="#10b981" />
                            <circle cx="4" cy="26" r="2.5" fill="#10b981" />
                            <circle cx="28" cy="26" r="2.5" fill="#10b981" />
                        </svg>
                        <span className="font-semibold text-base text-white">TrustAI</span>
                    </div>

                    {/* Desktop */}
                    <div className="hidden md:flex items-center gap-5">
                        {menuItems.map((item) => (
                            <button
                                key={item.name}
                                onClick={() => onNavigate && onNavigate(item.view)}
                                className={item.highlight
                                    ? "text-[13px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                                    : "text-[13px] text-zinc-500 hover:text-white transition-colors"
                                }
                            >
                                {item.name}
                            </button>
                        ))}

                        <div className="w-px h-4 bg-zinc-800" />

                        <button
                            onClick={() => onToggleLang && onToggleLang()}
                            className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors"
                        >
                            {lang === 'hi' ? 'EN' : 'HI'}
                        </button>

                        <button
                            onClick={() => onNavigate && onNavigate('dashboard')}
                            className="text-[13px] text-zinc-400 hover:text-white transition-colors"
                        >
                            Login
                        </button>
                    </div>

                    {/* Mobile */}
                    <button
                        className="md:hidden text-zinc-400 hover:text-white p-1"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {isOpen
                                ? <path d="M18 6L6 18M6 6l12 12" />
                                : <path d="M4 6h16M4 12h16M4 18h16" />
                            }
                        </svg>
                    </button>
                </div>
            </nav>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="md:hidden bg-zinc-950 border-t border-zinc-800 overflow-hidden"
                    >
                        <div className="flex flex-col items-center gap-4 py-5">
                            {menuItems.map((item) => (
                                <button
                                    key={item.name}
                                    onClick={() => { onNavigate && onNavigate(item.view); setIsOpen(false); }}
                                    className={item.highlight
                                        ? "text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                                        : "text-zinc-400 hover:text-white transition-colors"
                                    }
                                >
                                    {item.name}
                                </button>
                            ))}
                            <button
                                onClick={() => { onToggleLang && onToggleLang(); setIsOpen(false); }}
                                className="text-sm text-zinc-500 hover:text-white"
                            >
                                {lang === 'hi' ? 'English' : 'Hindi'}
                            </button>
                            <button
                                onClick={() => { onNavigate && onNavigate('dashboard'); setIsOpen(false); }}
                                className="text-zinc-300 hover:text-white"
                            >
                                Login
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
