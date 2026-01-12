# Content Pay

A micropayment content platform built on the Stacks blockchain using Clarity smart contracts. This platform enables writers to publish paid content and readers to purchase access using multiple cryptocurrencies including STX, sBTC, and USDCx.

## Features

- **Multi-token Payments**: Support for STX, sBTC, and USDCx tokens
- **Content Publishing**: Writers can publish articles with customizable pricing
- **Access Control**: One-time purchase grants permanent access to content
- **Platform Fees**: 3% platform fee on all transactions
- **Analytics**: Track writer earnings, reader purchases, and platform statistics
- **Testnet Ready**: Fully functional on Stacks testnet

## Live Demo (Testnet)

- **Frontend**: `http://localhost:3000` (Local)
- **Contract Address**: `ST34SWDZ8QJEB124ZBEVN6A69DDVQXNVH66AJKY65.content-registry-v2`
- **Mock Tokens**:
    - sBTC: `ST34SWDZ8QJEB124ZBEVN6A69DDVQXNVH66AJKY65.mock-sbtc-v1`
    - USDCx: `ST34SWDZ8QJEB124ZBEVN6A69DDVQXNVH66AJKY65.mock-usdc-v1`
    - Pyth Oracle: `ST34SWDZ8QJEB124ZBEVN6A69DDVQXNVH66AJKY65.mock-pyth-oracle-v1`

## Architecture

The platform consists of a **Next.js Frontend** and **Clarity Smart Contracts**:

1.  **Smart Contracts** (`contracts/`):
    - `content-registry-v2.clar`: Main logic for publishing and purchasing.
    - `mock-*.clar`: Testnet mocks for sBTC, USDC, and Pyth Oracle.

2.  **Frontend** (`frontend/`):
    - **Publish Page** (`/publish`): Register new articles on-chain.
    - **Article Feed** (`/`): Browse published content.
    - **Purchase Page** (`/article/[id]`): Buy content with STX, sBTC, or USDCx.

## Quick Start

### 1. Smart Contracts
Install [Clarinet](https://github.com/hirosystems/clarinet).

```bash
# Run tests
npm test
```

### 2. Frontend Application
Ensure you have Node.js 18+.

```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### 3. Usage Guide

**Writer Mode (Publishing)**:
1.  Connect your Stacks Wallet (Leather/Xverse).
2.  Click "Writer Mode" -> "Go to Full Page".
3.  Enter Title, Price (in Cents), and Category.
4.  Click "Publish" and confirm the transaction.

**Reader Mode (Buying)**:
1.  Browse the feed on the Home page.
2.  Click "View & Buy" on an article.
3.  Select your currency (STX / sBTC / USDCx).
4.  Confirm transaction to unlock the content.

## Troubleshooting

- **Wallet Connection Error** (`Failed to get selected account`):
    - Cause: Conflict between multiple installed wallets (e.g., Xverse AND Leather).
    - Fix: Disable one extension in Chrome or use Incognito Mode.
- **Hydration Errors**:
    - You may see a red "1 Issue" badge on localhost. This is a Next.js warning and does not affect functionality.

## Project Structure
```
content-pay/
├── contracts/               # Clarity smart contracts
├── frontend/               # Next.js App Router application
│   ├── app/                # Pages (/publish, /article/[id])
│   ├── components/         # React components
│   └── lib/                # Config and Stacks.js helpers
├── tests/                  # Contract unit tests
└── deployments/            # Clarinet deployment plans
```

### Adding New Features
1. Update the Clarity contract in `contracts/content-registry.clar`
2. Add corresponding tests in `tests/content-registry.test.ts`
3. Run tests to ensure functionality
4. Update this README with new features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

ISC License

## Disclaimer

This is experimental software. Use at your own risk. Always test thoroughly on testnet before mainnet deployment.