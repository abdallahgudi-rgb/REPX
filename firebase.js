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

export const ADMINS = ["abdallahgudi@gmail.com", "samu_428@hotmail.com"];
export const WHATSAPP_REPX = "584126133198";
export const METODOS_PAGO = ["Pago móvil", "Efectivo", "PayPal", "Binance", "Zinli"];

// Utilidades compartidas
export const dinero = n => "$" + (Number(n) || 0).toFixed(2).replace(/\.00$/, "");
export const codigo = id => id.slice(0, 5).toUpperCase();
export const telWa = t => {
  let d = String(t || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "58" + d.slice(1);
  else if (d.length === 10 && d.startsWith("4")) d = "58" + d;
  return d;
};
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const stockTotal = p => (p.tallas || []).reduce((a, t) => a + (Number(t.stock) || 0), 0);
export const estaAgotado = p => !!p.agotado || stockTotal(p) <= 0;
