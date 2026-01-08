import { describe, expect, it, beforeEach } from 'vitest';
import { Cl } from '@stacks/transactions';
import type { ClarityValue } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const writer1 = accounts.get('wallet_1')!;
const writer2 = accounts.get('wallet_2')!;
const reader1 = accounts.get('wallet_3')!;
const reader2 = accounts.get('wallet_4')!;

// Mock Feed IDs
const STX_FEED_ID = '0100000000000000000000000000000000000000000000000000000000000000';
const BTC_FEED_ID = '0200000000000000000000000000000000000000000000000000000000000000';
const USDC_FEED_ID = '0300000000000000000000000000000000000000000000000000000000000000';

// Helper function to initialize contracts
function initializeContracts() {
  simnet.callPublicFn(
    'content-registry',
    'initialize-contracts',
    [
      Cl.principal(`${deployer}.mock-sbtc`),
      Cl.principal(`${deployer}.mock-usdc`),
      Cl.principal(`${deployer}.mock-pyth-oracle`)
    ],
    deployer
  );

  // Set default prices in Oracle
  // STX = $0.50 (50000000, expo -8)
  simnet.callPublicFn('mock-pyth-oracle', 'set-price', [Cl.bufferFromHex(STX_FEED_ID), Cl.int(50000000), Cl.int(-8)], deployer);
  // BTC = $50,000 (5000000000000, expo -8)
  simnet.callPublicFn('mock-pyth-oracle', 'set-price', [Cl.bufferFromHex(BTC_FEED_ID), Cl.int(5000000000000), Cl.int(-8)], deployer);
  // USDC = $1.00 (100000000, expo -8)
  simnet.callPublicFn('mock-pyth-oracle', 'set-price', [Cl.bufferFromHex(USDC_FEED_ID), Cl.int(100000000), Cl.int(-8)], deployer);
}

// Helper function to mine blocks
function mineBlocks(count: number) {
  simnet.mineEmptyBlocks(count);
}

// Helper function to get current block height
function getCurrentBlockHeight(): number {
  return simnet.blockHeight;
}

// Helper to get tuple value from ClarityResult
function getTupleValue(result: { result: ClarityValue }): Record<string, ClarityValue> {
  let value = result.result as any;

  // Debug: Log the structure to understand what we're dealing with
  console.log('DEBUG: getTupleValue input:', JSON.stringify(value, null, 2));

  // Unwrap response first
  if (value.type === 'response') {
    if (!value.value) return {};
    value = value.value;
  }

  // Unwrap optional (some/none) - handle both 'optional' and 'some' types
  if (value.type === 'optional' || value.type === 'some') {
    if (!value.value) return {};
    value = value.value;
  }

  // Debug: Log after unwrapping
  console.log('DEBUG: after unwrapping:', JSON.stringify(value, null, 2));

  // Return tuple data - it's a map of field names to Clarity values
  if (value.type === 'tuple') {
    if (value.data) {
      console.log('DEBUG: returning tuple data:', JSON.stringify(value.data, null, 2));
      return value.data;
    }
    if (value.value) {
      console.log('DEBUG: returning tuple value:', JSON.stringify(value.value, null, 2));
      return value.value;
    }
  }

  // Fallback for non-tuple values
  console.log('DEBUG: returning empty object');
  return {};
}

