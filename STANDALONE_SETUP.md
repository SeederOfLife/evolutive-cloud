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

## 3. Local Development

Run the following commands to start the app locally:

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

The server will match the full-stack configuration and serve the frontend while proxing any backend needs.

## 4. Deployment (Vercel/Netlify)

1. Connect your GitHub repository to Vercel/Netlify.
2. In the deployment settings, add every variable listed in `.env.example`.
3. Set the build command to `npm run build`.
4. Set the output directory to `build`.

---

*Note: If `GEMINI_API_KEY` is not provided in the environment, the app will prompt users to enter their own key in the Settings panel for safety.*
