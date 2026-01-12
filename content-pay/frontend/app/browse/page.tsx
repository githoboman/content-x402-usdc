'use client';

import Navigation from '../../components/Navigation';
import GradientBackground from '../../components/GradientBackground';
import ArticleFeed from '../../components/ArticleFeed';

export default function BrowsePage() {
    return (
        <GradientBackground>
            <Navigation />

            <main className="min-h-screen pt-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-4xl font-extrabold text-white mb-3">
                            Browse Content
                        </h1>
                        <p className="text-gray-300">
                            Discover and purchase articles. Click "View & Buy" to see details and purchase options.
                        </p>
                    </div>

                    <ArticleFeed />
                </div>
            </main>
        </GradientBackground>
    );
}
