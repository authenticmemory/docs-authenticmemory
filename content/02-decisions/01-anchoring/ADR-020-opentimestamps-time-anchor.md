# Opentimestamps time anchor
Architectural Decision Record (ADR) **020**

## Title

Anchor OPRs to Bitcoin through OpenTimestamps calendars with Merkle aggregation

## Status

Accepted

## Context / Requirement Reference

Authentic Memory has selected the Bitcoin blockchain network as its primary time anchor. Writing one Bitcoin transaction per record is impractical: institutions may anchor tens of millions of files per year, and each transaction carries a fee and confirmation delay. A mechanism is needed that commits very large numbers of digests to Bitcoin cheaply, produces a portable proof per record, and can be verified with open tooling.

## Decision

- The institutional portal aggregates the digests of signed OPRs in a signing batch into a Merkle tree and submits them to the public **OpenTimestamps (OTS) calendars**.
- The calendars aggregate submissions from all users into a further Merkle tree and commit its root in a Bitcoin transaction (C8).
- Submission goes to **multiple calendar servers with automatic retry**.
- The portal later **upgrades** pending proofs to complete Bitcoin proofs once the commitment is confirmed.
- The OTS proof is stored in the OPR's `timestamps` array with its method, status, submission date and, once confirmed, block height.


## Rationale

- OpenTimestamps is an open protocol with independent implementations, usable without an account or fee.
- Aggregation lets a single Bitcoin commitment cover arbitrarily many records, so anchoring cost does not grow with collection size.
- OTS uses SHA-256, the same hash used for Authentic Memory file fingerprints.
- A completed OTS proof is verified against Bitcoin block headers alone. The calendars are needed to *create and upgrade* proofs, not to *verify* them.

## Assumptions

- The public, volunteer-run OTS calendars continue to accept submissions and publish their commitments to Bitcoin.
- At least one calendar is reachable at submission time. The automatic retry absorbs temporary outages.
- The portal's upgrade job runs until every pending proof is confirmed.

## Alternatives Considered

- **Authentic Memory writing its own Bitcoin transactions, or running its own calendar.** Nope.
- RFC 3161 selected as second option.

## Consequences / Implications

- **Easier:** anchoring scales to large batches at negligible marginal cost.
- **Harder:** the OTS calendars are a dependency for *creating* proofs, not for verifying them. Until a pending proof is upgraded (usually within hours), it relies on at least one of the calendars that received it. If all fail, the batch is resubmitted with a later date. Overdue pending proofs need alerting. Running Authentic Memory's own calendar, estimated at €10k a year including the operator, would remove the creation dependency.
- The Bitcoin chain stores only a Merkle root, so a lost OPR cannot be rebuilt from the blockchain. Institution-held copies and replication are essential.
- The service depends on volunteer infrastructure it does not control.
