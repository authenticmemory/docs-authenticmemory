# Bitcoin blockchain time anchor
Architectural Decision Record (ADR) **010**

## Description

Use the Bitcoin blockchain as the primary time anchor for Authentic Memory proof records.

## Status

Accepted

## Context / Requirement Reference

The core guarantee of Authentic Memory's Open Proof Record is **existence**: a publicly verifiable lower bound on the date by which a file existed in exactly its current form. The evidentiary value of that lower bound depends on *when* it is created, because a timestamp made before indistinguishable synthetic media became possible supports an inference that a later one cannot.

The time anchor therefore has to:

- remain verifiable for decades, beyond the lifetime of Authentic Memory and of any single institution;
- be checkable by anyone, without an account, fee, permission or trust in Authentic Memory;
- resist retroactive alteration, including by well-resourced adversaries such as organised denial campaigns.


## Decision

Anchor every Open Proof Record in the Bitcoin blockchain. The hash of each signed OPR (or of a Merkle root over a batch of them) is committed to a Bitcoin transaction through the OpenTimestamps protocol. The resulting proof is stored in the OPR's `timestamps` array.

## Rationale

- **Cost of rewriting history grows with time.** Under Bitcoin's proof-of-work model, the cost of rewriting confirmed transactions grows exponentially with their age.
- **Track record.** Bitcoin has operated continuously for over fifteen years without a successful attack on confirmed blocks.
- **Permissionless and public.** It is fully public and independently verifiable without any account, fee or permission.
- **No maintaining authority.** Long-term temporal proof rests on historical block headers, which are immutable, verifiable offline and bound to no authority that has to survive. A record stays verifiable even if Authentic Memory as an organisation does not.
- **Retroactive protection for signatures.** Because the anchor fixes the date, a future break of Ed25519 cannot produce a forged signature that appears to have been anchored in a 2026 block.

## Assumptions

- Bitcoin block headers will remain publicly available and the chain's proof-of-work security will continue to hold for the evidentiary lifetime of the proofs.
- SHA-256, on which both Bitcoin and OpenTimestamps depend, remains collision- and pre-image-resistant.
- Partner institutions, funders and public authorities will accept a public blockchain as a time anchor.

## Alternatives Considered

- **RFC 3161 timestamping authorities and certificate chains (the C2PA model).** Rejected as the *primary* anchor: their validity depends on authorities and certificates staying valid, requiring periodic re-timestamping and preservation of validation data, an obligation that cannot lapse over fifty to a hundred years. **RFC 3161 remains a candidate *additional* anchor**.
- **bloXberg (scientific blockchain).** Considered as a supplementary ledger for redundancy, not as a replacement.
- **Certificate Transparency logs, an Authentic Memory transparency log and AT Protocol feed** Proposed in the to-be architecture as additional, independent anchors, not as substitutes.
- **Zeitwerk (federated hourly co-signatures).** Would suit a second anchor if it became established infrastructure but could probably be discontinued. Authentic Memory is hosting a [mirror repository](https://zeitwerk.authenticmemory.org) of Zeitwerk timestamps.

## Consequences / Implications

- **Easier:** proofs can be validated with only the OPR, the file, the institution's public key and public Bitcoin headers; Authentic Memory is not in the validity path.
- **Latency:** anchoring is not instantaneous. Proofs are "pending" until a Bitcoin block confirms them and must then be upgraded.
- **Lower bound only:** the anchor proves existence no later than the block date. It says nothing about integrity before anchoring (Tier 2 evidence) or about content truthfulness.