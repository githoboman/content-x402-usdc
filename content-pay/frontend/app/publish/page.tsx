'use client';

import React from 'react';
import PublishArticle from '../../components/PublishArticle';
import GradientBackground from '../../components/GradientBackground';
import Link from 'next/link';

export default function PublishPage() {
    return (
        <GradientBackground>
            <main className="flex min-h-screen flex-col items-center p-8 md:p-24">
                <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex mb-12">
                    <Link href="/" className="fixed left-0 top-0 flex w-full justify-center border-b border-white/10 bg-black/20 pb-6 pt-8 backdrop-blur-2xl lg:static lg:w-auto lg:rounded-xl lg:border lg:p-4 hover:bg-white/10 transition-colors">
                        ← Back to Home
                    </Link>
                </div>

                <div className="flex flex-col items-center justify-center w-full max-w-md">
                    <PublishArticle />
                </div>
            </main>
        </GradientBackground>
    );
}
