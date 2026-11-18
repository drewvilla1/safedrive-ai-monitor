# SafeDrive AI Monitor

**AI-Assisted Distracted Driving Safety Monitoring System**  
Samsung Pilot — ITAI4373 Group 6 Final Project

---

## Team

| Name | Role |
|------|------|
| Bryton McClintock | Project Manager |
| Brian Martinez | Business Analyst |
| Diondria Morris | Technical Lead |
| Andrew Kuruvilla | Implementation Support |

---

## Overview

SafeDrive AI Monitor is a proof-of-concept (POC) web application that demonstrates an AI-driven distracted-driving detection and intervention system. It was designed as a Samsung-focused pilot proposal, adapted from a midterm artist-engagement assignment into a safety-focused equivalent with instructor approval.

The system fuses two simulated data streams — in-cabin phone/sensor signals and vehicle telematics — to detect potential mobile-device distraction, calculate a risk score (0–100), issue calibrated safety warnings in a consistent voice, and escalate unresolved or high-risk events to a human reviewer.

> **All data in this application is synthetic.** No real drivers, vehicles, or driving events are represented. Performance metrics are computed from generated test scenarios and should not be interpreted as real-world safety claims.

---

## Features

### 1. Live Monitoring
- Real-time Server-Sent Events (SSE) stream of simulated sensor and telematics events
- Start/pause controls for the live feed
- Two-column layout: event feed + detail panel showing risk factors
- Five scenarios: phone-while-moving, passenger use, stopped vehicle, missing data, benign
- Visible "SYNTHETIC DATA" banner on every screen

### 2. AI Risk Scoring
- Documented, explainable scoring algorithm (0–100 scale)
- Configurable warning threshold (default: 60)
- Confidence interval that decreases when data signals are missing
- LLM-powered rationale generation (streaming via Abacus AI API)
- Detailed factor breakdown: event type, speed, lane drift, duration, repeated events, reductions

### 3. Safety Warning System
- Three severity tiers: gentle reminder, firm warning, escalation notice
- Samsung-style safety voice: calm, brief, non-alarming
- Approved template library with randomly selected messages
- Outcome tracking: whether simulated activity stopped after warning
- Response time measurement

### 4. Human Review Queue
- Escalated cases with full event history, warning details, and confidence scores
- Approve / Dismiss / Escalate actions with reviewer notes
- Role-based access with reviewer attribution
- Filter by action status (pending, approved, dismissed, escalated)

### 5. Analytics & Performance
- Precision, recall, false-warning rate, F1 score from ground-truth-labeled synthetic data
- Mean processing latency trend
- Driver response rate (activity stopped after warning)
- Event and warning volume trends (30-day charts)
- Confusion matrix (TP, FP, TN, FN)
- Repeated-distraction driver list

### 6. Ethics & Compliance
- Privacy & data minimization policies
- Consent & transparency practices
- Bias & fairness monitoring
- Human oversight framework (three-tier delegation model)
- AI limitations & uncertainty handling
- Security & access control measures
- Alignment with NIST AI Risk Management Framework

---

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a detailed system architecture document.

**High-level stack:**
- **Frontend:** React web application with component-based UI
- **Backend:** API routes for data access, risk scoring, SSE streaming, and LLM integration
- **Database:** PostgreSQL with Prisma ORM
- **AI:** Abacus AI LLM API for rationale generation; rule-based risk scoring engine
- **Data:** Synthetic labeled dataset covering 8 drivers × 30 days × 5 scenarios

---

## Setup

### Prerequisites
- Node.js ≥ 20
- PostgreSQL database
- Abacus AI API key (for LLM rationale feature)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd safedrive_ai_monitor/nextjs_space

# Install dependencies
yarn install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, NEXTAUTH_SECRET, ABACUSAI_API_KEY

# Push database schema
npx prisma db push
npx prisma generate

# Seed synthetic data
yarn prisma db seed

# Start development server
yarn dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Auth.js session secret |
| `AUTH_SECRET` | Auth.js secret (same as NEXTAUTH_SECRET) |
| `NEXTAUTH_URL` | Application URL (e.g., `http://localhost:3000`) |
| `AUTH_URL` | Application URL (same as NEXTAUTH_URL) |
| `ABACUSAI_API_KEY` | Abacus AI API key for LLM features |

---

## Usage

1. **Sign up / Log in** — Create an account or use the demo credentials.
2. **Dashboard** — View KPIs (precision, recall, false-warning rate, response rate, latency, escalation volume) and trend charts.
3. **Live Monitor** — Press "Start" to stream synthetic events. Click any event to inspect its risk factors, telematics, and warnings.
4. **Review Queue** — Filter by status, review escalated cases, add notes, and take action (approve/dismiss/escalate).
5. **Analytics** — Explore ground-truth evaluation metrics, confusion matrix, trend charts, and repeated-distraction data.
6. **Ethics** — Review the system's approach to privacy, consent, bias, human oversight, and limitations.

---

## Risk Scoring Algorithm

The scoring engine is documented in `lib/risk-scoring.ts`. Key design:

- **Additive factors:** Each sensor event contributes based on its type weight × detection confidence
- **Contextual modifiers:** Speed, lane drift, and interaction duration add to the score
- **Reductions:** Vehicle stopped (−40), passenger present (−20)
- **Confidence:** Starts at 1.0, reduced by 0.10–0.15 per missing signal
- **Threshold:** Events scoring ≥ 60 trigger a warning; ≥ 70 is firm warning; ≥ 85 is escalation

See `docs/ARCHITECTURE.md` for the full algorithm specification.

---

## Definitions (from the Architecture doc)

- **Precision:** TP / (TP + FP) — proportion of warnings that were genuine distractions
- **Recall:** TP / (TP + FN) — proportion of genuine distractions that were detected
- **False-warning rate:** FP / (FP + TN) — proportion of non-distractions that received a warning
- **Driver response rate:** Fraction of warnings after which simulated activity stopped

---

## License

Academic project — ITAI4373, Fall 2026.
