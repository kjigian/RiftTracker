# Riftbound Card Sorter — Project Hub

Interactive project hub for the Riftbound TCG Card Sorting Machine build.

## Stack
- **Frontend**: React + Vite
- **Backend**: Supabase (card collection tracking)
- **Hosting**: Vercel

## Setup

```bash
npm install
cp .env.example .env
# Add your Supabase credentials to .env
npm run dev
```

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run `supabase-schema.sql`
3. Copy your project URL and anon key to `.env`

## Deploy

Push to GitHub and connect to Vercel. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in Vercel project settings.
