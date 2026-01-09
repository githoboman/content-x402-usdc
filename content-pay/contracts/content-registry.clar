;; content-registry-enhanced.clar

;; ===== CONSTANTS =====
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-NOT-FOUND (err u101))
(define-constant ERR-ALREADY-PURCHASED (err u102))
(define-constant ERR-INSUFFICIENT-PAYMENT (err u103))
(define-constant ERR-ORACLE-FAILURE (err u104))
(define-constant ERR-INACTIVE (err u105))

;; External contracts
(define-constant PYTH-ORACLE 'ST34SWDZ8QJEB124ZBEVN6A69DDVQXNVH66AJKY65.mock-pyth-oracle-v1)
(define-constant SBTC-TOKEN 'ST34SWDZ8QJEB124ZBEVN6A69DDVQXNVH66AJKY65.mock-sbtc-v1)
(define-constant USDCX-TOKEN 'ST34SWDZ8QJEB124ZBEVN6A69DDVQXNVH66AJKY65.mock-usdc-v1)
(define-constant PLATFORM-TREASURY 'ST34SWDZ8QJEB124ZBEVN6A69DDVQXNVH66AJKY65)
(define-constant PLATFORM-FEE-PERCENT u3)

;; ===== DATA STRUCTURES =====
(define-map articles
  uint
  {
    author: principal,
    title: (string-ascii 256),
    content-hash: (string-ascii 64),
    price-usd: uint, ;; Price in cents (e.g., 500 = $5.00)
    category: (string-ascii 50),
    active: bool,
    published-at: uint
  }
)

(define-map purchases
  {article-id: uint, reader: principal}
  {
    purchased: bool,
    paid-amount: uint,
    token: (string-ascii 10),
    purchased-at: uint
  }
)

(define-map writer-stats
  principal
  {
    total-articles: uint,
    total-earnings-usd: uint,
    total-purchases: uint
  }
)

(define-map reader-stats
  principal
  {
    total-purchases: uint,
    total-spent-usd: uint
  }
)

(define-data-var article-counter uint u0)
(define-data-var platform-total-revenue uint u0)

;; ===== PYTH ORACLE FUNCTIONS =====

;; Get real-time price from Pyth Oracle
(define-public (get-token-price (price-feed-id (buff 32)))
  (contract-call? PYTH-ORACLE read-price-feed price-feed-id none)
)

;; Calculate STX amount needed for USD price
(define-public (calculate-stx-amount (price-usd uint))
  (let (
    (price-data (unwrap! (get-token-price 0x5354580000000000000000000000000000000000000000000000000000000000) 
                         ERR-ORACLE-FAILURE))
    ;; Assuming price-data returns {price: int, expo: int, timestamp: uint}
    (stx-price-raw (get price price-data))
    (stx-expo (get expo price-data))
    ;; Convert USD cents (10^-2) to STX (10^6)
    ;; stx-price-raw is e.g. 100000000 ($1.00) with expo -8
    ;; We want (price-usd * 10^8) / price * 10^(6 - 2 - (-8)) ?? No.
    ;; Let's assume standard Pyth: price * 10^expo.
    ;; Target: STX amount (micros).
    ;; Value in USD = price-usd / 100.
    ;; Price of STX in USD = price-raw * 10^expo.
    ;; Amount = (Value in USD) / (Price of STX in USD)
    ;;        = (price-usd * 10^-2) / (price-raw * 10^expo)
    ;;        = (price-usd / price-raw) * 10^ (-2 - expo)
    ;; To get micros (10^6):
    ;; Amount_micros = Amount * 10^6
    ;;               = (price-usd / price-raw) * 10^(-2 - expo + 6)
    ;;               = (price-usd / price-raw) * 10^(4 - expo)
    ;; If expo is -8: 4 - (-8) = 12.
    ;; So: (price-usd * 10^12) / price-raw.
    ;; Note: stx-price-raw is int. Cast to uint for calculation if positive.
    (stx-price-uint (to-uint stx-price-raw))
  )
    ;; Safety check
    (asserts! (> stx-price-uint u0) ERR-ORACLE-FAILURE)
    (ok (/ (* price-usd u1000000000000) stx-price-uint))
  )
)

;; ... (publish-article remains same) ...

;; ===== PURCHASE FUNCTIONS =====

;; Purchase with STX (dynamic pricing via Pyth)
(define-public (purchase-with-stx (article-id uint))
  (let (
    (article (unwrap! (map-get? articles article-id) ERR-NOT-FOUND))
    (price-usd (get price-usd article))
    (stx-amount (unwrap! (calculate-stx-amount price-usd) ERR-ORACLE-FAILURE))
    (platform-fee (/ (* stx-amount PLATFORM-FEE-PERCENT) u100))
    (writer-amount (- stx-amount platform-fee))
  )
    ;; Validate
    (asserts! (get active article) ERR-INACTIVE)
    (asserts! (is-none (map-get? purchases {article-id: article-id, reader: tx-sender})) 
              ERR-ALREADY-PURCHASED)

    ;; Transfer STX
    (try! (stx-transfer? writer-amount tx-sender (get author article)))
    (try! (stx-transfer? platform-fee tx-sender PLATFORM-TREASURY))

    ;; Record purchase
    (map-set purchases 
      {article-id: article-id, reader: tx-sender}
      {
        purchased: true,
        paid-amount: stx-amount,
        token: "STX",
        purchased-at: block-height
      }
    )

    ;; Update stats
    (update-purchase-stats (get author article) tx-sender price-usd)
    (var-set platform-total-revenue (+ (var-get platform-total-revenue) platform-fee))

    ;; Emit event for Hiro Hooks
    (print {
      event: "purchase",
      article-id: article-id,
      reader: tx-sender,
      author: (get author article),
      token: "STX",
      amount: stx-amount,
      usd-price: price-usd,
      platform-fee: platform-fee,
      writer-earnings: writer-amount,
      timestamp: block-height
    })

    (ok true)
  )
)

;; Purchase with sBTC
(define-public (purchase-with-sbtc (article-id uint))
  (let (
    (article (unwrap! (map-get? articles article-id) ERR-NOT-FOUND))
    (price-usd (get price-usd article))
    ;; Get BTC/USD price from Pyth (BTC/USD feed id)
    (btc-price-data (unwrap! (get-token-price 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43) 
                             ERR-ORACLE-FAILURE))
    (btc-price-raw (get price btc-price-data))
    (btc-expo (get expo btc-price-data))
    (btc-price-uint (to-uint btc-price-raw))
    
    ;; Calculate sBTC amount (8 decimals)
    ;; USD value: price-usd * 10^-2
    ;; BTC Price: btc-price-raw * 10^expo
    ;; Amount = (price-usd * 10^-2) / (btc-price * 10^expo)
    ;;        = (price-usd / btc-price) * 10^(-2-expo)
    ;; Target 8 decimals (10^8):
    ;; Amount_sats = Amount * 10^8
    ;;             = (price-usd / btc-price) * 10^(-2-expo+8)
    ;;             = (price-usd / btc-price) * 10^(6-expo)
    ;; If expo is -8: 6 - (-8) = 14.
    ;; Formula: (price-usd * 10^14) / btc-price
    (sbtc-amount (/ (* price-usd u100000000000000) btc-price-uint))
    
    (platform-fee (/ (* sbtc-amount PLATFORM-FEE-PERCENT) u100))
    (writer-amount (- sbtc-amount platform-fee))
  )
    ;; Validate
    (asserts! (get active article) ERR-INACTIVE)
    (asserts! (is-none (map-get? purchases {article-id: article-id, reader: tx-sender})) 
              ERR-ALREADY-PURCHASED)

    ;; Transfer sBTC
    (try! (contract-call? SBTC-TOKEN transfer? writer-amount tx-sender (get author article) none))
    (try! (contract-call? SBTC-TOKEN transfer? platform-fee tx-sender PLATFORM-TREASURY none))

    ;; Record purchase
    (map-set purchases 
      {article-id: article-id, reader: tx-sender}
      {
        purchased: true,
        paid-amount: sbtc-amount,
        token: "sBTC",
        purchased-at: block-height
      }
    )

    ;; Update stats
    (update-purchase-stats (get author article) tx-sender price-usd)

    ;; Emit event
    (print {
      event: "purchase",
      article-id: article-id,
      reader: tx-sender,
      author: (get author article),
      token: "sBTC",
      amount: sbtc-amount,
      usd-price: price-usd,
      btc-usd-rate: btc-price-uint,
      platform-fee: platform-fee,
      writer-earnings: writer-amount,
      timestamp: block-height
    })

    (ok true)
  )
)

;; Purchase with USDCx (fixed USD pricing)
(define-public (purchase-with-usdcx (article-id uint))
  (let (
    (article (unwrap! (map-get? articles article-id) ERR-NOT-FOUND))
    (price-usd (get price-usd article))
    ;; USDCx has 6 decimals, price is in cents
    (usdcx-amount (* price-usd u10000)) ;; $5.00 = 500 cents = 5000000 uUSDCx
    (platform-fee (/ (* usdcx-amount PLATFORM-FEE-PERCENT) u100))
    (writer-amount (- usdcx-amount platform-fee))
  )
    ;; Validate
    (asserts! (get active article) ERR-INACTIVE)
    (asserts! (is-none (map-get? purchases {article-id: article-id, reader: tx-sender})) 
              ERR-ALREADY-PURCHASED)

    ;; Transfer USDCx
    (try! (contract-call? USDCX-TOKEN transfer? writer-amount tx-sender (get author article) none))
    (try! (contract-call? USDCX-TOKEN transfer? platform-fee tx-sender PLATFORM-TREASURY none))

    ;; Record purchase
    (map-set purchases 
      {article-id: article-id, reader: tx-sender}
      {
        purchased: true,
        paid-amount: usdcx-amount,
        token: "USDCx",
        purchased-at: block-height
      }
    )

    ;; Update stats
    (update-purchase-stats (get author article) tx-sender price-usd)

    ;; Emit event
    (print {
      event: "purchase",
      article-id: article-id,
      reader: tx-sender,
      author: (get author article),
      token: "USDCx",
      amount: usdcx-amount,
      usd-price: price-usd,
      platform-fee: platform-fee,
      writer-earnings: writer-amount,
      timestamp: block-height
    })

    (ok true)
  )
)

;; ===== HELPER FUNCTIONS =====

(define-private (update-purchase-stats (writer principal) (reader principal) (price-usd uint))
  (begin
    ;; Update writer stats
    (map-set writer-stats writer
      (let ((stats (default-to {total-articles: u0, total-earnings-usd: u0, total-purchases: u0}
                               (map-get? writer-stats writer))))
        {
          total-articles: (get total-articles stats),
          total-earnings-usd: (+ (get total-earnings-usd stats) price-usd),
          total-purchases: (+ (get total-purchases stats) u1)
        }
      )
    )
    
    ;; Update reader stats
    (map-set reader-stats reader
      (let ((stats (default-to {total-purchases: u0, total-spent-usd: u0}
                               (map-get? reader-stats reader))))
        {
          total-purchases: (+ (get total-purchases stats) u1),
          total-spent-usd: (+ (get total-spent-usd stats) price-usd)
        }
      )
    )
  )
)

;; ===== READ-ONLY FUNCTIONS =====

(define-read-only (get-article (article-id uint))
  (ok (map-get? articles article-id))
)

(define-read-only (has-purchased (article-id uint) (reader principal))
  (is-some (map-get? purchases {article-id: article-id, reader: reader}))
)

(define-read-only (get-writer-stats (writer principal))
  (ok (map-get? writer-stats writer))
)

(define-read-only (get-reader-stats (reader principal))
  (ok (map-get? reader-stats reader))
)

(define-read-only (get-platform-stats)
  (ok {
    total-articles: (var-get article-counter),
    total-revenue: (var-get platform-total-revenue)
  })
)

(define-read-only (get-purchase-info (article-id uint) (reader principal))
  (ok (map-get? purchases {article-id: article-id, reader: reader}))
)