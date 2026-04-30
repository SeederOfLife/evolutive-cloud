import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import aiStudioConfig from '../../firebase-applet-config.json';

// Support both AI Studio's managed config and standard environment variables for standalone deployment
const config = {
  ...aiStudioConfig,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || aiStudioConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || aiStudioConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || aiStudioConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || aiStudioConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || aiStudioConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || aiStudioConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || (aiStudioConfig as any).measurementId,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || (aiStudioConfig as any).databaseURL,
};

const app = initializeApp(config);
export const db = getFirestore(app, import.meta.env.VITE_FIREBASE_DB_ID || (aiStudioConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);
