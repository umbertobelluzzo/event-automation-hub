# UIS Event-Automation Hub

AI-Powered Event Management Platform for United Italian Societies
Automates the complete event lifecycle from volunteer form submission to multi-channel promotion using LangGraph AI agents and OpenRouter LLM integration. Volunteers fill a simple multi-step form, and AI agents handle the rest: flyer design, social media content, scheduling, and asset management.

> **Goal**: Reduce "idea → published promotion" time to under 10 minutes with AI-generated content and automated workflows, while maintaining human oversight for quality control.

For Volunteers

- Multi-step Form Wizard: Intuitive interface for event creation
- AI Content Generation: Automated flyer, social media captions, and WhatsApp messages
- Real-time Progress: Live updates on AI agent workflow
- Human Review: Approve/edit generated content before publishing
- One-click Deployment: Automatic scheduling and asset distribution

AI Automation Pipeline

1. 🎨 Canva Flyer Generation - Brand-compliant designs via AI instructions
2. 📱 Social Media Content - Instagram & LinkedIn captions optimized for engagement
3. 💬 WhatsApp Broadcasting - Community-friendly messages with proper structure
4. 📅 Calendar Integration - Google Calendar events for team coordination
5. 📋 Task Management - ClickUp tasks with automated checklists
6. 💾 Asset Management - Organized Google Drive folders with all materials

🏗️ Architecture
graph TD
    A[Volunteer Browser] --> B[Next.js Form Wizard]
    B --> C[Express API Server]
    C --> D[Redis Session Store]
    C --> E[LangGraph Agent System]
    E --> F[Event Planning Agent]
    F --> G[Content Creation Agents]
    G --> H[Canva Agent]
    G --> I[Social Media Agent] 
    G --> J[WhatsApp Agent]
    H --> K[Service Integration Layer]
    I --> K
    J --> K
    K --> L[External APIs]
    L --> M[Google Drive/Calendar]
    L --> N[ClickUp]
    L --> O[Canva API]

---

## 🛠️ Tech Stack

| Component        | Technology                                 | Purpose                                               |
| ---------------- | ------------------------------------------ | ----------------------------------------------------- |
| **Frontend**      | Next.js 14 + TypeScript + Tailwind          | Multi-step form wizard                                |
| **Backend API**   | Express + TypeScript                        | Form handling & session management                     |
| **AI Framework**  | LangGraph + FastAPI + Python                | Agent orchestration & workflow                         |
| **LLM Provider**  | OpenRouter API                              | Flexible model selection (GPT-4o, Claude, etc.)       |
| **State Management** | Redis + PostgreSQL                       | Session state & event history                          |
| **UI Components** | Shadcn/ui + Radix UI                        | Modern, accessible interface                           |
| **Deployment**    | Heroku (Multi-buildpack)                    | Volunteer platform access                              |
| **External APIs** | Google Workspace, Canva, ClickUp            | Service integrations                                   |


---

## 🌱 Environment Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/UIS-org/event-automation-hub.git
cd event-automation-hub
cp .env.example .env

```

### 2. Configure Env variables

```bash
pnpm install
pip install -r requirements.txt

OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=openai/gpt-4o
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

GOOGLE_SERVICE_ACCOUNT_JSON=base64_encoded_key
CANVA_API_TOKEN=your_canva_token
CLICKUP_API_TOKEN=your_clickup_token

```
### 3. Initialize database

```bash
pnpm db:push
pnpm db:seed

```

### 4. Start development servers

```bash
pnpm dev  # Starts frontend, API, and AI agents concurrently
```

## Folder / File Structure (First Commit)

event-automation-hub/
├── 🎨 frontend/                    # Next.js application
│   ├── app/
│   │   ├── create-event/           # Multi-step form wizard
│   │   ├── dashboard/              # Event management dashboard
│   │   └── api/                    # API routes
│   ├── components/                 # Reusable UI components
│   ├── hooks/                      # Custom React hooks
│   └── lib/                        # Utilities and configurations
├── 🔧 backend/                     # Express API server
│   ├── src/
│   │   ├── routes/                 # REST API endpoints
│   │   ├── middleware/             # Authentication, validation
│   │   ├── services/               # External service integrations
│   │   └── utils/                  # Helper functions
├── 🤖 agents/                      # LangGraph AI agent system
│   ├── orchestrator/               # Main workflow orchestration
│   ├── content_agents/             # Content creation agents
│   ├── service_agents/             # External service agents
│   ├── prompts/                    # LLM prompt templates
│   └── tools/                      # Agent tools and utilities
├── 📊 database/                    # Database schema and migrations
│   ├── migrations/                 # Prisma migrations
│   ├── schema.prisma              # Database schema
│   └── seed/                       # Development data
├── 🧪 tests/                       # Test suites
│   ├── frontend/                   # Frontend component tests
│   ├── backend/                    # API endpoint tests
│   └── agents/                     # AI agent tests
└── 📦 shared/                      # Shared types and utilities
    ├── types/                      # TypeScript interfaces
    └── constants/                  # Application constants


## AI Agent Workflow

### 1. Form Submission Processing

```typescript
interface EventFormData {
  eventType: 'community' | 'speaker';
  title: string;
  description: string;
  date: Date;
  location: LocationInfo;
  ticketInfo: TicketInfo;
  contentPreferences: ContentPreferences;
}
```

### 2.AI Agent Pipeline

```python
# LangGraph workflow
workflow_steps = [
  "validate_input",     # Validate form data
  "create_flyer",       # Generate Canva design
  "create_captions",    # Social media content
  "create_whatsapp",    # WhatsApp message
  "human_review",       # Volunteer approval
  "schedule_calendar",  # Google Calendar
  "create_task",        # ClickUp task
  "save_assets"         # Drive organization
]
```

## 3. Human Review Interface

- **Real-time Progress**: Live updates on agent status
- **Content Preview**: Review generated flyers and captions
- **Edit Capabilities**: Modify AI-generated content
- **Approval Workflow**: One-click approval or revision requests

---

## 🔐 Security & Privacy

- **API Key Rotation**: Support for multiple valid keys
- **Input Validation**: Strict form data sanitization
- **Rate Limiting**: Per-volunteer and per-IP restrictions
- **Audit Logging**: Complete workflow tracking
- **Data Encryption**: All sensitive data encrypted at rest
