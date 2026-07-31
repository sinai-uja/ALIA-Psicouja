# 🩺 Psicouja Frontend - Psychologist Dashboard

Welcome to the frontend application for psychologists in the **Psicouja** clinical platform. This application provides a comprehensive, modern dashboard for psychologists and administrators to monitor patient progress, manage therapy sessions, review clinical notes, and interact with AI-driven insights.

Built with **Next.js 16** (App Router), this dashboard is fully responsive, optimized for real-time monitoring, and adheres to the latest web standards.

---

## ✨ Key Features

- **📊 Patient Monitoring Dashboard**: Visual representations of EMA (Ecological Momentary Assessment) data to observe patient mood, anxiety, and behavior patterns.
- **🤖 AI Simulator Sandbox**: Practice sandbox for therapists to train with custom AI-simulated patient personas under different clinical models (CBT, ACT).
- **💡 Real-Time AI Supervision**: Direct live chat interface with side-by-side AI supervisor recommendations (Validation, Socratic questioning, Action commitment, etc.).
- **👑 Superadmin Panel (`/superadmin`)**: Administrative console for managing psychologist accounts, tracking global message counts, viewing human-AI edit ratios, and inspecting security audit logs.
- **📅 Session Management & Bitácoras**: Tools to schedule, log, and keep track of therapy sessions with automatic AI bitácora summaries.
- **📈 Advanced Analytics**: Interactive charts and telemetry graphs representing patient progress indicators over time using **Recharts**.
- **🌐 Bilingual Support**: Full multi-language support (English and Spanish) built-in dynamically.

---

## 📁 Project Structure

```bash
frontend/
├── app/                        # Next.js 16 App Router
│   ├── layout.tsx              # Root layout & context providers
│   ├── page.tsx                # Main Psychologist Dashboard
│   ├── login/                  # Authentication page
│   ├── pacientes/              # Patient list, profile telemetry & EMA charts
│   ├── simulador/              # AI Patient Simulator sandbox
│   ├── chat/                   # Secure patient messaging & AI Supervision panel
│   ├── sesiones/               # Session scheduling & clinical bitácoras
│   ├── superadmin/             # Superadmin platform governance panel
│   └── audit-logs/             # Security audit log inspection
├── components/                 # UI Components
│   ├── ui/                     # Accessible UI components (Radix UI, Tailwind 4)
│   ├── PatientCard.tsx         # Patient summary tile & status indicator
│   ├── EmaChart.tsx            # Interactive Recharts EMA trends graph
│   ├── AiSupervisorPanel.tsx   # Live strategy recommendation pill bar
│   └── SimulatorChat.tsx       # AI patient interactive practice interface
├── contexts/                   # Global React contexts
│   ├── AuthContext.tsx         # User session & JWT state provider
│   └── LanguageContext.tsx     # Internationalization state (ES / EN)
├── hooks/                      # Custom React hooks (useAuth, usePatients, useSocket)
├── lib/                        # Axios HTTP client, API route constants, date helpers
├── proxy.ts                    # Next.js 16 Proxy Convention for route & access logging
└── styles/                     # Tailwind CSS 4 global stylesheets
```

---

## 🛠️ Advanced Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/) for maximum type-safety and robust code structure
- **Styling**: Modern, premium styling using [Tailwind CSS 4](https://tailwindcss.com/)
- **UI Components**: High-quality accessibility primitives powered by [Radix UI](https://www.radix-ui.com/) & [Lucide React](https://lucide.dev/)
- **State & Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) for precise form validation
- **Charts & Visualization**: Interactive data graphs using [Recharts](https://recharts.org/)
- **Date Management**: [date-fns](https://date-fns.org/) for rich and contextual date parsing

---

## ⚙️ Architecture & Conventions

### 🛡️ Next.js 16 Proxy Convention
This project implements the modern **Next.js 16 Proxy Convention** via `proxy.ts`, which replaces the deprecated `middleware.ts`. This allows network-level logging, access control, and route logging with zero performance overhead.

---

## 🚀 Setup & Installation

Getting the Psychologist Dashboard running locally takes less than 2 minutes:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env.local` file in the root of the project (you can copy the structure from the provided `.env.example`):
   ```env
   # API URL of the Psicouja backend
   NEXT_PUBLIC_API_URL=http://localhost:8001

   # Link to the Patient Client App
   NEXT_PUBLIC_PATIENT_APP_URL=https://patient.yourdomain.com/
   ```

3. **Run the Development Server**:
   ```bash
   npm run dev
   ```

   The dashboard will be available at [http://localhost:3000](http://localhost:3000).

---

## 📄 Documentation Links

For step-by-step setup, dependency installation, and environment configuration, refer to:
- [INSTALL.md](INSTALL.md) — Comprehensive local setup guide.