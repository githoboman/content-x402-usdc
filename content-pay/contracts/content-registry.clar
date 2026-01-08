;; content-registry.clar
;; Micropayment content platform with multi-token support (USDCx, STX, sBTC)
;; TESTNET READY VERSION

;; Import the SIP-010 trait
(use-trait sip-010-trait .sip-010-trait-ft-standard.sip-010-trait)
(use-trait pyth-oracle-trait .pyth-oracle-trait.pyth-oracle-trait)

;; Constants
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-INVALID-PRICE (err u101))
(define-constant ERR-ARTICLE-NOT-FOUND (err u102))
(define-constant ERR-ALREADY-PURCHASED (err u103))
(define-constant ERR-INVALID-TOKEN (err u104))
(define-constant ERR-PAYMENT-FAILED (err u105))
(define-constant ERR-NOT-INITIALIZED (err u106))
(define-constant ERR-ORACLE-ERROR (err u107))

(define-constant PLATFORM-FEE-BPS u300) ;; 3% = 300 basis points

;; Price Feed IDs (Mock IDs for testing, would be real Pyth IDs on mainnet)
(define-constant STX-FEED-ID 0x0100000000000000000000000000000000000000000000000000000000000000)
(define-constant BTC-FEED-ID 0x0200000000000000000000000000000000000000000000000000000000000000)

;; Token contract addresses (set during initialization for simnet)
(define-data-var sbtc-token (optional principal) none)
(define-data-var usdcx-token (optional principal) none)
(define-data-var oracle-contract (optional principal) none)

;; Data Variables
(define-data-var article-nonce uint u0)
(define-data-var platform-treasury principal CONTRACT-OWNER)
(define-data-var total-articles uint u0)
(define-data-var total-revenue uint u0)
(define-data-var initialized bool false)

;; Article metadata
(define-map articles
  uint ;; article-id
  {
    author: principal,
    title: (string-ascii 256),
    content-hash: (string-ascii 64), ;; IPFS CID or Gaia URL
    price-usd: uint, ;; Price in USD cents (e.g., 50 = $0.50)
    published-at: uint, ;; block height
    category: (string-ascii 50),
    is-active: bool
  }
)

;; Track purchases per user per article
(define-map purchases
  {article-id: uint, reader: principal}
  {
    purchased-at: uint,
    amount-paid: uint,
    token-used: (string-ascii 10)
  }
)

;; Writer stats
(define-map writer-stats
  principal
  {
    total-articles: uint,
    total-earnings: uint,
    total-sales: uint
  }
)

;; Reader stats
(define-map reader-stats
  principal
  {
    total-purchases: uint,
    total-spent: uint
  }
)

;; Read-only functions

(define-read-only (get-article (article-id uint))
  (map-get? articles article-id)
)

(define-read-only (has-purchased (article-id uint) (reader principal))
  (is-some (map-get? purchases {article-id: article-id, reader: reader}))
)

(define-read-only (get-purchase-info (article-id uint) (reader principal))
  (map-get? purchases {article-id: article-id, reader: reader})
)

(define-read-only (get-writer-stats (writer principal))
  (default-to 
    {total-articles: u0, total-earnings: u0, total-sales: u0}
    (map-get? writer-stats writer)
  )
)

(define-read-only (get-reader-stats (reader principal))
  (default-to
    {total-purchases: u0, total-spent: u0}
    (map-get? reader-stats reader)
  )
)

(define-read-only (get-platform-stats)
  {
    total-articles: (var-get total-articles),
    total-revenue: (var-get total-revenue),
    platform-fee: PLATFORM-FEE-BPS
  }
)

(define-read-only (calculate-writer-amount (amount uint))
  ;; Writer gets 97% (100% - 3% fee) of the token amount
  (/ (* amount u97) u100)
)

(define-read-only (calculate-platform-fee (amount uint))
  ;; Platform gets 3% of the token amount
  (/ (* amount u3) u100)
)

