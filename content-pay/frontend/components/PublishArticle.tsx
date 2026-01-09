'use client';

import React, { useState } from 'react';
import { useConnect } from '@stacks/connect-react';
import { STACKS_TESTNET } from '@stacks/network';
import { openContractCall } from '@stacks/connect';
import {
    uintCV,
    stringAsciiCV,
    PostConditionMode,
} from '@stacks/transactions';

export default function PublishArticle() {
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('100'); // Default $1.00 (100 cents)
    const [category, setCategory] = useState('Tech');
    const [isPublishing, setIsPublishing] = useState(false);

    // Hardcoded for Testnet Demo
    const contractAddress = 'ST9NSDHK5969YF6WJ2MRCVVAVTDENWBNTFJRVZ3E';
    const contractName = 'content-registry';

    const handlePublish = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsPublishing(true);

        const priceInt = parseInt(price);
        // Mock IPFS Hash/Content for demo
        const contentHash = "QmHash" + Date.now();

        const functionArgs = [
            stringAsciiCV(title),
            stringAsciiCV(contentHash),
            uintCV(priceInt),
            stringAsciiCV(category)
        ];

        const options = {
            contractAddress,
            contractName,
            functionName: 'publish-article',
            functionArgs,
            network: STACKS_TESTNET,
            postConditionMode: PostConditionMode.Allow,
            onFinish: (data: any) => {
                console.log('Transaction:', data);
                alert(`Transaction Broadcasted! TxId: ${data.txId}`);
                setIsPublishing(false);
            },
            onCancel: () => {
                setIsPublishing(false);
            },
        };

        await openContractCall(options);
    };

    return (
        <div className="w-full max-w-md p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                Publish New Article
            </h2>

            <form onSubmit={handlePublish} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Article Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-gray-500"
                        placeholder="e.g. The Future of AI"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Price (USD Cents)</label>
                    <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
                        min="1"
                        required
                    />
                    <p className="text-xs text-gray-400 mt-1">100 = $1.00 USD</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
                    >
                        <option value="Tech">Tech</option>
                        <option value="Crypto">Crypto</option>
                        <option value="Art">Art</option>
                        <option value="Science">Science</option>
                    </select>
                </div>

                <button
                    type="submit"
                    disabled={isPublishing}
                    className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isPublishing ? 'Broadcasting...' : 'Publish to Blockchain'}
                </button>
            </form>
        </div>
    );
}
