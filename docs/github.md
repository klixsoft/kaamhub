# GitHub integration

GitHub is an optional module for software teams. Turn it on in **Settings → Modules**; until then it is hidden everywhere.

KaamHub uses a **GitHub App** installed on your organisation. A GitHub App is safer than a personal access token: it has only the permissions you grant, is not tied to one person, and its tokens expire automatically.

## 1. Create the GitHub App

Go to **GitHub → Your organisation → Settings → Developer settings → GitHub Apps → New GitHub App**.

| Field | Value |
|---|---|
| GitHub App name | e.g. `Acme KaamHub` |
| Homepage URL | Your `APP_URL` |
| Callback URL | `<APP_URL>/api/auth/callback/github` |
| Expire user authorization tokens | Enabled |
| Request user authorization (OAuth) during installation | Disabled |
| Webhook → Active | Enabled |
| Webhook URL | `<APP_URL>/api/github/webhook` |
| Webhook secret | A random string (`openssl rand -hex 32`) |

**Repository permissions**

| Permission | Access | Why |
|---|---|---|
| Administration | Read and write | Add and remove collaborators, create repositories |
| Metadata | Read-only | Required by GitHub |

**Organization permissions**

| Permission | Access | Why |
|---|---|---|
| Members | Read-only | Resolve organisation membership |

**Account permissions**

| Permission | Access | Why |
|---|---|---|
| Email addresses | Read-only | Used when someone links their account |

**Subscribe to events**: `Repository`.

Choose **Only on this account** for where the app can be installed, then create it.

## 2. Collect the credentials

On the app's page:

- **App ID** → `GITHUB_APP_ID`
- **Client ID** → `GITHUB_CLIENT_ID`
- **Generate a new client secret** → `GITHUB_CLIENT_SECRET`
- **Generate a private key** (downloads a `.pem` file) → `GITHUB_APP_PRIVATE_KEY`

For the private key in `.env`, put it on one line with `\n` for line breaks:

```bash
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' your-app.private-key.pem
```

## 3. Install the app

From the app's page choose **Install App**, pick your organisation, and select **All repositories** (or the ones you want to manage). After installing, the URL looks like `https://github.com/organizations/<org>/settings/installations/12345678`. The number is `GITHUB_APP_INSTALLATION_ID`.

Set `GITHUB_ORG` to the organisation login and `GITHUB_WEBHOOK_SECRET` to the webhook secret, then restart the app.

## 4. Use it

1. **GitHub settings** (sidebar): click **Sync repositories** and review the access rule for each project role.
2. Each person opens **My profile → Connect GitHub**.
3. In a project, open **Repositories** to link existing repositories or create new ones.
4. Add people on the **Team** tab. Their access is granted in the background; the Repositories tab shows the status for each person.

## How access sync works

The desired state is computed from the database:

> For each person and repository: the person is an active member of at least one project that links the repository, has a connected GitHub account, and their access has not expired. Their permission is the **strongest** one from all their project roles on projects that share that repository.

Each change (team update, role change, repository link or unlink, deactivation, GitHub connect or disconnect, settings change) reconciles only the affected people and repositories:

- missing or changed access → `PUT /repos/{owner}/{repo}/collaborators/{username}` (GitHub sends an invitation if the person is not yet a collaborator)
- access no longer needed → pending invitation cancelled and collaborator removed (when **Remove access automatically** is on)

Results are stored in `github_access_grant` with status `invited`, `active` or `failed`, and the error message for failed attempts. Calls run in the background after the response is sent, with limited concurrency to respect GitHub's rate limits.

Organisation owners always keep their access on GitHub, regardless of these rules.
