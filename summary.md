# BrandBrain Studio — Technical & Product Summary

> **"Other tools generate. Ours learns."**  
> An algorithmic video repurposing studio that extracts high-retention short-form clips from long videos, enforces creator brand voice, and continually adapts using real post-performance telemetry.

---

## 1. Executive Summary

Most video repurposing tools operate as "dumb generators": they cut random sections of transcripts and generate boilerplate captions that sound generic. 

**BrandBrain Studio** closes the feedback loop:
1. **Intelligent Clip Selection**: Extracts the 6 highest-retention moments from any YouTube video or raw transcript using multi-criteria scoring.
2. **Brand Voice Engine**: Profiles creator tone, vocabulary, sentence rhythm, and constraints.
3. **Voice Fidelity Scoring**: Evaluates platform copy with a 0–100% creator likeness score and interactive trait analysis.
4. **Algorithmic Learning Feedback Loop**: Tracks real post metrics (views, retention %, likes, shares) and uses deterministic mathematical lift calculations combined with LLM reflection to update clip ranking multipliers and voice directives.
5. **Demo-Proof Browser Memory**: Full export/import capabilities, prebuilt v3 demo brain, and zero-flash cinematic startup.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Next.js 15)                            │
│                                                                             │
│  ┌───────────────────────────┐         ┌─────────────────────────────────┐  │
│  │       Clips Studio        │         │      Brand Brain Dashboard      │  │
│  │  - YouTube / Paste Ingest │         │  - 3D Neural Constellation      │  │
│  │  - 6 Multi-Score Cards    │         │  - Telemetry Metric Cards       │  │
│  │  - Platform Copy + Match  │         │  - Learned Rules & Receipts     │  │
│  │  - Dynamic Rerank Badges  │         │  - Version History & Diff Modal │  │
│  └─────────────┬─────────────┘         └────────────────┬────────────────┘  │
│                │                                        │                   │
│                └───────────────────┬────────────────────┘                   │
│                                    ▼                                        │
│               LocalStorage State (Brain State vN + Telemetry Logs)          │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SERVER ROUTES (App Router)                         │
│                                                                             │
│   POST /api/ingest    ──► Scraper (8s timeout) ──► Gemini Video (Fallback)  │
│   POST /api/clips     ──► 6-Clip Multi-Criteria Hook Extraction (Gemini)    │
│   POST /api/copy      ──► Multi-Platform Copy Generation + Active Rules     │
│   POST /api/fidelity  ──► Voice Match Scoring & Mismatch Rewrites           │
│   POST /api/learn     ──► Mathematical Lift Analysis + Brain Evolution      │
│   POST /api/voice     ──► Persona & Voice Extraction                        │
│   GET/POST /api/sample──► Static Sample Data Management                     │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       EXTERNAL SERVICES & MODELS                            │
│  - Google Gemini API (`gemini-2.5-flash` / `gemini-3.5-flash` / Flash Lite) │
│  - YouTube Transcript & oEmbed APIs                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Modules & Innovations

### A. Resilient Video Ingest Pipeline (`/api/ingest`)
* **Dual-Tier Ingestion**:
  1. **Primary**: Fast transcript scraper (`youtube-transcript`) with an 8-second timeout race.
  2. **Fallback**: On cloud platforms (e.g. Vercel) where YouTube blocks cloud scraper IPs, automatically falls back to **Gemini Video Understanding**.
* **Gemini Video Understanding**:
  - Sends a `fileData` part referencing `https://www.youtube.com/watch?v=VIDEO_ID` with `mediaResolution: MEDIA_RESOLUTION_LOW` to conserve tokens.
  - Prompts Gemini to transcribe spoken words into `[mm:ss] text` lines at 15–20s intervals.
  - Parses timestamps into `{ text, start, duration }` segments matching the native format.
* **Timeout & Route Optimization**: `export const maxDuration = 60` with a 55-second `AbortController`.
* **In-Memory Cache**: Caches transcript data keyed by `videoId`.

### B. Intelligent Clip Extraction & Multi-Scoring (`/api/clips`)
* Analyzes timestamps and outputs exactly 6 clips adhering to strict constraints:
  - **Duration**: 20s to 60s at natural sentence boundaries.
  - **Hook Types**: Categorized as `question`, `bold claim`, `story`, `stat`, or `contrarian`.
  - **4D Scoring**: Individual 0–100 integer scores for `hook`, `emotion`, `standalone_clarity`, and `overall`.
  - **Trigger Quote**: An exact verbatim quote copied from the transcript.
  - **Adjustment Receipts**: When Brand Brain weights are active, raw scores and adjusted scores are calculated:
    $$\text{Adjusted Score} = \text{Raw Overall} \times M_{\text{hook}} \times M_{\text{duration}}$$
  - Displays directional movement badges (`#4 -> #1 +42%`) with up/down arrows.

### C. Voice Fidelity & Wispr Dictation (`/api/fidelity`, `/api/voice`)
* **Voice-Fidelity Score Ring**: Evaluates copy text against the active voice model:
  - Returns `score` (0–100), `matched_traits[]`, `mismatched_traits[]`, and a `suggested_rewrite`.
  - Includes an **"Improve match"** button that re-prompts Gemini using the specific mismatched traits as hard negative constraints.
* **Wispr Voice Dictation Hint**:
  - Direct integration hint: *"Press your Wispr hotkey and speak. Your spoken words train your voice."*
  - Dictate feedback textarea: Pressing Enter sends custom instructions to `/api/learn` as a manual rule tagged `dictated`.

### D. The Algorithmic Feedback Loop (`/api/learn`, `src/lib/stats.ts`)
* **Deterministic Scoring (Zero-LLM Math)**:
  $$\text{Performance Score} = 0.5 \times \text{NormViews} + 0.3 \times \text{RetentionPct} + 0.2 \times \text{NormEngagement}$$
