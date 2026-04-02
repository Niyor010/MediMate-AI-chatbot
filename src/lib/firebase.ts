import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyDi0SyP1Bu4tq4HGGQ_12VWReAVeI2zCQE",
  authDomain:        "medimate-2ba8e.firebaseapp.com",
  projectId:         "medimate-2ba8e",
  storageBucket:     "medimate-2ba8e.firebasestorage.app",
  messagingSenderId: "232096780266",
  appId:             "1:232096780266:web:d63c1916bc1de8c79bec93",
  measurementId:     "G-BJ7G5E0F9Q",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);   // ← Firestore for storing user profiles
export default app;