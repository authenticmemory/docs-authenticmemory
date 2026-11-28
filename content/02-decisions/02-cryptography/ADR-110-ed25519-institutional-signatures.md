# ed25519 institutional signatures
Architectural Decision Record (ADR) **110**

## Title

Use Ed25519 for institutional signatures on GPRs

## Status

Accepted

## Context / Requirement Reference

A hash identifies a file but does not say who vouches for it. The **institutional attribution** guarantee requires that a named institution signs each proof with a key under its exclusive control, verifiable by anyone against the institution's published public key ([core guarantees](../../000-product-vision/000-product-vision.md#core-guarantees)). The scheme must be widely implemented so that independent verifiers can be built in any language.

Related requirements: U-07 (signing officer signs the authorized batch), U-13 (independent verification) in [system requirements](../003-system-requirements.md).

## Decision

Sign GPRs with **Ed25519 (RFC 8032)**, producing 64-byte signatures. The public key is published through the institution's DID document ([ADR-008](ADR-008-did-web-institutional-identity.md)). The private key is held on a hardware security key ([ADR-005](ADR-005-hardware-key-webauthn-signing.md)).

## Rationale

From [system workflow](../002-system-workflow.md#2-institutional-digital-signature) and [system security](../To%20review/system-security.md):

- Ed25519 is an established elliptic-curve scheme widely deployed in SSH, TLS and the Signal protocol.
- It provides 128-bit classical security with compact 64-byte signatures.
- It has mature implementations in all major programming languages, supporting the goal that verification can be fully reimplemented by third parties.
- It is supported by the hardware security keys used for institutional signing.

## Assumptions

- The private key remains under the institution's sole control; otherwise a valid signature no longer implies institutional authorship.
- Quantum computers capable of running Shor's algorithm against Ed25519 will not exist before the renewal chain is in place. Even then, the anchor date bounds any forgery: a forger cannot create a signature that was anchored in an earlier Bitcoin block ([post-quantum resilience](../To%20review/system-security.md#postquantum-resilience)).

## Alternatives Considered

- No alternative classical signature scheme (for example ECDSA or RSA) is recorded as having been evaluated.
- **SLH-DSA (FIPS 205)** is planned for signing the aggregated tree in the renewal chain, not for per-record signing. It is not yet deployed ([standards compliance](../To%20review/standards-compliance.md)).

## Consequences / Implications

- **Easier:** small signatures and fast verification (under 1 ms per signature, per the [performance table](../002-system-workflow.md#performance)).
- **Quantum vulnerability:** Ed25519, like the CT and TSA signatures considered for additional anchors, is quantum-vulnerable. Migration may require re-signing, and what the renewal chain preserves has not been modelled (risk T-12). Algorithm identifiers should be kept in every record for agility.
- **Signed bytes:** in the as-is implementation Ed25519 signs WebAuthn authenticator data plus a client-data hash, not the canonical GPR directly ([ADR-005](ADR-005-hardware-key-webauthn-signing.md)). Verifiers must handle both forms until the proof contract is frozen (D-02, risk T-01).
- **Encoding:** a production record stores its signature in hex where schema v1 requires Base64 (U-25, risk T-01).

## Related Decisions / Notes

- [ADR-005](ADR-005-hardware-key-webauthn-signing.md): hardware-key signing through WebAuthn.
- [ADR-007](ADR-007-jcs-canonicalization.md): canonicalization of the signed content.
- [ADR-008](ADR-008-did-web-institutional-identity.md): publication of the public key.
- Open decision D-02 (proof contract); risks T-01, T-12 in the [risk register](../../000-product-vision/002-risk-register.md).