describe('Content Registry - Article Publishing', () => {
  it('can publish article with valid parameters', () => {
    const { result } = simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [
        Cl.stringAscii('My First Article'),
        Cl.stringAscii('QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco'),
        Cl.uint(50), // $0.50
        Cl.stringAscii('technology')
      ],
      writer1
    );

    expect(result).toBeOk(Cl.uint(1)); // Article ID should be 1

    // Verify article was stored
    const article = simnet.callReadOnlyFn(
      'content-registry',
      'get-article',
      [Cl.uint(1)],
      deployer
    );

    expect(article.result).toBeTruthy(); // Verify article exists
    const articleData = getTupleValue(article);
    expect(articleData['title']).toStrictEqual(Cl.stringAscii('My First Article'));
    expect(articleData['price-usd']).toStrictEqual(Cl.uint(50));
    expect(articleData['is-active']).toStrictEqual(Cl.bool(true));
  });

  it('cannot publish article with zero price', () => {
    const { result } = simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [
        Cl.stringAscii('Free Article'),
        Cl.stringAscii('QmHash'),
        Cl.uint(0), // Invalid
        Cl.stringAscii('free')
      ],
      writer1
    );

    expect(result).toBeErr(Cl.uint(101)); // ERR-INVALID-PRICE
  });

  it('cannot publish article over $10,000', () => {
    const { result } = simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [
        Cl.stringAscii('Expensive Article'),
        Cl.stringAscii('QmHash'),
        Cl.uint(1000001), // Too high
        Cl.stringAscii('premium')
      ],
      writer1
    );

    expect(result).toBeErr(Cl.uint(101)); // ERR-INVALID-PRICE
  });

  it('article IDs increment correctly', () => {
    const article1 = simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [Cl.stringAscii('Article 1'), Cl.stringAscii('QmHash1'), Cl.uint(50), Cl.stringAscii('tech')],
      writer1
    );

    const article2 = simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [Cl.stringAscii('Article 2'), Cl.stringAscii('QmHash2'), Cl.uint(100), Cl.stringAscii('tech')],
      writer1
    );

    const article3 = simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [Cl.stringAscii('Article 3'), Cl.stringAscii('QmHash3'), Cl.uint(150), Cl.stringAscii('tech')],
      writer1
    );

    expect(article1.result).toBeOk(Cl.uint(1));
    expect(article2.result).toBeOk(Cl.uint(2));
    expect(article3.result).toBeOk(Cl.uint(3));
  });
});

describe('Content Registry - STX Purchases', () => {
  beforeEach(() => {
    initializeContracts();
    // Publish an article before each test
    simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [Cl.stringAscii('Test Article'), Cl.stringAscii('QmHash'), Cl.uint(50), Cl.stringAscii('tech')],
      writer1
    );
  });

  it('can purchase article with STX (calculated amount)', () => {
    // Price $0.50 (50 cents). STX = $0.50 (50000000, -8). 
    // Calculation: 50 * 10^12 / 50000000 = 1,000,000 uSTX = 1 STX.

    // Set STX to exactly $0.50 for clarity
    simnet.callPublicFn('mock-pyth-oracle', 'set-price', [Cl.bufferFromHex(STX_FEED_ID), Cl.int(50000000), Cl.int(-8)], deployer);

    const { result } = simnet.callPublicFn(
      'content-registry',
      'purchase-with-stx',
      [
        Cl.uint(1), // article-id
        Cl.contractPrincipal(deployer, 'mock-pyth-oracle')
      ],
      reader1
    );

    expect(result).toBeOk(Cl.bool(true));

    // Verify purchase was recorded
    const hasPurchased = simnet.callReadOnlyFn(
      'content-registry',
      'has-purchased',
      [Cl.uint(1), Cl.principal(reader1)],
      deployer
    );

    expect(hasPurchased.result).toStrictEqual(Cl.bool(true));

    // Verify amount recorded is the calculated amount (1,000,000 uSTX)
    const purchaseInfo = simnet.callReadOnlyFn(
      'content-registry',
      'get-purchase-info',
      [Cl.uint(1), Cl.principal(reader1)],
      deployer
    );
    const info = getTupleValue(purchaseInfo);
    expect(info['amount-paid']).toStrictEqual(Cl.uint(1000000));
  });

  it('cannot purchase same article twice', () => {
    // First purchase
    simnet.callPublicFn(
      'content-registry',
      'purchase-with-stx',
      [Cl.uint(1), Cl.contractPrincipal(deployer, 'mock-pyth-oracle')],
      reader1
    );

    // Second purchase should fail
    const { result } = simnet.callPublicFn(
      'content-registry',
      'purchase-with-stx',
      [Cl.uint(1), Cl.contractPrincipal(deployer, 'mock-pyth-oracle')],
      reader1
    );

    expect(result).toBeErr(Cl.uint(103)); // ERR-ALREADY-PURCHASED
  });

  it('cannot purchase non-existent article', () => {
    const { result } = simnet.callPublicFn(
      'content-registry',
      'purchase-with-stx',
      [Cl.uint(999), Cl.contractPrincipal(deployer, 'mock-pyth-oracle')],
      reader1
    );

    expect(result).toBeErr(Cl.uint(102)); // ERR-ARTICLE-NOT-FOUND
  });

  it('cannot purchase deactivated article', () => {
    // Deactivate article
    simnet.callPublicFn(
      'content-registry',
      'deactivate-article',
      [Cl.uint(1)],
      writer1
    );

    // Try to purchase
    const { result } = simnet.callPublicFn(
      'content-registry',
      'purchase-with-stx',
      [Cl.uint(1), Cl.contractPrincipal(deployer, 'mock-pyth-oracle')],
      reader1
    );

    expect(result).toBeErr(Cl.uint(102)); // ERR-ARTICLE-NOT-FOUND
  });
});

