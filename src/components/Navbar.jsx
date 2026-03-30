import React, { useState } from "react";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const menuItems = [
    { name: "Agent Swarm", view: "swarm" },
    { name: "Credit Mesh", view: "mesh" },
    { name: "TCN Agent", view: "tcn" },
    { name: "Decision", view: "decision" },
    { name: "Merchant", view: "shopkeeper" },
];

export function Navbar({ onNavigate, lang, onToggleLang }) {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, "change", (latest) => {
        setScrolled(latest > 50);
    });

    return (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "py-2" : "py-4"}`}>
            <nav
                className={`mx-auto max-w-7xl px-4 md:px-8 transition-all duration-300 ${scrolled
                    ? "bg-black/40 backdrop-blur-xl border border-white/10 rounded-full mx-4 mt-2"
                    : "bg-transparent border-transparent"
                    }`}
            >
                <div className="flex items-center justify-between h-14">
                    {/* Logo */}
                    <div
                        className="flex items-center gap-2.5 cursor-pointer"
                        onClick={() => onNavigate && onNavigate('home')}
                    >
                        <div className="w-8 h-8 rounded-lg bg-[var(--cyber-green)] flex items-center justify-center text-black font-bold text-xl">T</div>
                        <div className="flex flex-col">
                            <span className="font-bold text-lg tracking-wider text-white leading-none">TrustAI</span>
                            <span className="text-[8px] text-gray-500 tracking-widest uppercase leading-none mt-0.5">Powered by Paytm MCP</span>
                        </div>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-5">
                        {menuItems.map((item) => (
                            <a
                                key={item.name}
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    onNavigate && onNavigate(item.view);
                                }}
                                className="text-sm font-medium text-gray-300 hover:text-[var(--cyber-green)] transition-colors relative group"
                            >
                                {item.name}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--cyber-green)] transition-all group-hover:w-full"></span>
                            </a>
                        ))}

                        {/* Hindi Toggle */}
                        <button
                            onClick={() => onToggleLang && onToggleLang()}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-400 hover:text-white transition-colors border border-white/5"
                            title="Toggle Hindi / English"
                        >
                            {lang === 'hi' ? 'EN' : 'HI'}
                        </button>

                        <button
                            onClick={() => onNavigate && onNavigate('dashboard')}
                            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors border border-white/5"
                        >
                            Login
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden text-white"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        {isOpen ? <X /> : <Menu />}
                    </button>
                </div>

                {/* Mobile Menu Overlay */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="absolute top-full left-0 w-full bg-black/95 backdrop-blur-xl border-t border-white/10 py-6 md:hidden rounded-b-2xl shadow-xl"
                        >
                            <div className="flex flex-col items-center gap-6">
                                {menuItems.map((item) => (
                                    <a
                                        key={item.name}
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onNavigate && onNavigate(item.view);
                                            setIsOpen(false);
                                        }}
                                        className="text-lg font-medium text-gray-300 hover:text-[var(--cyber-green)]"
                                    >
                                        {item.name}
                                    </a>
                                ))}
                                <button
                                    onClick={() => {
                                        onToggleLang && onToggleLang();
                                        setIsOpen(false);
                                    }}
                                    className="text-sm font-medium text-gray-400 hover:text-white"
                                >
                                    {lang === 'hi' ? 'Switch to English' : 'Switch to Hindi'}
                                </button>
                                <button
                                    onClick={() => {
                                        onNavigate && onNavigate('dashboard');
                                        setIsOpen(false);
                                    }}
                                    className="text-lg font-medium text-white hover:text-[var(--cyber-green)]"
                                >
                                    Login
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>
        </header>
    );
}
