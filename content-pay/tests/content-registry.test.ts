import { describe, expect, it, beforeEach } from 'vitest';
import { Cl } from '@stacks/transactions';
import type { ClarityValue } from '@stacks/transactions';

const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const writer1 = accounts.get('wallet_1')!;
const writer2 = accounts.get('wallet_2')!;
const reader1 = accounts.get('wallet_3')!;
const reader2 = accounts.get('wallet_4')!;

// Initialize token contracts for tests
simnet.callPublicFn(
  'content-registry',
  'initialize-contracts',
  [Cl.principal('ST1PQHQKV0RJ0FY1JXKBPR4JKNV09J5ZZVVACM3JD.mock-sbtc'), Cl.principal('ST1PQHQKV0RJ0FY1JXKBPR4JKNV09J5ZZVVACM3JD.mock-usdc')],
  deployer
);

// Helper function to mine blocks
function mineBlocks(count: number) {
  simnet.mineEmptyBlocks(count);
}

// Helper function to get current block height
function getCurrentBlockHeight(): number {
  return simnet.blockHeight;
}

// Helper to get tuple value from ClarityResult
function getTupleValue(result: { result: ClarityValue }): any {
  return (result.result as any).value;
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
    // Publish an article before each test
    simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [Cl.stringAscii('Test Article'), Cl.stringAscii('QmHash'), Cl.uint(50), Cl.stringAscii('tech')],
      writer1
    );
  });

  it('can purchase article with STX', () => {
    const { result } = simnet.callPublicFn(
      'content-registry',
      'purchase-with-stx',
      [
        Cl.uint(1), // article-id
        Cl.uint(625000) // 0.625 STX
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
  });

  it('cannot purchase same article twice', () => {
    // First purchase
    simnet.callPublicFn(
      'content-registry',
      'purchase-with-stx',
      [Cl.uint(1), Cl.uint(625000)],
      reader1
    );

    // Second purchase should fail
    const { result } = simnet.callPublicFn(
      'content-registry',
      'purchase-with-stx',
      [Cl.uint(1), Cl.uint(625000)],
      reader1
    );

    expect(result).toBeErr(Cl.uint(103)); // ERR-ALREADY-PURCHASED
  });

  it('cannot purchase non-existent article', () => {
    const { result } = simnet.callPublicFn(
      'content-registry',
      'purchase-with-stx',
      [Cl.uint(999), Cl.uint(625000)],
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
      [Cl.uint(1), Cl.uint(625000)],
      reader1
    );

    expect(result).toBeErr(Cl.uint(102)); // ERR-ARTICLE-NOT-FOUND
  });
});

describe('Content Registry - USDCx Purchases', () => {
  beforeEach(() => {
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
      [Cl.uint(1)],
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
  });

  it('cannot purchase same article twice with USDCx', () => {
    simnet.callPublicFn(
      'content-registry',
      'purchase-with-usdcx',
      [Cl.uint(1)],
      reader1
    );

    const { result } = simnet.callPublicFn(
      'content-registry',
      'purchase-with-usdcx',
      [Cl.uint(1)],
      reader1
    );

    expect(result).toBeErr(Cl.uint(103)); // ERR-ALREADY-PURCHASED
  });

  it('USDCx purchase updates writer earnings correctly', () => {
    simnet.callPublicFn(
      'content-registry',
      'purchase-with-usdcx',
      [Cl.uint(1)],
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
    simnet.callPublicFn(
      'content-registry',
      'purchase-with-usdcx',
      [Cl.uint(1)],
      reader1
    );

    simnet.callPublicFn(
      'content-registry',
      'purchase-with-usdcx',
      [Cl.uint(1)],
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
    simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [Cl.stringAscii('Test Article'), Cl.stringAscii('QmHash'), Cl.uint(50), Cl.stringAscii('tech')],
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

  it('can purchase article with sBTC', () => {
    const { result } = simnet.callPublicFn(
      'content-registry',
      'purchase-with-sbtc',
      [Cl.uint(1)],
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
  });

  it('cannot purchase same article twice with sBTC', () => {
    simnet.callPublicFn(
      'content-registry',
      'purchase-with-sbtc',
      [Cl.uint(1)],
      reader1
    );

    const { result } = simnet.callPublicFn(
      'content-registry',
      'purchase-with-sbtc',
      [Cl.uint(1)],
      reader1
    );

    expect(result).toBeErr(Cl.uint(103));
  });
});

describe('Content Registry - Mixed Token Purchases', () => {
  beforeEach(() => {
    simnet.callPublicFn(
      'content-registry',
      'publish-article',
      [Cl.stringAscii('Test Article'), Cl.stringAscii('QmHash'), Cl.uint(50), Cl.stringAscii('tech')],
      writer1
    );

    // Mint tokens to readers
    simnet.callPublicFn('mock-usdc', 'mint', [Cl.uint(100000000), Cl.principal(reader1)], deployer);
    simnet.callPublicFn('mock-sbtc', 'mint', [Cl.uint(100000000), Cl.principal(reader1)], deployer);
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
    simnet.callPublicFn(
      'content-registry',
      'purchase-with-usdcx',
      [Cl.uint(1)],
      reader1
    );

    // Reader2 uses STX for article 2
    simnet.callPublicFn(
      'content-registry',
      'purchase-with-stx',
      [Cl.uint(2), Cl.uint(1250000)],
      reader2
    );

    // Reader1 uses sBTC for article 3
    const sbtcResult = simnet.callPublicFn(
      'content-registry',
      'purchase-with-sbtc',
      [Cl.uint(3)],
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
      [Cl.uint(1)],
      reader1
    );

    simnet.callPublicFn(
      'content-registry',
      'purchase-with-stx',
      [Cl.uint(2), Cl.uint(625000)],
      reader1
    );

    simnet.callPublicFn(
      'content-registry',
      'purchase-with-sbtc',
      [Cl.uint(3)],
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
    expect(readerStats['total-spent']).toStrictEqual(Cl.uint(300)); // 100 + 50 + 150
  });
});

describe('Content Registry - Writer Stats', () => {
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
      [Cl.uint(1), Cl.uint(1250000)],
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
      [Cl.uint(1), Cl.uint(625000)],
      reader1
    );

    simnet.callPublicFn(
      'content-registry',
      'purchase-with-stx',
      [Cl.uint(2), Cl.uint(1250000)],
      reader2
    );

    simnet.callPublicFn(
      'content-registry',
      'purchase-with-stx',
      [Cl.uint(1), Cl.uint(625000)],
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
      [Cl.uint(1), Cl.uint(625000)],
      reader1
    );

    simnet.callPublicFn(
      'content-registry',
      'purchase-with-stx',
      [Cl.uint(2), Cl.uint(1250000)],
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
    expect(platformStats['total-revenue']).toStrictEqual(Cl.uint(0)); // Revenue not tracked in purchases
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
    expect(publishedAt).toStrictEqual(Cl.uint(startHeight));
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
      [Cl.uint(1), Cl.uint(625000)],
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
    expect(purchasedAt).toStrictEqual(Cl.uint(purchaseHeight));
  });
});