describe('Content Registry - USDCx Purchases', () => {
  beforeEach(() => {
    initializeContracts();

    simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [Cl.stringAscii('Test Article'), Cl.stringAscii('QmHash'), Cl.uint(50), Cl.stringAscii('tech')],
      writer1
    );

    // Mint USDCx to reader1
    simnet.callPublicFn(
      'mock-usdc',
      'mint',
      [Cl.uint(100000000), Cl.principal(reader1)],
      deployer
    );
  });

  it('can purchase article with USDCx', () => {
    const { result } = simnet.callPublicFn(
      'content-registry',
      'purchase-with-usdcx',
      [
        Cl.uint(1),
        Cl.contractPrincipal(deployer, 'mock-usdc')
      ],
      reader1
    );

    expect(result).toBeOk(Cl.bool(true));

    // Verify token type recorded
    const purchaseInfo = simnet.callReadOnlyFn(
      'content-registry',
      'get-purchase-info',
      [Cl.uint(1), Cl.principal(reader1)],
      deployer
    );

    expect(purchaseInfo.result).toBeTruthy(); // Verify purchase exists
    const info = getTupleValue(purchaseInfo);
    expect(info['token-used']).toStrictEqual(Cl.stringAscii('USDCx'));
    expect(info['amount-paid']).toStrictEqual(Cl.uint(500000));
  });

  it('cannot purchase same article twice with USDCx', () => {
    simnet.callPublicFn(
      'content-registry',
      'purchase-with-usdcx',
      [Cl.uint(1), Cl.contractPrincipal(deployer, 'mock-usdc')],
      reader1
    );

    const { result } = simnet.callPublicFn(
      'content-registry',
      'purchase-with-usdcx',
      [Cl.uint(1), Cl.contractPrincipal(deployer, 'mock-usdc')],
      reader1
    );

    expect(result).toBeErr(Cl.uint(103)); // ERR-ALREADY-PURCHASED
  });

  it('USDCx purchase updates writer earnings correctly', () => {
    simnet.callPublicFn(
      'content-registry',
      'purchase-with-usdcx',
      [Cl.uint(1), Cl.contractPrincipal(deployer, 'mock-usdc')],
      reader1
    );

    const stats = simnet.callReadOnlyFn(
      'content-registry',
      'get-writer-stats',
      [Cl.principal(writer1)],
      deployer
    );

    const writerStats = getTupleValue(stats);
    expect(writerStats['total-sales']).toStrictEqual(Cl.uint(1));
    // 97% of $0.50 = $0.485 = 48 cents (integer division)
    expect(writerStats['total-earnings']).toStrictEqual(Cl.uint(48));
  });

  it('multiple users can purchase with USDCx', () => {
    // Mint tokens to reader2
    simnet.callPublicFn(
      'mock-usdc',
      'mint',
      [Cl.uint(100000000), Cl.principal(reader2)],
      deployer
    );

    simnet.callPublicFn(
      'content-registry',
      'purchase-with-usdcx',
      [Cl.uint(1), Cl.contractPrincipal(deployer, 'mock-usdc')],
      reader1
    );

    simnet.callPublicFn(
      'content-registry',
      'purchase-with-usdcx',
      [Cl.uint(1), Cl.contractPrincipal(deployer, 'mock-usdc')],
      reader2
    );

    const stats = simnet.callReadOnlyFn(
      'content-registry',
      'get-writer-stats',
      [Cl.principal(writer1)],
      deployer
    );

    const writerStats = getTupleValue(stats);
    expect(writerStats['total-sales']).toStrictEqual(Cl.uint(2));
    // 2 * 48 cents = 96 cents
    expect(writerStats['total-earnings']).toStrictEqual(Cl.uint(96));
  });
});

