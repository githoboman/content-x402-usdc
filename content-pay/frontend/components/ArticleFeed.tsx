'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useConnect } from '@stacks/connect-react';
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';
import { openContractCall } from '@stacks/connect';
import {
    fetchCallReadOnlyFunction,
    uintCV,
    cvToValue,
    PostConditionMode,
    contractPrincipalCV,
    standardPrincipalCV,
} from '@stacks/transactions';
import { userSession, appDetails } from '../lib/stacks';
import { CONFIG, ORACLE_NAME, SBTC_NAME, USDC_NAME } from '../lib/config';

// ====== CONFIGURATION ======
// Configuration imported from ../lib/config


interface Article {
    id: number;
    title: string;
    author: string;
    priceUsd: number;
    category: string;
    contentHash: string;
    isPurchased: boolean;
}

export default function ArticleFeed() {
    const { authOptions } = useConnect();
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userAddress, setUserAddress] = useState<string | null>(null);

    useEffect(() => {
        if (userSession.isUserSignedIn()) {
            try {
                const userData = userSession.loadUserData();
                if (userData) {
                    setUserAddress(userData.profile.stxAddress.testnet);
                }
            } catch (e) {
                console.log("User not signed in or session error");
            }
        }
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Verify contract exists (Optional but helpful for improved DX)
            // Skip this check if we know we are offline or on specific environments if needed
            if (CONFIG.apiUrl) {
                try {
                    const contractCheck = await fetch(`${CONFIG.apiUrl}/v2/contracts/interface/${CONFIG.deployer}/${CONFIG.contractName}`);
                    if (!contractCheck.ok && contractCheck.status === 404) {
                        throw new Error(`NoSuchContract`);
                    }
                } catch (netErr) {
                    // Ignore network errors here, proceed to node call might work or fail there
                    console.warn("Could not check contract status via API, proceeding anyway...", netErr);
                }
            }

            // 2. Get stats to find total articles
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

            const loaded: Article[] = [];
            const user = userAddress || CONFIG.deployer;

            // 3. Loop backwards to get latest 5 (or fewer)
            for (let i = total; i > Math.max(0, total - 5); i--) {
                const id = i;

                try {
                    // Fetch Article Data
                    const articleData = await fetchCallReadOnlyFunction({
                        contractAddress: CONFIG.deployer,
                        contractName: CONFIG.contractName,
                        functionName: 'get-article',
                        functionArgs: [uintCV(id)],
                        network: CONFIG.network,
                        senderAddress: user,
                    });

                    const rawArticle = cvToValue(articleData);
                    if (rawArticle && rawArticle.value) {
                        const val = rawArticle.value;
                        loaded.push({
                            id: id,
                            title: val.title.value,
                            author: val.author.value,
                            priceUsd: Number(val['price-usd'].value),
                            category: val.category.value,
                            contentHash: val['content-hash'].value,
                            isPurchased: false // TODO: fetch 'has-purchased' status if needed
                        });
                    }
                } catch (innerErr) {
                    console.warn(`Failed to fetch article ${id}`, innerErr);
                }
            }
            setArticles(loaded);
        } catch (e: any) {
            console.error("Error fetching feed:", e);
            if (e.message?.includes('NoSuchContract') || e.toString().includes('NoSuchContract')) {
                setError(`Contract ${CONFIG.deployer}.${CONFIG.contractName} not found. Please deploy usage: 'clarinet deployments apply --testnet'`);
            } else {
                setError(e.message || "Failed to load articles");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleBuy = async (articleId: number, token: 'STX' | 'sBTC' | 'USDC') => {
        let functionName = '';
        let functionArgs: any[] = [];

        if (token === 'STX') {
            functionName = 'purchase-with-stx';
            functionArgs = [
                uintCV(articleId),
                contractPrincipalCV(CONFIG.deployer, ORACLE_NAME)
            ];
        } else if (token === 'sBTC') {
            functionName = 'purchase-with-sbtc';
            functionArgs = [
                uintCV(articleId),
                contractPrincipalCV(CONFIG.deployer, SBTC_NAME),
                contractPrincipalCV(CONFIG.deployer, ORACLE_NAME)
            ];
        } else {
            functionName = 'purchase-with-usdcx';
            functionArgs = [
                uintCV(articleId),
                contractPrincipalCV(CONFIG.deployer, USDC_NAME)
            ];
        }

        const authOptions = {
            appDetails,
            redirectTo: '/',
            onFinish: () => {
                window.location.reload();
            },
            userSession,
        };

        await openContractCall({
            contractAddress: CONFIG.deployer,
            contractName: CONFIG.contractName,
            functionName,
            functionArgs,
            network: CONFIG.network,
            postConditionMode: PostConditionMode.Allow,
            onFinish: (data) => {
                alert(`Purchase broadcasted! Tx: ${data.txId}`);
            },
        });
    };

    if (loading) return <div className="text-white text-center p-10 animate-pulse">Connecting to Stacks Testnet...</div>;

    if (error) {
        return (
            <div className="text-center p-8 bg-red-900/20 rounded-xl border border-red-500/30">
                <h3 className="text-xl font-bold text-red-200 mb-2">Connection Error</h3>
                <p className="text-red-300/80 mb-4">{error}</p>
                <button
                    onClick={fetchArticles}
                    className="px-4 py-2 bg-red-900/40 hover:bg-red-900/60 text-red-200 rounded-lg transition-colors"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    // Show specific message if no articles
    if (articles.length === 0) {
        return (
            <div className="text-center p-8 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-xl font-bold text-white mb-2">Waiting for Articles</h3>
                <p className="text-gray-400 mb-4">
                    The content registry is active but no articles have been published yet.
                </p>
                <div className="text-xs text-gray-500 font-mono">
                    Contract: {CONFIG.deployer}.{CONFIG.contractName}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl space-y-6">
            <h2 className="text-2xl font-bold text-white mb-4">Latest Articles</h2>

            {articles.map((article) => (
                <div key={article.id} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-semibold text-white">{article.title}</h3>
                        <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2 py-1 rounded">{article.category}</span>
                    </div>

                    <p className="text-gray-400 text-sm mb-4">
                        By {article.author.slice(0, 6)}...{article.author.slice(-4)}
                    </p>

                    <div className="bg-black/30 rounded-lg p-4 mb-4">
                        {article.isPurchased ? (
                            <div className="text-green-400 font-mono">
                                🔓 Content Unlocked: <br />
                                <span className="text-white">{article.contentHash}</span>
                                <br />
                                <span className="text-xs text-gray-500">(In real app, we fetch IPFS content here)</span>
                            </div>
                        ) : (
                            <div className="text-gray-500 italic">
                                🔒 Content Locked. Purchase to view.
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 items-center justify-between">
                        <div className="text-white font-bold text-lg">
                            ${(article.priceUsd / 100).toFixed(2)}
                        </div>
                        {!article.isPurchased && (
                            <Link href={`/article/${article.id}`} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold text-white transition-colors">
                                View & Buy
                            </Link>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
