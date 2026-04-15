import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBZSLEyKQi1LRzBtsWsEhKd7wZjBTCxQe8",
  authDomain: "chatbox1-16d69.firebaseapp.com",
  projectId: "chatbox1-16d69",
  storageBucket: "chatbox1-16d69.firebasestorage.app",
  messagingSenderId: "905763005937",
  appId: "1:905763005937:web:4715cb72bdd440e16b1050",
  measurementId: "G-7VTNL2J6YF"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
