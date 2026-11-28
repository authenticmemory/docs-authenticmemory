# Ed25519 institutional signatures
Architectural Decision Record (ADR) **110**

## Description

Use Ed25519 for institutional signatures on Authentic Memory proof records.

## Status

Accepted

## Context / Requirement Reference

A hash identifies a file but does not say who vouches for it. The **institutional attribution** guarantee requires that a named institution signs each proof with a key under its exclusive control, verifiable by anyone against the institution's published public key.

The signature scheme therefore has to:

- let a signing officer sign the authorised batch;
- support independent verification;
- be widely implemented, so that independent verifiers can be built in any language.

## Decision

Sign every Open Proof Record with **Ed25519 (RFC 8032)**, producing 64-byte signatures.

- **Public key.** The public key is published through the institution's DID document (ADR-130).
- **Private key.** The private key is held on a hardware security key (ADR-120).

## Rationale

- **Established.** Ed25519 is an elliptic-curve scheme widely deployed in SSH, TLS and the Signal protocol.
- **Compact and secure.** It provides 128-bit classical security with 64-byte signatures.
- **Reimplementable.** It has mature implementations in all major programming languages, supporting the goal that verification can be fully reimplemented by third parties.
- **Hardware support.** It is supported by the hardware security keys used for institutional signing.

## Assumptions

- The private key remains under the institution's sole control. Otherwise a valid signature no longer implies institutional authorship.
- Quantum computers capable of running Shor's algorithm against Ed25519 will not exist before the renewal chain is in place. Even then, the anchor date bounds any forgery: a forger cannot create a signature that was anchored in an earlier Bitcoin block.

## Alternatives Considered

- **Another classical signature scheme** (for example ECDSA or RSA). No evaluation of an alternative is on record.
- **SLH-DSA (FIPS 205).** Planned for signing the aggregated tree in the renewal chain, not for per-record signing. It is not yet deployed.

## Consequences / Implications

- **Easier:** small signatures and fast verification, under 1 ms per signature.
- **Quantum vulnerability:** Ed25519, like the Certificate Transparency and time-stamping authority signatures considered for additional anchors, is quantum-vulnerable. Migration may require re-signing, and what the renewal chain preserves has not been modelled. Algorithm identifiers should be kept in every record for agility.
- **Signed bytes:** in the as-is implementation Ed25519 signs WebAuthn authenticator data plus a client-data hash, not the canonical OPR directly (ADR-120). Verifiers must handle both forms until the proof contract is frozen.
- **Encoding:** a production record stores its signature in hex where schema v1 requires Base64.
