# Standalone Deployment Guide (GitHub & Beyond)

This guide explains how to take this repository and run it outside of the Google AI Studio environment (e.g., on GitHub, Vercel, or local development).

## 1. Environment Configuration

When running in Google AI Studio, secrets are managed automatically. Externally, you must provide these via a `.env` file or your hosting provider's "Environment Variables" settings.

### Setup Instructions:
1. Copy `.env.example` to a new file named `.env`.
2. Fill in the values for your Firebase and Supabase projects.
3. For AI functionality, provide a `GEMINI_API_KEY` from the [Google AI SDK console](https://aistudio.google.com/app/apikey).

## 2. Authentication (OAuth)

To make GitHub and Google login work in your own environment:

### Firebase Auth Setup:
1. Go to your **Firebase Console** > **Authentication** > **Settings** > **Authorized Domains**.
2. Add your production domain (e.g., `myapp.vercel.app`) to the list.
3. In the **Sign-in method** tab:
   - Enable **Google** and ensure the Web SDK client ID is configured.
   - Enable **GitHub** and provide the Client ID/Secret from your GitHub Developer settings.

### GitHub OAuth Setup:
1. Create a new "OAuth App" in your GitHub settings.
2. Set the "Authorization callback URL" to the one provided in your Firebase Console (usually `https://[project-id].firebaseapp.com/__/auth/handler`).

### How to find these values:
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click the **Project Settings** (gear icon) next to "Project Overview".
3. Scroll down to the **Your apps** section.
4. Select your Web App (or create one if you haven't).
5. Choose the **SDK setup and configuration** > **Config** radio button.
6. You will see a `firebaseConfig` object:
   - `measurementId` &rarr; `VITE_FIREBASE_MEASUREMENT_ID` (Only if Analytics is enabled).
   - `databaseURL` &rarr; `VITE_FIREBASE_DATABASE_URL` (Found in the **Realtime Database** tab if initialized). If you only use Firestore, you can leave this empty.
   - `apiKey`, `authDomain`, `projectId`, etc. map directly to the variables in `.env.example`.

## 3. Local Development

Run the following commands to start the app locally:

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

The server will match the full-stack configuration and serve the frontend while proxing any backend needs.

## 5. Security Hardening (CRITICAL)

To prevent others from "stealing" your resources or data:

### Environment Variables
- **NEVER** commit your `.env` file. It is already in `.gitignore`.
- If you use a host like Vercel or Netlify, enter the keys in their **Environment Variables** dashboard.

### API Key Restrictions
1. Go to the [Google Cloud Console Credentials page](https://console.cloud.google.com/apis/credentials).
2. Find the API Key used for Firebase.
3. Set **Website Restrictions** (Referrers) to your production URL (e.g., `https://yourdomain.com/*`).
4. This prevents others from using your key on their own sites.

### Database Rules
- **Firestore**: Always use the provided `firestore.rules`.
- **Realtime Database**: Do not leave rules as `true`. Use identity-based rules:
  ```json
  {
    "rules": {
      "users": {
        "$uid": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        }
      }
    }
  }
  ```

### Supabase
- Always enable **Row Level Security (RLS)** in the Supabase dashboard for all tables.

---

*Note: If `GEMINI_API_KEY` is not provided in the environment, the app will prompt users to enter their own key in the Settings panel for safety.*
