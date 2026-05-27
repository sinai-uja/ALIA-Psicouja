# 🩺 Psicouja Frontend - Psychologist Dashboard

Welcome to the frontend application for psychologists in the **Psicouja** clinical platform. This application provides a comprehensive, modern dashboard for psychologists and administrators to monitor patient progress, manage therapy sessions, review clinical notes, and interact with AI-driven insights.

Built with **Next.js 16** (App Router), this dashboard is fully responsive, optimized for real-time monitoring, and adheres to the latest web standards.

---

## ✨ Key Features

- **📊 Patient Monitoring Dashboard**: Visual representations of EMA (Ecological Momentary Assessment) data to observe patient mood, anxiety, and behavior patterns.
- **💬 AI Simulator & Assistants**: Practice tools for therapists using customized virtual client simulators to refine intervention strategies.
- **📅 Session Management**: Intuitive tools to schedule, log, and keep track of active patient therapy sessions.
- **📝 Secure Clinical Notes & Bitácoras**: Secure storage and logging of therapist clinical progress notes and summaries.
- **📈 Advanced Analytics**: Interactive charts, metrics, and progress lines representing clinical indicators over time using **Recharts**.
- **🔔 Real-time Notifications**: Real-time alerts regarding patient check-ins, messages, or anomalies.
- **🌐 Bilingual Support**: Full multi-language support (English and Spanish) built-in dynamically.

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