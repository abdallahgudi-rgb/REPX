import { db, WHATSAPP_REPX, METODOS_PAGO, dinero, codigo, esc, stockTotal, estaAgotado } from "./firebase.js";
import { collection, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = s => document.querySelector(s);
let productos = [];
let filtro = "todo";
let cart = [];
try { cart = JSON.parse(localStorage.getItem("repx-cart2") || "[]"); } catch (e) { cart = []; }
const save = () => { try { localStorage.setItem("repx-cart2", JSON.stringify(cart)); } catch (e) {} };

$("#ticker").innerHTML = Array(2).fill("No excuses<i>✕</i>Just reps<i>✕</i>Relentless<i>✕</i>Built different<i>✕</i>").join("");
$("#payList").innerHTML = METODOS_PAGO.map(m => `<span>${m}</span>`).join("");

/* ---------- productos ---------- */
async function cargar() {
  try {
    const snap = await getDocs(collection(db, "productos"));
    productos = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(p => p.visible !== false)
      .sort((a, b) => (estaAgotado(a) - estaAgotado(b)) || ((b.creado?.seconds || 0) - (a.creado?.seconds || 0)));
    // limpia del carrito lo que ya no existe
    cart = cart.filter(l => productos.some(p => p.id === l.id));
    save(); count(); render();
  } catch (e) {
    $("#grid").innerHTML = `<div class="empty"><p>No pudimos cargar los productos. Revisa tu conexión y recarga la página.</p></div>`;
  }
}
function render() {
  const lista = productos.filter(p => filtro === "todo" || p.categoria === filtro);
  if (!lista.length) {
    $("#grid").innerHTML = `<div class="empty"><img src="img/bulldog.png" alt=""><p>${productos.length ? "No hay productos en esta categoría por ahora." : "Muy pronto vas a ver los productos aquí."}</p></div>`;
    return;
  }
  $("#grid").innerHTML = lista.map(p => {
    const out = estaAgotado(p);
    const tallas = (p.tallas || []).filter(t => t.stock > 0).map(t => t.t);
    return `<button class="card${out ? " out" : ""}" type="button" data-id="${p.id}">
      <div class="ph">${p.foto ? `<img src="${p.foto}" alt="${esc(p.nombre)}" loading="lazy">` : ""}${out ? `<span class="tag out">Agotado</span>` : ""}</div>
      <div class="row"><h3>${esc(p.nombre)}</h3><span class="price">${dinero(p.precio)}</span></div>
      <span class="meta">${out ? "Sin disponibilidad" : "Tallas " + esc(tallas.join(" · "))}</span>
    </button>`;
  }).join("");
}
document.querySelectorAll(".chips button").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll(".chips button").forEach(x => x.setAttribute("aria-pressed", x === b));
  filtro = b.dataset.f; render();
}));

/* ---------- paneles ---------- */
function open(id) { $("#scrim").hidden = false; $(id).hidden = false; }
function closeAll() { $("#scrim").hidden = true; $("#product").hidden = true; $("#cart").hidden = true; }
document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeAll));
$("#scrim").addEventListener("click", closeAll);
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeAll(); cerrarInstalar(); } });
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => t.hidden = true, 2400); }

