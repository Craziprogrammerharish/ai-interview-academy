# AI Interview Academy

A Vercel-ready Next.js chat app for four learning tracks:
- Python Tutor
- DSA Coach
- System Design
- Interview Coach

Uses Groq's API on the server. The browser never receives the Groq API key. Conversations are saved in the current browser's `localStorage`, so they remain visible after refresh on the same browser/device.

## Requirements

- Node.js 20.9+
- A Groq API key
- A model ID enabled for your Groq account (default: `openai/gpt-oss-20b`)

## Run locally

1. Extract this project.
2. Open a terminal in the project directory.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Create `.env.local` in the project root. Use `.env.example` as a template:

   ```env
   GROQ_API_KEY=your_real_groq_key
   GROQ_MODEL=openai/gpt-oss-20b
   ```

   Do not commit `.env.local` to GitHub.

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open http://localhost:3000.

## Deploy to Vercel

1. Create a private GitHub repository and upload the extracted project files.
2. Sign in to Vercel and import that repository.
3. In Vercel's project settings, open **Environment Variables** and add:
   - `GROQ_API_KEY` = your actual Groq key
   - `GROQ_MODEL` = `openai/gpt-oss-20b` (optional; this is the default)
4. Deploy the project.
5. If you change environment variables later, redeploy the project.

The key must only exist in server-side environment variables. Do not prefix it with `NEXT_PUBLIC_`.

## Chat persistence

Chats are saved to localStorage in this starter version. They persist across page refreshes in the same browser, but are not synced across devices and are not tied to a user account. Clearing browser site data removes the saved chats. For private per-user chat history across devices, add authentication and a database (for example, Supabase or another managed database).

## Current scope and production considerations

This starter app has a working text chat UI and separate system instructions for each track. It does not yet include:
- User accounts or cross-device sync
- Markdown rendering / syntax highlighting for assistant replies
- Streaming token-by-token responses
- Server-side chat history or long-term learning progress
- Rate limiting and per-user usage controls
- Automated code execution/sandboxing

Before making the app public, add authentication and rate limiting so strangers cannot use your API quota. Keep the Groq key server-side.
