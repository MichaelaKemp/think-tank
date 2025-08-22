// Import the functions you need from the SDKs you need
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: API_KEY,
  authDomain: AUTH_DOMAIN,
  projectId: PROJECT_ID,
  storageBucket: STORAGE_BUCKET,
  messagingSenderId: MESSAGING_SENDER_ID,
  appId: APP_ID
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// IMPORTANT for React Native: initialize Auth with AsyncStorage persistence.
// After this file runs, the lecturer-style `const auth = getAuth();` works everywhere.
let auth; // ADDED: exportable auth instance
try {
  auth = getAuth(app);
} catch {
  auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
}

export const db = getFirestore(app);
export { auth }; // ADDED: export auth so you can `signOut(auth)` etc.

