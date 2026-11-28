# SHA-256 file fingerprint
Architectural Decision Record (ADR) **100**

## Description

Use SHA-256, computed locally or reused from existing fixity records, as the file fingerprint for Authentic Memory proof records.

## Status

Accepted

## Context / Requirement Reference

An Authentic Memory proof must identify one exact file without the file ever leaving institutional custody. Collections reach the petabyte range, so the fingerprint must be fast to compute and, where possible, reuse work institutions have already done.

The file fingerprint therefore has to:

- be calculated locally, without changing source files;
- reuse trustworthy existing digests;
- allow preparation to be resumed.

## Decision

Fingerprint every file with **SHA-256 (FIPS 180-4)**.

- **Local computation.** The hash is computed inside the institution's infrastructure, by Authentic Memory Hash or by the institution's own systems.
- **Fixity reuse.** Where an OAIS-conformant preservation system already holds SHA-256 fixity values (for example Archivematica, Preservica), those values may be reused instead of rehashing.
- **Other uses.** SHA-256 is also used to hash OPRs for anchoring and in public verification, where the file is hashed in the reader's browser.

## Rationale

- **Suitable properties.** SHA-256 offers determinism, the avalanche effect, pre-image resistance and collision resistance.
- **Ecosystem alignment.** The same function is used by OpenTimestamps, C2PA, Archivematica and Preservica, so existing fixity hashes can be reused and the OPR digest feeds OpenTimestamps directly.
- **Long-term security.** It keeps 128-bit effective security even against quantum search (Grover) and has no known practical weaknesses.
- **Throughput.** About 500 MB/s per CPU core, or roughly 1 PB hashed in about three days on one 8-core server.

## Assumptions

- SHA-256 remains secure for the evidentiary lifetime of the proofs, or a weakness will be announced early enough for the renewal chain to re-anchor with a stronger algorithm.
- Reused fixity values are current and correctly bound to the file being anchored.

## Alternatives Considered

- **Another primary hash function.** No evaluation of an alternative is on record.
- **SHA-3.** Named as the post-quantum re-hashing algorithm for the planned renewal chain, not as a replacement for the file fingerprint.
- **Perceptual fingerprinting.** Described as a future extension for matching re-encoded or cropped derivatives. It would complement exact-byte hashing, not replace it.

## Consequences / Implications

- **Easier:** institutions with SHA-256 fixity skip the hashing phase entirely. Verification needs only the file and standard tooling.
- **Exact-byte matching only:** re-encoded, cropped or screenshot copies never match, and readers may read "not found" as "fake".
- **Fixity reuse is weaker than it looks:** only Archivematica stores SHA-256 by default among surveyed systems, and no current pilot uses it. Reused values may be stale or bound to the wrong file, so reconciliation with sample re-hashing before signing is required.
- **Disclosure:** publishing file hashes lets anyone confirm whether a known file is held.
