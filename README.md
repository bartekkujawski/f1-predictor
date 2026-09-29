# F1 Predictor

Prediction league for Formula 1 fans. Friends predict race weekend results before
qualifying starts, and the app scores them automatically once results are in.

Work in progress.

## Running locally

Requires Node.js 24 (see `.nvmrc` and `engines` in `package.json`, which Vercel reads).

```sh
npm install
npm run dev        # http://localhost:3000
```

## Checks

These are the same checks CI runs on every push and pull request:

```sh
npm run typecheck  # TypeScript, after generating Next.js route types
npm run lint       # ESLint
npm test           # Vitest, single run
```

`npm run test:watch` reruns tests on file changes.

## Deployment

The app is deployed to Vercel: `main` goes to production, and every pull request gets a
preview deploy.
