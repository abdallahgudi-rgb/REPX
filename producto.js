import { METODOS_PAGO, dinero, esc, estaAgotado, tipoDe } from "./comun.js";
import { obtener } from "./rest.js";

const $ = s => document.querySelector(s);
const id = new URLSearchParams(location.search).get("id");
let cart = [];
function leerCarrito() {
  try { const c = JSON.parse(localStorage.getItem("repx-cart2") || "[]"); cart = Array.isArray(c) ? c.filter(l => l && l.id && l.talla && l.qty > 0) : []; }
  catch (e) { cart = []; }
  return cart;
}
leerCarrito();
const save = () => { try { localStorage.setItem("repx-cart2", JSON.stringify(cart)); } catch (e) {} };
// guarda este producto en la lista del teléfono, para que la tienda lo reconozca al abrir el carrito
function recordar(p) {
  try {
    const c = JSON.parse(localStorage.getItem("repx-prod-cache") || "[]");
    const i = c.findIndex(x => x.id === p.id);
    const min = { ...p }; delete min.toDate;
    if (i >= 0) c[i] = min; else c.unshift(min);
    localStorage.setItem("repx-prod-cache", JSON.stringify(c));
  } catch (e) {}
}
addEventListener("pageshow", () => { leerCarrito(); count(); });
function count() {
  leerCarrito();
  const n = cart.reduce((a, l) => a + l.qty, 0);
  $("#cartCount").textContent = n; $("#tabCount").textContent = n; $("#tabCount").hidden = n === 0;
}
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => t.hidden = true, 2600); }
count();

function noEncontrado() {
  $("#pp").outerHTML = `<div class="nf"><img src="img/bulldog.webp" alt=""><h2>Producto no disponible</h2>
    <p class="hint">Puede que ya no esté en la tienda.</p><a class="btn solid" href="./#tienda">Ver productos</a></div>`;
}

// lo que el cliente escogió se mantiene aunque la página se actualice al terminar de cargar
const sel = { talla: null, qty: 1 };
let pintado = false;
async function iniciar() {
  if (!id) return noEncontrado();
  let p;
  // muestra al instante desde lo guardado en la tienda
  try {
    const c = JSON.parse(localStorage.getItem("repx-prod-cache") || "null");
    const prev = c?.find(x => x.id === id);
    if (prev) { document.title = `${prev.nombre} · REPX`; pintar(prev, prev.foto ? [prev.foto] : []); }
  } catch (e) {}
  try {
    p = await obtener("productos", id);
    if (!p) return noEncontrado();
    recordar(p);
  } catch (e) {
    if (pintado) { toast("Sin conexión: puede que el stock no esté al día"); return; }
    $("#pp").innerHTML = `<div class="nf"><img src="img/bulldog.webp" alt=""><h2>Sin conexión</h2><p class="hint">No pudimos cargar el producto. Revisa tu internet y vuelve a intentar.</p><button class="btn solid" type="button" onclick="location.reload()">Reintentar</button></div>`; return;
  }
  document.title = `${p.nombre} · REPX`;
  let fotos = p.foto ? [p.foto] : [];
  try {
    const g = await obtener("galerias", id);
    if (g?.fotos?.length) fotos = g.fotos;
  } catch (e) {}
  pintar(p, fotos);
}

