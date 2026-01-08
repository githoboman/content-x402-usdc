;; pyth-oracle-trait.clar
(define-trait pyth-oracle-trait
  (
    (read-price-feed ((buff 32) (optional (buff 32))) (response { price: int, expo: int, timestamp: uint } uint))
  )
)
