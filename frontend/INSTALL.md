# Installation Guide - Psicouja Frontend

Follow these steps to set up and run the Psychologist Dashboard locally.

## 📋 Prerequisites
- **Node.js** (LTS version recommended)
- **npm** (comes with Node.js)

## 🛠️ Step-by-Step Setup

### 1. Install Dependencies
Navigate to the project directory and run:

```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory. You can copy the structure from `.env.example` in the root.

The following variables must be configured:
- `NEXT_PUBLIC_API_URL`: The URL of the Psicouja/Terauja backend server (e.g., `http://localhost:8001` for local development).
- `NEXT_PUBLIC_PATIENT_APP_URL`: The URL of the Patient App client (e.g., `https://patient.yourdomain.com/` or your custom hosted client).

### 3. Running the Development Server
Start the application in development mode:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000) (or the port specified in the terminal).

## 🚀 Production Build

To create an optimized production build:

```bash
npm run build
```

To start the production server:

```bash
npm start
```
