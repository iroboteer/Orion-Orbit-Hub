# Open Source Submission Policy

This repository is open source.
Only code and public documentation may be committed here.

## Forbidden content

Do not commit the following to this repository:

1. Internal memory artifacts:
- `docs/memory/**`
- `docs/project-stargate-memory/**`

2. Private credentials or environment secrets:
- `infra-credentials.local.md`
- `.env`
- `*.pem`
- `*.key`
- `*.p12`
- Any plaintext account/password/token/secret material

3. Internal-only operational records not intended for public release

## Allowed content

1. Source code
2. Public architecture/design documentation
3. Public setup and usage guides
4. Open-source CI checks that do not expose secrets

## Notes

1. Private projects may store memory/operations documents under their own private repositories.
2. If sensitive files were committed by mistake, remove them immediately and rotate affected credentials.
