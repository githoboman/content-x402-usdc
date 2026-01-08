;; mock-pyth-oracle.clar
;; Mock implementation of Pyth Oracle for testing

(impl-trait .pyth-oracle-trait.pyth-oracle-trait)

(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-STALE-PRICE (err u101))

(define-data-var contract-owner principal tx-sender)

;; Map of price feeds: feed-id -> { price: int, expo: int, timestamp: uint }
(define-map price-feeds
  (buff 32)
  {
    price: int,
    expo: int,
    timestamp: uint
  }
)

;; Read price feed (Mocking Pyth interface)
;; Returns (ok { price: int, expo: int, timestamp: uint })
(define-read-only (read-price-feed (feed-id (buff 32)) (vaa (optional (buff 32))))
  (ok (default-to 
    { price: 0, expo: 0, timestamp: u0 }
    (map-get? price-feeds feed-id)
  ))
)

;; Admin: Set price for testing
(define-public (set-price (feed-id (buff 32)) (price int) (expo int))
  (begin
    ;; (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)
    (map-set price-feeds feed-id {
      price: price,
      expo: expo,
      timestamp: block-height
    })
    (ok true)
  )
)
