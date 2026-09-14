# Secure Dual-Auth Voting System

Production-oriented monorepo for a high-assurance voting workflow.

## Security boundary
This project does **not** fake Bangladesh NID, face, fingerprint, or biometric verification. Those require an authorized provider, approved SDK/device flow, contracts, privacy controls, and legal/operational approval.

## Stack
React/Vite/TypeScript • Express/TypeScript • PostgreSQL/Prisma • Helmet/Zod/Pino • Vercel web deployment.

## Local
1. Copy `.env.example` to `.env`.
2. `npm install`
3. `npm run db:migrate`
4. `npm run db:seed`
5. `npm run dev`

## Production blockers
Provider-backed identity verification, secure session authentication, KMS/HSM key management, WAF/rate limiting, immutable audit export, SIEM/alerting, backups/PITR, restore drills, SAST/DAST, secret scanning, independent penetration testing, and election/legal approval are required before real elections.
