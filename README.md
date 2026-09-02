# Full-Stack AI Chatbot with Next.js, Supabase & Google Gemini

A full-stack AI chatbot web application built with:

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Next.js Route Handlers (serverless streaming functions)
- **Database & Auth:** Supabase (PostgreSQL with Row Level Security + Supabase Auth)
- **LLM:** Google Gemini API (`gemini-3.6-flash`)

## Current Status

✅ **Working:**
- Real-time streaming chat responses (Gemini `gemini-3.6-flash`)
- Supabase authentication (email/password signup & login, email confirmation)
- Persistent conversations and messages (saved to Supabase, tied to logged-in user)
- Graceful error handling for API failures

🚧 **Built but currently disabled:**
- **Agentic web_search tool** — the code for autonomous tool-calling (Tavily/Serper integration) exists in `lib/tools/web-search.ts` and `lib/gemini/client.ts`, but is currently disabled. Newer Gemini models (3.6-flash) require a `thought_signature` field on function-call turns that isn't yet correctly implemented in this codebase — attempting to re-enable it will throw a `400 Bad Request` error from the Gemini API. To re-enable: uncomment the `tools: chatTools` line in `lib/gemini/client.ts` and fix the thought_signature handling in `app/api/chat/route.ts` per [Gemini's function calling docs](https://ai.google.dev/gemini-api/docs/thought-signatures).

## Project Structure

gemini-fullstack-chatbot/
├── app/
│ ├── api/chat/route.ts # Streaming SSE chat endpoint
│ └── page.tsx # Chat interface
├── components/ # UI components
├── lib/
│ ├── gemini/client.ts # Gemini SDK setup (tool calling currently disabled)
│ ├── supabase/ # Supabase client (browser + server)
│ └── tools/web-search.ts # Web search tool (built, not currently wired in)
├── supabase/schema.sql # Database schema with RLS policies
└── .env.example # Environment variable template


## Getting Started

### 1. Install dependencies

npm install


### 2. Set up environment variables

cp .env.example .env.local


Edit `.env.local`:

**Gemini API (required):**

GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.6-flash

Get a key at [Google AI Studio](https://aistudio.google.com/apikey).

**Supabase (required for auth/persistence):**
1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor → New Query → paste the contents of `supabase/schema.sql` → Run
3. Go to Project Settings → API (legacy keys page) → copy Project URL and `anon` key

NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key


**Tavily/Serper (optional — not currently used since search is disabled):**

TAVILY_API_KEY=your_key_here


### 3. Run locally

npm run dev

Open http://localhost:3000

## Verifying it works

- **Chat:** send any message, confirm a streamed response appears.
- **Auth:** click Sign In / Sign Up, create an account, confirm the email (check inbox for a Supabase confirmation link), log in.
- **Persistence:** while logged in, send a message, refresh the page — the message should still be there. **Note:** persistence only works while logged in; guest/anonymous chats are not saved.

## Known Limitations

- Web search / agentic tool-calling is disabled (see above)
- No password reset flow implemented
- No production deployment configured — this is a local-dev build
