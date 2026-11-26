# Security policy

## Reporting a vulnerability

Please do **not** open a public issue for security problems. Use GitHub's **Report a vulnerability** button under the repository's Security tab to send a private report. Include steps to reproduce and the version you tested.

You will get an initial response within a few working days.

## Supported versions

Security fixes are released for the latest minor version. Use the System page or the steps in [docs/deployment.md](docs/deployment.md) to stay current.

## Security model

- **Authentication**: email and password, built into KaamHub. Public sign-up is disabled; accounts are created by invitation. Passwords need at least 10 characters with mixed case and a number, and are hashed with scrypt. Sign-in errors never reveal whether an email exists, and take the same time either way.
- **Sessions**: two HTTP-only, `SameSite=Lax` cookies, `Secure` with the `__Host-` prefix when `APP_URL` uses HTTPS:
  - a short-lived access cookie (15 minutes), encrypted and signed with iron-session using `SESSION_SECRET`;
  - a refresh token that is stored only as a SHA-256 hash, can be used once, and is replaced on every refresh. Reusing an old refresh token signs out that session, because it means the token may have been copied.
  - Every request checks the session row and the user's status, role and access expiry in the database, so signing out, deactivating a user or revoking a device takes effect immediately.
  - Sessions end after 30 days without use and 90 days at most. People can see their signed-in devices on **My profile** and sign out any of them. Changing a password signs out other devices; resetting it signs out all of them.
- **Rate limiting**: sign-in is limited to 5 attempts a minute per email and 20 per IP; password reset requests and resets are limited too. Counters are stored in the database, so they hold across restarts.
- **Password links**: invitation links last 7 days and reset links 1 hour. Each link works once and only its hash is stored.
- **Authorization**: every page and server action checks permissions on the server. Project data is filtered in SQL by membership or client contact, so lists and counts never include projects outside the user's scope.
- **Input validation**: every server action validates input with zod. List parameters (sort keys, filters, page sizes) are whitelisted.
- **Freelancer expiry**: access ends automatically at the configured date, both for sign-in and GitHub.
- **Stored secrets**: environment credentials and the email and GitHub secrets entered in the app are encrypted with AES-256-GCM using `ENCRYPTION_KEY`, and only Super Admins can change the email and GitHub settings.
- **GitHub**: a GitHub App with minimal permissions; webhooks are verified with HMAC-SHA256. Connecting a personal account uses OAuth with an encrypted state cookie that expires after 10 minutes and is tied to the signed-in user.
- **Headers**: Content Security Policy, HSTS, `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy and a restrictive permissions policy.
- **Containers**: the app runs as a non-root user. The updater is reachable only on the internal Docker network and requires a token derived from `SESSION_SECRET`. See [docs/deployment.md](docs/deployment.md#about-the-updaters-access).
- **Audit log**: invitations, role and status changes, project and repository changes, settings changes and updates are recorded.

Two-factor authentication is not available yet.
