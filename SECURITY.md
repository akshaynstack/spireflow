# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| 0.3.x | Yes |
| 0.2.x and older | No |

## Reporting a vulnerability

Please do **not** open a public issue for security problems.

Preferred: use GitHub's private vulnerability reporting at
<https://github.com/akshaynstack/spireflow/security/advisories/new>.

Alternative: email **akshay.fivem@gmail.com** with:

- the affected version and platform,
- a description of the issue and its impact,
- reproduction steps or a proof of concept,
- any suggested fix.

You can expect an acknowledgement within a few days. Please give us a reasonable
window to fix and release before disclosing the issue publicly.

## Scope

Spireflow is local-first by design:

- Audio is transcribed on the machine; it is not sent to a cloud service.
- The desktop app talks to the sidecar over `127.0.0.1:8756` by default.
- The optional API under `api/` stores hashed API keys in SQLite and should not
  be exposed to the public internet without TLS and auth enabled.

Reports that are in scope include:

- code execution, path traversal or injection through audio files, file names or
  the local sidecar API,
- authentication bypass or key leakage in `api/`,
- privilege escalation through the global keyboard hook, clipboard paste or the
  tray/overlay windows,
- supply-chain issues in the packaged model or dependencies.

## Handling secrets

Never commit `.env` files, API keys, signing certificates or notarization
credentials. If you believe a secret has been committed, report it privately and
rotate it immediately.
