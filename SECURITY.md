# Security policy

## Reporting a vulnerability

Please do **not** open a public issue for security problems. Use GitHub's **Report a vulnerability** button under the repository's Security tab to send a private report. Include steps to reproduce and the version you tested.

You will get an initial response within a few working days.

## Supported versions

Security fixes are released for the latest minor version. Use the System page or the steps in [docs/deployment.md](docs/deployment.md) to stay current.

## Security model

- **Authentication**: Better Auth with email and password. Public sign-up is disabled; accounts are created by invitation. Passwords need at least 10 characters with mixed case and a number.
- **Sessions**: HTTP-only cookies, `Secure` in production, 7-day lifetime. Deactivating a user deletes all their sessions; role and status are re-read from the database on every request.
- **Rate limiting**: sign-in, password reset requests and password resets are rate limited per IP, stored in the database.
- **Authorization**: every page and server action checks permissions on the server. Project data is filtered in SQL by membership or client contact, so lists and counts never include projects outside the user's scope.
- **Input validation**: every server action validates input with zod. List parameters (sort keys, filters, page sizes) are whitelisted.
- **Freelancer expiry**: access ends automatically at the configured date, both for sign-in and GitHub.
- **GitHub**: a GitHub App with minimal permissions; webhooks are verified with HMAC-SHA256.
- **Headers**: Content Security Policy, HSTS, `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy and a restrictive permissions policy.
- **Containers**: the app runs as a non-root user. The updater is reachable only on the internal Docker network and requires a shared token. See [docs/deployment.md](docs/deployment.md#about-the-updaters-access).
- **Audit log**: invitations, role and status changes, project and repository changes, settings changes and updates are recorded.

Two-factor authentication is not available yet.
