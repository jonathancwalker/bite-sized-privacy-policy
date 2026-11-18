# Public Vercel deployment

## Goal and decision

- Publish the complete Plainer flow for a noncommercial class project, including policy imports and AI rephrasing.
- Use Vercel Hobby. GitHub Pages alone cannot run the API; a persistent Node service would require fewer adaptations but adds a separate hosting choice.
- Preserve the plain HTML/CSS/JavaScript interface and source-linked analysis pipeline. Four thin Vercel entry points use the same API as local development.

## Implementation

- Public address: <https://plainer-gamma.vercel.app>.
- Serve the built interface, fonts, saved policies, and bundled PDF libraries through the CDN; keep model calls in Node.js 22 functions.
- Limit web uploads to 3 MiB so base64 and JSON fit the platform's 4.5 MB payload limit. Larger uploads need a different storage path.
- Keep local loopback checks and add exact deployed HTTPS origins. Cancel model work after four minutes, ahead of the platform's five-minute limit.
- Configure a production-only secret and a published firewall rule: 30 API POSTs per five minutes per IP. Browser-origin checks are not authentication, and an IP limit does not cap total model spending.
- Document deployment, key rotation, custom domains, and verification in [DEPLOYMENT.md](../../DEPLOYMENT.md).

## Evidence

- Before the changes, a legitimate hosted import returned 403; the client accepted a 4 MB file; cancellation did not stop later model groups. Regression tests reproduced these failures before fixes.
- 132 automated tests passed, including a real PDF import through the Vercel request adapter. `vercel build` and the remote Linux deployment succeeded.
- Unauthenticated HTTP checks on the public address passed for the homepage, fonts, PDF library, all six saved analyses, paste/PDF/URL imports, and cross-site rejection. Secret/configuration/server-source paths returned 404.
- A small synthetic policy produced two source-linked overview claims with no reported model failures. A separate rephrasing request succeeded. These checks demonstrate connectivity, not broad semantic accuracy.
- Firewall configuration was published and read back as active; the rate threshold was not exhausted in production.

## Limits and lessons

- No browser interaction, accessibility, load, or large-policy performance study was conducted in this deployment pass. Earlier PDF rendering checks remain separate evidence.
- GitHub login, repository-app permission, and project linking are separate setup steps.
- Encode file sizes before comparing them with host payload limits; the raw file alone understates request size.
- Stop upstream model work before the host deadline so timeout handling can return a useful response.
