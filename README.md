# Plainer

Privacy policies, in plain language.

[Try Plainer](https://plainer-gamma.vercel.app)

## Intended audience

- People who want to understand how apps collect and use their data.

## Problem / opportunity

- Privacy policies are long and hard to follow. Plainer turns them into readable cards linked to the original wording.

## Primary user flow

1. Choose Instagram, TikTok, or YouTube—or upload, paste, or link your own policy.
2. Use **Quick overview** or **Lawyer mode**; optionally choose priority areas.
3. Mark cards **Comfortable**, **Concerned**, **Unsure**, or skip them. Check the source or rephrase a card when needed.
4. Explore your report, revisit cards, and download a PDF of concerns and uncertainty, with an unreviewed count.

## Technical stack

- HTML, CSS, and JavaScript interface; Node.js API hosted on Vercel.
- Browser storage saves review progress.
- pdf-lib and fontkit create PDFs; pdfjs-dist reads uploaded PDFs; esbuild packages browser libraries.

## API used

- **OpenAI Responses API:** creates plain-language claims and rephrases cards to help readers understand a policy.
- Analysis and rephrasing send policy text to OpenAI. The API key stays on the server.

## Run locally

- Install **Node.js 22**, then run from the repository folder:

```sh
npm ci
npm run dev
```

- Open [localhost:4173](http://127.0.0.1:4173). Saved featured policies work without an API key.
- For AI features, stop the server, create `.env` containing `OPENAI_API_KEY=your_key`, then run:

```sh
node --env-file=.env scripts/serve.mjs
```

- Checks: `npm test`. Static build: `npm run build`.
- Hosting setup: [Deploy to Vercel](DEPLOYMENT.md).

## Known limitations

- AI can miss meaning; Quick overview leaves some material out. This is not legal advice.
- Featured policies are dated snapshots, not automatically refreshed.
- Progress stays in one browser, with one policy saved at a time.
- Some websites block imports; scanned PDFs are not supported.
- Web uploads are limited to 3 MB; lengthy AI requests can time out.

## What I would improve next

- Improve slow imports and support larger files.
- Test with readers and improve mobile use, accessibility, and clarity.
- Improve claim accuracy, topic grouping, and policy coverage.
