# did:webvh for institutional identity
Architectural Decision Record (ADR) **130**

## Title


## Status

Accepted

## Context / Requirement Reference

Verifiers need to find the public key that signed a GPR, know that it belongs to the named institution, and know which key was valid on the signing date, including after rotations, revocations and domain changes. Memory institutions, especially national archives and memorial sites, are unlikely to accept that the authenticity of their records depends on membership of a centrally governed trust list ([relationship to C2PA](../To%20review/standards-compliance.md#relationship-to-c2pa)).

Related requirements: U-17 (rotate, recover and retire authority with preserved history), U-20 (know what supports an institution's identity), U-50 (resolver enforces did:webvh checks) in [system requirements](../003-system-requirements.md).

## Decision

Each institution publishes its keys as a **Decentralized Identifier on its own primary domain**:

- **did:web** (`/.well-known/did.json`) for the first pilot institutions.
- **did:webvh** (DIF "did:web + Verifiable History", version 1.0) as the target, published at `/.well-known/did.jsonl` alongside a plain `did.json` for compatibility. It provides a self-certifying identifier (SCID), a hash-chained log of every DID document version, pre-rotation and `portable: true` for domain moves ([key management](../002-system-workflow.md#key-management-didwebvh)).

The GPR's `key_id` is a DID URL (for example `did:web:kz-gedenkstaette-dachau.de#key-2026`). Key revocation is published as a revocation date in the DID document, followed by rotation; annual rotation is expected.

## Rationale

- **Sovereignty:** each institution is its own trust root. Verification checks the institution's own signature, not a central authorisation ([relationship to C2PA](../To%20review/standards-compliance.md#relationship-to-c2pa)).
- **Verifiable key history:** the key that signed a GPR is validated against the log entry authoritative at signing time, so records signed under retired keys stay verifiable.
- **Resistance to domain takeover:** whoever later controls the domain cannot forge a substitute identity or rewrite the log without breaking the chain.
- **Pre-rotation:** a compromised signing key does not permit an unauthorised rotation.
- **Backwards compatibility:** existing did:web tooling keeps working, and did:web identities can be upgraded in place.

## Assumptions

- Institutions control and maintain their primary domain and can publish files under `/.well-known/`.
- The did:webvh specification and resolver libraries are mature enough for production. One resolver was found skipping timestamp checks (fixed upstream; risk T-18).
- A timestamped archive of partner DID logs can serve as a fallback when a domain is unavailable. Because the log is self-certifying, the archive only needs to be available, not trusted.

## Alternatives Considered

- **X.509 certificates checked against a central trust list (the C2PA model).** Rejected because it makes an institution's authenticity depend on membership in a list governed by others ([relationship to C2PA](../To%20review/standards-compliance.md#relationship-to-c2pa)).
- **Plain did:web only.** Retained for the first pilots but weaker: it has no verifiable history, and its fallback after a domain loss requires trust in the archive (risk T-19).

## Consequences / Implications

- **Easier:** no certificate authority or live GAMI service is needed to verify an existing proof.
- **Domain dependence:** live key resolution fails when a domain lapses, is taken over or goes offline. The DID log archive fallback is documented but its shipped status is unconfirmed (risks T-03, T-19).
- **Lookalike domains:** a valid signature from a lookalike domain is cryptographically sound but misleading. A confirmed-domain directory, kept out of the verification path, is proposed (D-12, risk T-20).
- **Result semantics:** the verifier's top-level result does not yet depend on key-authorization status (D-03, risk T-02, rated Critical).
- did:webvh protections such as witnesses and pre-rotation are optional by default and must be enabled per institution (risk T-18).

## Related Decisions / Notes

- [ADR-004](ADR-004-ed25519-institutional-signatures.md), [ADR-005](ADR-005-hardware-key-webauthn-signing.md): the keys being published.
- [ADR-016](ADR-016-independent-cli-verifier.md): DID authorization checks in GAMI Verify.
- Open decisions D-03, D-12; risks T-02, T-16, T-18, T-19, T-20 in the [risk register](../../000-product-vision/002-risk-register.md).
