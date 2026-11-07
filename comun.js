// Datos y utilidades compartidas (sin cargar Firebase, para que la tienda sea rápida)
export const ADMINS = ["abdallahgudi@gmail.com", "samu_428@hotmail.com"];
export const WHATSAPP_REPX = "584126133198";
export const TIPOS_PRENDA = ["Camiseta", "Tank", "Top", "Short", "Leggings", "Set", "Vestido", "Falda", "Sudadera", "Accesorio"];
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