describe('Content Registry - sBTC Purchases', () => {
  beforeEach(() => {
    initializeContracts();

    simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [Cl.stringAscii('Test Article'), Cl.stringAscii('QmHash'), Cl.uint(5000), Cl.stringAscii('tech')],
      writer1
    );

    // Mint sBTC to reader1
    simnet.callPublicFn(
      'mock-sbtc',
      'mint',
      [Cl.uint(100000000), Cl.principal(reader1)],
      deployer
    );
  });

  it('can purchase article with sBTC (calculated amount)', () => {
    // Price $50 (5000 cents). BTC = $50,000. 
    // Decimals 8. Oracle $50,000 (5,000,000,000,000, -8).
    // Power = 8 - 2 - (-8) = 14.
    // Numerator = 5000 * 10^14 = 5 * 10^17.
    // Result = 5 * 10^17 / 5 * 10^12 = 100,000 sats (0.001 BTC). $50 is 1/1000 of $50k. Correct.

    const { result } = simnet.callPublicFn(
      'content-registry',
      'purchase-with-sbtc',
      [
        Cl.uint(1),
        Cl.contractPrincipal(deployer, 'mock-sbtc'),
        Cl.contractPrincipal(deployer, 'mock-pyth-oracle')
      ],
      reader1
    );

    expect(result).toBeOk(Cl.bool(true));

    // Verify token type
    const purchaseInfo = simnet.callReadOnlyFn(
      'content-registry',
      'get-purchase-info',
      [Cl.uint(1), Cl.principal(reader1)],
      deployer
    );

    const info = getTupleValue(purchaseInfo);
    expect(info['token-used']).toStrictEqual(Cl.stringAscii('sBTC'));
    expect(info['amount-paid']).toStrictEqual(Cl.uint(100000));
  });

  it('cannot purchase same article twice with sBTC', () => {
    simnet.callPublicFn(
      'content-registry',
      'purchase-with-sbtc',
      [Cl.uint(1), Cl.contractPrincipal(deployer, 'mock-sbtc'), Cl.contractPrincipal(deployer, 'mock-pyth-oracle')],
      reader1
    );

    const { result } = simnet.callPublicFn(
      'content-registry',
      'purchase-with-sbtc',
      [Cl.uint(1), Cl.contractPrincipal(deployer, 'mock-sbtc'), Cl.contractPrincipal(deployer, 'mock-pyth-oracle')],
      reader1
    );

    expect(result).toBeErr(Cl.uint(103));
  });
});

