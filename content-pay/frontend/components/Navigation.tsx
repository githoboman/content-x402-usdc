'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ConnectWallet from './ConnectWallet';

export default function Navigation() {
    const pathname = usePathname();

    const isActive = (path: string) => {
        return pathname === path;
    };

    const navLinks = [
        { href: '/', label: 'Home', icon: '🏠' },
        { href: '/browse', label: 'Browse', icon: '📚' },
        { href: '/publish', label: 'Publish', icon: '✍️' },
        { href: '/my-library', label: 'My Library', icon: '📖' },
        { href: '/test-publish', label: 'Test', icon: '🧪' },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo/Brand */}
                    <Link href="/" className="flex items-center space-x-2">
                        <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                            ContentPay
                        </span>
                        <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-300 rounded-full border border-yellow-500/30">
                            Testnet
                        </span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center space-x-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive(link.href)
                                        ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/50'
                                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <span className="mr-1.5">{link.icon}</span>
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Wallet Connection */}
                    <div className="flex items-center">
                        <ConnectWallet />
                    </div>
                </div>

                {/* Mobile Menu */}
                <div className="md:hidden pb-3 flex items-center space-x-1 overflow-x-auto">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${isActive(link.href)
                                    ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/50'
                                    : 'text-gray-300 hover:bg-white/5'
                                }`}
                        >
                            <span className="mr-1">{link.icon}</span>
                            {link.label}
                        </Link>
                    ))}
                </div>
            </div>
        </nav>
    );
}
