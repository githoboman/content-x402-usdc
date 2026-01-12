'use client';

import React, { useEffect, useState } from 'react';
import { openContractCall } from '@stacks/connect';
import {
    fetchCallReadOnlyFunction,
    uintCV,
    cvToValue,
    PostConditionMode,
    standardPrincipalCV
} from '@stacks/transactions';
import { CONFIG } from '../../lib/config';
import GradientBackground from '../../components/GradientBackground';
import Navigation from '../../components/Navigation';
import Link from 'next/link';
import { userSession } from '../../lib/stacks';

interface Article {
    id: number;
    title: string;
    author: string;
    priceUsd: number;
    category: string;
    contentHash: string;
    isPurchased: boolean;
}

export default function TestBuyPage() {
    const [loading, setLoading] = useState(true);
    const [latestArticle, setLatestArticle] = useState<Article | null>(null);
    const [userAddress, setUserAddress] = useState<string | null>(null);
    const [buying, setBuying] = useState(false);

    useEffect(() => {
        if (userSession.isUserSignedIn()) {
            setUserAddress(userSession.loadUserData().profile.stxAddress.testnet);
        }
        fetchLatestArticle();
    }, []);

    const fetchLatestArticle = async () => {
        try {
            setLoading(true);

            // Get total articles
            const stats = await fetchCallReadOnlyFunction({
                contractAddress: CONFIG.deployer,
                contractName: CONFIG.contractName,
                functionName: 'get-platform-stats',
                functionArgs: [],
                network: CONFIG.network,
                senderAddress: CONFIG.deployer,
            });

            const statsVal = cvToValue(stats);
            const total = Number(statsVal?.['total-articles']?.value || 0);

            if (total === 0) {
                setLatestArticle(null);
                setLoading(false);
                return;
            }

            // Fetch latest article
            const articleData = await fetchCallReadOnlyFunction({
                contractAddress: CONFIG.deployer,
                contractName: CONFIG.contractName,
                functionName: 'get-article',
                functionArgs: [uintCV(total)],
                network: CONFIG.network,
                senderAddress: userAddress || CONFIG.deployer,
            });

            const rawArticle = cvToValue(articleData);
            if (rawArticle && rawArticle.value) {
                const val = rawArticle.value;

                // Check if purchased
                let isPurchased = false;
                if (userAddress) {
                    try {
                        const purchaseCheck = await fetchCallReadOnlyFunction({
                            contractAddress: CONFIG.deployer,
                            contractName: CONFIG.contractName,
                            functionName: 'has-purchased',
                            functionArgs: [uintCV(total), standardPrincipalCV(userAddress)],
                            network: CONFIG.network,
                            senderAddress: userAddress,
                        });
                        const pVal = cvToValue(purchaseCheck);
                        isPurchased = pVal === true || pVal?.value === true;
                    } catch (e) {
                        console.log("Could not check purchase status", e);
                    }
                }

                setLatestArticle({
                    id: total,
                    title: val.title.value,
                    author: val.author.value,
                    priceUsd: Number(val['price-usd'].value),
                    category: val.category.value,
                    contentHash: val['content-hash'].value,
                    isPurchased
                });
            }
        } catch (e) {
            console.error("Error fetching article:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleBuy = async () => {
        if (!latestArticle) return;

        setBuying(true);
        const options = {
            contractAddress: CONFIG.deployer,
            contractName: CONFIG.contractName,
            functionName: 'purchase-with-stx',
            functionArgs: [uintCV(latestArticle.id)],
            network: CONFIG.network,
            postConditionMode: PostConditionMode.Allow,
            onFinish: (data: any) => {
                alert(`✅ Purchase Complete!\n\nTxID: ${data.txId}\n\nWait ~1 minute then reload this page to see unlocked content.`);
                setBuying(false);
            },
            onCancel: () => {
                setBuying(false);
            },
        };

        await openContractCall(options);
    };

    if (loading) {
        return (
            <GradientBackground>
                <Navigation />
                <div className="flex min-h-screen items-center justify-center text-white pt-24">
                    Loading...
                </div>
            </GradientBackground>
        );
    }

    if (!latestArticle) {
        return (
            <GradientBackground>
                <Navigation />
                <main className="flex min-h-screen flex-col items-center p-8 md:p-24 pt-24">
                    <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex mb-12">
                        <Link href="/" className="text-white underline">← Back to Home</Link>
                    </div>
                    <div className="w-full max-w-2xl bg-yellow-900/20 border border-yellow-500/30 p-8 rounded-2xl text-center">
                        <h2 className="text-2xl font-bold text-yellow-200 mb-4">⚠️ No Articles Found</h2>
                        <p className="text-yellow-300 mb-6">You need to publish an article first before you can buy it.</p>
                        <Link
                            href="/test-publish"
                            className="inline-block py-3 px-6 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg"
                        >
                            Go to Test Publish Page
                        </Link>
                    </div>
                </main>
            </GradientBackground>
        );
    }

    return (
        <GradientBackground>
            <Navigation />
            <main className="flex min-h-screen flex-col items-center p-8 md:p-24 pt-24">
                <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex mb-12">
                    <Link href="/" className="fixed left-0 top-0 flex w-full justify-center border-b border-white/10 bg-black/20 pb-6 pt-8 backdrop-blur-2xl lg:static lg:w-auto lg:rounded-xl lg:border lg:p-4 hover:bg-white/10 transition-colors">
                        ← Back to Home
                    </Link>
                </div>

                <div className="w-full max-w-2xl">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-8">
                        <h1 className="text-4xl font-extrabold text-white mb-6">
                            🧪 Test Buying
                        </h1>

                        <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg mb-6">
                            <p className="text-blue-200 text-sm">
                                <strong>Step 2 of 2:</strong> Buy the latest published article
                            </p>
                        </div>

                        <div className="bg-black/30 rounded-lg p-6 mb-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-white font-bold text-xl mb-2">{latestArticle.title}</h3>
                                    <p className="text-gray-400 text-sm">Article #{latestArticle.id}</p>
                                    <p className="text-gray-400 text-sm">By: {latestArticle.author.slice(0, 8)}...</p>
                                </div>
                                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded-full">
                                    {latestArticle.category}
                                </span>
                            </div>

                            <div className="border-t border-white/10 pt-4">
                                <p className="text-white font-bold text-2xl mb-2">
                                    ${(latestArticle.priceUsd / 100).toFixed(2)} USD
                                </p>
                                <p className="text-gray-400 text-xs">≈ 1.00 STX (if Oracle is set correctly)</p>
                            </div>
                        </div>

                        {latestArticle.isPurchased ? (
                            <div className="bg-green-900/20 border border-green-500/30 p-6 rounded-lg">
                                <h3 className="text-green-200 font-bold mb-3">🔓 Content Unlocked!</h3>
                                <div className="bg-black/30 p-4 rounded font-mono text-sm">
                                    <p className="text-green-400 mb-2">✅ You own this content</p>
                                    <p className="text-gray-300">Content Hash:</p>
                                    <p className="text-white break-all">{latestArticle.contentHash}</p>
                                </div>
                                <p className="text-xs text-gray-400 mt-4">
                                    In a real app, this would fetch and display the actual content from IPFS.
                                </p>
                                <button
                                    onClick={fetchLatestArticle}
                                    className="mt-4 w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg"
                                >
                                    🔄 Refresh Article
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-lg mb-6">
                                    <p className="text-red-200 text-sm">
                                        🔒 Content is locked. Purchase to unlock.
                                    </p>
                                </div>

                                <button
                                    onClick={handleBuy}
                                    disabled={buying}
                                    className="w-full py-4 px-6 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                                >
                                    {buying ? '📡 Buying...' : '💳 Buy with STX'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </GradientBackground>
    );
}
