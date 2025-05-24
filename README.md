# UIS Event-Automation Hub

Automates the creation, management, and distribution of events for **United Italian Societies** (and, in the future, for any non-profit community).  
The Hub receives a single submission (form or API) and generates, in a few seconds:

1. Brand-compliant flyer via Canva API  
2. Pre-formatted WhatsApp message  
3. Newsletter draft (Mailchimp Campaign Draft)  
4. Operational task in ClickUp with pre-populated checklist  
5. Google Calendar event (UIS team)  
6. Drive folder with all assets

> **Goal**: reduce the "idea → published promotion" time to under 10 minutes, prevent manual errors, and track all KPIs in a centralized way.

---

## Tech Stack

| Area                     | Choice                        | Reason                                      |
| ------------------------ | ---------------------------- | ------------------------------------------- |
| Runtime                  | Node 20 + TypeScript          | Rich ecosystem of official SDKs            |
| API server               | Express                       | Simple, plug-and-play with CURSOR          |
| DB / State Management    | None (stateless)              | Orchestration via webhooks; Redis if needed |
| Front-end (optional)     | Next.js 14 + Tailwind         | Wizard form, Google auth                   |
| Automation               | Zapier / n8n (for external triggers) | Low-code fallback                     |
| CI/CD                    | GitHub Actions → Docker + Render.com | Fast, free deployment                |
| Copilot                  | CURSOR                        | AI pair-programming, fast refactoring      |

---

## High-level Architecture

## API Flow

Form ➜ `/api/v1/event` (Express)  
├─▶ **CanvaService** ➜ poster PNG public URL  
├─▶ **WhatsAppService** ➜ broadcast message  
├─▶ **MailService** ➜ campaign draft  
├─▶ **ClickUpService** ➜ task + checklist  
├─▶ **DriveService** ➜ folder + assets  
└─▶ **CalendarService** ➜ Google Calendar entry



Tutte le chiamate sono orchestrate da **EventFlowOrchestrator** (pattern façade + retry/back-off in caso di errori API).

---

## Requisiti

* Node ≥ 20, pnpm ≥ 9  
* Account Canva Teams (API token)  
* Google Cloud service account con scope Drive + Calendar  
* ClickUp API token (Spazio «EVENTI 24-25»)  
* Mailchimp API key / Server prefix  
* WhatsApp Business session (whatsapp-web.js)  
* (Opz.) Buffer / Hootsuite token per social scheduling

---

## Quick start (dev)

```bash
git clone https://github.com/UIS-org/event-automation-hub.git
cd event-automation-hub
cp .env.example .env   # ↖ inserisci le chiavi
pnpm i
pnpm dev               # nodemon + ts-node


---

#ENV variables
GOOGLE_SERVICE_ACCOUNT_JSON=...
CANVA_API_TOKEN=...
MAILCHIMP_API_KEY=...
MAILCHIMP_SERVER_PREFIX=eu21
WHATSAPP_SESSION=        # lasciato vuoto la prima volta
CLICKUP_API_TOKEN=...
BUFFER_API_TOKEN=...
PORT=4000

## npm Scripts

| Command            | Description                                   |
| ------------------ | --------------------------------------------- |
| `pnpm dev`         | Starts the API with hot-reload                 |
| `pnpm test`        | Runs `vitest` + coverage                       |
| `pnpm lint`        | Runs ESLint and Prettier                       |
| `pnpm build`       | Transpiles code to `dist/`                     |
| `pnpm start`       | Starts the server from the compiled output     |

---

## Roadmap MVP

| Sprint   | Focus                                                    |
| -------- | -------------------------------------------------------- |
| Sprint 1 | Webhook, DriveService, CanvaService, basic orchestrator   |
| Sprint 2 | WhatsApp + ClickUp + Google Calendar                     |
| Sprint 3 | Next.js wizard front-end, Google authentication          |
| Sprint 4 | VAT-router, Buffer, BigQuery metrics                      |
| Pilot    | Rollout in London/Zurich, KPI collection                 |

---

## Contributing

- Fork the repo + create a branch with `feat/` or `fix/` prefix
- Add tests (`vitest`) for any services you touch
- Open a Pull Request describing:
  - **What** you did
  - **Why** you did it
  - **Screenshot** (if UI changes)
- Owners will review your code asynchronously (within 48h)

## Folder / File Structure (First Commit)

event-automation-hub/
├─ .env.example
├─ .gitignore
├─ README.md
├─ package.json
├─ pnpm-lock.yaml
├─ tsconfig.json
├─ src/
│ ├─ index.ts # Bootstrap Express
│ ├─ routes/
│ │ └─ webhook.ts # POST /v1/event
│ ├─ orchestrator/
│ │ └─ event-flow.ts # EventFlowOrchestrator class
│ ├─ services/
│ │ ├─ canva.service.ts
│ │ ├─ whatsapp.service.ts
│ │ ├─ mail.service.ts
│ │ ├─ clickup.service.ts
│ │ ├─ drive.service.ts
│ │ └─ gcal.service.ts
│ ├─ shared/
│ │ └─ dto/
│ │ └─ event.ts # EventDTO interface
│ ├─ templates/
│ │ ├─ whatsapp.ejs
│ │ └─ newsletter.ejs
│ └─ logger.ts
├─ tests/
│ ├─ drive.service.spec.ts
│ └─ canva.service.spec.ts
└─ storage/ # Ignored in git, for WhatsApp sessions
└─ .gitkeep
