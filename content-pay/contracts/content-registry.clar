;; content-registry.clar
;; Micropayment content platform with multi-token support (USDCx, STX, sBTC)
;; TESTNET READY VERSION

;; Constants
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-INVALID-PRICE (err u101))
(define-constant ERR-ARTICLE-NOT-FOUND (err u102))
(define-constant ERR-ALREADY-PURCHASED (err u103))
(define-constant ERR-INVALID-TOKEN (err u104))
(define-constant ERR-PAYMENT-FAILED (err u105))
(define-constant ERR-NOT-INITIALIZED (err u106))
(define-constant PLATFORM-FEE-BPS u300) ;; 3% = 300 basis points

;; Token contract addresses (set during initialization for simnet)
(define-data-var sbtc-token (optional principal) none)
(define-data-var usdcx-token (optional principal) none)

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

(define-read-only (calculate-writer-amount (price-usd uint))
  ;; Writer gets 97% (100% - 3% fee)
  (/ (* price-usd u97) u100)
)

(define-read-only (calculate-platform-fee (price-usd uint))
  ;; Platform gets 3%
  (/ (* price-usd u3) u100)
)

;; Initialization function for setting token contracts
(define-public (initialize-contracts (sbtc principal) (usdcx principal))
   (begin
     (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
     (asserts! (not (var-get initialized)) ERR-NOT-AUTHORIZED)
     (var-set sbtc-token (some sbtc))
     (var-set usdcx-token (some usdcx))
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
(define-public (purchase-with-stx (article-id uint) (stx-amount uint))
  (let
    (
      (article (unwrap! (map-get? articles article-id) ERR-ARTICLE-NOT-FOUND))
      (reader tx-sender)
      (author (get author article))
      (price (get price-usd article))
      (writer-amount (calculate-writer-amount stx-amount))
      (platform-fee (calculate-platform-fee stx-amount))
    )
    ;; Validations
    (asserts! (get is-active article) ERR-ARTICLE-NOT-FOUND)
    (asserts! (not (has-purchased article-id reader)) ERR-ALREADY-PURCHASED)
    
    ;; Transfer STX to writer (using actual STX amount for transfers)
    (try! (stx-transfer? writer-amount reader author))
    
    ;; Transfer platform fee
    (try! (stx-transfer? platform-fee reader (var-get platform-treasury)))
    
    ;; Record purchase with USD price
    (record-purchase article-id reader price "STX" author)
  )
)

;; Purchase with sBTC (TESTNET READY)
(define-public (purchase-with-sbtc (article-id uint))
   (let
     (
       (article (unwrap! (map-get? articles article-id) ERR-ARTICLE-NOT-FOUND))
       (reader tx-sender)
       (author (get author article))
       (price (get price-usd article))
       (writer-amount-sats (calculate-writer-amount price))
       (platform-fee-sats (calculate-platform-fee price))
       (sbtc-contract (unwrap! (var-get sbtc-token) ERR-NOT-INITIALIZED))
     )
     ;; Validations
     (asserts! (get is-active article) ERR-ARTICLE-NOT-FOUND)
     (asserts! (not (has-purchased article-id reader)) ERR-ALREADY-PURCHASED)

     ;; Transfer sBTC from reader to author (97%)
     (try! (contract-call? sbtc-contract transfer?
       writer-amount-sats
       reader
       author
       none))

     ;; Transfer sBTC platform fee (3%)
     (try! (contract-call? sbtc-contract transfer?
       platform-fee-sats
       reader
       (var-get platform-treasury)
       none))

     ;; Record purchase
     (record-purchase article-id reader price "sBTC" author)
   )
)

;; Purchase with USDCx
(define-public (purchase-with-usdcx (article-id uint))
   (let
     (
       (article (unwrap! (map-get? articles article-id) ERR-ARTICLE-NOT-FOUND))
       (reader tx-sender)
       (author (get author article))
       (price (get price-usd article))
       (usdcx-contract (unwrap! (var-get usdcx-token) ERR-NOT-INITIALIZED))
     )
     ;; Validations
     (asserts! (get is-active article) ERR-ARTICLE-NOT-FOUND)
     (asserts! (not (has-purchased article-id reader)) ERR-ALREADY-PURCHASED)

     (let
       (
         (writer-amount (calculate-writer-amount price))
         (platform-fee (calculate-platform-fee price))
       )
       ;; Transfer USDCx from reader to author (97%)
       (try! (contract-call? usdcx-contract transfer?
         writer-amount
         reader
         author
         none))

       ;; Transfer USDCx platform fee (3%)
       (try! (contract-call? usdcx-contract transfer?
         platform-fee
         reader
         (var-get platform-treasury)
         none))
     )

     ;; Record purchase
     (record-purchase article-id reader price "USDCx" author)
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
    (update-writer-stats-sale author amount)
    
    ;; Update reader stats
    (update-reader-stats reader amount)
    
    ;; Update platform revenue
    (var-set total-revenue (+ (var-get total-revenue) amount))
    
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

(define-private (update-writer-stats-sale (writer principal) (amount uint))
  (let
    (
      (stats (get-writer-stats writer))
      (writer-earnings (calculate-writer-amount amount))
    )
    (map-set writer-stats writer {
      total-articles: (get total-articles stats),
      total-earnings: (+ (get total-earnings stats) writer-earnings),
      total-sales: (+ (get total-sales stats) u1)
    })
  )
)

(define-private (update-reader-stats (reader principal) (amount uint))
  (let
    (
      (stats (get-reader-stats reader))
    )
    (map-set reader-stats reader {
      total-purchases: (+ (get total-purchases stats) u1),
      total-spent: (+ (get total-spent stats) amount)
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
