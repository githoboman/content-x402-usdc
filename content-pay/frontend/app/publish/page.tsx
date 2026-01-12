'use client';

import React, { useState } from 'react';
import { openContractCall } from '@stacks/connect';
import { uintCV, stringAsciiCV, PostConditionMode } from '@stacks/transactions';
import { CONFIG } from '../../lib/config';
import Navigation from '../../components/Navigation';
import GradientBackground from '../../components/GradientBackground';
import Link from 'next/link';

export default function PublishPage() {
    const [formData, setFormData] = useState({
        title: '',
        url: '',
        price: '',
        category: 'Technology'
    });
    const [publishing, setPublishing] = useState(false);
    const [lastTxId, setLastTxId] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPublishing(true);

        const priceInCents = Math.round(parseFloat(formData.price) * 100);

        const options = {
            contractAddress: CONFIG.deployer,
            contractName: CONFIG.contractName,
            functionName: 'publish-article',
            functionArgs: [
                stringAsciiCV(formData.title),
                stringAsciiCV(formData.url),
                uintCV(priceInCents),
                stringAsciiCV(formData.category)
            ],
            network: CONFIG.network,
            postConditionMode: PostConditionMode.Allow,
            onFinish: (data: any) => {
                setLastTxId(data.txId);
                setPublishing(false);
                setFormData({ title: '', url: '', price: '', category: 'Technology' });
            },
            onCancel: () => {
                setPublishing(false);
            },
        };

        await openContractCall(options);
    };

    const categories = ['Technology', 'Finance', 'Art', 'Science', 'Education', 'Entertainment', 'Other'];

    return (
        <GradientBackground>
            <Navigation />

            <main className="min-h-screen pt-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-4xl font-extrabold text-white mb-3">
                            Publish Article
                        </h1>
                        <p className="text-gray-300">
                            Share your content with the world. Set your own price and earn directly from readers.
                        </p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
                        {lastTxId && (
                            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-6">
                                <p className="text-green-200 font-medium mb-2">✅ Article Published!</p>
                                <p className="text-xs text-green-300/80 mb-3 break-all">
                                    Transaction: {lastTxId}
                                </p>
                                <Link
                                    href="/browse"
                                    className="inline-block px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-all"
                                >
                                    View in Browse →
                                </Link>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Article Title
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                                    placeholder="Enter article title..."
                                    required
                                    maxLength={256}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Content URL / Hash
                                </label>
                                <input
                                    type="text"
                                    value={formData.url}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                    className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none font-mono text-sm"
                                    placeholder="ipfs://... or QmXxx..."
                                    required
                                    maxLength={64}
                                />
                                <p className="text-xs text-gray-500 mt-1">IPFS hash or URL where content is stored</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Price (USD)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3 text-gray-400">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full pl-8 pr-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                                        placeholder="1.50"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">You keep 97%, platform takes 3%</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Category
                                </label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                                >
                                    {categories.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={publishing}
                                className="w-full py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg"
                            >
                                {publishing ? '📡 Publishing...' : '✍️ Publish Article'}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </GradientBackground>
    );
}
