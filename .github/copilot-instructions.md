## ColdMind

- This is a Next.js App Router application written in TypeScript.
- Keep the OpenRouter API key server-side in `OPENROUTER_API_KEY`; never expose it in client components or commit secrets.
- Keep chat API validation and provider calls in `src/app/api/chat/route.ts`.
- Follow the existing visual system in `src/app/globals.css` and keep the chat usable on mobile.
- Run `npm run build` to verify changes; the build uses Webpack for compatibility with this Windows environment.
