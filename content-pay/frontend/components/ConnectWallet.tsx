'use client';

import React, { useEffect, useState } from 'react';
import { useConnect } from '@stacks/connect-react';
import { userSession, appDetails } from '../lib/stacks';

export default function ConnectWallet() {
    const authOptions = {
        appDetails,
        redirectTo: '/',
        onFinish: () => {
            window.location.reload();
        },
        userSession,
    };
    const { authenticate } = useConnect();
    const [mounted, setMounted] = useState(false);
    const [userAddress, setUserAddress] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        if (userSession.isUserSignedIn()) {
            const userData = userSession.loadUserData();
            setUserAddress(userData.profile.stxAddress.testnet);
        }
    }, []);

    const handleConnect = () => {
        authenticate(authOptions);
    };

    const handleDisconnect = () => {
        userSession.signUserOut();
        setUserAddress(null);
        window.location.reload();
    };

    if (!mounted) return null;

    if (userAddress) {
        return (
            <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700 bg-white/10 px-3 py-1 rounded-lg">
                    {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                </span>
                <button
                    onClick={handleDisconnect}
                    className="px-4 py-2 text-sm font-medium text-red-200 bg-red-900/30 rounded-md hover:bg-red-900/50 border border-red-500/30 transition-colors"
                >
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-2">
            <button
                onClick={handleConnect}
                className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30"
            >
                Connect Wallet
            </button>
            <button
                onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                }}
                className="text-xs text-gray-500 hover:text-red-400 underline"
            >
                Reset Session (Fix Connection)
            </button>
        </div>
    );
}