describe('Content Registry - Mixed Token Purchases', () => {
  beforeEach(() => {
    initializeContracts();

    simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [Cl.stringAscii('Test Article'), Cl.stringAscii('QmHash'), Cl.uint(50), Cl.stringAscii('tech')],
      writer1
    );

    // Mint tokens to readers
    simnet.callPublicFn('mock-usdc', 'mint', [Cl.uint(100000000), Cl.principal(reader1)], deployer);
    simnet.callPublicFn('mock-sbtc', 'mint', [Cl.uint(100000000), Cl.principal(reader1)], deployer);
    simnet.callPublicFn('mock-usdc', 'mint', [Cl.uint(100000000), Cl.principal(reader2)], deployer);
    simnet.callPublicFn('mock-sbtc', 'mint', [Cl.uint(100000000), Cl.principal(reader2)], deployer);
  });

  it('different users can use different tokens for same article', () => {
    // Need separate articles since one user can only buy once
    simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [Cl.stringAscii('Article 2'), Cl.stringAscii('QmHash2'), Cl.uint(100), Cl.stringAscii('tech')],
      writer1
    );

    simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [Cl.stringAscii('Article 3'), Cl.stringAscii('QmHash3'), Cl.uint(100), Cl.stringAscii('tech')],
      writer1
    );

    // Reader1 uses USDCx for article 1
    const usdcResult = simnet.callPublicFn(
      'content-registry',
      'purchase-with-usdcx',
      [Cl.uint(1), Cl.contractPrincipal(deployer, 'mock-usdc')],
      reader1
    );
    expect(usdcResult.result).toBeOk(Cl.bool(true));

    // Reader2 uses STX for article 2
    const stxResult = simnet.callPublicFn(
      'content-registry',
      'purchase-with-stx',
      [Cl.uint(2), Cl.contractPrincipal(deployer, 'mock-pyth-oracle')],
      reader2
    );
    expect(stxResult.result).toBeOk(Cl.bool(true));

    // Reader1 uses sBTC for article 3
    const sbtcResult = simnet.callPublicFn(
      'content-registry',
      'purchase-with-sbtc',
      [Cl.uint(3), Cl.contractPrincipal(deployer, 'mock-sbtc'), Cl.contractPrincipal(deployer, 'mock-pyth-oracle')],
      reader1
    );

    expect(sbtcResult.result).toBeOk(Cl.bool(true));

    // Verify all purchases recorded
    const purchase1 = simnet.callReadOnlyFn(
      'content-registry',
      'get-purchase-info',
      [Cl.uint(1), Cl.principal(reader1)],
      deployer
    );
    expect(getTupleValue(purchase1)['token-used']).toStrictEqual(Cl.stringAscii('USDCx'));

    const purchase2 = simnet.callReadOnlyFn(
      'content-registry',
      'get-purchase-info',
      [Cl.uint(2), Cl.principal(reader2)],
      deployer
    );
    expect(getTupleValue(purchase2)['token-used']).toStrictEqual(Cl.stringAscii('STX'));
  });

  it('same user can purchase different articles with different tokens', () => {
    simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [Cl.stringAscii('Article 2'), Cl.stringAscii('QmHash2'), Cl.uint(50), Cl.stringAscii('tech')],
      writer1
    );

    simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [Cl.stringAscii('Article 3'), Cl.stringAscii('QmHash3'), Cl.uint(150), Cl.stringAscii('tech')],
      writer1
    );

    // Purchase with different tokens
    simnet.callPublicFn(
      'content-registry',
      'purchase-with-usdcx',
      [Cl.uint(1), Cl.contractPrincipal(deployer, 'mock-usdc')],
      reader1
    );

    simnet.callPublicFn(
      'content-registry',
      'purchase-with-stx',
      [Cl.uint(2), Cl.contractPrincipal(deployer, 'mock-pyth-oracle')],
      reader1
    );

    simnet.callPublicFn(
      'content-registry',
      'purchase-with-sbtc',
      [Cl.uint(3), Cl.contractPrincipal(deployer, 'mock-sbtc'), Cl.contractPrincipal(deployer, 'mock-pyth-oracle')],
      reader1
    );

    const stats = simnet.callReadOnlyFn(
      'content-registry',
      'get-reader-stats',
      [Cl.principal(reader1)],
      deployer
    );

    const readerStats = getTupleValue(stats);
    expect(readerStats['total-purchases']).toStrictEqual(Cl.uint(3));
    expect(readerStats['total-spent']).toStrictEqual(Cl.uint(250)); // 50 + 50 + 150
  });
});

