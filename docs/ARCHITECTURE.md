# Architecture
Browser → Vercel React → authenticated API → PostgreSQL.

NID verification and biometric verification are explicit provider boundaries. Never treat a SHA-256 hash of an uploaded face/fingerprint image as biometric verification.

Votes have a unique voter/election constraint and a tamper-evident receipt chain. Audit storage should be extended to immutable/WORM storage for production.