/* ---------- ficha de producto ---------- */
let actual = null, talla = null;
$("#grid").addEventListener("click", e => {
  const c = e.target.closest(".card[data-id]"); if (!c) return;
  actual = productos.find(p => p.id === c.dataset.id); talla = null;
  const out = estaAgotado(actual);
  $("#pdCat").textContent = { hombre: "Hombre", mujer: "Mujer" }[actual.categoria] || "";
  $("#pdImg").src = actual.foto || ""; $("#pdImg").alt = actual.nombre; $("#pdImg").hidden = !actual.foto;
  $("#pdTitle").textContent = actual.nombre; $("#pdDesc").textContent = actual.descripcion || "";
  $("#pdPrice").textContent = dinero(actual.precio);
  $("#pdSizes").innerHTML = (actual.tallas || []).map(t =>
    `<button type="button" aria-pressed="false" data-t="${esc(t.t)}" ${out || t.stock <= 0 ? "disabled" : ""}>${esc(t.t)}</button>`).join("");
  $("#pdStock").textContent = out ? "Este producto está agotado por ahora." : "";
  $("#pdAdd").textContent = out ? "Agotado" : "Elige una talla";
  $("#pdAdd").disabled = out;
  open("#product");
});
$("#pdSizes").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  talla = b.dataset.t;
  $("#pdSizes").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
  const st = actual.tallas.find(t => t.t === talla).stock;
  $("#pdStock").textContent = st <= 3 ? `Quedan ${st} en talla ${talla}.` : "";
  $("#pdAdd").textContent = "Agregar al carrito";
});
$("#pdAdd").addEventListener("click", () => {
  if (!talla) { toast("Elige una talla primero"); return; }
  const st = actual.tallas.find(t => t.t === talla)?.stock || 0;
  const ex = cart.find(l => l.id === actual.id && l.talla === talla);
  if ((ex?.qty || 0) + 1 > st) { toast(`Solo quedan ${st} en talla ${talla}`); return; }
  ex ? ex.qty++ : cart.push({ id: actual.id, talla, qty: 1 });
  save(); count(); closeAll(); toast(`${actual.nombre} (${talla}) agregado`);
});

/* ---------- carrito y pedido ---------- */
const prod = id => productos.find(p => p.id === id);
function count() {
  const n = cart.reduce((a, l) => a + l.qty, 0);
  $("#cartCount").textContent = n; $("#tabCount").textContent = n; $("#tabCount").hidden = n === 0;
}
const total = () => cart.reduce((a, l) => a + l.qty * (prod(l.id)?.precio || 0), 0);
let datos = { nombre: "", telefono: "", envio: "pickup", zona: "", pago: METODOS_PAGO[0], nota: "" };
try { datos = { ...datos, ...JSON.parse(localStorage.getItem("repx-datos") || "{}") }; } catch (e) {}

