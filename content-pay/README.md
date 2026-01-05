# Content Pay

A micropayment content platform built on the Stacks blockchain using Clarity smart contracts. This platform enables writers to publish paid content and readers to purchase access using multiple cryptocurrencies including STX, sBTC, and USDCx.

## Features

- **Multi-token Payments**: Support for STX, sBTC, and USDCx tokens
- **Content Publishing**: Writers can publish articles with customizable pricing
- **Access Control**: One-time purchase grants permanent access to content
- **Platform Fees**: 3% platform fee on all transactions
- **Analytics**: Track writer earnings, reader purchases, and platform statistics
- **Testnet Ready**: Fully functional on Stacks testnet

## Architecture

The platform consists of a single Clarity smart contract (`content-registry.clar`) that manages:

- Article metadata and content hashes
- Purchase tracking and access control
- Writer and reader statistics
- Multi-token payment processing
- Platform revenue collection

## Prerequisites

- [Clarinet](https://github.com/hirosystems/clarinet) - Stacks development environment
- Node.js (for running tests)
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd content-pay
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install Clarinet (if not already installed):
   ```bash
   # Follow instructions at https://github.com/hirosystems/clarinet
   ```

## Testing

Run the test suite:

```bash
npm test
```

For test coverage and cost analysis:

```bash
npm run test:report
```

Watch mode for development:

```bash
npm run test:watch
```

## Deployment

### Testnet Deployment

1. Configure your deployment settings in `settings/Devnet.toml`

2. Check the contract:
   ```bash
   clarinet check
   ```

3. Deploy to testnet:
   ```bash
   clarinet deployments generate --devnet
   clarinet deployments apply --devnet
   ```

### Mainnet Deployment

**⚠️ WARNING: Mainnet deployment requires careful review and testing**

1. Update token contract addresses in `contracts/content-registry.clar`:
   - Replace sBTC testnet contract with mainnet contract
   - Add actual USDCx mainnet contract address

2. Update `settings/Mainnet.toml` (create if needed)

3. Deploy:
   ```bash
   clarinet deployments generate --mainnet
   clarinet deployments apply --mainnet
   ```

## Usage

### Publishing Content

Call the `publish-article` function with:
- `title`: Article title (max 256 characters)
- `content-hash`: IPFS CID or content hash (64 characters)
- `price-usd`: Price in USD cents (e.g., 500 = $5.00)
- `category`: Content category (max 50 characters)

### Purchasing Content

Choose payment method:

- **STX**: `purchase-with-stx(article-id, stx-amount)`
- **sBTC**: `purchase-with-sbtc(article-id)`
- **USDCx**: `purchase-with-usdcx(article-id)` (requires USDCx contract setup)

### Reading Content

After purchase, use `has-purchased(article-id, reader)` to check access, then retrieve content using the stored `content-hash`.

## Contract Functions

### Read-only Functions
- `get-article(article-id)` - Get article metadata
- `has-purchased(article-id, reader)` - Check purchase status
- `get-writer-stats(writer)` - Get writer statistics
- `get-reader-stats(reader)` - Get reader statistics
- `get-platform-stats()` - Get platform statistics

### Public Functions
- `publish-article(title, content-hash, price-usd, category)` - Publish new content
- `purchase-with-stx(article-id, stx-amount)` - Purchase with STX
- `purchase-with-sbtc(article-id)` - Purchase with sBTC
- `purchase-with-usdcx(article-id)` - Purchase with USDCx
- `deactivate-article(article-id)` - Deactivate content (author only)
- `update-article-price(article-id, new-price)` - Update price (author only)

## Token Support

### STX (Stacks Token)
- Fully implemented
- Direct STX transfers with platform fee deduction

### sBTC (Stacks BTC)
- Testnet ready
- Uses Hiro Platform sBTC contract
- Mainnet: Update contract address to mainnet sBTC token

### USDCx (USD Coin)
- Placeholder implementation
- Requires deployment of USDC SIP-010 token contract
- Update `USDCX-TOKEN` constant with actual contract address

## Security Considerations

- All payments are final and non-refundable
- Content hashes are stored on-chain but content is off-chain
- Platform takes 3% fee on all transactions
- Contract owner can update platform treasury address

## Development

### Project Structure
```
content-pay/
├── contracts/
│   └── content-registry.clar    # Main smart contract
├── tests/
│   └── content-registry.test.ts # Unit tests
├── settings/
│   └── Devnet.toml             # Testnet configuration
├── Clarinet.toml               # Project configuration
└── package.json               # Node.js dependencies
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