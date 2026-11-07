// Conexión a Firebase (proyecto repx-67f15). Estos datos son públicos; la seguridad está en las reglas de Firestore.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCe-Wlx4M2RSNjjhFoKseY1Be_G3suXoH4",
  authDomain: "repx-67f15.firebaseapp.com",
  projectId: "repx-67f15",
  storageBucket: "repx-67f15.firebasestorage.app",
  messagingSenderId: "177169986064",
  appId: "1:177169986064:web:32ac35bbacb39ecaf4d095"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export * from "./comun.js";
