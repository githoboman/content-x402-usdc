'use client';

import React, { useState } from 'react';
import { openContractCall } from '@stacks/connect';
import { uintCV, stringAsciiCV, PostConditionMode } from '@stacks/transactions';
import { CONFIG } from '../../lib/config';
import GradientBackground from '../../components/GradientBackground';
import Navigation from '../../components/Navigation';
import Link from 'next/link';

export default function TestPublishPage() {
    const [publishing, setPublishing] = useState(false);
    const [lastTx Id, setLastTxId] = useState<string | null>(null);

    const publishTestArticle = async () => {
        setPublishing(true);

        const testArticle = {
            title: `Test Article ${Date.now()}`,
            url: `ipfs://QmTest${Date.now()}`,
            price: 150, // $1.50
            category: 'Testing'
        };

        const options = {
            contractAddress: CONFIG.deployer,
            contractName: CONFIG.contractName,
            functionName: 'publish-article',
            functionArgs: [
                stringAsciiCV(testArticle.title),
                stringAsciiCV(testArticle.url),
                uintCV(testArticle.price),
                stringAsciiCV(testArticle.category)
            ],
            network: CONFIG.network,
            postConditionMode: PostConditionMode.Allow,
            onFinish: (data: any) => {
                setLastTxId(data.txId);
                alert(`✅ Article Published!\n\nTxID: ${data.txId}\n\nWait ~1 minute then go to "Test Buy" page.`);
                setPublishing(false);
            },
            onCancel: () => {
                setPublishing(false);
            },
        };

        await openContractCall(options);
    };

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
                            🧪 Test Publishing
                        </h1>

                        <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg mb-6">
                            <p className="text-blue-200 text-sm">
                                <strong>Step 1 of 2:</strong> Publish a test article to the blockchain
                            </p>
                        </div>

                        <div className="bg-black/30 rounded-lg p-6 mb-6">
                            <h3 className="text-white font-bold mb-2">Test Article Details:</h3>
                            <ul className="text-gray-300 text-sm space-y-1">
                                <li>• <strong>Title:</strong> Test Article [timestamp]</li>
                                <li>• <strong>Price:</strong> $1.50 USD (150 cents)</li>
                                <li>• <strong>Category:</strong> Testing</li>
                                <li>• <strong>Content:</strong> Mock IPFS hash</li>
                            </ul>
                        </div>

                        <button
                            onClick={publishTestArticle}
                            disabled={publishing}
                            className="w-full py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                        >
                            {publishing ? '📡 Publishing...' : '✍️ Publish Test Article'}
                        </button>

                        {lastTxId && (
                            <div className="mt-6 bg-green-900/20 border border-green-500/30 p-4 rounded-lg">
                                <p className="text-green-200 text-sm mb-2">
                                    ✅ <strong>Published!</strong>
                                </p>
                                <a
                                    href={`https://explorer.hiro.so/txid/${lastTxId}?chain=testnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-green-400 underline break-all"
                                >
                                    View Transaction: {lastTxId}
                                </a>
                                <div className="mt-4">
                                    <Link
                                        href="/test-buy"
                                        className="block w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-center"
                                    >
                                        Next: Go to Test Buy Page →
                                    </Link>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 text-center">
                            <Link href="/test-buy" className="text-indigo-400 hover:text-indigo-300 text-sm underline">
                                Skip to Test Buy Page →
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </GradientBackground>
    );
}
