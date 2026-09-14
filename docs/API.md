# API

`GET /health` — service health.

`GET /api/elections/:id` — election and ordered candidates.

`POST /api/votes` — authenticated voter vote submission. Body: `{ electionId, candidateId, duressPin }`. The duress PIN is never logged or returned.

The temporary `x-voter-id` context is intentionally not production authentication and must be replaced by a secure session/token implementation before deployment.