function renderCart() {
  const body = $("#cartBody"), foot = $("#cartFoot");
  if (!cart.length) {
    body.innerHTML = `<div class="empty"><img src="img/bulldog.png" alt=""><p>Tu carrito está vacío.</p><button class="btn" type="button" data-close>Ver productos</button></div>`;
    body.querySelector("[data-close]").addEventListener("click", closeAll);
    foot.hidden = true; return;
  }
  foot.hidden = false;
  body.innerHTML = cart.map((l, i) => {
    const p = prod(l.id);
    return `<div class="line">${p.foto ? `<img src="${p.foto}" alt="">` : "<span></span>"}<div><h4>${esc(p.nombre)}</h4><span class="label">Talla ${esc(l.talla)}</span><br>
      <span class="qty"><button type="button" data-i="${i}" data-d="-1" aria-label="Quitar uno">−</button><span>${l.qty}</span><button type="button" data-i="${i}" data-d="1" aria-label="Agregar uno">+</button></span></div>
      <span class="price">${dinero(p.precio * l.qty)}</span></div>`;
  }).join("") + `
    <div class="field"><label class="label" for="cNombre">Tu nombre</label><input id="cNombre" autocomplete="name" value="${esc(datos.nombre)}" placeholder="Nombre y apellido" required></div>
    <div class="field"><label class="label" for="cTel">Tu teléfono</label><input id="cTel" type="tel" inputmode="tel" autocomplete="tel" value="${esc(datos.telefono)}" placeholder="0412 000 0000" required></div>
    <div class="field"><span class="label">Entrega</span>
      <div class="opts">
        <label><input type="radio" name="envio" id="eP" value="pickup" ${datos.envio === "pickup" ? "checked" : ""}> Pickup</label>
        <label><input type="radio" name="envio" id="eD" value="delivery" ${datos.envio === "delivery" ? "checked" : ""}> Delivery</label>
      </div></div>
    <div id="deliveryBox" class="field" ${datos.envio === "delivery" ? "" : "hidden"}>
      <label class="label" for="cZona">Zona o dirección</label><input id="cZona" value="${esc(datos.zona)}" placeholder="Ej. Los Palos Grandes, Caracas">
      <p class="note">Al enviar el pedido por WhatsApp, mándanos tu ubicación en el mismo chat.</p></div>
    <p class="note" id="pickupNote" ${datos.envio === "pickup" ? "" : "hidden"}>Te escribimos por WhatsApp para coordinar el punto y la hora de pickup.</p>
    <div class="field"><span class="label">Método de pago</span>
      <div class="opts">${METODOS_PAGO.map((m, i) => `<label><input type="radio" name="pago" id="pg${i}" value="${m}" ${datos.pago === m ? "checked" : ""}> ${m}</label>`).join("")}</div>
      <p class="hint">Te enviamos los datos para pagar por WhatsApp.</p></div>
    <div class="field"><label class="label" for="cNota">Nota (opcional)</label><input id="cNota" value="${esc(datos.nota)}" placeholder="Ej. color, hora de entrega"></div>
    <p class="err" id="cErr" hidden></p>`;
  body.querySelectorAll(".qty button").forEach(b => b.addEventListener("click", () => {
    const l = cart[b.dataset.i], st = prod(l.id).tallas.find(t => t.t === l.talla)?.stock || 0;
    if (+b.dataset.d > 0 && l.qty >= st) { toast(`Solo quedan ${st} en talla ${l.talla}`); return; }
    l.qty += +b.dataset.d;
    if (l.qty <= 0) cart.splice(b.dataset.i, 1);
    save(); count(); leer(); renderCart();
  }));
  body.querySelectorAll('input[name="envio"]').forEach(r => r.addEventListener("change", () => {
    $("#deliveryBox").hidden = r.value !== "delivery" || !r.checked;
    $("#pickupNote").hidden = r.value !== "pickup" || !r.checked;
  }));
  foot.innerHTML = `<div class="total"><span>Total</span><span class="price">${dinero(total())}</span></div>
    <button class="btn plum" type="button" id="sendOrder">Hacer pedido por WhatsApp</button>`;
  $("#sendOrder").addEventListener("click", enviar);
}
function leer() {
  if (!$("#cNombre")) return;
  datos = {
    nombre: $("#cNombre").value.trim(), telefono: $("#cTel").value.trim(),
    envio: document.querySelector('input[name="envio"]:checked')?.value || "pickup",
    zona: $("#cZona").value.trim(),
    pago: document.querySelector('input[name="pago"]:checked')?.value || METODOS_PAGO[0],
    nota: $("#cNota").value.trim(),
  };
  try { localStorage.setItem("repx-datos", JSON.stringify(datos)); } catch (e) {}
}
function mensaje(id) {
  const lineas = cart.map(l => { const p = prod(l.id); return `• ${l.qty} × ${p.nombre} (talla ${l.talla}) — ${dinero(p.precio * l.qty)}`; });
  return [
    `*REPX* · Pedido #${codigo(id)}`,
    "",
    ...lineas,
    `*Total: ${dinero(total())}*`,
    "",
    `Nombre: ${datos.nombre}`,
    `Teléfono: ${datos.telefono}`,
    datos.envio === "delivery" ? `Entrega: Delivery${datos.zona ? " · " + datos.zona : ""}` : "Entrega: Pickup",
    `Pago: ${datos.pago}`,
    ...(datos.nota ? [`Nota: ${datos.nota}`] : []),
    "",
    datos.envio === "delivery" ? "Les envío mi ubicación por aquí 📍" : "¿Dónde y cuándo puedo retirar?",
    "No excuses. Just reps.",
  ].join("\n");
}
async function enviar() {
  leer();
  const err = $("#cErr");
  const faltan = [];
  if (!datos.nombre) faltan.push("tu nombre");
  if (datos.telefono.replace(/\D/g, "").length < 10) faltan.push("un teléfono válido");
  if (datos.envio === "delivery" && !datos.zona) faltan.push("tu zona o dirección");
  if (faltan.length) { err.textContent = "Falta " + faltan.join(", ") + "."; err.hidden = false; return; }
  err.hidden = true;
  const btn = $("#sendOrder"); btn.disabled = true; btn.textContent = "Enviando…";
  try {
    const items = cart.map(l => { const p = prod(l.id); return { id: l.id, nombre: p.nombre, talla: l.talla, qty: l.qty, precio: Number(p.precio) }; });
    const ref = await addDoc(collection(db, "pedidos"), {
      estado: "pendiente", origen: "web", items, total: total(),
      cliente: { nombre: datos.nombre, telefono: datos.telefono },
      envio: datos.envio, zona: datos.envio === "delivery" ? datos.zona : "",
      pago: datos.pago, nota: datos.nota, creado: serverTimestamp(),
    });
    const url = `https://wa.me/${WHATSAPP_REPX}?text=${encodeURIComponent(mensaje(ref.id))}`;
    cart = []; save(); count();
    $("#cartBody").innerHTML = `<div class="empty"><img src="img/bulldog.png" alt=""><h2 style="font-size:36px">Pedido #${codigo(ref.id)}</h2>
      <p>Ya lo recibimos. Ahora envíalo por WhatsApp para confirmar el pago y la entrega.</p>
      <a class="btn plum" href="${url}" target="_blank" rel="noopener">Abrir WhatsApp</a>
      <p class="hint">Si WhatsApp no abre, escríbenos al 0412-6133198 con tu número de pedido.</p></div>`;
    $("#cartFoot").hidden = true;
    location.href = url;
  } catch (e) {
    err.textContent = "No se pudo enviar el pedido. Revisa tu conexión e intenta de nuevo."; err.hidden = false;
    btn.disabled = false; btn.textContent = "Hacer pedido por WhatsApp";
  }
}
$("#openCart").addEventListener("click", () => { renderCart(); open("#cart"); });
$("#tabCart").addEventListener("click", () => { renderCart(); open("#cart"); });

