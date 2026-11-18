# SafeDrive AI Monitor — Architecture & Algorithms

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web Browser (Client)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐ ┌──────────┐│
│  │Dashboard │ │Live      │ │Review    │ │Analyt-│ │Ethics    ││
│  │(Abacus   │ │Monitor   │ │Queue     │ │ics    │ │Page      ││
│  │Dashboard)│ │(SSE)     │ │(CRUD)    │ │Charts │ │(Static)  ││
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬───┘ └──────────┘│
│       │            │            │            │                  │
└───────┼────────────┼────────────┼────────────┼──────────────────┘
        │            │            │            │
   ┌────▼────────────▼────────────▼────────────▼─────┐
   │              API Routes (Server)                 │
   │  /api/dashboard    — KPIs, trends, driver table  │
   │  /api/monitor/stream — SSE event generator       │
   │  /api/review       — GET queue, PATCH actions    │
   │  /api/analytics    — Ground truth eval, stats    │
   │  /api/risk-score   — LLM rationale (streaming)   │
   │  /api/auth/*       — Authentication (Auth.js)    │
   │  /api/signup       — Account creation            │
   └─────────┬─────────────────────────────┬──────────┘
             │                             │
   ┌─────────▼─────────┐    ┌──────────────▼───────────┐
   │  PostgreSQL DB    │    │  Abacus AI LLM API       │
   │  (Prisma ORM)     │    │  (gpt-5.4-mini)          │
   │  - Users          │    │  Streaming chat           │
   │  - Drivers        │    │  completions for          │
   │  - SensorEvents   │    │  risk rationale           │
   │  - Telematics     │    └──────────────────────────┘
   │  - RiskScores     │
   │  - Warnings       │
   │  - ReviewActions  │
   │  - Analytics      │
   │  - Templates      │
   └───────────────────┘
```

## 2. Three-Tier Delegation Model

Adapted from the midterm proposal's AI delegation framework:

### Tier 1: Sensing & Event Detection (High AI Autonomy)
- **Function:** Capture and structure raw phone/sensor signals alongside vehicle telematics
- **AI role:** Fully automated detection — phone interaction, screen state, gaze, hands
- **Output:** Structured event record passed to Tier 2
- **Implementation:** `SensorEvent` and `TelematicsEvent` models, SSE event generator

### Tier 2: Risk Assessment & Safety Intervention (Moderate AI Autonomy)
- **Function:** Score distraction risk and issue calibrated warnings
- **AI role:** Automated scoring and warning delivery within approved thresholds
- **Output:** Risk score (0–100), confidence interval, warning if threshold exceeded
- **Implementation:** `calculateRiskScore()` in `lib/risk-scoring.ts`, `Warning` model

### Tier 3: Escalation, Review & Accountability (Low AI Autonomy)
- **Function:** Human review of escalated cases
- **AI role:** Case preparation and summary only — no autonomous decisions
- **Output:** Human disposition (approve, dismiss, escalate) with notes
- **Implementation:** `ReviewAction` model, Review Queue UI

## 3. Risk Scoring Algorithm

### Input Signals

| Signal | Source | Type |
|--------|--------|------|
| Phone handling | In-cabin sensor | Boolean + confidence |
| Screen active | In-cabin sensor | Boolean + confidence |
| Texting detected | In-cabin sensor | Boolean + confidence |
| Gaze off road | In-cabin sensor | Boolean + confidence |
| Hands off wheel | In-cabin sensor | Boolean + confidence |
| Vehicle speed | Telematics | Float (mph) |
| Lane drift | Telematics | Float (meters) |
| Braking force | Telematics | Float (0–1) |
| Vehicle moving | Telematics | Boolean |
| Passenger present | Telematics | Boolean |

### Scoring Weights

| Factor | Base Weight | Condition |
|--------|-------------|----------|
| Phone handling | +30 | × sensor confidence |
| Texting | +35 | × sensor confidence |
| Screen on | +20 | × sensor confidence |
| Gaze off road | +25 | × sensor confidence |
| Hands off wheel | +15 | × sensor confidence |
| Speed factor | +0 to +10 | Linear scale (speed/80 × 10) |
| Lane drift | +0 to +15 | Linear scale (drift × 10) |
| Duration factor | +0 to +10 | For interactions > 3 seconds |
| Repeated events | +5 per event | Max +20, events in last 30 min |
| **Vehicle stopped** | **−40** | Major risk reduction |
| **Passenger present** | **−20** | May be passenger's phone |

### Confidence Calculation

- Starts at 1.0
- Missing speed signal: −0.15
- Missing lane drift: −0.10
- Missing vehicle status: −0.15
- Minimum confidence: 0.10

### Warning Thresholds

| Score Range | Severity | Action |
|-------------|----------|--------|
| 0–59 | None | Event closed, no warning |
| 60–69 | 1 (Gentle) | "Please keep your eyes on the road." |
| 70–84 | 2 (Firm) | "Continued phone use detected. Please stop." |
| 85–100 | 3 (Escalation) | Warning + escalation to human review |

### Missing Data Handling

When signals are unavailable:
- The system **does not inflate** the risk score to compensate
- Instead, the **confidence interval is reduced**
- Low-confidence events may close without warning even if the score exceeds the threshold
- Missing data fields are explicitly listed in the event record and review interface

## 4. Performance Metrics — Definitions

> These definitions are stated consistently throughout the system.

| Metric | Formula | Interpretation |
|--------|---------|---------------|
| **Precision** | TP / (TP + FP) | Of all events that triggered a warning, what fraction were genuine distractions? A high precision means few false alarms. |
| **Recall** | TP / (TP + FN) | Of all genuine distractions, what fraction did the system detect and warn about? A high recall means few missed events. |
| **False-warning rate** | FP / (FP + TN) | Of all non-distraction events, what fraction incorrectly received a warning? This is the complement of specificity. |
| **F1 Score** | 2 × (Precision × Recall) / (Precision + Recall) | Harmonic mean of precision and recall — a single balanced measure. |
| **Driver response rate** | Stopped / Total warnings | Fraction of warnings after which simulated phone activity ceased. |
| **Mean processing latency** | Average time (ms) from sensor event to risk score output | Measures system responsiveness. |
| **Escalation volume** | Count of events escalated to Tier 3 per day | Indicates workload for human reviewers. |

### Precision vs. False-Warning Rate

These two metrics are related but distinct:
- **Precision** looks at the system's warnings: "Were the warnings correct?"
- **False-warning rate** looks at the safe events: "Were safe events left alone?"
- Both are important. High precision alone does not guarantee a low false-warning rate if the system issues very few warnings (high threshold).

## 5. Warning Template System

All warnings follow Samsung's safety communication guidelines:
- **Calm tone** — no alarming language
- **Brief** — one sentence maximum (the warning must not itself become a distraction)
- **Non-punitive** — the system suggests, it does not discipline
- **Consistent voice** — templates are pre-approved and stored in the database

See `lib/warning-templates.ts` for the full template library.

## 6. Ground Truth Evaluation

The synthetic dataset includes ground-truth labels on ~60% of events:
- **True positive:** System warned, and the event was genuinely a distraction
- **False positive:** System warned, but the event was not a distraction
- **True negative:** System did not warn, and the event was not a distraction
- **False negative:** System did not warn, but the event was a genuine distraction

Labels are assigned based on the scenario that generated the event (e.g., phone_while_moving events are predominantly true positives; stopped_vehicle events are predominantly true negatives).

## 7. Data Flow

```
Sensor signals  ──┐
                   ├──▶  Event Record  ──▶  Risk Score  ──┐
Telematics      ──┘                                       │
                                                          ├──▶  Below threshold → Close
                                                          │
                                                          ├──▶  Threshold exceeded → Warning
                                                          │       │
                                                          │       ├──▶  Activity stops → Close
                                                          │       │
                                                          │       └──▶  Continues/repeats → Escalate
                                                          │                   │
                                                          │                   └──▶  Human Review
                                                          │                           │
                                                          │                           ├──▶  Approve
                                                          │                           ├──▶  Dismiss
                                                          │                           └──▶  Escalate further
```

## 8. Database Schema

See `prisma/schema.prisma` for the complete schema. Key models:

- `Driver` — Monitored drivers with risk level tracking
- `SensorEvent` — In-cabin sensor readings (phone, gaze, hands)
- `TelematicsEvent` — Vehicle telematics (speed, drift, braking)
- `RiskScore` — Computed risk assessments with factor breakdown
- `WarningTemplate` — Pre-approved safety warning messages
- `Warning` — Issued warnings with outcome tracking
- `ReviewAction` — Human review decisions with notes
- `AnalyticsSnapshot` — Daily aggregated performance metrics

## 9. Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React, Tailwind CSS, Framer Motion |
| Dashboard | Abacus Dashboard Kit (ECharts) |
| Charts | Recharts (analytics page) |
| Backend | API Routes |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | Auth.js v5 (credentials provider) |
| AI/LLM | Abacus AI API (gpt-5.4-mini) |
| Streaming | Server-Sent Events (SSE) |
| Hosting | Abacus AI Platform |
