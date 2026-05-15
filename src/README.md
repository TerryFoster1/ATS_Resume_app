# ATS Resume App — `src/`

The Next.js application for the ATS Resume App. Session-only MVP.

## Run locally

```bash
cd src
npm install
cp .env.local.example .env.local
# open .env.local and paste your Anthropic API key
npm run dev
```

Then open http://localhost:3000.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm start` — run the production build
- `npm run typecheck` — TypeScript check only
- `npm run lint` — Next lint

## Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              ← the wizard
│   ├── globals.css
│   └── api/
│       ├── parse-resume/     ← pdf/docx → text
│       ├── analyze/          ← resume vs JD → gaps + follow-ups
│       ├── generate/         ← tailored resume + cover letter
│       └── check/            ← ATS checker + revise loop
├── components/               ← one component per wizard step
└── lib/                      ← shared logic (no UI)
```

## Environment variables

- `ANTHROPIC_API_KEY` — required. Used server-side only.
- `ANTHROPIC_MODEL` — optional. Defaults to a current Claude model in `lib/llm.ts`.

## Notes

- No persistent storage. State lives in React.
- Server-only libraries (`pdf-parse`, `mammoth`, `@anthropic-ai/sdk`) are only imported in `app/api/**` and `lib/**`.
