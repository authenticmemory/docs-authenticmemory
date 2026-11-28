# RFC 3161 time anchor
Architectural Decision Record (ADR) 015

## Description

Use eIDAS-qualified RFC 3161 time-stamps from two unrelated providers as the second, Bitcoin-independent time anchor for Authentic Memory proof records.

## Status

Proposed

Decision D-13 (choice of the second timestamping system) is still open in the manual. This record assumes the recommendation of the [anchoring evaluation report](../Anchoring-alternatives/authenticmemory-anchoring-alternatives.md) is adopted. Change the status to Accepted when D-13 is closed and the open items below are resolved.

## Context / Requirement Reference

[ADR-010](ADR-010-bitcoin-blockchain-time-anchor.md) makes the Bitcoin blockchain, reached through OpenTimestamps calendars ([ADR-020](ADR-020-opentimestamps-anchoring.md)), the only time anchor. Every live proof therefore shares one failure mode. The project's own risk register (T-08) and an outside critique in October 2026 both hold that a single anchor is not enough over decades, and the funder commitment is a second independent timestamping system in production by 31 December 2026 (D-13, requirement U-36).

The requirement reads: "Authentic Memory must implement a second anchor that does not rely on Bitcoin (e.g. an RFC 3161 or eIDAS timestamp). Every batch goes to both, the verifier shows both."

The second anchor therefore has to:

- fail for different reasons than Bitcoin and the OpenTimestamps calendars;
- carry recognised legal effect, which the Bitcoin anchor does not, for institutions with legal retention duties;
- stay verifiable by third parties, offline, without Authentic Memory;
- receive only batch roots, never file digests (risk T-14);
- stay cheap and light to operate for a small non-profit that anchors a few batch roots a day, without dependence on any one vendor.

## Decision

Anchor every batch a second time with RFC 3161 time-stamp tokens from two eIDAS-qualified time-stamping authorities.

- **Mechanism.** The token is issued over the same value that is submitted to OpenTimestamps for the batch. That value is sent as the `messageImprint` with the SHA-256 identifier and is not hashed again.
- **Two providers.** Each batch is stamped by two qualified authorities that are separate companies in different countries. The pair tested on 26 November 2026 is Sectigo (Europe) SL, Spain, and DigiCert Europe, Netherlands.
- **Entitlement.** At least one qualified source is held under contract or prepaid terms, so that the service is a right and not a tolerated use of an open endpoint.
- **Evidence stored.** Each token is stored in the Open Proof Record with the signer's certificate chain, the revocation evidence current at the time, the policy identifier, the attested time and a digest of the national trusted list used to confirm qualified status.
- **Record format.** The OPR carries a list of anchors typed by mechanism, in place of the single OpenTimestamps object. Each entry states its trust basis and what it relies on.
- **Verifier.** The verifier shows each anchor on its own line with its type, attested time, precision and trust basis. It never merges anchors into one result, and it reports an unknown anchor type as "not evaluated", not as a failure.
- **Renewal.** Each time-stamp is renewed before its signer certificate expires or its algorithm is deprecated, following the Evidence Record method (RFC 4998).

Bitcoin remains the primary anchor. Certificate Transparency, which the manual had proposed as the fast path, is not the mandatory second anchor and remains a candidate for a later, additional one.

## Rationale

- **Independent failure.** A signed token from a supervised authority involves no blockchain. It fails for different reasons than Bitcoin and the OpenTimestamps calendars.
- **Legal standing.** A qualified electronic time-stamp carries a presumption of the accuracy of its date and of the integrity of the data in every EU Member State (eIDAS Article 41).
- **Mutual protection.** The Bitcoin anchor later shows that a token existed before its certificate expired. The token gives a time to the second and a legal effect that Bitcoin cannot.
- **No single authority.** Two unrelated providers remove the single-authority risk (T-11). RFC 3161 itself recommends tokens from two authorities against key compromise.
- **Standard and simple.** RFC 3161 is a published IETF standard. Tokens were obtained and parsed on 26 November 2026 with stock `openssl` and `curl`. No custom protocol or verifier logic is needed beyond certificate-path checking.
- **Privacy.** The protocol time-stamps a hash only and forbids the authority from recording the requester. Only the batch root leaves the service.
- **Cost and schedule.** Between nothing and about €65 a year at current volume, and it can be in production before 31 December 2026.
- **Best of the options examined.** It is the only option that passed every test in the evaluation, scoring 28 of 30 across legal standing, long-term verification, independent failure, integration effort, cost and continuity. The next option scored 22.