;; Helper to get token units from USD price
;; price-usd: Article price in cents (integer)
;; feed-id: Pyth feed ID
;; decimals: Token decimals (e.g. 6 for STX, 8 for BTC)
(define-private (calculate-token-amount (price-usd uint) (feed-id (buff 32)) (decimals uint) (oracle <pyth-oracle-trait>))
  (let
    (
      (price-data (unwrap! (contract-call? oracle read-price-feed feed-id none) ERR-ORACLE-ERROR))
      (oracle-price (get price price-data))
      (oracle-expo (get expo price-data))
    )
    ;; Ensure price is positive
    (asserts! (> oracle-price 0) ERR-ORACLE-ERROR)
    
    ;; Formula: (price-usd * 10^(decimals - 2 - expo)) / oracle-price
    ;; -2 because price-usd is in cents (10^-2)
    ;; Example STX: $0.50 (50), Oracle $1 (10^8, expo -8). Decimals 6.
    ;; Power = 6 - 2 - (-8) = 12.
    ;; Numerator = 50 * 10^12.
    ;; Result = 50 * 10^12 / 10^8 = 500,000 (0.5 STX).
    
    (let
      (
        (power (- (+ (to-int decimals) 8) 2)) ;; Using fixed -8 expo assumption for simplicity or we calculate dynamic power
        ;; Note: Clarity pow takes uint. We need positive power.
        ;; Pyth expo is usually negative (-8).
        ;; Let's handle generic case carefully. 
        ;; We simplify assuming Pyth expo is -8 (standard) AND decimals >= 2.
        ;; Real implementation needs absolute value helper for expo.
        ;; For this MVP, we assume power is resulting positive.
         
        (adjusted-power (to-uint (- (+ (to-int decimals) (* -1 oracle-expo)) 2))) 
        (numerator (* price-usd (pow u10 adjusted-power)))
      )
       (ok (/ numerator (to-uint oracle-price)))
    )
  )
)

