# ColdMind

ColdMind is a browser-based AI chat assistant powered by OpenRouter. The API key is read only by the server and is never sent to the browser.

## Requirements

- Node.js 20.9 or newer
- An OpenRouter API key

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `OPENROUTER_API_KEY` in `.env.local`. The default model is `inclusionai/ling-3.1-flash`, routed only through Novita without provider fallback. Optionally set `OPENROUTER_MODEL` to use another model.
4. Start the development server with `npm run dev` and open `http://localhost:3000`.

Never commit `.env.local` or share your API key. If a key is exposed, revoke it and create a replacement. Without a configured key, the app displays a setup error instead of sending a request.

## Checks

- `npm run build` creates a production build using Webpack.
- `npm run lint` runs ESLint.
- `npm start` serves the production build after building.