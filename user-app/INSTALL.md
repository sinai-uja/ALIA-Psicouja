# Installation Guide - PsicoUJA User App

Follow these steps to set up and run the Patient Application locally.

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
Copy the `.env.example` template into a new `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

This project has been fully parameterized to read configurations from environment variables. If these variables are not provided, the API URL will automatically fall back to the local backend (`http://127.0.0.1:8001`), but Firebase push notifications will require the variables to be configured to function properly.

You can customize the following variables in `.env.local`:
- `NEXT_PUBLIC_API_URL`: Base URL of the backend API (e.g. `https://api.tu-proyecto.com` or `http://localhost:8001`).
- `NEXT_PUBLIC_FIREBASE_API_KEY`: API Key for Firebase.
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Auth domain for Firebase.
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Firebase project ID.
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: Storage bucket for Firebase.
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: Sender ID for messaging.
- `NEXT_PUBLIC_FIREBASE_APP_ID`: App ID for Firebase client.
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`: VAPID Key used by the client for push notification token registration.

### 3. Running the Development Server
Start the application in development mode:

```bash
npm run dev
```

The application will be available at [http://localhost:3001](http://localhost:3001) (or the port specified in the terminal, usually 3001 to avoid conflict with the main frontend).

## 🚀 Production Build

To create an optimized production build:

```bash
npm run build
```

To start the production server:

```bash
npm start
```
