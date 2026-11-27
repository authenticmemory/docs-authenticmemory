# Architecture Decision Record - Authentic Memory
ADR-010-bitcoin-blockchain-time-anchor.md

## Title

Use the Bitcoin blockchain as the primary time anchor for Authentic Memory proof records

## Status

Accepted

## Context / Requirement Reference

The core guarantee of Authentic Memory's Open Proof Record is **existence**: a publicly verifiable lower bound on the date by which a file existed in exactly its current form. The evidentiary value of that lower bound depends on *when* it is created, because a timestamp made before indistinguishable synthetic media became possible supports an inference that a later one cannot.

The time anchor therefore has to:

- remain verifiable for decades, beyond the lifetime of Authentic Memory and of any single institution;
- be checkable by anyone, without an account, fee, permission or trust in Authentic Memory;
- resist retroactive alteration, including by well-resourced adversaries such as organised denial campaigns.


## Decision

Anchor every Open Proof Record in the Bitcoin blockchain. The hash of each signed OPR (or of a Merkle root over a batch of them) is committed to a Bitcoin transaction through the OpenTimestamps protocol ([ADR-020](ADR-020-opentimestamps-anchoring.md)). The resulting proof is stored in the OPR's `timestamps` array.

## Rationale

- **Cost of rewriting history grows with time.** Under Bitcoin's proof-of-work model, the cost of rewriting confirmed transactions grows exponentially with their age.
- **Track record.** Bitcoin has operated continuously for over fifteen years without a successful attack on confirmed blocks.
- **Permissionless and public.** It is fully public and independently verifiable without any account, fee or permission.
- **No maintaining authority.** Long-term temporal proof rests on historical block headers, which are immutable, verifiable offline and bound to no authority that has to survive. A record stays verifiable even if Authentic Memory as an organisation does not.
- **Retroactive protection for signatures.** Because the anchor fixes the date, a future break of Ed25519 cannot produce a forged signature that appears to have been anchored in a 2026 block.

## Assumptions

- Bitcoin block headers will remain publicly available and the chain's proof-of-work security will continue to hold for the evidentiary lifetime of the proofs.
- SHA-256, on which both Bitcoin and OpenTimestamps depend, remains collision- and pre-image-resistant (see [ADR-030](ADR-030-sha256-file-fingerprint.md)).
- Partner institutions, funders and public authorities will accept a public blockchain as a time anchor.

## Alternatives Considered

- **RFC 3161 timestamping authorities and certificate chains (the C2PA model).** Rejected as the *primary* anchor: their validity depends on authorities and certificates staying valid, requiring periodic re-timestamping and preservation of validation data, an obligation that cannot lapse over fifty to a hundred years ([relationship to C2PA](../To%20review/standards-compliance.md#relationship-to-c2pa)). RFC 3161 remains a candidate *additional* anchor (risks T-08, T-11).
- **bloXberg (scientific blockchain).** Considered as a supplementary ledger for redundancy, not as a replacement ([system workflow](../002-system-workflow.md#3-distributed-timestamp-anchoring)).
- **Certificate Transparency logs, a GAMI transparency log and AT Protocol.** Proposed in the to-be architecture as additional, independent anchors, not as substitutes ([system overview](../000-system-overview.md)).
- **Zeitwerk (federated hourly co-signatures).** Would suit a second anchor if it became established infrastructure, but GAMI will not be directly involved as a prominent co-signer or ask its institutions to sign, and the project will probably be discontinued ([competing options](../../000-product-vision/001-competing-options.md)).

## Consequences / Implications

- **Easier:** proofs can be validated with only the GPR, the file, the institution's public key and public Bitcoin headers; GAMI is not in the validity path.
- **Latency:** anchoring is not instantaneous. Proofs are "pending" until a Bitcoin block confirms them and must then be upgraded (see [ADR-002](ADR-002-opentimestamps-anchoring.md)).
- **Lower bound only:** the anchor proves existence no later than the block date. It says nothing about integrity before anchoring (Tier 2 evidence) or about content truthfulness.
- **Single anchor today:** every live proof rests on one time source. The funder commitment of a second independent timestamping system by 31 Dec 2026 is open (D-13, risk T-08, requirement U-36).
- **Offline verification:** the CLI verifier reports Bitcoin membership as indeterminate without chain data (risk T-03).
- **Adoption risk:** some public authorities may reject Bitcoin or require a sovereign alternative (risk B-10).

## Related Decisions / Notes

- [ADR-002](ADR-002-opentimestamps-anchoring.md): OpenTimestamps as the anchoring protocol.
- [ADR-003](ADR-003-sha256-file-fingerprint.md): SHA-256 file fingerprint.
- [ADR-006](ADR-006-gami-proof-record-format.md): `timestamps` array allows more than one anchor per GPR.
- Open decision D-13: choice of the second timestamping system.
- Risks T-03, T-08, T-10, B-10, B-16 in the [risk register](../../000-product-vision/002-risk-register.md).