describe('Content Registry - Writer Stats', () => {
  beforeEach(() => {
    initializeContracts();
  });

  it('writer stats update after publishing', () => {
    simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [Cl.stringAscii('Article 1'), Cl.stringAscii('QmHash1'), Cl.uint(50), Cl.stringAscii('tech')],
      writer1
    );

    simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [Cl.stringAscii('Article 2'), Cl.stringAscii('QmHash2'), Cl.uint(100), Cl.stringAscii('tech')],
      writer1
    );

    const stats = simnet.callReadOnlyFn(
      'content-registry',
      'get-writer-stats',
      [Cl.principal(writer1)],
      deployer
    );

    const writerStats = getTupleValue(stats);
    expect(writerStats['total-articles']).toStrictEqual(Cl.uint(2));
    expect(writerStats['total-earnings']).toStrictEqual(Cl.uint(0)); // No sales yet
  });

  it('writer stats update after sale', () => {
    simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [Cl.stringAscii('Test'), Cl.stringAscii('QmHash'), Cl.uint(100), Cl.stringAscii('tech')],
      writer1
    );

    simnet.callPublicFn(
      'content-registry',
      'purchase-with-stx',
      [Cl.uint(1), Cl.contractPrincipal(deployer, 'mock-pyth-oracle')],
      reader1
    );

    const stats = simnet.callReadOnlyFn(
      'content-registry',
      'get-writer-stats',
      [Cl.principal(writer1)],
      deployer
    );

    const writerStats = getTupleValue(stats);
    expect(writerStats['total-sales']).toStrictEqual(Cl.uint(1));
    // 97% of $1.00 = $0.97 = 97 cents
    expect(writerStats['total-earnings']).toStrictEqual(Cl.uint(97));
  });

  it('multiple sales accumulate correctly', () => {
    simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [Cl.stringAscii('Article 1'), Cl.stringAscii('QmHash1'), Cl.uint(50), Cl.stringAscii('tech')],
      writer1
    );

    simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [Cl.stringAscii('Article 2'), Cl.stringAscii('QmHash2'), Cl.uint(100), Cl.stringAscii('tech')],
      writer1
    );

    // Three purchases
    simnet.callPublicFn(
      'content-registry',
      'purchase-with-stx',
      [Cl.uint(1), Cl.contractPrincipal(deployer, 'mock-pyth-oracle')],
      reader1
    );

    simnet.callPublicFn(
      'content-registry',
      'purchase-with-stx',
      [Cl.uint(2), Cl.contractPrincipal(deployer, 'mock-pyth-oracle')],
      reader2
    );

    simnet.callPublicFn(
      'content-registry',
      'purchase-with-stx',
      [Cl.uint(1), Cl.contractPrincipal(deployer, 'mock-pyth-oracle')],
      reader2
    );

    const stats = simnet.callReadOnlyFn(
      'content-registry',
      'get-writer-stats',
      [Cl.principal(writer1)],
      deployer
    );

    const writerStats = getTupleValue(stats);
    expect(writerStats['total-sales']).toStrictEqual(Cl.uint(3));
    // (50 * 0.97) + (100 * 0.97) + (50 * 0.97) = 48 + 97 + 48 = 193 cents
    expect(writerStats['total-earnings']).toStrictEqual(Cl.uint(193));
  });
});

describe('Content Registry - Platform Stats', () => {
  beforeEach(() => {
    initializeContracts();
  });

  it('platform stats track correctly', () => {
    simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [Cl.stringAscii('Article 1'), Cl.stringAscii('QmHash1'), Cl.uint(50), Cl.stringAscii('tech')],
      writer1
    );

    simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [Cl.stringAscii('Article 2'), Cl.stringAscii('QmHash2'), Cl.uint(100), Cl.stringAscii('tech')],
      writer2
    );

    simnet.callPublicFn(
      'content-registry',
      'purchase-with-stx',
      [Cl.uint(1), Cl.contractPrincipal(deployer, 'mock-pyth-oracle')],
      reader1
    );

    simnet.callPublicFn(
      'content-registry',
      'purchase-with-stx',
      [Cl.uint(2), Cl.contractPrincipal(deployer, 'mock-pyth-oracle')],
      reader2
    );

    const stats = simnet.callReadOnlyFn(
      'content-registry',
      'get-platform-stats',
      [],
      deployer
    );

    const platformStats = getTupleValue(stats);
    expect(platformStats['total-articles']).toStrictEqual(Cl.uint(2));
    expect(platformStats['total-revenue']).toStrictEqual(Cl.uint(150)); // 50 + 100
    expect(platformStats['platform-fee']).toStrictEqual(Cl.uint(300)); // 3% = 300 bps
  });
});

describe('Content Registry - Price Calculations', () => {
  it('calculates writer amount correctly (97%)', () => {
    const testCases = [
      { price: 50, expected: 48 },
      { price: 100, expected: 97 },
      { price: 1000, expected: 970 },
      { price: 10000, expected: 9700 }
    ];

    testCases.forEach(({ price, expected }) => {
      const result = simnet.callReadOnlyFn(
        'content-registry',
        'calculate-writer-amount',
        [Cl.uint(price)],
        deployer
      );

      expect(result.result).toStrictEqual(Cl.uint(expected));
    });
  });

  it('calculates platform fee correctly (3%)', () => {
    const testCases = [
      { price: 50, expected: 1 },
      { price: 100, expected: 3 },
      { price: 1000, expected: 30 },
      { price: 10000, expected: 300 }
    ];

    testCases.forEach(({ price, expected }) => {
      const result = simnet.callReadOnlyFn(
        'content-registry',
        'calculate-platform-fee',
        [Cl.uint(price)],
        deployer
      );

      expect(result.result).toStrictEqual(Cl.uint(expected));
    });
  });
});