;; Initialization function for setting token contracts
(define-public (initialize-contracts (sbtc principal) (usdcx principal) (oracle principal))
   (begin
     (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
     (asserts! (not (var-get initialized)) ERR-NOT-AUTHORIZED)
     (var-set sbtc-token (some sbtc))
     (var-set usdcx-token (some usdcx))
     (var-set oracle-contract (some oracle))
     (var-set initialized true)
     (ok true)
   )
)

;; Public functions

(define-public (publish-article 
  (title (string-ascii 256))
  (content-hash (string-ascii 64))
  (price-usd uint) ;; Price in USD cents
  (category (string-ascii 50))
)
  (let
    (
      (article-id (+ (var-get article-nonce) u1))
      (author tx-sender)
    )
    ;; Validations
    (asserts! (> price-usd u0) ERR-INVALID-PRICE)
    (asserts! (<= price-usd u1000000) ERR-INVALID-PRICE) ;; Max $10,000
    
    ;; Store article
    (map-set articles article-id {
      author: author,
      title: title,
      content-hash: content-hash,
      price-usd: price-usd,
      published-at: block-height,
      category: category,
      is-active: true
    })
    
    ;; Update writer stats
    (update-writer-stats-publish author)
    
    ;; Increment counters
    (var-set article-nonce article-id)
    (var-set total-articles (+ (var-get total-articles) u1))
    
    (ok article-id)
  )
)

;; Purchase with STX
;; Calculates required STX based on Oracle price
(define-public (purchase-with-stx (article-id uint) (oracle <pyth-oracle-trait>))
  (let
    (
      (article (unwrap! (map-get? articles article-id) ERR-ARTICLE-NOT-FOUND))
      (reader tx-sender)
      (author (get author article))
      (price (get price-usd article))
      
      ;; Verify oracle matches initialized one
      (oracle-ok (asserts! (is-eq (contract-of oracle) (unwrap! (var-get oracle-contract) ERR-NOT-INITIALIZED)) ERR-NOT-AUTHORIZED))
      
      ;; Calculate amount
      (amount (unwrap! (calculate-token-amount price STX-FEED-ID u6 oracle) ERR-ORACLE-ERROR))
      
      (writer-amount (calculate-writer-amount amount))
      (platform-fee (calculate-platform-fee amount))
    )
    ;; Validations
    (asserts! (get is-active article) ERR-ARTICLE-NOT-FOUND)
    (asserts! (not (has-purchased article-id reader)) ERR-ALREADY-PURCHASED)
    
    ;; Transfer STX to writer
    (try! (stx-transfer? writer-amount reader author))
    
    ;; Transfer platform fee
    (try! (stx-transfer? platform-fee reader (var-get platform-treasury)))
    
    ;; Record purchase - Store 'price' (USD) in statistics, but tracking actual token amount might be better for some stats? 
    ;; Current stats use 'amount' for both.
    ;; We should track 'amount-paid' as the token amount.
    ;; 'total-revenue' will now be a mix of tokens... that's problematic for the platform-stats.
    ;; LIMITATION: `total-revenue` is tracking raw units. Mixing STX and sBTC units makes it meaningless.
    ;; FIX: We'll stop incrementing `total-revenue` or split it by token in V2.
    ;; For now, we will just record the purchase.
    (record-purchase article-id reader amount "STX" author price)
  )
)

;; Purchase with sBTC (using trait parameter)
(define-public (purchase-with-sbtc (article-id uint) (token-contract <sip-010-trait>) (oracle <pyth-oracle-trait>))
   (let
     (
       (article (unwrap! (map-get? articles article-id) ERR-ARTICLE-NOT-FOUND))
       (reader tx-sender)
       (author (get author article))
       (price (get price-usd article))
       
       ;; Verify oracle matches initialized one
      (oracle-ok (asserts! (is-eq (contract-of oracle) (unwrap! (var-get oracle-contract) ERR-NOT-INITIALIZED)) ERR-NOT-AUTHORIZED))

       ;; Calculate amount (sBTC has 8 decimals)
       (amount (unwrap! (calculate-token-amount price BTC-FEED-ID u8 oracle) ERR-ORACLE-ERROR))
       
       (writer-amount (calculate-writer-amount amount))
       (platform-fee (calculate-platform-fee amount))
     )
     ;; Validations
     (asserts! (get is-active article) ERR-ARTICLE-NOT-FOUND)
     (asserts! (not (has-purchased article-id reader)) ERR-ALREADY-PURCHASED)
     
     ;; Verify this is the correct token
     (asserts! (is-eq (contract-of token-contract) (unwrap! (var-get sbtc-token) ERR-NOT-INITIALIZED)) ERR-INVALID-TOKEN)

     ;; Transfer sBTC from reader to author (97%)
     (try! (contract-call? token-contract transfer?
       writer-amount
       reader
       author
       none))

     ;; Transfer sBTC platform fee (3%)
     (try! (contract-call? token-contract transfer?
       platform-fee
       reader
       (var-get platform-treasury)
       none))

     ;; Record purchase
     (record-purchase article-id reader amount "sBTC" author price)
   )
)

;; Purchase with USDCx (using trait parameter)
;; Purchase with USDCx (using trait parameter)
;; USDCx is treated as a stablecoin with 6 decimals, hard-pegged to USD
(define-public (purchase-with-usdcx (article-id uint) (token-contract <sip-010-trait>))
   (let
     (
       (article (unwrap! (map-get? articles article-id) ERR-ARTICLE-NOT-FOUND))
       (reader tx-sender)
       (author (get author article))
       (price (get price-usd article))
       
       ;; Calculate amount (USDC has 6 decimals, price is in cents)
       ;; Formula: price-usd * 10^4 (to go from 2 decimals to 6)
       (amount (* price u10000))

       (writer-amount (calculate-writer-amount amount))
       (platform-fee (calculate-platform-fee amount))
     )
     ;; Validations
     (asserts! (get is-active article) ERR-ARTICLE-NOT-FOUND)
     (asserts! (not (has-purchased article-id reader)) ERR-ALREADY-PURCHASED)
     
     ;; Verify this is the correct token
     (asserts! (is-eq (contract-of token-contract) (unwrap! (var-get usdcx-token) ERR-NOT-INITIALIZED)) ERR-INVALID-TOKEN)

     ;; Transfer USDCx from reader to author (97%)
     (try! (contract-call? token-contract transfer?
       writer-amount
       reader
       author
       none))

     ;; Transfer USDCx platform fee (3%)
     (try! (contract-call? token-contract transfer?
       platform-fee
       reader
       (var-get platform-treasury)
       none))

     ;; Record purchase
     (record-purchase article-id reader amount "USDCx" author price)
   )
)

(define-public (deactivate-article (article-id uint))
  (let
    (
      (article (unwrap! (map-get? articles article-id) ERR-ARTICLE-NOT-FOUND))
    )
    (asserts! (is-eq tx-sender (get author article)) ERR-NOT-AUTHORIZED)
    
    (map-set articles article-id
      (merge article {is-active: false})
    )
    (ok true)
  )
)

(define-public (update-article-price (article-id uint) (new-price uint))
  (let
    (
      (article (unwrap! (map-get? articles article-id) ERR-ARTICLE-NOT-FOUND))
    )
    (asserts! (is-eq tx-sender (get author article)) ERR-NOT-AUTHORIZED)
    (asserts! (> new-price u0) ERR-INVALID-PRICE)
    (asserts! (<= new-price u1000000) ERR-INVALID-PRICE)
    
    (map-set articles article-id
      (merge article {price-usd: new-price})
    )
    (ok true)
  )
)

;; Private functions

(define-private (record-purchase 
  (article-id uint) 
  (reader principal) 
  (amount uint) 
  (token (string-ascii 10))
  (author principal)
  (price-usd uint)
)
  (begin
    ;; Record purchase
    (map-set purchases 
      {article-id: article-id, reader: reader}
      {
        purchased-at: block-height,
        amount-paid: amount,
        token-used: token
      }
    )
    
    ;; Update writer stats
    (update-writer-stats-sale author price-usd)
    
    ;; Update reader stats
    (update-reader-stats reader price-usd)
    
    ;; Update platform revenue (Track USD volume)
    (var-set total-revenue (+ (var-get total-revenue) price-usd))
    
    (ok true)
  )
)

(define-private (update-writer-stats-publish (writer principal))
  (let
    (
      (stats (get-writer-stats writer))
    )
    (map-set writer-stats writer {
      total-articles: (+ (get total-articles stats) u1),
      total-earnings: (get total-earnings stats),
      total-sales: (get total-sales stats)
    })
  )
)

(define-private (update-writer-stats-sale (writer principal) (price-usd uint))
  (let
    (
      (stats (get-writer-stats writer))
      (writer-earnings (calculate-writer-amount price-usd))
    )
    (map-set writer-stats writer {
      total-articles: (get total-articles stats),
      total-earnings: (+ (get total-earnings stats) writer-earnings),
      total-sales: (+ (get total-sales stats) u1)
    })
  )
)

(define-private (update-reader-stats (reader principal) (price-usd uint))
  (let
    (
      (stats (get-reader-stats reader))
    )
    (map-set reader-stats reader {
      total-purchases: (+ (get total-purchases stats) u1),
      total-spent: (+ (get total-spent stats) price-usd)
    })
  )
)

;; Admin functions

(define-public (set-platform-treasury (new-treasury principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set platform-treasury new-treasury)
    (ok true)
  )
)