# TourLingo Fixes - Bidirectional Translation & Channel Selection

## Issues Fixed

### 1. ✅ Guest → Guide/Other Guests Translation
**Problem:** Guest audio played raw to the operator without translation.

**Solution:** Guests now capture audio, send it through the translation pipeline, and broadcast translated audio to the guide (in English) and other guests (in their languages).

### 2. ✅ Channel Selection (Who to Talk To)
**Problem:** Guests could only broadcast to everyone.

**Solution:** Added UI for guests to select:
- **Everyone** - Guide and all guests hear (default)
- **Guide Only** - Private question to guide
- **Specific Guest** - Private peer-to-peer message

### 3. ✅ Ambient Noise Filtering
**Problem:** ElevenLabs Scribe transcribed ambient sounds like "[traffic noise]", "[wind sounds]" etc.

**Solution:** Added noise filtering that:
- Detects and removes bracketed sound descriptions: `[traffic]`, `(wind)`, `*coughing*`
- Filters out filler words: "um", "uh", "ah"
- Validates that transcription contains actual speech content before translating
- Skips translation entirely if only noise was detected

---

## Files to Copy

### Web App (Guest Side) - `apps/web/`

```
apps/web/src/app/tour/[id]/page.tsx          → REPLACE existing file
apps/web/src/app/api/translate/audio/route.ts → CREATE new file
```

### Operator App (Guide Side) - `apps/operator/`

```
apps/operator/src/app/(dashboard)/dashboard/tours/[id]/live/page.tsx → REPLACE existing file
apps/operator/src/app/api/translate/audio/route.ts                    → REPLACE existing file
```

### Optional: Standalone Noise Filter Module

```
packages/translation/src/noiseFilter.ts → ADD new file (optional, for reference)
```

---

## How It Works Now

### Guest Speaking Flow
```
┌──────────────────────────────────────────────────────────────┐
│  Guest (German) holds "Talk" button                          │
│         │                                                    │
│         ▼                                                    │
│  ┌────────────────────┐                                     │
│  │  MediaRecorder     │  Records audio                       │
│  └──────────┬─────────┘                                     │
│             │  Release button                                │
│             ▼                                                │
│  ┌────────────────────┐                                     │
│  │  /api/translate/   │                                     │
│  │     audio          │                                     │
│  └──────────┬─────────┘                                     │
│             │                                                │
│             ▼                                                │
│  ┌────────────────────┐                                     │
│  │  ElevenLabs STT    │  "Wo ist die Toilette?"             │
│  └──────────┬─────────┘                                     │
│             │                                                │
│             ▼                                                │
│  ┌────────────────────┐                                     │
│  │  Noise Filter      │  Skip if "[traffic noise]" etc      │
│  └──────────┬─────────┘                                     │
│             │                                                │
│             ▼                                                │
│  ┌────────────────────┐                                     │
│  │  Google Translate  │  → EN: "Where is the toilet?"       │
│  │    (Parallel)      │  → IT: "Dov'è il bagno?"            │
│  └──────────┬─────────┘                                     │
│             │                                                │
│             ▼                                                │
│  ┌────────────────────┐                                     │
│  │  ElevenLabs TTS    │  Audio for each language            │
│  └──────────┬─────────┘                                     │
│             │                                                │
│             ▼                                                │
│  Route based on channel:                                     │
│  • "Guide Only" → EN audio to guide only                    │
│  • "All"        → All languages to guide + guests           │
│  • "Guest X"    → Target language to specific guest + guide │
└──────────────────────────────────────────────────────────────┘
```

### Operator Receiving Translations
```
┌──────────────────────────────────────────────────────────────┐
│  Guest sends translated_audio via LiveKit data channel       │
│         │                                                    │
│         ▼                                                    │
│  Operator receives message with:                             │
│  • language: "en"                                            │
│  • text: "Where is the toilet?"                              │
│  • audioUrl: "data:audio/mp3;base64,..."                    │
│  • senderName: "Hans"                                        │
│  • senderLanguage: "de"                                      │
│  • targetChannel: "guide" or "all"                           │
│         │                                                    │
│         ▼                                                    │
│  Operator UI shows:                                          │
│  • Yellow alert: "Hans is speaking..."                       │
│  • Message list with sender flag & name                      │
│  • Private badge if targetChannel === "guide"                │
│         │                                                    │
│         ▼                                                    │
│  Audio plays automatically in English                        │
└──────────────────────────────────────────────────────────────┘
```

---

## Noise Filter Examples

| Input (STT Output) | Filtered | Reason |
|-------------------|----------|--------|
| `[traffic noise]` | ✅ Filtered | Pure noise description |
| `Hello [coughing] world` | `Hello world` | Noise removed |
| `um uh` | ✅ Filtered | Only filler words |
| `(background music playing)` | ✅ Filtered | Pure noise description |
| `The bridge is beautiful` | `The bridge is beautiful` | Valid speech |
| `*wind sounds* Nice view` | `Nice view` | Noise removed |

---

## Testing

1. **Start tour as operator** on operator app
2. **Join as guest** on web app with a different language (e.g., German)
3. **Test guide → guests:** Operator broadcasts → Guest hears German translation
4. **Test guest → guide:** Guest speaks German → Operator hears English translation
5. **Test channel selection:** Guest selects "Guide Only" → Other guests don't hear
6. **Test noise filter:** Make ambient noise without speaking → Nothing translates

---

## Environment Variables

Make sure both apps have these variables set:

```env
ELEVENLABS_API_KEY=your_key
GOOGLE_TRANSLATE_API_KEY=your_key
ELEVENLABS_VOICE_ID=your_voice_id (optional, uses Tim's voice by default)
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server
```

---

## Notes

- The noise filter is **rule-based** for speed (no API calls)
- LLM-based filtering is available in `noiseFilter.ts` if higher accuracy is needed
- Channel selection uses LiveKit's `destinationIdentities` for targeted messaging
- Audio is sent as base64 data URLs to work within LiveKit's data channel limits
- Large audio payloads are chunked to stay under 64KB per message
