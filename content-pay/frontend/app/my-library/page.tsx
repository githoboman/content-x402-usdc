'use client';

import React, { useEffect, useState } from 'react';
import {
    fetchCallReadOnlyFunction,
    uintCV,
    cvToValue,
    standardPrincipalCV
} from '@stacks/transactions';
import { CONFIG } from '../../lib/config';
import Navigation from '../../components/Navigation';
import GradientBackground from '../../components/GradientBackground';
import Link from 'next/link';
import { userSession } from '../../lib/stacks';

interface PurchasedArticle {
    id: number;
    title: string;
    author: string;
    priceUsd: number;
    category: string;
    contentHash: string;
}

export default function MyLibraryPage() {
    const [loading, setLoading] = useState(true);
    const [articles, setArticles] = useState<PurchasedArticle[]>([]);
    const [userAddress, setUserAddress] = useState<string | null>(null);

    useEffect(() => {
        if (userSession.isUserSignedIn()) {
            const userData = userSession.loadUserData();
            setUserAddress(userData.profile.stxAddress.testnet);
            fetchPurchasedArticles(userData.profile.stxAddress.testnet);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchPurchasedArticles = async (address: string) => {
        try {
            setLoading(true);

            // Get total articles
            const stats = await fetchCallReadOnlyFunction({
                contractAddress: CONFIG.deployer,
                contractName: CONFIG.contractName,
                functionName: 'get-platform-stats',
                functionArgs: [],
                network: CONFIG.network,
                senderAddress: address,
            });

            const statsVal = cvToValue(stats);
            const total = Number(statsVal?.['total-articles']?.value || 0);

            const purchased: PurchasedArticle[] = [];

            // Check each article for purchase status
            for (let i = 1; i <= total; i++) {
                try {
                    const hasPurchased = await fetchCallReadOnlyFunction({
                        contractAddress: CONFIG.deployer,
                        contractName: CONFIG.contractName,
                        functionName: 'has-purchased',
                        functionArgs: [uintCV(i), standardPrincipalCV(address)],
                        network: CONFIG.network,
                        senderAddress: address,
                    });

                    const purchased Val = cvToValue(hasPurchased);

                    if (purchasedVal === true || purchasedVal?.value === true) {
                        // Fetch article details
                        const articleData = await fetchCallReadOnlyFunction({
                            contractAddress: CONFIG.deployer,
                            contractName: CONFIG.contractName,
                            functionName: 'get-article',
                            functionArgs: [uintCV(i)],
                            network: CONFIG.network,
                            senderAddress: address,
                        });

                        const rawArticle = cvToValue(articleData);
                        if (rawArticle && rawArticle.value) {
                            const val = rawArticle.value;
                            purchased.push({
                                id: i,
                                title: val.title.value,
                                author: val.author.value,
                                priceUsd: Number(val['price-usd'].value),
                                category: val.category.value,
                                contentHash: val['content-hash'].value,
                            });
                        }
                    }
                } catch (e) {
                    console.log(`Error checking article ${i}:`, e);
                }
            }

            setArticles(purchased);
        } catch (e) {
            console.error("Error fetching purchased articles:", e);
        } finally {
            setLoading(false);
        }
    };

    if (!userAddress) {
        return (
            <GradientBackground>
                <Navigation />

                <main className="min-h-screen pt-24 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-2xl mx-auto text-center">
                        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-2xl p-8">
                            <div className="text-4xl mb-4">🔒</div>
                            <h2 className="text-2xl font-bold text-yellow-200 mb-3">
                                Wallet Not Connected
                            </h2>
                            <p className="text-yellow-300/80 mb-6">
                                Connect your wallet to view your purchased content.
                            </p>
                            <p className="text-xs text-gray-400">
                                Use the "Connect Wallet" button in the navigation bar above.
                            </p>
                        </div>
                    </div>
                </main>
            </GradientBackground>
        );
    }

    if (loading) {
        return (
            <GradientBackground>
                <Navigation />
                <div className="min-h-screen pt-24 flex items-center justify-center">
                    <div className="text-white text-xl">Loading your library...</div>
                </div>
            </GradientBackground>
        );
    }

    return (
        <GradientBackground>
            <Navigation />

            <main className="min-h-screen pt-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-4xl font-extrabold text-white mb-3">
                            My Library
                        </h1>
                        <p className="text-gray-300">
                            Content you've purchased. You own these articles forever.
                        </p>
                    </div>

                    {articles.length === 0 ? (
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-12 text-center">
                            <div className="text-6xl mb-4">📖</div>
                            <h3 className="text-2xl font-bold text-white mb-3">
                                Your Library is Empty
                            </h3>
                            <p className="text-gray-300 mb-6">
                                Browse and purchase articles to build your collection.
                            </p>
                            <Link
                                href="/browse"
                                className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all"
                            >
                                Browse Content
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {articles.map((article) => (
                                <div key={article.id} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-xl font-bold text-white">
                                                    {article.title}
                                                </h3>
                                                <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded-full">
                                                    {article.category}
                                                </span>
                                            </div>
                                            <p className="text-gray-400 text-sm mb-4">
                                                By {article.author.slice(0, 10)}...
                                            </p>

                                            <div className="bg-black/40 rounded-lg p-4 border border-green-500/30">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-green-400 text-xl">🔓</span>
                                                    <span className="text-green-200 font-medium">Content Unlocked</span>
                                                </div>
                                                <p className="text-xs text-gray-400 mb-1">Content Hash:</p>
                                                <p className="text-white font-mono text-xs break-all">
                                                    {article.contentHash}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <div className="text-right">
                                                <div className="text-gray-400 text-xs">Paid</div>
                                                <div className="text-white font-bold">
                                                    ${(article.priceUsd / 100).toFixed(2)}
                                                </div>
                                            </div>
                                            <Link
                                                href={`/article/${article.id}`}
                                                className="px-4 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-sm font-medium rounded-lg border border-indigo-500/30 transition-all text-center"
                                            >
                                                View Details
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </GradientBackground>
    );
}
