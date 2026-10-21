# Vaani Live

A full-stack, real-time multilingual transcription application built for the Procucev AI Tech hiring assignment. It streams microphone audio to Gemini Live and supports English, Hindi, Tamil and Telugu, including automatic language detection.

## Included

- Next.js App Router and TypeScript
- Gemini Live (`gemini-3.5-transcribe-live`) through short-lived browser tokens
- PostgreSQL with Prisma
- Email/password authentication with bcrypt and HTTP-only JWT cookies
- Live interim and final transcription
- Optional WebM audio storage and playback
- Per-user history with sorting, pagination and detail view
- Dark responsive interface built from shadcn conventions
- Loading states, skeletons, validation and user-facing errors

## Local setup

1. Install Node.js 22.13 or newer and PostgreSQL.
2. Create an empty PostgreSQL database named `vaani` (or use any existing database).
3. Copy `.env.example` to `.env.local` and add your PostgreSQL URL, a 32+ character auth secret, and a Gemini API key from Google AI Studio. Prisma supports both `.env.local` and `.env` in this project.
4. Run:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`, create an account and allow microphone access.

The seed command creates an idempotent demo account: `demo@vaani.app` / `Demo@12345`. Override `DEMO_EMAIL` and `DEMO_PASSWORD` in `.env` if needed.

## Configuration

Product settings, languages, duration limits, model name and pagination defaults live in `src/config/app.ts`. Secrets stay in `.env` and are never sent to the browser. The server exchanges the Gemini API key for a one-use ephemeral token before each Live session.

Audio is stored directly in PostgreSQL for this assignment-sized application. For a larger production system, move audio blobs to object storage and retain only their private object keys in PostgreSQL.
