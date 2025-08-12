# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Notionary is a Korean-English dictionary service built as a Supabase Edge Function. It fetches English word definitions using Google's Gemini AI and stores them in a Notion database with Korean translations.

## Development Commands

### Local Development
```bash
# Start local development server
npm run dev

# Build TypeScript
npm run build

# Start compiled application
npm start

# Start Supabase local development
supabase start

# Deploy edge function
supabase functions deploy enkoextension
```

## Architecture

### Core Flow
1. **HTTP Request** → `index.ts` (handles CORS, routes POST requests)
2. **API Handler** → `dictionary.ts` (coordinates services)
3. **AI Service** → `GeminiService.ts` (generates definitions using Gemini 2.0-flash)
4. **Storage Service** → `NotionService.ts` (creates structured Notion pages)

### Key Directories
- `supabase/functions/enkoextension/` - Main edge function code
- `src/api/` - API request handlers
- `src/services/` - External service integrations (Gemini AI, Notion)
- `src/types/` - TypeScript type definitions
- `src/config/` - Environment configuration

### Runtime Environment
- **Runtime**: Deno (for Supabase Edge Functions)
- **Local Development**: Node.js with ts-node and nodemon
- **Configuration**: `deno.json` in the edge function directory

## Data Flow and Types

The service processes requests with this data structure:
```typescript
interface DictionaryResponse {
  word: string;
  definition1: string;
  definition2: string | null;
  example: string;
  synonyms: string[] | null;
  antonyms: string[] | null;
}
```

## Environment Setup

Required environment variables:
- `NOTION_API_KEY` - Notion integration token
- `NOTION_DATABASE_ID` - Target Notion database ID  
- `GEMINI_API_KEY` - Google Gemini AI API key

## Service Integration Patterns

### Gemini AI Integration
- Uses structured prompts to enforce consistent JSON responses
- Enforces valid part of speech abbreviations in definitions
- Generates Korean translations alongside English definitions

### Notion Integration  
- Creates pages with structured properties
- Handles optional fields gracefully (definition2, synonyms, antonyms)
- Adds spaces after commas in synonym/antonym lists for readability

## Known Issues

The `index.ts` file contains duplicate server definitions that should be cleaned up during development.