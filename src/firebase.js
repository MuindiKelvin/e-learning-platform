import { initializeApp } from "firebase/app"; import { getAuth } from "firebase/auth"; 
import { getFirestore } from "firebase/firestore"; 

const firebaseConfig = {
  apiKey: "AIzaSyDe2GNV6Qg15-9SV6TQmu7DBRVsoiTvrAI",
  authDomain: "e-learning-system-e8b1f.firebaseapp.com",
  projectId: "e-learning-system-e8b1f",
  storageBucket: "e-learning-system-e8b1f.firebasestorage.app",
  messagingSenderId: "713527429392",
  appId: "1:713527429392:web:532972b1fe5c222b1f3d95",
  measurementId: "G-EWYM2S3K7C"
};

// Initialize Firebase 
const app = initializeApp(firebaseConfig); 
const auth = getAuth(app); 
const db = getFirestore(app); 
export { auth, db };