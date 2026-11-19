// Datos y utilidades compartidas (sin cargar Firebase, para que la tienda sea rápida)
export const ADMINS = ["abdallahgudi@gmail.com", "samu_428@hotmail.com"];
export const WHATSAPP_REPX = "584126133198";
// Tipos de prenda agrupados por familia. "sin" son palabras que la gente busca y deben encontrar esa familia.
export const FAMILIAS = [
  { f: "Franelas", tipos: ["Franela", "Franela oversize", "Manga larga", "Esqueleto", "Polo"], sin: ["franela", "camiseta", "camisa", "remera", "playera", "t-shirt", "tshirt", "oversize", "manga", "esqueleto", "tank", "musculosa", "polo"] },
  { f: "Tops", tipos: ["Top deportivo", "Crop top", "Bra deportivo"], sin: ["top", "crop", "bra", "sosten", "sujetador", "brasier", "bralette"] },
  { f: "Pantalones", tipos: ["Jogger", "Mono", "Pantalón deportivo", "Leggings"], sin: ["pantalon", "jogger", "mono", "licra", "malla", "calza", "legging", "pants", "deportivo"] },
  { f: "Shorts", tipos: ["Short", "Short 2 en 1", "Biker short"], sin: ["short", "bermuda", "biker", "ciclista", "licra corta"] },
  { f: "Faldas y vestidos", tipos: ["Falda", "Falda short", "Vestido"], sin: ["falda", "skort", "vestido", "enterizo corto"] },
  { f: "Conjuntos", tipos: ["Conjunto", "Enterizo"], sin: ["conjunto", "set", "combo", "enterizo", "braga", "bodysuit", "jumpsuit"] },
  { f: "Abrigos", tipos: ["Sudadera", "Hoodie", "Chaqueta"], sin: ["sudadera", "hoodie", "capucha", "sueter", "sweater", "buzo", "chaqueta", "rompevientos", "abrigo"] },
  { f: "Accesorios", tipos: ["Gorra", "Medias", "Bolso", "Toalla", "Termo", "Accesorio"], sin: ["gorra", "media", "calcetin", "bolso", "morral", "toalla", "termo", "botella", "shaker", "accesorio"] },
];
export const TIPOS_PRENDA = FAMILIAS.flatMap(x => x.tipos);
// Nombres que se usaron antes, para que los productos viejos sigan funcionando
const VIEJOS = { "Camiseta": "Franela", "Tank": "Esqueleto", "Top": "Top deportivo", "Set": "Conjunto" };
export const tipoDe = p => { const t = (p && p.tipo) || ""; return VIEJOS[t] || t; };
export const familiaDe = p => { const t = tipoDe(p); return t ? (FAMILIAS.find(x => x.tipos.includes(t))?.f || "") : ""; };
export const sinonimosDe = p => { const f = FAMILIAS.find(x => x.f === familiaDe(p)); return f ? [f.f, ...f.sin].join(" ") : ""; };
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
