# TourLingo

Real-time multilingual communication platform for tour operators and guests.

## Overview

TourLingo enables tour operators to speak naturally while guests hear real-time translations in their preferred language through their own earphones.

### Translation Flow

```
🎤 Operator speaks → ElevenLabs STT → Google Translate → ElevenLabs TTS → 🎧 Guests hear
        (English)        (~150ms)         (~50ms)           (~75ms)        (German, Japanese, etc.)
```

**Total latency: ~300-500ms** — Fast enough for natural tour narration.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Monorepo** | Turborepo + pnpm |
| **Frontend** | Next.js 14 (App Router) |
| **Hosting** | Vercel |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **Realtime** | Supabase Realtime + LiveKit |
| **Audio Streaming** | LiveKit Cloud (WebRTC) |
| **Speech-to-Text** | ElevenLabs Scribe v2 (~150ms) |
| **Translation** | Google Cloud Translation API |
| **Text-to-Speech** | ElevenLabs Flash v2.5 (~75ms) |

### Why ElevenLabs?

- **Lower latency**: Scribe v2 (~150ms) + Flash TTS (~75ms) = fastest pipeline
- **Voice cloning**: Tim's voice can speak German, Japanese, Chinese!
- **32 languages**: Comprehensive multilingual support
- **Better quality**: More natural, expressive voices

## Project Structure

```
tourlingo/
├── apps/
│   ├── web/           # Guest-facing PWA (port 3000)
│   └── operator/      # Operator dashboard (port 3001)
├── packages/
│   ├── ui/            # Shared UI components
│   ├── api/           # Supabase client & queries
│   ├── audio/         # LiveKit integration
│   ├── translation/   # ElevenLabs + Google pipeline
│   └── types/         # Shared TypeScript types
└── supabase/
    ├── migrations/    # Database schema
    └── seed.sql       # Test data
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Supabase CLI
- Accounts: Supabase, LiveKit, ElevenLabs, Google Cloud

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/tourlingo.git
cd tourlingo

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Fill in your API keys in .env.local

# Start Supabase locally (optional)
supabase start

# Generate database types
pnpm db:generate

# Run development servers
pnpm dev
```

### Development URLs

| App | URL |
|-----|-----|
| Guest PWA | http://localhost:3000 |
| Operator Dashboard | http://localhost:3001 |
| Supabase Studio | http://localhost:54323 |

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# LiveKit (real-time audio streaming)
NEXT_PUBLIC_LIVEKIT_URL=wss://your-app.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# ElevenLabs (STT + TTS)
ELEVENLABS_API_KEY=your-elevenlabs-api-key
ELEVENLABS_VOICE_ID=default-voice-id
ELEVENLABS_OPERATOR_VOICE_ID=tims-cloned-voice-id  # Optional

# Google Cloud Translation
GOOGLE_TRANSLATE_API_KEY=your-google-key
GOOGLE_PROJECT_ID=your-project-id
```

## Apps

### Guest Web App (`apps/web`)

PWA for tour guests to join tours and receive translated audio.

**Features:**
- QR code / tour code join flow
- Language selection (10 languages)
- Real-time translated audio in earphones
- Ask questions (translated for all guests)
- Private chat with operator

### Operator Dashboard (`apps/operator`)

Web app for tour operators to manage tours.

**Features:**
- Create and manage tours
- Generate QR codes / join links
- View connected guests by language
- Broadcast narration (big red button!)
- Private communication with guests
- View archived tours and transcripts

## Packages

### `@tourlingo/translation`

ElevenLabs + Google translation pipeline:

```typescript
import { processAudioTranslation } from '@tourlingo/translation';

const result = await processAudioTranslation(audioBlob, {
  sourceLanguage: 'en',
  targetLanguages: ['de', 'ja', 'zh'],
  useOperatorVoice: true, // Use Tim's cloned voice!
  lowLatency: true,       // Use Flash model
});

// result.translations['de'].audioUrl → German audio
// result.translations['ja'].audioUrl → Japanese audio
```

### `@tourlingo/audio`

LiveKit integration for WebRTC audio streaming:

```typescript
import { useTourRoom, useOperatorBroadcast } from '@tourlingo/audio';

// In operator app
const { isBroadcasting, toggleBroadcast } = useOperatorBroadcast(roomName);

// In guest app
const { audioTrack, isMuted, toggleMute } = useGuestAudio(roomName);
```

### `@tourlingo/api`

Supabase client and database queries:

```typescript
import { getTourByCode, addParticipant } from '@tourlingo/api';

const tour = await getTourByCode('ABC123');
await addParticipant(tour.id, { name: 'Yuki', language: 'ja' });
```

### `@tourlingo/types`

Shared TypeScript types:

```typescript
import { Tour, Participant, SUPPORTED_LANGUAGES } from '@tourlingo/types';
```

### `@tourlingo/ui`

Shared React components with Tailwind CSS.

## Scripts

```bash
# Development
pnpm dev              # Start all apps
pnpm dev:web          # Start guest app only
pnpm dev:operator     # Start operator app only

# Build
pnpm build            # Build all apps
pnpm typecheck        # Type check all packages
pnpm lint             # Lint all packages

# Database
pnpm db:generate      # Generate Supabase types
pnpm db:migrate       # Push migrations
pnpm db:reset         # Reset database
pnpm db:seed          # Seed database

# Utilities
pnpm clean            # Clean all build artifacts
pnpm format           # Format code with Prettier
```

## Supported Languages

| Flag | Language | Code |
|------|----------|------|
| 🇬🇧 | English | en |
| 🇩🇪 | German | de |
| 🇯🇵 | Japanese | ja |
| 🇨🇳 | Chinese (Simplified) | zh |
| 🇰🇷 | Korean | ko |
| 🇫🇷 | French | fr |
| 🇪🇸 | Spanish | es |
| 🇮🇹 | Italian | it |
| 🇵🇹 | Portuguese | pt |
| 🇳🇱 | Dutch | nl |

## Cost Estimates

| Service | Per Tour Hour (10 guests, 10 languages) |
|---------|----------------------------------------|
| ElevenLabs STT | ~$0.50 |
| Google Translate | ~$1.80 |
| ElevenLabs TTS | ~$2.50 |
| **Total** | **~$4.80/hour** |

*Prices may vary based on plan and usage.*

## Deployment

### Vercel

Both apps are configured for automatic deployment:

1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy

### Supabase

1. Create a new Supabase project
2. Run migrations in SQL Editor (copy from `supabase/migrations/`)
3. Update environment variables with production keys

### ElevenLabs Voice Clone (Optional)

To clone the operator's voice:

1. Record 3-5 minutes of operator speaking clearly
2. Upload to ElevenLabs Voice Lab
3. Copy voice ID to `ELEVENLABS_OPERATOR_VOICE_ID`
4. Guests now hear the operator's voice in their language!

## License

Proprietary - All rights reserved