/* ---------- app instalable ---------- */
let installEvt = null;
const ua = navigator.userAgent;
const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isAndroid = /android/i.test(ua);
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
if (isIOS) $("#stepsAndroid").hidden = true;
if (isAndroid) $("#stepsIos").hidden = true;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; $("#doInstall").hidden = false; });
$("#doInstall").addEventListener("click", async () => {
  if (!installEvt) return;
  installEvt.prompt();
  try { const r = await installEvt.userChoice; if (r.outcome === "accepted") { cerrarInstalar(); toast("App instalada"); } } catch (e) {}
  installEvt = null; $("#doInstall").hidden = true;
});
function abrirInstalar() { $("#install").hidden = false; }
function cerrarInstalar() { $("#install").hidden = true; try { localStorage.setItem("repx-aviso-app", "1"); } catch (e) {} }
$("#instClose").addEventListener("click", cerrarInstalar);
$("#install").addEventListener("click", e => { if (e.target.id === "install") cerrarInstalar(); });
$("#tabInstall").addEventListener("click", abrirInstalar);
let visto = false;
try { visto = localStorage.getItem("repx-aviso-app") === "1"; } catch (e) {}
if (standalone) {
  $("#tabInstall").hidden = true; document.querySelector(".tabbar").style.gridTemplateColumns = "repeat(3, 1fr)";
} else if (!visto) {
  setTimeout(abrirInstalar, 1200);
}
const tabs = [...document.querySelectorAll(".tabbar a")];
addEventListener("scroll", () => {
  const enTienda = $("#tienda").getBoundingClientRect().top < innerHeight * 0.5;
  tabs[0].classList.toggle("on", !enTienda); tabs[1].classList.toggle("on", enTienda);
}, { passive: true });
try { if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {}); } catch (e) {}

count();
cargar();
