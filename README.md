# QA Dock — Modern Test Management System (TMS)

![QA Dock TMS Architecture](https://img.shields.io/badge/Stack-NestJS%20%7C%20React%20%7C%20Prisma%20%7C%20PostgreSQL-blue?style=for-the-badge)

**QA Dock** is a high-performance, enterprise-grade Test Management System (TMS) designed for manual QA teams and automated CI/CD pipelines (similar to Test IT, Zephyr, and Qase).

---

## Key Features

- 🏢 **Multi-Project Workspaces**: Complete workspace isolation with unique project keys (e.g. `QAD`, `APP`).
- 📋 **Test Case Authoring**:
  - Drag-and-drop ordered test steps.
  - ⚡ **Общие шаги (Shared Steps)**: переиспользование готовых тест-кейсов в качестве предусловий или шагов проверок (как вложенный модуль или через копирование шагов).
  - Multi-tag classification with custom badge colors.
  - Priority & status lifecycles (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
  - Preconditions, postconditions, and rich descriptions.
- ⚡ **Automation CI/CD Webhook**:
  - `POST /api/v1/projects/:projectId/automation/results`.
  - Ingests **JSON** and **JUnit XML** reports directly from Playwright, Pytest, Cypress, Jest, or JUnit.
  - Auto-matches test cases via `automationId` or title, and auto-provisions missing cases.
- 🚀 **Manual Test Execution Workspace**:
  - Real-time progress bar with Pass Rate calculation.
  - 1-click status execution (`PASSED`, `FAILED`, `BLOCKED`, `SKIPPED`).
  - Failure note & error log capture.
- 🐳 **Full Containerization**:
  - Multi-stage Docker builds for NestJS and React.
  - Nginx reverse-proxy and static asset caching.
  - Single-command orchestration via `docker-compose.yml`.

---

## 🚀 Quick Start with Docker

### 1. Configure Environment
```bash
cp .env.example .env
```

### 2. Start Full Stack
```bash
docker-compose up -d --build
```

### 3. Access Services
- 🌐 **Web UI**: [http://localhost:3000](http://localhost:3000)
- 🔌 **Backend REST API**: [http://localhost:4000](http://localhost:4000)
- 📑 **Swagger API Docs**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
- 🔐 **Keycloak SSO & IAM**: [http://localhost:8080](http://localhost:8080)
  - Admin Console: `http://localhost:8080/admin` (Логин: `admin`, Пароль: `admin`)
  - Realm: `qa-dock`
  - Client ID: `qa-dock-client`
- 🐘 **PostgreSQL**: `localhost:5432` (`user: postgres`, `db: qa_dock`, `db: keycloak`)

---

## 🔐 Авторизация через Keycloak SSO

В QA Dock интегрирована единая система аутентификации (Single Sign-On) на базе **Keycloak 24**:
- **Автоматический импорт Realm**: при старте контейнера `qa_dock_keycloak` подгружается realm `qa-dock` из `./keycloak/realm-export.json`.
- **Ролевая модель (RBAC)**: роли Keycloak (`admin`, `qa_engineer`) автоматически транслируются в роли системы QA Dock (`ADMIN`, `QA_ENGINEER`).
- **Синхронизация пользователей**: при входе через SSO профиль пользователя автоматически сохраняется/обновляется в базе данных PostgreSQL.

### Преднастроенные тестовые учетные записи:
| Пользователь | Email | Пароль | Роль Keycloak | Роль в QA Dock |
|---|---|---|---|---|
| **admin** | `admin@qadock.dev` | `Password123!` | `admin` | Администратор (`ADMIN`) |
| **tester** | `tester@qadock.dev` | `Password123!` | `qa_engineer` | Инженер QA (`QA_ENGINEER`) |

---

## 🛠 Project Structure

```text
qa_dock/
├── backend/                  # NestJS + TypeScript REST API
│   ├── prisma/
│   │   └── schema.prisma     # Prisma Data Model (PostgreSQL)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/         # JWT Authentication & RBAC
│   │   │   ├── projects/     # Isolated Workspace Management
│   │   │   ├── test-cases/   # Test Cases & Ordered Steps CRUD
│   │   │   ├── test-plans/   # Test Suite Grouping
│   │   │   ├── test-runs/    # Execution Runs & Manual QA Tracking
│   │   │   ├── tags/         # Scoped Tag Badges
│   │   │   └── automation-integration/ # CI/CD Ingestion Webhook
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── Dockerfile            # Multi-stage Backend Container
│   └── package.json
├── frontend/                 # React 18 + Vite + Tailwind + Zustand
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/       # AppLayout & Sidebar
│   │   │   ├── test-cases/   # TestCaseGrid & TestCaseEditor (Dnd)
│   │   │   ├── test-runs/    # TestRunView (Manual QA interface)
│   │   │   ├── test-plans/   # TestPlansView
│   │   │   └── automation/   # AutomationWebhookGuide
│   │   ├── store/            # Zustand global state
│   │   └── lib/              # Axios API client
│   ├── nginx.conf            # Nginx SPA & API Reverse Proxy
│   ├── Dockerfile            # Multi-stage Frontend Container
│   └── package.json
├── docker-compose.yml        # Multi-container orchestration
└── README.md
```

---

## 🤖 CI/CD Automation Webhook

### Send Test Results via cURL
```bash
curl -X POST http://localhost:4000/api/v1/projects/<PROJECT_ID>/automation/results \
  -H "Content-Type: application/json" \
  -d '{
    "title": "GitHub Actions Run #108",
    "environment": "staging",
    "results": [
      {
        "automationId": "tests/login.spec.ts#testLogin",
        "name": "User can log in with valid credentials",
        "status": "PASSED",
        "duration": 1.45
      }
    ]
  }'
```

### Send JUnit XML Report
```bash
curl -X POST http://localhost:4000/api/v1/projects/<PROJECT_ID>/automation/results \
  -H "Content-Type: application/xml" \
  --data-binary @results/junit.xml
```
