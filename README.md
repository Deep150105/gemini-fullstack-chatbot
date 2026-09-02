# Full-Stack AI Chatbot with Next.js, Supabase, Google Gemini & Agentic Web Search

A modern, production-ready AI Chatbot web application built with:
- **Frontend**: Next.js 14/15 (App Router), React, TypeScript, Tailwind CSS, Lucide Icons, React Markdown
- **Backend**: Next.js Route Handlers (Serverless streaming functions)
- **Database & Auth**: Supabase (PostgreSQL with Row Level Security + Supabase Auth)
- **LLM**: Google Gemini API (`gemini-2.0-flash` or `gemini-1.5-flash`)
- **Agentic Tool Calling**: Autonomous `web_search(query: string)` tool integration with Tavily, Serper, and DuckDuckGo fallback.

---

## Features

1. **Real-Time Streaming Responses**: Token-by-token streaming over Server-Sent Events (SSE) using Gemini's streaming API.
2. **Persistent Conversations**: Conversations and messages are persisted in Supabase PostgreSQL tables, tied to authenticated users via Row Level Security (RLS).
3. **Multi-Turn Context Management**: Automatically sends prior conversation history to Gemini while enforcing a sliding window truncation budget to ensure responses never exceed model context limits.
4. **Prompt Engineering & Guardrails**: System instructions define the assistant's persona, restrict scope, and instruct it to state "I don't know" rather than hallucinating when lacking verified facts.
5. **Agentic `web_search` Tool Loop**:
   - The Gemini model autonomously decides when external or real-time information is needed.
   - The backend executes the search via Tavily API or Serper API, feeds the structured search findings back to Gemini, and streams the synthesized, cited response.
   - If the search service encounters an error or lacks an API key, it gracefully informs Gemini to answer from its existing knowledge base while noting that live search was unavailable.
6. **Graceful Error Handling**: Resilient handling for HTTP 429 rate limits, network faults, and missing credentials with in-app retry options.
7. **Secure & Deployment-Ready**: Environment variables for all keys with zero hardcoded credentials.

---

## Project Structure

```
gemini-fullstack-chatbot/
├── app/
│   ├── api/
│   │   ├── chat/route.ts                     # Streaming SSE & agentic tool execution loop
│   │   └── conversations/
│   │       ├── route.ts                      # Conversation management (list, create, delete)
│   │       └── [id]/messages/route.ts        # Fetch conversation history
│   ├── globals.css                           # Tailwind CSS & animations
│   ├── layout.tsx                            # Root layout & meta tags
│   └── page.tsx                              # Single-route chat interface
├── components/
│   ├── AuthModal.tsx                         # Email/password login & signup
│   ├── ChatInput.tsx                         # Message input bar with auto-expand
│   ├── ChatMessage.tsx                       # Message bubble with markdown & tool source badge
│   ├── ErrorBanner.tsx                       # Retryable error notifications
│   └── Sidebar.tsx                           # Conversations sidebar & profile footer
├── lib/
│   ├── gemini/
│   │   ├── client.ts                         # Gemini SDK initialization & web_search tool schema
│   │   └── context.ts                        # Multi-turn history formatting & truncation
│   ├── supabase/
│   │   ├── client.ts                         # Browser Supabase client
│   │   └── server.ts                         # Server Supabase client & JWT verification
│   ├── tools/
│   │   └── web-search.ts                     # Tavily / Serper / DuckDuckGo search integration
│   └── types/
│       └── chat.ts                           # TypeScript types
├── supabase/
│   └── schema.sql                            # Complete SQL schema with RLS and triggers
├── .env.example                              # Environment variable template
├── package.json                              # Dependencies and scripts
├── tailwind.config.ts                        # Tailwind CSS configuration
└── tsconfig.json                             # TypeScript compiler options
```

---

## Getting Started

### 1. Clone or Open the Workspace

Open the project directory in your terminal or IDE:
```bash
cd C:\Users\patel\.gemini\antigravity\scratch\gemini-fullstack-chatbot
```

### 2. Install Dependencies

```bash
npm install
```

---

## Setting Up External Services & Environment Variables

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Edit `.env.local` and provide your API keys:

### A. Google Gemini API (Required)
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Generate a free API key.
3. Add to `.env.local`:
   ```env
   GEMINI_API_KEY=AIzaSy...
   GEMINI_MODEL=gemini-2.0-flash
   ```

### B. Supabase Setup (PostgreSQL + Auth)
1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In your Supabase Project Dashboard, go to **SQL Editor** -> **New Query**.
3. Open `supabase/schema.sql` from this repository, copy its entire contents, paste them into the SQL Editor, and click **Run**.
   - This creates `profiles`, `conversations`, and `messages` tables.
   - This configures Row Level Security (RLS) policies so users can only access their own conversations.
   - This sets up database triggers for user creation and updated timestamps.
4. Go to **Project Settings** -> **API** in Supabase and copy:
   - **Project URL**
   - **anon / public key**
5. Add them to `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
*(Note: If you run the app without Supabase configured, it operates gracefully in guest mode with local state).*

### C. Web Search Provider (Recommended)
Choose either:
- **Tavily API** (Recommended, generous free tier):
  1. Sign up at [tavily.com](https://tavily.com).
  2. Copy your API key.
  3. Add to `.env.local`:
     ```env
     TAVILY_API_KEY=tvly-...
     ```
- **Serper API**:
  1. Sign up at [serper.dev](https://serper.dev).
  2. Copy your API key.
  3. Add to `.env.local`:
     ```env
     SERPER_API_KEY=...
     ```

---

## Running the Application Locally

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Verifying Features

1. **Chat & Streaming**: Enter any question (e.g., *"Explain how neural networks learn"*). Watch the token-by-token streaming animation.
2. **Agentic Web Search Tool**: Enter a real-time query (e.g., *"What were the top tech headlines today?"* or *"Search the web for the latest updates on Artemis II"*).
   - Notice the status pill: `🔍 Searching the web for: "..."`.
   - The backend runs `web_search`, provides results to Gemini, and Gemini cites the sources in its response.
3. **Hallucination Guardrails**: Ask an unanswerable or unknowable question (e.g., *"What will the exact price of gold be on December 31, 2035?"*). The assistant will explicitly declare that it does not know rather than hallucinating.
4. **Context Window & History Truncation**: Chat across multiple turns. The backend automatically maintains dialogue context while enforcing a sliding window budget with summary notes if the history grows excessively long.
5. **Supabase Auth & Persistence**: Click **Sign In / Sign Up** in the sidebar, create an account, and verify that your chats appear in the sidebar and are persisted across browser refreshes.
6. **Error Handling & Retry**: If network disconnection or an invalid API key occurs, a dismissible banner appears with a **Retry** button.

---

## Production Build

To test the production build:
```bash
npm run build
npm run start
```
