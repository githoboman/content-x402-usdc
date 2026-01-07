;; mock-usdc.clar
;; A mock USDC token for testing purposes conforming to SIP-010

(impl-trait 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sip-010-trait-ft-standard.sip-010-trait)

(define-fungible-token mock-usdc)

(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-token-owner (err u101))

(define-public (transfer? (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
    (begin
        (asserts! (is-eq tx-sender sender) err-not-token-owner)
        (try! (ft-transfer? mock-usdc amount sender recipient))
        (match memo to-print (print to-print) 0x)
        (ok true)
    )
)

(define-read-only (get-name)
    (ok "Mock USDC")
)

(define-read-only (get-symbol)
    (ok "mUSDC")
)

(define-read-only (get-decimals)
    (ok u6)
)

(define-read-only (get-balance (who principal))
    (ok (ft-get-balance mock-usdc who))
)

(define-read-only (get-total-supply)
    (ok (ft-get-supply mock-usdc))
)

(define-read-only (get-token-uri)
    (ok none)
)

;; Mint function for testing
(define-public (mint (amount uint) (recipient principal))
    (begin
        ;; In a real contract, this would be restricted
        ;; For mocks, we allow anyone to mint to facilitate testing
        (ft-mint? mock-usdc amount recipient)
    )
)