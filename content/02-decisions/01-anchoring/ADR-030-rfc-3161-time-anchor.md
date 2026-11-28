# RFC 3161 time anchor
Architectural Decision Record (ADR) **030**

## Description

Use an eIDAS-qualified RFC 3161 time-stamp as the second, Bitcoin-independent time anchor for Authentic Memory proof records.

## Status

Proposed

## Context / Requirement Reference

The Bitcoin blockchain, reached through OpenTimestamps calendars is the only time anchor for Authentic Memory. Every live proof therefore shares one failure mode. 

Authentic Memory has a funder commitment to deliver a second independent timestamping system where "every batch goes to both, the verifier shows both."

The second anchor therefore has to:

- fail for different reasons than Bitcoin and the OpenTimestamps calendars;
- carry recognised legal effect, which the Bitcoin anchor does not, for institutions with legal retention duties;
- stay verifiable by third parties, offline, without Authentic Memory;
- receive only batch roots, never file digests
- stay cheap and light to operate for a small non-profit that anchors a few batch roots a day, without dependence on any one vendor.

## Decision

Anchor every batch a second time with RFC 3161 time-stamp tokens through an eIDAS-qualified time-stamping authorities.

- **Mechanism.** The token is issued over the same value that is submitted to OpenTimestamps for the batch. That value is sent as the `messageImprint` with the SHA-256 identifier and is not hashed again.
- **Entitlement.** Keep a qualified source under contract with prepaid terms, so that the service is a right and not a tolerated use of an open endpoint.
- **Evidence stored.** Each token is stored in the Open Proof Record with the signer's certificate chain, the revocation evidence current at the time, the policy identifier, the attested time and a digest of the national trusted list used to confirm qualified status.
- **Record format.** The OPR carries a list of anchors typed by mechanism, in place of the single OpenTimestamps object. Each entry states its trust basis and what it relies on.
- **Verifier.** The verifier shows each anchor on its own line with its type, attested time, precision and trust basis. It never merges anchors into one result, and it reports an unknown anchor type as "not evaluated", not as a failure.
- **Renewal.** Each time-stamp is renewed before its signer certificate expires or its algorithm is deprecated, following the Evidence Record method (RFC 4998).

## Rationale

- **Independent failure.** A signed token from a supervised authority involves no blockchain. It fails for different reasons than Bitcoin and the OpenTimestamps calendars.
- **Legal standing.** A qualified electronic time-stamp carries a presumption of the accuracy of its date and of the integrity of the data in every EU Member State (eIDAS Article 41).
- **Mutual protection.** The Bitcoin anchor later shows that a token existed before its certificate expired. The token gives a time to the second and a legal effect that Bitcoin cannot.
- **Standard and simple.** RFC 3161 is a published IETF standard. No custom protocol or verifier logic is needed beyond certificate-path checking, stock `openssl` and `curl` can be used.
- **Privacy.** The protocol time-stamps a hash only and forbids the authority from recording the requester. Only the batch root leaves the service.
- **Cost and schedule.** Between nothing and about €65 a year at current volume, and it can be in production before 31 December 2026.


## Assumptions

- The chosen authority remains on its national trusted list with "granted" status for qualified time-stamps. 
- The operators accept this use. For example, Sectigo's disclosure statement permits use for any application needing proof that a datum existed. DigiCert Europe's policy reserves the right to limit use to its certificate holders, so written confirmation or a contract is still to be obtained.
- Both authorities publish revocation data that Authentic Memory may archive.
- SHA-256 (see [ADR-030](ADR-030-sha256-file-fingerprint.md)) and the authorities' signature algorithms stay sound until the first renewal.
- The OPR's anchor fields sit outside the institution's signed form, so anchors can be added and renewed without a new institutional signature. 
- eIDAS qualification is persuasive, though not binding, for institutions outside the EU.

## Alternatives Considered

- **Non-qualified RFC 3161 time-stamps** DigiStamp FreeTSA, certificate authorities' public endpoints. 
- **Certificate Transparency anchor** Rejected as the mandatory anchor: logs accept certificates, not hashes; a signed certificate timestamp is a promise to include, not a proof; the evidence bundle is large and decays as logs retire; it depends on a certificate authority's tolerance, has no legal standing and needs custom verifier code.
- **Services that rely on Bitcoin** A second OpenTimestamps proof or calendar, Let's Seal, Project Timestamper, the Bitcoin leg of OriginStamp. Rejected: the same anchor under another name.
- **Other blockchains** The Ethereum leg of OriginStamp, or writing directly to Ethereum, Algorand, Tezos, Cardano or Arweave. Rejected: not Bitcoin in name, but the same class of risk as the first anchor, with key and fee management and no legal standing.
- **Zeitwerk** A good design, but a prototype with no co-signers, no written specification and no continuation funding. To be reassessed only against the published acceptance criteria.
- **OriginTrail and WordProof**  Rejected as not independently verifiable: OriginTrail needs tokens and a node, its on-chain commitment is undocumented and it cannot be verified offline; WordProof is a publisher service on EOS with vendor-dependent verification.
- **C2PA and IdentityTrusts** Not time sources. C2PA stores RFC 3161 tokens but does not issue time; IdentityTrusts produces signed consent records with no time attestation.
- **Guardtime KSI.** Needs neither a blockchain nor a certificate to verify, which would make it the most independent option. Deferred for cost, a single-vendor format and unconfirmed trusted-list status. **Candidate for a later third kind of anchor**.
- **Sigstore Rekor.** Built for software signing; version 2 has no time of its own and retires log shards about every six months.
- **A self-hosted time-stamping authority or transparency log.** Gives no independent trust.
- **IETF SCITT, Roughtime and randomness beacons** (drand, NIST). No neutral public service, experimental status, or proof of "not before" only.
- **eIDAS qualified electronic ledgers.** Defined in law since 2024, but no provider was found in operation.
- **Publishing roots widely** (DOI deposit, Internet Archive, AT Proto feed, print). Nearly free and suitable as an extra, but its trust is social, so it is not the formal second anchor.

## Consequences / Implications

- **Easier:** every proof record gains time evidence with legal effect and second-level precision, and the verifier can show two anchors with different trust bases, which answers the single-anchor critique. Institutions under legal retention rules can relate a record to practice they already know (qualified time-stamps, TR-ESOR, Evidence Records).
- **Extensible:** adding further anchor types later needs a new entry type, not a new record format.
- **Renewal becomes a standing duty:** certificates expire and algorithms age. Evidence must be stored in full at anchoring time and re-stamped on a schedule. If renewal lapses, the token's value rests on the Bitcoin anchor.
- **A trust list must be governed:** the verifier needs a published, versioned list of accepted authorities and a rule for judging a token against the trusted list as it stood at the time. This is a new governance duty.
- **Record format and verifier change:** the proof record schema, the batch-close workflow, the web verifier and the CLI verifier must all handle a list of anchors, and the CLI verifier must check RFC 3161 tokens offline. The forms used for signing and for time-stamping must exclude the anchor list.
- **Records grow:** a token with its chain adds about 4 to 6 kB per provider. Whether the chain is stored per record or once per batch is undecided.
- **Shared technology:** RFC 3161 tokens rest on X.509 certificates. They are independent of Bitcoin but not of each other in kind.
- **Existing records:** records already issued can be time-stamped now, but the token proves existence only from the day it is made.
- **A trusted third party enters the design:** the first principle of ADR-010 (timestamping on Bitcoin) is that no authority has to survive. This decision accepts an authority because it is additional to, and checkable against, the anchor that needs none.


