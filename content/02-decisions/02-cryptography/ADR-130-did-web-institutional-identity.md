# did:webvh for institutional identity
Architectural Decision Record (ADR) **130**

## Description

Publish each institution's signing keys as a Decentralized Identifier on its own primary domain, with did:web for the first pilots and did:webvh as the target.

## Status

Accepted

## Context / Requirement Reference

Verifiers need to find the public key that signed an Open Proof Record, know that it belongs to the named institution, and know which key was valid on the signing date, including after rotations, revocations and domain changes. Memory institutions, especially national archives and memorial sites, are unlikely to accept that the authenticity of their records depends on membership of a centrally governed trust list.

The identity method therefore has to:

- let an institution rotate, recover and retire signing authority with its history preserved;
- show what supports an institution's identity;
- allow a resolver to enforce the did:webvh checks.

## Decision

Each institution publishes its keys as a **Decentralized Identifier on its own primary domain**.

- **did:web.** Published at `/.well-known/did.json` for the first pilot institutions.
- **did:webvh.** The target method (DIF "did:web + Verifiable History", version 1.0), published at `/.well-known/did.jsonl` alongside a plain `did.json` for compatibility. It provides a self-certifying identifier (SCID), a hash-chained log of every DID document version, pre-rotation and `portable: true` for domain moves.
- **Key identifier.** The OPR's `key_id` is a DID URL (for example `did:web:kz-gedenkstaette-dachau.de#key-2026`).
- **Revocation and rotation.** Key revocation is published as a revocation date in the DID document, followed by rotation. Annual rotation is expected.

## Rationale

- **Sovereignty.** Each institution is its own trust root. Verification checks the institution's own signature, not a central authorisation.
- **Verifiable key history.** The key that signed an OPR is validated against the log entry authoritative at signing time, so records signed under retired keys stay verifiable.
- **Resistance to domain takeover.** Whoever later controls the domain cannot forge a substitute identity or rewrite the log without breaking the chain.
- **Pre-rotation.** A compromised signing key does not permit an unauthorised rotation.
- **Backwards compatibility.** Existing did:web tooling keeps working, and did:web identities can be upgraded in place.

## Assumptions

- Institutions control and maintain their primary domain and can publish files under `/.well-known/`.
- The did:webvh specification and resolver libraries are mature enough for production. One resolver was found skipping timestamp checks (fixed upstream).
- A timestamped archive of partner DID logs can serve as a fallback when a domain is unavailable. Because the log is self-certifying, the archive only needs to be available, not trusted.

## Alternatives Considered

- **X.509 certificates checked against a central trust list (the C2PA model).** Rejected because it makes an institution's authenticity depend on membership in a list governed by others.
- **Plain did:web only.** Retained for the first pilots but weaker: it has no verifiable history, and its fallback after a domain loss requires trust in the archive.

## Consequences / Implications

- **Easier:** no certificate authority or live Authentic Memory service is needed to verify an existing proof.
- **Domain dependence:** live key resolution fails when a domain lapses, is taken over or goes offline. The DID log archive fallback is documented but its shipped status is unconfirmed.
- **Lookalike domains:** a valid signature from a lookalike domain is cryptographically sound but misleading. A confirmed-domain directory, kept out of the verification path, is proposed.
- **Result semantics:** the verifier's top-level result does not yet depend on key-authorisation status.
- **Optional protections:** did:webvh protections such as witnesses and pre-rotation are optional by default and must be enabled per institution.
