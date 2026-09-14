# Security Review

## Cannot safely be self-implemented
- Bangladesh NID verification: authorized provider + legal/operational approval required.
- Face/fingerprint verification: approved biometric provider/device attestation required; image hashing is not verification.
- Real election operation: election authority approval, ballot secrecy model, threat model, accessibility and operational controls required.
- Duress PIN: covert behavior requires explicit safety, legal and election-integrity review.

## Required before production
Secure authentication/session lifecycle, CSRF protection for cookie sessions, rate limiting/WAF, KMS/HSM-backed secrets, immutable audit export, SIEM, SAST/DAST, dependency/secret scanning, independent penetration test and recovery drill.