describe('Content Registry - Article Management', () => {
  beforeEach(() => {
    simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [Cl.stringAscii('Test'), Cl.stringAscii('QmHash'), Cl.uint(50), Cl.stringAscii('tech')],
      writer1
    );
  });

  it('only author can deactivate article', () => {
    const { result } = simnet.callPublicFn(
      'content-registry',
      'deactivate-article',
      [Cl.uint(1)],
      reader1 // Not the author
    );

    expect(result).toBeErr(Cl.uint(100)); // ERR-NOT-AUTHORIZED
  });

  it('author can deactivate article', () => {
    const { result } = simnet.callPublicFn(
      'content-registry',
      'deactivate-article',
      [Cl.uint(1)],
      writer1
    );

    expect(result).toBeOk(Cl.bool(true));

    // Verify deactivation
    const article = simnet.callReadOnlyFn(
      'content-registry',
      'get-article',
      [Cl.uint(1)],
      deployer
    );

    const articleData = getTupleValue(article);
    expect(articleData['is-active']).toStrictEqual(Cl.bool(false));
  });

  it('only author can update price', () => {
    const { result } = simnet.callPublicFn(
      'content-registry',
      'update-article-price',
      [Cl.uint(1), Cl.uint(100)],
      reader1
    );

    expect(result).toBeErr(Cl.uint(100));
  });

  it('author can update price', () => {
    const { result } = simnet.callPublicFn(
      'content-registry',
      'update-article-price',
      [Cl.uint(1), Cl.uint(100)],
      writer1
    );

    expect(result).toBeOk(Cl.bool(true));

    const article = simnet.callReadOnlyFn(
      'content-registry',
      'get-article',
      [Cl.uint(1)],
      deployer
    );

    const articleData = getTupleValue(article);
    expect(articleData['price-usd']).toStrictEqual(Cl.uint(100));
  });

  it('cannot update price to zero', () => {
    const { result } = simnet.callPublicFn(
      'content-registry',
      'update-article-price',
      [Cl.uint(1), Cl.uint(0)],
      writer1
    );

    expect(result).toBeErr(Cl.uint(101));
  });
});

describe('Content Registry - Block Height Usage', () => {
  beforeEach(() => {
    initializeContracts();
  });

  it('tracks publication block height', () => {
    const startHeight = getCurrentBlockHeight();

    simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [Cl.stringAscii('Test'), Cl.stringAscii('QmHash'), Cl.uint(50), Cl.stringAscii('tech')],
      writer1
    );

    const article = simnet.callReadOnlyFn(
      'content-registry',
      'get-article',
      [Cl.uint(1)],
      deployer
    );

    const articleData = getTupleValue(article);
    const publishedAt = articleData['published-at'];
    // Block height increases by 1 during the transaction
    expect(publishedAt).toStrictEqual(Cl.uint(startHeight + 1));
  });

  it('tracks purchase block height', () => {
    simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [Cl.stringAscii('Test'), Cl.stringAscii('QmHash'), Cl.uint(50), Cl.stringAscii('tech')],
      writer1
    );

    // Mine some blocks
    mineBlocks(5);
    const purchaseHeight = getCurrentBlockHeight();

    simnet.callPublicFn(
      'content-registry',
      'purchase-with-stx',
      [Cl.uint(1), Cl.contractPrincipal(deployer, 'mock-pyth-oracle')],
      reader1
    );

    const purchaseInfo = simnet.callReadOnlyFn(
      'content-registry',
      'get-purchase-info',
      [Cl.uint(1), Cl.principal(reader1)],
      deployer
    );

    const purchaseData = getTupleValue(purchaseInfo);
    const purchasedAt = purchaseData['purchased-at'];
    // Block height increases by 1 during the transaction
    expect(purchasedAt).toStrictEqual(Cl.uint(purchaseHeight + 1));
  });
});