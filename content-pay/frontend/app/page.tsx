'use client';

import Navigation from '../components/Navigation';
import GradientBackground from '../components/GradientBackground';
import Link from 'next/link';
import { userSession } from '../lib/stacks';
import { useEffect, useState } from 'react';

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setIsConnected(userSession.isUserSignedIn());
  }, []);

  return (
    <GradientBackground>
      <Navigation />

      <main className="min-h-screen pt-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl sm:text-7xl font-extrabold text-white mb-6">
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Content Pay
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Decentralized content marketplace powered by Stacks blockchain.
              Publish, discover, and purchase content with STX, sBTC, or USDCx.
            </p>

            {!isConnected && (
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4 max-w-2xl mx-auto mb-8">
                <p className="text-yellow-200 text-sm">
                  ⚠️ Connect your wallet to get started
                </p>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/browse"
                className="px-8 py-4 text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl shadow-xl transition-all transform hover:scale-105"
              >
                📚 Browse Content
              </Link>
              <Link
                href="/publish"
                className="px-8 py-4 text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl shadow-xl transition-all transform hover:scale-105"
              >
                ✍️ Publish Article
              </Link>
            </div>
          </div>

          {/* How It Works */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
              <div className="text-4xl mb-4">✍️</div>
              <h3 className="text-xl font-bold text-white mb-2">Publish</h3>
              <p className="text-gray-300 text-sm">
                Writers set their own prices and publish content to the blockchain. No middlemen, full control.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-white mb-2">Discover</h3>
              <p className="text-gray-300 text-sm">
                Browse articles by category. See prices upfront. Pay only for what interests you.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="text-xl font-bold text-white mb-2">Purchase</h3>
              <p className="text-gray-300 text-sm">
                Pay with STX, sBTC, or USDCx. One payment unlocks content forever. Fully decentralized.
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Platform Features</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-gray-300">
              <div className="flex items-start gap-3">
                <span className="text-green-400 text-xl">✓</span>
                <div>
                  <strong className="text-white">Multi-Token Support</strong>
                  <p className="text-sm">Pay with STX, sBTC, or USDCx</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 text-xl">✓</span>
                <div>
                  <strong className="text-white">Permanent Access</strong>
                  <p className="text-sm">One-time purchase, lifetime ownership</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 text-xl">✓</span>
                <div>
                  <strong className="text-white">Writer Freedom</strong>
                  <p className="text-sm">Set your own prices, keep 97% revenue</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-400 text-xl">✓</span>
                <div>
                  <strong className="text-white">Blockchain Verified</strong>
                  <p className="text-sm">All transactions on Stacks blockchain</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links for Testing */}
          <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-3">🧪 Quick Testing</h3>
            <p className="text-gray-300 text-sm mb-4">
              Test the complete flow with one-click pages:
            </p>
            <div className="flex gap-4">
              <Link
                href="/test-publish"
                className="flex-1 py-2 px-4 bg-green-600/20 hover:bg-green-600/30 text-green-200 font-medium rounded-lg border border-green-500/30 transition-all text-center text-sm"
              >
                Test Publish
              </Link>
              <Link
                href="/test-buy"
                className="flex-1 py-2 px-4 bg-orange-600/20 hover:bg-orange-600/30 text-orange-200 font-medium rounded-lg border border-orange-500/30 transition-all text-center text-sm"
              >
                Test Buy
              </Link>
            </div>
          </div>
        </div>
      </main>
    </GradientBackground>
  );
}
