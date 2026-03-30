import React, { lazy } from 'react';
const Spline = lazy(() => import('@splinetool/react-spline'));

export function HeroSplineBackground() {
    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'auto',
            overflow: 'hidden',
            zIndex: 0
        }}>
            <Spline
                style={{ width: '100%', height: '100%' }}
                scene="https://prod.spline.design/us3ALejTXl6usHZ7/scene.splinecode"
            />
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: `
                        linear-gradient(to right, rgba(0, 0, 0, 0.8), transparent 30%, transparent 70%, rgba(0, 0, 0, 0.8)),
                        linear-gradient(to bottom, transparent 50%, rgba(0, 0, 0, 0.9))
                    `,
                    pointerEvents: 'none',
                }}
            />
        </div>
    );
}

// HeroContent is now inlined in App.jsx — this is kept for backward compat
export function HeroContent() {
    return (
        <div className="relative z-10 text-left text-white pt-32 sm:pt-40 md:pt-48 px-4 max-w-4xl mx-auto pointer-events-none">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6 pointer-events-auto">
                <div className="w-2 h-2 rounded-full bg-[var(--cyber-green)] animate-pulse" />
                <span className="text-xs text-gray-400">Built on Paytm MCP</span>
                <span className="text-[10px] text-gray-600">|</span>
                <span className="text-[10px] text-gray-500">FIN-O-HACK 2026</span>
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-bold mb-6 leading-tight tracking-tight drop-shadow-2xl pointer-events-auto">
                TrustAI
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl mb-8 opacity-90 max-w-2xl text-gray-200 pointer-events-auto leading-relaxed">
                AI agent swarm that turns merchant transaction patterns into <span className="text-[var(--cyber-green)] font-semibold">trust scores</span> —
                enabling instant credit through Paytm's payment infrastructure.
            </p>
        </div>
    );
}

export const HeroSection = () => {
    return (
        <div className="relative w-full h-screen overflow-hidden bg-black">
            <HeroSplineBackground />
            <div className="absolute inset-0 flex justify-center items-center z-10">
                <HeroContent />
            </div>
        </div>
    );
};