function pintar(p, fotos) {
  pintado = true;
  const out = estaAgotado(p);
  const tallas = p.tallas || [];
  if (sel.talla && !tallas.some(t => t.t === sel.talla && t.stock > 0)) { sel.talla = null; sel.qty = 1; }
  $("#pp").innerHTML = `
    <div class="gal">
      <div style="position:relative">
        <div class="slides" id="slides">${fotos.map((f, i) => `<img src="${f}" alt="${esc(p.nombre)}, foto ${i + 1}">`).join("")}</div>
        ${fotos.length > 1 ? `<span class="gal-count" id="galCount">1 / ${fotos.length}</span>
          <button class="gal-nav prev" type="button" id="prev" aria-label="Foto anterior">‹</button>
          <button class="gal-nav next" type="button" id="next" aria-label="Foto siguiente">›</button>` : ""}
        ${out ? `<span class="tag out" style="z-index:2;left:12px;top:12px">Agotado</span>` : ""}
      </div>
      ${fotos.length > 1 ? `<div class="thumbs" id="thumbs">${fotos.map((f, i) => `<button type="button" data-i="${i}" aria-label="Ver foto ${i + 1}" aria-current="${i === 0}"><img src="${f}" alt=""></button>`).join("")}</div>` : ""}
    </div>
    <div class="info">
      <span class="label">${[{ hombre: "Hombre", mujer: "Mujer" }[p.categoria], tipoDe(p)].filter(Boolean).join(" · ") || "REPX"}</span>
      <h1>${esc(p.nombre)}</h1>
      <span class="big-price">${dinero(p.precio)}</span>
      ${p.descripcion ? `<p class="desc">${esc(p.descripcion)}</p>` : ""}
      <div class="buy">
        <div class="field"><span class="label">Talla</span>
          <div class="sizes" id="sizes">${tallas.map(t => `<button type="button" aria-pressed="${sel.talla === t.t}" data-t="${esc(t.t)}" ${out || t.stock <= 0 ? "disabled" : ""}>${esc(t.t)}</button>`).join("")}</div>
          <p class="stock-note" id="stockNote">${out ? "Este producto está agotado por ahora." : "Elige tu talla para ver cuántas quedan."}</p>
        </div>
        <div class="field"><span class="label">Cantidad</span>
          <div class="qty-big"><button type="button" id="qMenos" aria-label="Menos">−</button><span id="qNum">${sel.qty}</span><button type="button" id="qMas" aria-label="Más">+</button></div>
        </div>
        <button class="btn solid" type="button" id="add" ${out ? "disabled" : ""}>${out ? "Agotado" : "Agregar al carrito"}</button>
        <button class="btn plum" type="button" id="buy" ${out ? "disabled" : ""}>Comprar ahora</button>
      </div>
      <div class="facts">
        <div><span>Entrega</span><span>Pickup o delivery. Coordinamos por WhatsApp.</span></div>
        <div><span>Pago</span><span>${METODOS_PAGO.join(" · ")}</span></div>
        <div><span>Pedido</span><span>Se confirma por WhatsApp al 0412-6133198.</span></div>
      </div>
    </div>`;

  // galería
  const slides = $("#slides");
  const ir = i => slides.scrollTo({ left: i * slides.clientWidth, behavior: "smooth" });
  let actual = 0;
  slides.addEventListener("scroll", () => {
    const i = Math.round(slides.scrollLeft / slides.clientWidth);
    if (i === actual) return;
    actual = i;
    if ($("#galCount")) $("#galCount").textContent = `${i + 1} / ${fotos.length}`;
    document.querySelectorAll("#thumbs button").forEach((b, k) => b.setAttribute("aria-current", k === i));
  }, { passive: true });
  $("#thumbs")?.addEventListener("click", e => { const b = e.target.closest("button"); if (b) ir(+b.dataset.i); });
  $("#prev")?.addEventListener("click", () => ir(Math.max(0, actual - 1)));
  $("#next")?.addEventListener("click", () => ir(Math.min(fotos.length - 1, actual + 1)));

  // talla y cantidad
  let talla = sel.talla, qty = sel.qty;
  const stockDe = t => tallas.find(x => x.t === t)?.stock || 0;
  const enCarrito = t => cart.filter(l => l.id === p.id && l.talla === t).reduce((a, l) => a + l.qty, 0);
  const pintarQty = () => { $("#qNum").textContent = qty; sel.talla = talla; sel.qty = qty; };
  const nota = () => {
    const note = $("#stockNote"); if (!talla) return;
    const st = stockDe(talla);
    note.textContent = st <= 3 ? `Quedan ${st} en talla ${talla}.` : `Disponible en talla ${talla}.`;
    note.classList.toggle("low", st <= 3);
  };
  nota();
  $("#sizes").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b || b.disabled) return;
    talla = b.dataset.t; qty = 1; pintarQty();
    $("#sizes").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
    nota();
  });
  $("#qMenos").addEventListener("click", () => { qty = Math.max(1, qty - 1); pintarQty(); });
  $("#qMas").addEventListener("click", () => {
    if (!talla) { toast("Elige una talla primero"); return; }
    leerCarrito();
    const max = stockDe(talla) - enCarrito(talla);
    if (qty + 1 > max) { toast(`Solo quedan ${stockDe(talla)} en talla ${talla}`); return; }
    qty++; pintarQty();
  });
  const agregar = () => {
    if (!talla) { toast("Elige una talla primero"); return false; }
    leerCarrito();
    const max = stockDe(talla) - enCarrito(talla);
    if (qty > max) { toast(max > 0 ? `Solo puedes agregar ${max} más en talla ${talla}` : `Ya tienes todas las de talla ${talla} en tu carrito`); return false; }
    const ex = cart.find(l => l.id === p.id && l.talla === talla);
    ex ? ex.qty += qty : cart.push({ id: p.id, talla, qty });
    save(); count();
    return true;
  };
  $("#add").addEventListener("click", () => {
    const n = qty;
    if (agregar()) { toast(`${n} × ${p.nombre} (${talla}) agregado`); qty = 1; pintarQty(); }
  });
  $("#buy").addEventListener("click", () => {
    if (!talla) { toast("Elige una talla primero"); return; }
    leerCarrito();
    // si ya tienes todas las de esa talla en el carrito, igual te lleva a pagar
    if (agregar() || enCarrito(talla) > 0) location.href = "./#carrito";
  });
}

iniciar();
