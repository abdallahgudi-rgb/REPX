// Lectura y pedidos directo a Firestore, sin la librería de Firebase (mucho más liviano).
// La seguridad sigue igual: las reglas de Firestore deciden qué se puede leer o crear.
const PROYECTO = "repx-67f15";
const KEY = "AIzaSyCe-Wlx4M2RSNjjhFoKseY1Be_G3suXoH4";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROYECTO}/databases/(default)/documents`;

function leer(v) {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) { const d = new Date(v.timestampValue); return { seconds: Math.floor(d / 1000), toDate: () => d }; }
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(leer);
  if ("mapValue" in v) return campos(v.mapValue.fields);
  return null;
}
const campos = f => Object.fromEntries(Object.entries(f || {}).map(([k, v]) => [k, leer(v)]));
function escribir(x) {
  if (x === null || x === undefined) return { nullValue: null };
  if (x instanceof Date) return { timestampValue: x.toISOString() };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(escribir) } };
  if (typeof x === "boolean") return { booleanValue: x };
  if (typeof x === "number") return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  if (typeof x === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(x).map(([k, v]) => [k, escribir(v)])) } };
  return { stringValue: String(x) };
}
const idDe = name => name.split("/").pop();

export async function listar(col) {
  const out = [];
  let token = "";
  do {
    const r = await fetch(`${BASE}/${col}?pageSize=300&key=${KEY}${token ? "&pageToken=" + token : ""}`);
    if (!r.ok) throw new Error("No se pudo leer " + col);
    const j = await r.json();
    (j.documents || []).forEach(d => out.push({ id: idDe(d.name), ...campos(d.fields) }));
    token = j.nextPageToken || "";
  } while (token);
  return out;
}
export async function obtener(col, id) {
  const r = await fetch(`${BASE}/${col}/${encodeURIComponent(id)}?key=${KEY}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("No se pudo leer " + col);
  const d = await r.json();
  return { id: idDe(d.name), ...campos(d.fields) };
}
export async function crear(col, data) {
  const r = await fetch(`${BASE}/${col}?key=${KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: escribir(data).mapValue.fields }),
  });
  if (!r.ok) throw new Error("No se pudo guardar");
  const d = await r.json();
  return { id: idDe(d.name) };
}
