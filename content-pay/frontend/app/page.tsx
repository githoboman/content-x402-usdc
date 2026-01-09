'use client';

import ConnectWallet from '../components/ConnectWallet';
import GradientBackground from '../components/GradientBackground';
import PublishArticle from '../components/PublishArticle';
import ArticleFeed from '../components/ArticleFeed';

export default function Home() {
  return (
    <GradientBackground>
      <main className="flex min-h-screen flex-col items-center p-8 md:p-24">
        {/* Header */}
        <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex mb-12">
          <p className="fixed left-0 top-0 flex w-full justify-center border-b border-white/10 bg-black/20 pb-6 pt-8 backdrop-blur-2xl lg:static lg:w-auto lg:rounded-xl lg:border lg:p-4">
            Content Pay - Testnet Demo
          </p>
          <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-black via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
            <ConnectWallet />
          </div>
        </div>

        {/* Hero */}
        <div className="relative flex flex-col items-center text-center mb-16">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 mb-4 drop-shadow-lg">
            Hybrid Oracle Platform
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl">
            Publish in USD. Earn in Crypto. <br />
            Powered by Stacks, sBTC, and Pyth Network.
          </p>
        </div>

        {/* Content Area */}
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

          {/* Left: Publish (Writer) */}
          <div className="flex flex-col items-center space-y-8">
            <div className="w-full max-w-md">
              <div className="mb-4 flex items-center gap-2">
                <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-200 bg-indigo-900/50 rounded-full">Writer Mode</span>
              </div>
              <PublishArticle />
            </div>
          </div>

          {/* Right: Article Feed (Reader) */}
          <div className="flex flex-col items-center w-full">
            <div className="mb-4 w-full max-w-2xl flex items-center gap-2">
              <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-200 bg-green-900/50 rounded-full">Reader Mode</span>
            </div>
            <ArticleFeed />
          </div>

        </div>
      </main>
    </GradientBackground>
  );
}
