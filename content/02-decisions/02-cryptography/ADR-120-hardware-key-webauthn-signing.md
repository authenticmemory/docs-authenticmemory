# WebAuthn signing
Architectural Decision Record (ADR) **120**

## Description

Sign Authentic Memory proof records through WebAuthn on institution-held hardware security keys, with Merkle-root batch signing.

## Status

Accepted

## Context / Requirement Reference

The institutional signature only means something if the private key is under the institution's sole control. Authentic Memory must never hold institutional private keys. At the same time, institutions anchor large batches, and asking a signing officer to approve thousands of records one by one is not workable.

The signing mechanism therefore has to:

- let a signing officer inspect and sign the authorised batch;
- support the management of authorised signers and continuity;
- keep key custody usable without sharing keys or writing down PINs.

## Decision

Sign through WebAuthn in the institutional portal, with the key held on hardware at the institution.

- **Custody.** The institution holds its Ed25519 signing key on a hardware security key (YubiKey in pilots; an HSM is possible), with a primary and a backup key. Authentic Memory never holds private keys.
- **Mechanism.** Signatures are produced through **WebAuthn** in the institutional portal. The WebAuthn challenge carries the record hash or the batch hash. The signed bytes are the authenticator data plus a hash of the client data.
- **Batching.** Batch signing builds a **Merkle tree (RFC 6962 style)** over the records in a signing batch and signs its root, so one hardware-key touch covers a whole batch.

## Rationale

- **Key isolation.** The private key never leaves the hardware, so neither Authentic Memory nor a compromised server can sign on the institution's behalf.
- **No installation.** WebAuthn is a browser standard, so the hosted portal can request signatures from a hardware key without installing software at the institution.
- **Effort independent of batch size.** Merkle-root signing makes the signing effort independent of batch size while letting each record carry a proof of inclusion.
- **Auditable approval.** Requiring user presence (a physical touch) for every signature gives a clear, auditable act of institutional approval.

## Assumptions

- Signing officers can set up and operate hardware keys correctly. Pilot evidence challenges this: setup took 45 minutes instead of 5, and keys were shared and PINs written down.
- Supported browsers behave consistently for WebAuthn.
- Verifiers can reconstruct and check the WebAuthn signed bytes. Authentic Memory Verify checks Ed25519/WebAuthn signatures.

## Alternatives Considered

- **Signing the canonical OPR directly with Ed25519.** This is the method in the architecture description. The as-is implementation signs WebAuthn data instead, and how the two relate is open.
- **Per-record signing.** Used in one of the four source descriptions of the OPR. Batch-root signing is used in the others.
- **Hosted or managed keys, zero-knowledge hosted keys, an HSM profile for national archives, and tiered custody by institution capacity.** Under discussion as options, not adopted.
- **Authentic Memory hashing and signing on the institution's behalf** (the pilot "media handover" pattern). Being ended because it conflicts with the trust model.

## Consequences / Implications

- **Easier:** strong key isolation, and one touch signs a whole batch.
- **Harder:** the signed bytes are WebAuthn structures, not the bare canonical OPR, which complicates the proof contract and independent verification.
- **Backup key:** bulk signing currently accepts only the primary key, so the backup key cannot be used for batches.
- **Funder commitment:** a YubiKey rollout in production is a funder commitment for 31 December 2026.
- **Operations:** key loss, compromise and insider misuse need playbooks and monitoring.
