'use client';

import React, { useEffect, useState } from 'react';
import { useConnect } from '@stacks/connect-react';
import { openContractCall } from '@stacks/connect';
import {
    fetchCallReadOnlyFunction,
    uintCV,
    cvToValue,
    PostConditionMode,
    contractPrincipalCV,
    standardPrincipalCV,
} from '@stacks/transactions';
import { CONFIG, ORACLE_NAME, SBTC_NAME, USDC_NAME } from '../../../lib/config';
import GradientBackground from '../../../components/GradientBackground';
import Link from 'next/link';
import { userSession } from '../../../lib/stacks';

interface Article {
    id: number;
    title: string;
    author: string;
    priceUsd: number;
    category: string;
    contentHash: string;
    isPurchased: boolean;
}

export default function ArticlePage({ params }: { params: { id: string } }) {
    const { id } = params;
    const articleId = parseInt(id);
    const [article, setArticle] = useState<Article | null>(null);
    const [loading, setLoading] = useState(true);
    const [userAddress, setUserAddress] = useState<string | null>(null);

    useEffect(() => {
        if (userSession.isUserSignedIn()) {
            setUserAddress(userSession.loadUserData().profile.stxAddress.testnet);
        }
        fetchArticle();
    }, [userAddress]);

    const fetchArticle = async () => {
        try {
            const senderAddress = userAddress || CONFIG.deployer;
            const result = await fetchCallReadOnlyFunction({
                contractAddress: CONFIG.deployer,
                contractName: CONFIG.contractName,
                functionName: 'get-article',
                functionArgs: [uintCV(articleId)],
                network: CONFIG.network,
                senderAddress: senderAddress,
            });

            const value = cvToValue(result);
            // Result is (ok (optional tuple)) or (err uint)
            // If article exists: {value: {active: true, author: ..., ...}}

            if (value && value.value) {
                const data = value.value;
                setArticle({
                    id: articleId,
                    title: data.title.value, // ascii
                    author: data.author.value,
                    priceUsd: Number(data['price-usd'].value),
                    category: data.category.value,
                    contentHash: data['content-hash'].value,
                    isPurchased: false // Need separate check for purchase status if really needed, but contract enforces it on buy
                });
            } else {
                console.warn("Article not found or empty response");
            }

        } catch (err) {
            console.error("Error fetching article:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleBuy = async (token: 'STX' | 'sBTC' | 'USDCx') => {
        let functionName = '';
        switch (token) {
            case 'STX': functionName = 'purchase-with-stx'; break;
            case 'sBTC': functionName = 'purchase-with-sbtc'; break;
            case 'USDCx': functionName = 'purchase-with-usdcx'; break;
        }

        const options = {
            contractAddress: CONFIG.deployer,
            contractName: CONFIG.contractName,
            functionName,
            functionArgs: [uintCV(articleId)],
            network: CONFIG.network,
            postConditionMode: PostConditionMode.Allow,
            onFinish: (data: any) => {
                alert(`Purchase Broadcasted! TxId: ${data.txId}`);
            },
        };
        await openContractCall(options);
    };

    if (loading) return (
        <GradientBackground>
            <div className="flex min-h-screen items-center justify-center text-white">Loading...</div>
        </GradientBackground>
    );

    if (!article) return (
        <GradientBackground>
            <div className="flex min-h-screen items-center justify-center text-white">
                <div className="text-center">
                    <h2 className="text-2xl mb-4">Article Not Found</h2>
                    <Link href="/" className="text-indigo-400 hover:text-indigo-300">Back to Home</Link>
                </div>
            </div>
        </GradientBackground>
    );

    return (
        <GradientBackground>
            <main className="flex min-h-screen flex-col items-center p-8 md:p-24">
                <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex mb-12">
                    <Link href="/" className="fixed left-0 top-0 flex w-full justify-center border-b border-white/10 bg-black/20 pb-6 pt-8 backdrop-blur-2xl lg:static lg:w-auto lg:rounded-xl lg:border lg:p-4 hover:bg-white/10 transition-colors">
                        ← Back to Feed
                    </Link>
                </div>

                <div className="w-full max-w-2xl bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-8">
                    <div className="mb-6">
                        <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-200 bg-indigo-900/50 rounded-full">
                            {article.category}
                        </span>
                    </div>

                    <h1 className="text-4xl font-extrabold text-white mb-4">{article.title}</h1>

                    <div className="flex items-center gap-4 text-gray-400 mb-8 border-b border-white/10 pb-8">
                        <div>
                            <span className="block text-xs uppercase tracking-wider">Author</span>
                            <span className="font-mono text-sm">{article.author}</span>
                        </div>
                        <div className="ml-auto text-right">
                            <span className="block text-xs uppercase tracking-wider">Price</span>
                            <span className="text-2xl font-bold text-green-400">${(article.priceUsd / 100).toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-xl font-bold text-white">Purchase to Unlock</h3>
                        <p className="text-gray-300">
                            Support the creator by purchasing this content. You can pay with STX, sBTC, or USDCx.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                            <button onClick={() => handleBuy('STX')} className="py-3 px-4 bg-orange-600/20 border border-orange-500/50 hover:bg-orange-600/40 text-orange-200 rounded-xl font-bold transition-all">
                                Buy with STX
                            </button>
                            <button onClick={() => handleBuy('sBTC')} className="py-3 px-4 bg-yellow-600/20 border border-yellow-500/50 hover:bg-yellow-600/40 text-yellow-200 rounded-xl font-bold transition-all">
                                Buy with sBTC
                            </button>
                            <button onClick={() => handleBuy('USDCx')} className="py-3 px-4 bg-blue-600/20 border border-blue-500/50 hover:bg-blue-600/40 text-blue-200 rounded-xl font-bold transition-all">
                                Buy with USDCx
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </GradientBackground>
    );
}
