# Deploy Plainer on Vercel

- Public site: <https://plainer-gamma.vercel.app>.
- Vercel project: `plainer`. Use the free Hobby plan for this noncommercial project.
- `vercel.json` builds the interface into `app/dist/` and deploys four Node.js API functions from `api/`.
- Keep Node.js on **22.x**. No database or persistent server disk is required; reviews stay in the reader's browser.

## Setup

1. Connect the GitHub repository to the Vercel project. The Vercel GitHub App needs access to this repository; a GitHub login connection alone is not enough.
2. Use `main` as the production branch. Merge the deployment changes before relying on automatic builds.
3. Add `OPENAI_API_KEY` as a **Secret** for Production in Vercel's environment settings. Redeploy after adding or replacing it. Never put it in browser code, build output, or Git.
4. Publish a project firewall rate-limit rule: path starts with `/api/`, method equals `POST`, **30 requests per 300 seconds per IP**, action **Rate Limit**. This is stored in Vercel, not `vercel.json`; recreate it for a new project.
5. Verify the production domain without a Vercel login. Preview deployments may remain protected.

For a manual deployment from a reviewed checkout:

```sh
npx vercel login
npx vercel link
npm ci
npm test
npx vercel deploy --prod
```

- Build on Vercel so optional PDF dependencies match its Linux runtime.
- Production has the AI secret. Preview deployments can exercise saved policies and imports without it.
- `.env*`, `.vercel/`, uploads, and generated reports are excluded from Git or deployment uploads. Local secret files are not a way to configure hosted runtime variables.
- Vercel's generated deployment and production origins are allowed automatically. For a custom domain, set `PUBLIC_APP_ORIGIN` to its exact HTTPS origin and redeploy.

## Limits and checks

- Uploads accept up to 3 MiB; their base64-encoded JSON stays below Vercel's 4.5 MB request limit. Larger files need a different upload path.
- API requests stop model work after four minutes, ahead of Vercel's five-minute function limit. Try Quick overview or a shorter policy after a timeout.
- The firewall limits requests per IP across instances. It is not a global OpenAI spending cap or user authentication; shared networks also share the limit.
- Check saved policies in both depths, paste/file/URL import, a small live analysis, rephrasing, and PDF export when changing hosting configuration.
- The API rejects unrelated browser origins, retains URL-fetch protections, and does not write policy uploads to disk.

References: [Vercel function limits](https://vercel.com/docs/functions/limitations), [rate limits](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting), [GitHub integration](https://vercel.com/docs/git/vercel-for-github).