## Assumptions

- Both authorities remain on their national trusted lists with "granted" status for qualified time-stamps. Status was matched for both on 26 November 2026.
- The operators accept this use. Sectigo's disclosure statement permits use for any application needing proof that a datum existed. DigiCert Europe's policy reserves the right to limit use to its certificate holders, so written confirmation or a contract is still to be obtained.
- Both authorities publish revocation data that Authentic Memory may archive.
- SHA-256 (see [ADR-030](ADR-030-sha256-file-fingerprint.md)) and the authorities' signature algorithms stay sound until the first renewal.
- The renewal process is built with the renewal-chain prototype due on 30 April 2027.
- The OPR's anchor fields sit outside the institution's signed form, so anchors can be added and renewed without a new institutional signature. This is to be confirmed against the code and decision D-02.
- eIDAS qualification is persuasive, though not binding, for institutions outside the EU.

## Alternatives Considered

Details and sources for each are in the [evaluation report](../Anchoring-alternatives/authenticmemory-anchoring-alternatives.md) and the knowledge-base files beside it.

- **Non-qualified RFC 3161 time-stamps** ([DigiStamp](../Anchoring-alternatives/digistamp.md), [FreeTSA](../Anchoring-alternatives/freetsa.md), certificate authorities' public endpoints). Score 22 of 30. Same integration, but no legal presumption in the EU, and roots that a verifier must be told to trust. FreeTSA has no accountable operator and the public code-signing endpoints publish no terms granting general use. Kept as the fallback and as an optional third token.
- **Certificate Transparency anchor** ([notes](../Anchoring-alternatives/certificate-transparency.md)). Score 16 of 30. Rejected as the mandatory anchor: logs accept certificates, not hashes; a signed certificate timestamp is a promise to include, not a proof; the evidence bundle is large and decays as logs retire; it depends on a certificate authority's tolerance, has no legal standing and needs custom verifier code.
- **A single qualified provider** (for example [EADTrust](../Anchoring-alternatives/eadtrust-qualified-timestamps.md) alone). Rejected because it leaves one authority as a single point of failure. EADTrust also publishes no endpoint, price or policy identifier, so it could not be compared without a sales contact.
- **Services that rely on Bitcoin** (a second [OpenTimestamps](../Anchoring-alternatives/opentimestamps.md) proof or calendar, [Let's Seal](../Anchoring-alternatives/lets-seal.md), [Project Timestamper](../Anchoring-alternatives/project-timestamper.md), the Bitcoin leg of [OriginStamp](../Anchoring-alternatives/originstamp.md)). Rejected: the same anchor under another name.
- **Other blockchains** (the Ethereum leg of OriginStamp, or writing directly to Ethereum, Algorand, Tezos, Cardano or Arweave). Rejected: not Bitcoin in name, but the same class of risk as the first anchor, with key and fee management and no legal standing.
- **Zeitwerk** ([notes](../Anchoring-alternatives/zeitwerk-timestamping.md)). A good design, but a prototype with no co-signers, no written specification and no continuation funding. To be reassessed only against the published acceptance criteria.
- **OriginTrail and WordProof** ([OriginTrail](../Anchoring-alternatives/origintrail-dkg.md), [WordProof](../Anchoring-alternatives/wordproof-timestamp.md)). Rejected as not independently verifiable: OriginTrail needs tokens and a node, its on-chain commitment is undocumented and it cannot be verified offline; WordProof is a publisher service on EOS with vendor-dependent verification.
- **C2PA and IdentityTrusts** ([C2PA](../Anchoring-alternatives/c2pa-time-stamps.md), [IdentityTrusts](../Anchoring-alternatives/identity-trusts.md)). Not time sources. C2PA stores RFC 3161 tokens but does not issue time; IdentityTrusts produces signed consent records with no time attestation.
- **Guardtime KSI.** Needs neither a blockchain nor a certificate to verify, which would make it the most independent option. Deferred for cost, a single-vendor format and unconfirmed trusted-list status. Candidate for a later third kind of anchor.
- **Sigstore Rekor.** Built for software signing; version 2 has no time of its own and retires log shards about every six months.
- **A self-hosted time-stamping authority or transparency log.** Gives no independent trust.
- **IETF SCITT, Roughtime and randomness beacons** (drand, NIST). No neutral public service, experimental status, or proof of "not before" only.
- **eIDAS qualified electronic ledgers.** Defined in law since 2024, but no provider was found in operation.
- **Publishing roots widely** (DOI deposit, Internet Archive, print). Nearly free and suitable as an extra, but its trust is social, so it is not the formal second anchor.

## Consequences / Implications

- **Easier:** every proof record gains time evidence with legal effect and second-level precision, and the verifier can show two anchors with different trust bases, which answers the single-anchor critique. Institutions under legal retention rules can relate a record to practice they already know (qualified time-stamps, TR-ESOR, Evidence Records).
- **Extensible:** adding further anchor types later needs a new entry type, not a new record format.
- **Renewal becomes a standing duty:** certificates expire and algorithms age. Evidence must be stored in full at anchoring time and re-stamped on a schedule. If renewal lapses, the token's value rests on the Bitcoin anchor.
- **A trust list must be governed:** the verifier needs a published, versioned list of accepted authorities and a rule for judging a token against the trusted list as it stood at the time. This is a new governance duty.
- **Record format and verifier change:** the proof record schema, the batch-close workflow, the web verifier and the CLI verifier must all handle a list of anchors, and the CLI verifier must check RFC 3161 tokens offline. The forms used for signing and for time-stamping must exclude the anchor list.
- **Records grow:** a token with its chain adds about 4 to 6 kB per provider. Whether the chain is stored per record or once per batch is undecided.
- **New external dependencies:** two commercial authorities join the dependency register (risk B-16). Open endpoints can be withdrawn or charged for.
- **Shared technology:** both tokens rest on X.509 certificates. They are independent of Bitcoin but not of each other in kind.
- **Existing records:** records already issued can be time-stamped now, but the token proves existence only from the day it is made.
- **A trusted third party enters the design:** the first principle of ADR-010 is that no authority has to survive. This decision accepts an authority because it is additional to, and checkable against, the anchor that needs none.
- **Earlier plan reversed:** the manual's plan to run Certificate Transparency as the fast path, with RFC 3161 as the fallback, is turned around.

## Related Decisions / Notes

- [ADR-010](ADR-010-bitcoin-blockchain-time-anchor.md): Bitcoin as the primary time anchor. Unchanged; this record adds to it.
- [ADR-020](ADR-020-opentimestamps-anchoring.md): OpenTimestamps as the anchoring protocol. Unchanged.
- [ADR-030](ADR-030-sha256-file-fingerprint.md): SHA-256 file fingerprint.
- [V1 ADR-006](../Software-dev/V1/V1%20ADRs/ADR-006-gami-proof-record-format.md): GPR format. Needs a successor for the multi-anchor record; see the [Open Proof Record 2.0.2 working draft](../../references/GPR/GRPv2.0.2.md).
- [V1 ADR-007](../Software-dev/V1/V1%20ADRs/ADR-007-jcs-canonicalization.md): canonical form, which must exclude the anchor list.
- [V1 ADR-016](../Software-dev/V1/V1%20ADRs/ADR-016-independent-cli-verifier.md): independent CLI verifier, which must verify RFC 3161 tokens offline.
- Manual: decisions D-02 and D-13; risks T-08, T-09, T-11, T-14 and B-16; requirement U-36; user story U-56.
- Evidence: [evaluation report](../Anchoring-alternatives/authenticmemory-anchoring-alternatives.md) and [RFC 3161 notes](../Anchoring-alternatives/rfc-3161-time-stamp-protocol.md).

Open items before acceptance:

1. Written permission or a contract with each chosen authority.
2. Choice of the contracted provider (Disig prepaid packs were the cheapest found).
3. Where certificate chains and revocation data are stored: per record or once per batch.
4. The verifier's trust-list governance.
5. A trusted-list check for any provider not yet matched, including EADTrust.
