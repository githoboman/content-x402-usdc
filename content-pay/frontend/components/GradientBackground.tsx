'use client';

import React from 'react';

export default function GradientBackground({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-slate-900 text-white selection:bg-indigo-500 selection:text-white">
            {/* Gradient Orbs */}
            <div className="fixed top-0 left-0 -z-10 h-full w-full">
                <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-purple-500/30 blur-[120px]" />
                <div className="absolute top-[20%] right-[-10%] h-[400px] w-[400px] rounded-full bg-indigo-500/30 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[20%] h-[600px] w-[600px] rounded-full bg-blue-500/30 blur-[120px]" />
            </div>

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}
