;; mock-sbtc.clar
;; A mock sBTC token for testing purposes conforming to SIP-010

(impl-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

(define-fungible-token mock-sbtc)

(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-token-owner (err u101))

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
    (begin
        (asserts! (is-eq tx-sender sender) err-not-token-owner)
        (try! (ft-transfer? mock-sbtc amount sender recipient))
        (match memo to-print (print to-print) 0x)
        (ok true)
    )
)

(define-read-only (get-name)
    (ok "Mock sBTC")
)

(define-read-only (get-symbol)
    (ok "msBTC")
)

(define-read-only (get-decimals)
    (ok u8)
)

(define-read-only (get-balance (who principal))
    (ok (ft-get-balance mock-sbtc who))
)

(define-read-only (get-total-supply)
    (ok (ft-get-supply mock-sbtc))
)

(define-read-only (get-token-uri)
    (ok none)
)

;; Mint function for testing
(define-public (mint (amount uint) (recipient principal))
    (begin
        ;; In a real contract, this would be restricted
        ;; For mocks, we allow anyone to mint to facilitate testing
        (ft-mint? mock-sbtc amount recipient)
    )
)
