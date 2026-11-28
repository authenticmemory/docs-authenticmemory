# Architecture Decision Record - Authentic Memory
ADR-005-hardware-key-webauthn-signing.md

## Title

Sign through WebAuthn on institution-held hardware security keys, with Merkle-root batch signing

## Status

Accepted

## Context / Requirement Reference

The institutional signature only means something if the private key is under the institution's sole control. GAMI must never hold institutional private keys ([key management](../002-system-workflow.md#key-management-didwebvh)). At the same time, institutions anchor large batches, and asking a signing officer to approve thousands of records one by one is not workable.

Related requirements: U-07 (signing officer inspects and signs the authorized batch), U-08 (manage authorized signers and continuity), U-40 (key custody usable without sharing keys or writing down PINs) in [system requirements](../003-system-requirements.md).

## Decision

- **Custody:** the institution holds its Ed25519 signing key on a hardware security key (YubiKey in pilots; an HSM is possible), with a primary and a backup key. GAMI never holds private keys ([identity and key management](../001-technical-stack.md#identity-and-key-management)).
- **Mechanism:** signatures are produced through **WebAuthn** in the institutional portal. The WebAuthn challenge carries the record hash or the batch hash. The signed bytes are the authenticator data plus a hash of the client data ([cryptography and proof format](../001-technical-stack.md#cryptography-and-proof-format)).
- **Batching:** batch signing builds a **Merkle tree (RFC 6962 style)** over the records in a signing batch and signs its root, so one hardware-key touch covers a whole batch ([GAMI app](../../002-components/gami-app.md)).

## Rationale

- The private key never leaves the hardware, so neither GAMI nor a compromised server can sign on the institution's behalf.
- WebAuthn is a browser standard, so the hosted portal can request signatures from a hardware key without installing software at the institution.
- Merkle-root signing makes the signing effort independent of batch size while letting each record carry a proof of inclusion.
- Inferred, not stated in the source documentation: requiring user presence (a physical touch) for every signature gives a clear, auditable act of institutional approval.

## Assumptions

- Signing officers can set up and operate hardware keys correctly. Pilot evidence challenges this: setup took 45 minutes instead of 5, and keys were shared and PINs written down (risk T-15).
- Supported browsers behave consistently for WebAuthn (challenged by risk T-35).
- Verifiers can reconstruct and check the WebAuthn signed bytes. GAMI Verify checks "Ed25519/WebAuthn signatures" ([GAMI Verify](../../002-components/gami-verify.md)).

## Alternatives Considered

- **Signing the canonical GPR directly with Ed25519.** This is the method in the architecture description ([signing process](../002-system-workflow.md#signing-process)). The as-is implementation signs WebAuthn data instead; how the two relate is open (D-02).
- **Per-record signing.** Used in one of the four source descriptions of the GPR. Batch-root signing is used in the others (risk T-01).
- **Hosted or managed keys, zero-knowledge hosted keys, an HSM profile for national archives, and tiered custody by institution capacity.** Under discussion as options, not adopted (D-14, risk T-15).
- **GAMI hashing and signing on the institution's behalf** (the pilot "media handover" pattern). Being ended because it conflicts with the trust model (risk O-15).

## Consequences / Implications

- **Easier:** strong key isolation, and one touch signs a whole batch.
- **Harder:** the signed bytes are WebAuthn structures, not the bare canonical GPR, which complicates the proof contract and independent verification (D-02, risk T-01).
- Bulk signing currently accepts only the primary key, so the backup key cannot be used for batches (D-14, risk T-15).
- A YubiKey rollout in production is a funder commitment for 31 Dec 2026.
- Key loss, compromise and insider misuse need playbooks and monitoring (risks T-16, T-17).

## Related Decisions / Notes

- [ADR-004](ADR-004-ed25519-institutional-signatures.md): Ed25519.
- [ADR-008](ADR-008-did-web-institutional-identity.md): publication of the public key.
- [ADR-013](ADR-013-nextauth-passkey-magic-link-auth.md): hardware key required for signing.
- Open decisions D-02, D-14; risks T-01, T-15, T-16, T-17, T-35, O-15 in the [risk register](../../000-product-vision/002-risk-register.md).