* **Lift Calculation**: Computes mean score, count ($n$), and percentage lift vs. overall baseline grouped by `hook_type`, `duration_bucket`, and `platform`.
  - Groups are only deemed "winning" if $n \ge 2$ and $\text{Lift} > +15\%$.
* **Full-Screen "What Changed" Diff Modal**:
  - Compares version $N$ against $N+1$.
  - Highlights added rules (green), modified rules (amber), retired rules (red), and reordered clips with receipts (e.g. `"#4 -> #1 because question hooks lift +42% (n=5)"`).
  - Staggered entry animation using Framer Motion.

### E. 3D Neural Constellation (`BrainConstellation.tsx`)
* Top hero panel on the Brand Brain dashboard (height: 380px).
* Interactive 3D lattice showing:
  - Center "Voice" core node with radial breathing glow.
  - Trait nodes orbiting the core.
  - Learned rule nodes connected by glowing links.
  - Visual pulse animation on newly incorporated rules.
  - Automatic 2D canvas/SVG fallback if WebGL is unavailable.

### F. Zero-Flash 3D Cinematic Boot Intro (`BootIntro.tsx`)
* **Pre-Paint Head Script**: Synchronous `<script>` in `layout.tsx` checks `sessionStorage.getItem('bb_boot_done')` and sets `data-booting="1"` on `<html>`.
* **Instant Black First Paint**: Global CSS hides app DOM nodes and renders a server-side `#boot-root` (`bg-[#05050A]`) with a pulsing dot.
* **Sequence (3.7s total, strictly under 4s)**:
  - `0.0–0.8s`: 1,400 glowing particles drift in from deep space.
  - `0.8–2.2s`: Particles converge into a dual-hemisphere brain lattice with glowing neighbor links and typing monospace boot logs.
  - `2.2–3.2s`: Camera dollies through the lattice as the headline shimmer wordmark appears.
  - `3.2–3.7s`: Smooth 500ms fade transition into the pre-loaded studio.
* **Particle Rendering**: Clamped soft round glows (max 8px) with custom vertex shader and radial canvas textures.

### G. Demo-Proof Brain Memory (`src/lib/brain.ts`)
* **Export / Import**:
  - **Export**: One-click download of `brain.json` containing `{ version, voice, rules, history, results, weights }`.
  - **Import**: File input with strict structural validation (`validateBrainShape`).
* **Prebuilt Demo Brain (Version 3)**:
  - Loads instantly with complete history (v1 raw, v2 first learning, v3 second learning).
  - 5 learned rules with empirical receipts and sample labels.
  - 12 realistic sample audience results.
* **Honest Note**: Tooltip under the header badge: *"Memory is saved in this browser. Export it to keep or move it."*
* **Fresh Brain State**: When a user clears memory or has a clean v1 brain, displays: *"Fresh brain. Load the demo brain or log results to start learning."*

---

## 4. API Endpoints Reference

| Route | Method | Purpose | Key Parameters / Payload |
|---|---|---|---|
| `/api/ingest` | `POST` | Dual-path transcription (Scraper + Gemini Video) | `{ type: 'youtube'\|'paste', url, text, videoId }` |
| `/api/clips` | `POST` | Extract 6 short clips with 4D scoring & hooks | `{ formattedTranscript, videoId, totalDuration }` |
| `/api/copy` | `POST` | Generate platform-specific social copy | `{ clip, platform, brainVoice, activeRules, rawText }` |
| `/api/fidelity`| `POST` | Calculate voice match score (0–100) & traits | `{ copyText, voice, platform }` |
| `/api/learn` | `POST` | Update Brand Brain rules & multipliers from stats | `{ statsTable, currentBrain, manualInstruction }` |
| `/api/voice` | `POST` | Extract brand voice profile from text | `{ samples, existingVoice }` |
| `/api/sample` | `GET/POST`| Fetch or dev-save real clip datasets | `{ videoId, title, transcript, clips }` |
| `/api/health` | `GET` | System health, environment, and rate limit info | `N/A` |

---

## 5. Technology Stack

* **Framework**: Next.js 16.4.3 (Turbopack, App Router)
* **Frontend**: React 19, TypeScript 5, Tailwind CSS 4
* **3D & Graphics**: Three.js, React Three Fiber (`@react-three/fiber`), React Three Drei (`@react-three/drei`)
* **Animations**: Framer Motion 12
* **Icons**: Lucide React
* **AI & LLM**: Google GenAI SDK (`@google/genai`), Google Gemini Flash models
* **Transcript Extraction**: `youtube-transcript`, YouTube oEmbed

---

## 6. How to Run & Test Locally

### Prerequisites
1. Node.js 18+ installed.
2. A valid Google Gemini API key configured in `.env.local`:
   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   GEMINI_MODEL="gemini-2.5-flash"
   ```

### Running the App
```bash
# Navigate to the studio directory
cd brandbrain-studio

# Install dependencies
npm install

# Start development server
npm run dev -- -p 3000

# Build for production
npm run build
```

---

## 7. Key Accomplishments & Hackathon Highlights

1. **True Closed-Loop Learning**: Not just another wrapper — BrandBrain Studio actually adapts clip selection and copy style based on empirical post performance.
2. **Production-Grade Zero Flash**: Synchronous layout pre-paint gating solves the common Next.js / R3F intro flicker completely.
3. **Cloud-Immune Ingestion**: Defeats cloud IP rate limits and transcript blocks on Vercel by seamlessly falling back to Gemini's multi-modal video understanding.
4. **Transparent receipts**: Every learned rule presents clear evidence and mathematical lift numbers, demystifying AI decision making for creators.
