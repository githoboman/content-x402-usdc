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
    bufferCV,
    intCV,
    noneCV,
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

export default function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
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
        // Mock fallback for testing
        const isMock = typeof window !== 'undefined' && window.location.search.includes('mock=true');

        if (isMock) {
            let userHasPurchased = false;
            if (userAddress) {
                try {
                    const purchaseCheck = await fetchCallReadOnlyFunction({
                        contractAddress: CONFIG.deployer,
                        contractName: CONFIG.contractName,
                        functionName: 'has-purchased',
                        functionArgs: [uintCV(articleId), standardPrincipalCV(userAddress)],
                        network: CONFIG.network,
                        senderAddress: userAddress,
                    });
                    const val = cvToValue(purchaseCheck);
                    userHasPurchased = val === true || val?.value === true;
                } catch (e) {
                    console.log("Could not check mock purchase status", e);
                }
            }

            setArticle({
                id: articleId,
                title: "Test Article (Mock for Testing)",
                author: CONFIG.deployer,
                priceUsd: 150,
                category: "Testing",
                contentHash: "QmMockHashForTesting",
                isPurchased: userHasPurchased
            });
            setLoading(false);
            return;
        }

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
                console.warn("Article not found, trying fallback...");
                // FALLBACK FOR DEMO if on-chain fails (double safety)
                setArticle({
                    id: articleId,
                    title: "Test Article (Fallback)",
                    author: CONFIG.deployer,
                    priceUsd: 150,
                    category: "Testing",
                    contentHash: "QmFallback",
                    isPurchased: false
                });
            }

        } catch (err) {
            console.error("Error fetching article:", err);
        } finally {
            setLoading(false);
        }
    };

    const [stxCost, setStxCost] = useState<string | null>(null);

    const fetchStxCost = async (priceUsd: number) => {
        try {
            const result = await fetchCallReadOnlyFunction({
                contractAddress: CONFIG.deployer,
                contractName: CONFIG.contractName,
                functionName: 'calculate-stx-amount',
                functionArgs: [uintCV(priceUsd)],
                network: CONFIG.network,
                senderAddress: CONFIG.deployer,
            });
            const val = cvToValue(result);
            if (val && val.value) {
                // val.value is BigInt in micros
                const micros = Number(val.value);
                setStxCost((micros / 1000000).toFixed(2));
            }
        } catch (e) {
            console.error("Error fetching STX cost", e);
            // Oracle likely not initialized (price = 0)
            setStxCost("ORACLE_NOT_SET");
        }
    };

    useEffect(() => {
        if (article) {
            fetchStxCost(article.priceUsd);
        }
    }, [article]);

    // Additional cost states
    const [sbtcCost, setSbtcCost] = useState<string | null>(null);
    const [usdcCost, setUsdcCost] = useState<string | null>(null);

    const fetchSbtcCost = async (priceUsd: number) => {
        try {
            // Fetch BTC price from oracle
            const BTC_FEED_ID = Buffer.from('e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43', 'hex');
            const result = await fetchCallReadOnlyFunction({
                contractAddress: CONFIG.deployer,
                contractName: ORACLE_NAME,
                functionName: 'read-price-feed',
                functionArgs: [bufferCV(BTC_FEED_ID), noneCV()],
                network: CONFIG.network,
                senderAddress: CONFIG.deployer,
            });
            const val = cvToValue(result);
            if (val && val.value) {
                const btcPrice = Number(val.value.price);
                // Calculate: (price-usd * 10^14) / btc-price
                const sbtcSats = (priceUsd * 100000000000000) / btcPrice;
                setSbtcCost((sbtcSats / 100000000).toFixed(8)); // Convert to BTC
            }
        } catch (e) {
            console.error("Error fetching sBTC cost", e);
            setSbtcCost("ORACLE_NOT_SET");
        }
    };

    const fetchUsdcCost = async (priceUsd: number) => {
        // USDCx: price-usd * 10000 (6 decimals)
        const usdcAmount = priceUsd * 10000;
        setUsdcCost((usdcAmount / 1000000).toFixed(2)); // Convert to USDC
    };

    useEffect(() => {
        if (article) {
            fetchStxCost(article.priceUsd);
            fetchSbtcCost(article.priceUsd);
            fetchUsdcCost(article.priceUsd);
        }
    }, [article]);

    const handleBuy = async (token: 'STX' | 'sBTC' | 'USDCx') => {
        // Show confirmation with price for each token type
        if (token === 'STX') {
            if (!stxCost || stxCost === "ORACLE_NOT_SET") {
                alert("⚠️ Oracle not initialized! Please click 'Fix STX Price' first.");
                return;
            }
            const confirmed = confirm(
                `You will pay approximately ${stxCost} STX for this $${(article!.priceUsd / 100).toFixed(2)} article.\n\n` +
                `Continue with purchase?`
            );
            if (!confirmed) return;
        } else if (token === 'sBTC') {
            if (!sbtcCost || sbtcCost === "ORACLE_NOT_SET") {
                alert("⚠️ BTC Oracle not initialized! Please set BTC price in Oracle first.");
                return;
            }
            const confirmed = confirm(
                `You will pay approximately ${sbtcCost} sBTC for this $${(article!.priceUsd / 100).toFixed(2)} article.\n\n` +
                `Continue with purchase?`
            );
            if (!confirmed) return;
        } else if (token === 'USDCx') {
            if (!usdcCost) {
                alert("⚠️ Unable to calculate USDCx cost.");
                return;
            }
            const confirmed = confirm(
                `You will pay ${usdcCost} USDCx for this $${(article!.priceUsd / 100).toFixed(2)} article.\n\n` +
                `Continue with purchase?`
            );
            if (!confirmed) return;
        }

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

                        {/* REAL-TIME COST ESTIMATOR */}
                        <div className="bg-indigo-900/20 border border-indigo-500/30 p-3 rounded-lg my-4">
                            <p className="text-sm text-indigo-200">
                                <strong>Estimated Cost:</strong> {stxCost ? `${stxCost} STX` : 'Loading...'}
                                <span className="text-xs text-indigo-400 opacity-75 ml-2">
                                    (Based on Oracle Exchange Rate)
                                </span>
                            </p>
                            {Number(stxCost) < 0.1 && (
                                <p className="text-xs text-yellow-400 mt-1">
                                    ⚠️ Low STX cost detected? The Oracle price might be too high. Use the Admin Tool below to fix it.
                                </p>
                            )}
                        </div>

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

                        {/* ADMIN TOOL FOR TESTNET */}
                        {articleId === 1 && (
                            <div className="mt-8 pt-8 border-t border-white/5">
                                <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Testnet Admin Tools</p>
                                <button
                                    onClick={async () => {
                                        // Set STX Price to $1.50 (150,000,000, expo -8)
                                        // 32-byte feed id for STX: 0x535458...
                                        // We need to pass buffer. strict encoding needed.
                                        // Actually easier: Use a specific known value or update contract constants? 
                                        // Let's rely on standard hex string passing if library supports it, or bufferCV.
                                        // Buffer for "STX" padded:
                                        const feedId = Buffer.from('5354580000000000000000000000000000000000000000000000000000000000', 'hex');

                                        await openContractCall({
                                            contractAddress: CONFIG.deployer,
                                            contractName: ORACLE_NAME,
                                            functionName: 'set-price',
                                            functionArgs: [
                                                bufferCV(feedId),
                                                intCV(150000000),
                                                intCV(-8)
                                            ],
                                            postConditionMode: PostConditionMode.Allow,
                                            network: CONFIG.network,
                                            onFinish: (data) => alert(`Price Update Broadcasted! Tx: ${data.txId}`)
                                        });
                                    }}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                                >
                                    🔧 Fix STX Price (Set to $1.50)
                                </button>
                                <p className="text-[10px] text-gray-600 mt-1">
                                    Click this if payment amount seems wrong (e.g. $0.03). It syncs the oracle.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </GradientBackground>
    );
}
