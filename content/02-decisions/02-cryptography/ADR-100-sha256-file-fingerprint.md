# SHA-256 file fingerprint
Architectural Decision Record (ADR) **100**

## Title

Use SHA-256, computed locally or reused from existing fixity records, as the file fingerprint

## Status

Accepted

## Context / Requirement Reference

A GAMI proof must identify one exact file without the file ever leaving institutional custody ([what we deliberately do not do](../../000-product-vision/000-product-vision.md#what-we-deliberately-do-not-do)). Collections reach the petabyte range, so the fingerprint must be fast to compute and, where possible, reuse work institutions have already done.

Related requirements: U-02 (calculate digests locally without changing source files), U-03 (reuse trustworthy existing digests), U-04 (resumable preparation) in [system requirements](../003-system-requirements.md).

## Decision

Fingerprint every file with **SHA-256 (FIPS 180-4)**.

- The hash is computed inside the institution's infrastructure, by GAMI Hash ([ADR-011](ADR-011-gami-hash-go-offline-tool.md)) or by the institution's own systems.
- Where an OAIS-conformant preservation system already holds SHA-256 fixity values (for example Archivematica, Preservica), those values may be reused instead of rehashing.
- SHA-256 is also used to hash GPRs for anchoring and in public verification ([ADR-015](ADR-015-client-side-browser-hashing.md)).

## Rationale

From [system workflow](../002-system-workflow.md#1-file-fingerprinting), [system security](../To%20review/system-security.md) and [system scalability](../To%20review/system-scalability.md):

- **Suitable properties:** determinism, avalanche effect, pre-image resistance and collision resistance.
- **Ecosystem alignment:** the same function is used by OpenTimestamps, C2PA, Archivematica and Preservica, so existing fixity hashes can be reused and the GPR digest feeds OTS directly.
- **Long-term security:** 128-bit effective security even against quantum search (Grover); no known practical weaknesses.
- **Throughput:** about 500 MB/s per CPU core; roughly 1 PB hashed in about three days on one 8-core server.

## Assumptions

- SHA-256 remains secure for the evidentiary lifetime of the proofs, or a weakness will be announced early enough for the renewal chain to re-anchor with a stronger algorithm ([post-quantum resilience](../To%20review/system-security.md#postquantum-resilience)).
- Reused fixity values are current and correctly bound to the file being anchored (challenged by risk T-13).

## Alternatives Considered

- No alternative primary hash function is recorded as having been evaluated.
- **SHA-3** is named as the post-quantum re-hashing algorithm for the planned renewal chain, not as a replacement for the file fingerprint ([system security](../To%20review/system-security.md#postquantum-resilience)).
- **Perceptual fingerprinting** is described as a future extension for matching re-encoded or cropped derivatives, complementing exact-byte hashing ([matched-fragment attribution](../../000-product-vision/000-product-vision.md#matched-fragment-attribution)).

## Consequences / Implications

- **Easier:** institutions with SHA-256 fixity skip the hashing phase entirely. Verification needs only the file and standard tooling.
- **Exact-byte matching only:** re-encoded, cropped or screenshot copies never match, and readers may read "not found" as "fake" (risk T-07).
- **Fixity reuse is weaker than it looks:** only Archivematica stores SHA-256 by default among surveyed systems, and no current pilot uses it (risk T-29). Reused values may be stale or bound to the wrong file (risk T-13), so reconciliation with sample re-hashing before signing is required (U-34).
- **Disclosure:** publishing file hashes lets anyone confirm whether a known file is held (risk T-27).

## Related Decisions / Notes

- [ADR-009](ADR-009-read-only-post-ingestion-integration.md): read-only integration that relies on reusing fixity.
- [ADR-011](ADR-011-gami-hash-go-offline-tool.md): GAMI Hash.
- [ADR-015](ADR-015-client-side-browser-hashing.md): hashing in the reader's browser.
- Risks T-07, T-13, T-27, T-29 in the [risk register](../../000-product-vision/002-risk-register.md).
