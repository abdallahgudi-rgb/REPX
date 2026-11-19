import { WHATSAPP_REPX, METODOS_PAGO, FAMILIAS, tipoDe, familiaDe, sinonimosDe, dinero, codigo, esc, stockTotal, estaAgotado } from "./comun.js";
import { listar, crear } from "./rest.js";

const $ = s => document.querySelector(s);
let productos = [];
let filtro = "todo", familia = "", tipo = "", busqueda = "";
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const raiz = w => w.length > 4 && w.endsWith("es") ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w;
// El carrito se guarda en el teléfono. Siempre se vuelve a leer antes de usarlo,
// para no perder lo agregado desde otra página o al volver atrás.
let cart = [];
function leerCarrito() {
  try { const c = JSON.parse(localStorage.getItem("repx-cart2") || "[]"); cart = Array.isArray(c) ? c.filter(l => l && l.id && l.talla && l.qty > 0) : []; }
  catch (e) { cart = []; }
  return cart;
}
leerCarrito();
const save = () => { try { localStorage.setItem("repx-cart2", JSON.stringify(cart)); } catch (e) {} };

$("#ticker").innerHTML = Array(2).fill('No excuses<img class="t-dog" src="img/bulldog.webp" alt="">Just REPX<img class="t-dog" src="img/bulldog.webp" alt=""><img class="t-logo" src="img/logo-repx.png" alt=""><img class="t-dog" src="img/bulldog.webp" alt="">Relentless<img class="t-dog" src="img/bulldog.webp" alt="">Built different<img class="t-dog" src="img/bulldog.webp" alt=""><img class="t-logo" src="img/logo-repx.png" alt=""><img class="t-dog" src="img/bulldog.webp" alt="">').join("");
$("#payList").innerHTML = METODOS_PAGO.map(m => `<span>${m}</span>`).join("");

/* ---------- productos ---------- */
const ordenar = l => l.filter(p => p.visible !== false)
  .sort((a, b) => (estaAgotado(a) - estaAgotado(b)) || ((b.creado?.seconds || 0) - (a.creado?.seconds || 0)));
let cargado = false; // true cuando ya llegó la lista actualizada de internet
// Ajusta el carrito SOLO con la lista actualizada (nunca con la guardada, que puede estar vieja)
function ajustarCarrito() {
  leerCarrito();
  const antes = cart.reduce((a, l) => a + l.qty, 0);
  const avisos = [];
  cart = cart.filter(l => {
    const p = prod(l.id);
    if (!p) { avisos.push("Un producto ya no está disponible"); return false; }
    const st = Number(p.tallas?.find(t => t.t === l.talla)?.stock) || 0;
    if (estaAgotado(p) || st <= 0) { avisos.push(`${p.nombre} (${l.talla}) se agotó`); return false; }
    if (l.qty > st) { l.qty = st; avisos.push(`Solo quedan ${st} de ${p.nombre} (${l.talla})`); }
    return true;
  });
  if (cart.reduce((a, l) => a + l.qty, 0) !== antes) { save(); if (avisos.length) toast(avisos[0]); }
}
function listo(fresco) {
  if (fresco) { cargado = true; ajustarCarrito(); }
  count(); render();
  if (!$("#cart").hidden) renderCart();
}
async function cargar() {
  // 1) muestra al instante lo que se vio la última vez
  try {
    const c = JSON.parse(localStorage.getItem("repx-prod-cache") || "null");
    if (c?.length) { productos = ordenar(c); listo(); }
  } catch (e) {}
  // 2) trae lo más reciente
  try {
    const frescos = ordenar(await listar("productos"));
    productos = frescos; listo(true);
    try { localStorage.setItem("repx-prod-cache", JSON.stringify(frescos)); } catch (e) {}
  } catch (e) {
    if (!productos.length) $("#grid").innerHTML = `<div class="empty"><p>No pudimos cargar los productos. Revisa tu conexión y recarga la página.</p></div>`;
  }
}
function pintarTipos() {
  const delGenero = productos.filter(p => filtro === "todo" || p.categoria === filtro);
  const fams = FAMILIAS.filter(x => delGenero.some(p => familiaDe(p) === x.f));
  if (familia && !fams.some(x => x.f === familia)) { familia = ""; tipo = ""; }
  $("#tipos").innerHTML = fams.length ? [`<button type="button" data-fam="" aria-pressed="${!familia}">Todo</button>`,
    ...fams.map(x => `<button type="button" data-fam="${x.f}" aria-pressed="${familia === x.f}">${x.f}</button>`)].join("") : "";
  const subs = familia ? FAMILIAS.find(x => x.f === familia).tipos.filter(tp => delGenero.some(p => tipoDe(p) === tp)) : [];
  if (tipo && !subs.includes(tipo)) tipo = "";
  $("#subtipos").innerHTML = subs.length > 1 ? [`<button type="button" data-t="" aria-pressed="${!tipo}">Todos</button>`,
    ...subs.map(x => `<button type="button" data-t="${x}" aria-pressed="${tipo === x}">${x}</button>`)].join("") : "";
}
let ampliada = false; // true si la búsqueda directa no encontró nada y se usan palabras parecidas
function coincide(p) {
  if (!busqueda) return true;
  const gen = { hombre: "hombre caballero", mujer: "mujer dama" }[p.categoria] || "";
  const texto = norm([p.nombre, tipoDe(p), familiaDe(p), p.descripcion, gen, ampliada ? sinonimosDe(p) : ""].join(" "));
  return norm(busqueda).split(/\s+/).filter(Boolean).every(w => texto.includes(raiz(w)));
}
function render() {
  pintarTipos();
  const filtrar = () => productos.filter(p => (filtro === "todo" || p.categoria === filtro)
    && (!familia || familiaDe(p) === familia) && (!tipo || tipoDe(p) === tipo) && coincide(p));
  ampliada = false;
  let lista = filtrar();
  if (!lista.length && busqueda) { ampliada = true; lista = filtrar(); }
  if (!lista.length) {
    const msg = !productos.length ? "Muy pronto vas a ver los productos aquí."
      : busqueda ? `No encontramos "${esc(busqueda)}". Prueba con otra palabra, como franela, jogger o short.`
      : "No hay productos con ese filtro por ahora.";
    $("#grid").innerHTML = `<div class="empty"><img src="img/bulldog.webp" alt=""><p>${msg}</p>${busqueda || familia || filtro !== "todo" ? `<button class="btn" type="button" id="verTodo">Ver todo</button>` : ""}</div>`;
    $("#verTodo")?.addEventListener("click", limpiarFiltros);
    return;
  }
  $("#grid").innerHTML = lista.map(p => {
    const out = estaAgotado(p);
    const tallas = (p.tallas || []).filter(t => t.stock > 0).map(t => t.t);
    return `<a class="card${out ? " out" : ""}" href="producto.html?id=${encodeURIComponent(p.id)}">
      <div class="ph">${p.foto ? `<img src="${p.foto}" alt="${esc(p.nombre)}" loading="lazy">` : ""}${out ? `<span class="tag out">Agotado</span>` : ""}</div>
      <div class="row"><h3>${esc(p.nombre)}</h3><span class="price">${dinero(p.precio)}</span></div>
      <span class="meta">${tipoDe(p) ? esc(tipoDe(p)) + " · " : ""}${out ? "Sin disponibilidad" : "Tallas " + esc(tallas.join(" · "))}</span>
    </a>`;
  }).join("");
}
document.querySelectorAll("#genero button").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll("#genero button").forEach(x => x.setAttribute("aria-pressed", x === b));
  filtro = b.dataset.f; render();
}));
$("#tipos").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; familia = b.dataset.fam; tipo = ""; render(); });
$("#subtipos").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; tipo = b.dataset.t; render(); });
let tq;
$("#q").addEventListener("input", () => {
  $("#qClear").hidden = !$("#q").value;
  clearTimeout(tq); tq = setTimeout(() => { busqueda = $("#q").value.trim(); render(); }, 150);
});
$("#q").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); $("#q").blur(); } });
$("#qClear").addEventListener("click", () => { $("#q").value = ""; $("#qClear").hidden = true; busqueda = ""; render(); $("#q").focus(); });
function limpiarFiltros() {
  busqueda = ""; familia = ""; tipo = ""; filtro = "todo"; $("#q").value = ""; $("#qClear").hidden = true;
  document.querySelectorAll("#genero button").forEach(x => x.setAttribute("aria-pressed", x.dataset.f === "todo"));
  render();
}

/* ---------- paneles ---------- */
function open(id) { $("#scrim").hidden = false; $(id).hidden = false; }
function closeAll() { $("#scrim").hidden = true; $("#cart").hidden = true; }
document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeAll));
$("#scrim").addEventListener("click", closeAll);
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeAll(); cerrarInstalar(); } });
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => t.hidden = true, 2400); }

/* ---------- carrito y pedido ---------- */
const prod = id => productos.find(p => p.id === id);
function count() {
  leerCarrito();
  const n = cart.reduce((a, l) => a + l.qty, 0);
  $("#cartCount").textContent = n; $("#tabCount").textContent = n; $("#tabCount").hidden = n === 0;
}
const total = () => cart.reduce((a, l) => a + l.qty * (prod(l.id)?.precio || 0), 0);
let datos = { nombre: "", telefono: "", envio: "pickup", zona: "", pago: METODOS_PAGO[0], nota: "" };
try { datos = { ...datos, ...JSON.parse(localStorage.getItem("repx-datos") || "{}") }; } catch (e) {}

function renderCart() {
  leerCarrito();
  const body = $("#cartBody"), foot = $("#cartFoot");
  if (!cart.length) {
    body.innerHTML = `<div class="empty"><img src="img/bulldog.webp" alt=""><p>Tu carrito está vacío.</p><button class="btn" type="button" data-close>Ver productos</button></div>`;
    body.querySelector("[data-close]").addEventListener("click", closeAll);
    foot.hidden = true; return;
  }
  foot.hidden = false;
  const faltan = cart.some(l => !prod(l.id));
  body.innerHTML = cart.map((l, i) => {
    const p = prod(l.id);
    if (!p) return `<div class="line"><span></span><div><h4>Cargando producto…</h4><span class="label">Talla ${esc(l.talla)} · ${l.qty} ud.</span></div><span></span></div>`;
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
    leerCarrito();
    const l = cart[b.dataset.i]; if (!l || !prod(l.id)) return;
    const st = prod(l.id).tallas?.find(t => t.t === l.talla)?.stock || 0;
    if (+b.dataset.d > 0 && l.qty >= st) { toast(`Solo quedan ${st} en talla ${l.talla}`); return; }
    l.qty += +b.dataset.d;
    if (l.qty <= 0) cart.splice(b.dataset.i, 1);
    save(); count(); leer(); renderCart();
  }));
  body.querySelectorAll('input[name="envio"]').forEach(r => r.addEventListener("change", () => {
    $("#deliveryBox").hidden = r.value !== "delivery" || !r.checked;
    $("#pickupNote").hidden = r.value !== "pickup" || !r.checked;
  }));
  const espera = faltan && !cargado;
  foot.innerHTML = `<div class="total"><span>Total</span><span class="price">${espera ? "…" : dinero(total())}</span></div>
    <button class="btn plum" type="button" id="sendOrder" ${espera ? "disabled" : ""}>${espera ? "Cargando productos…" : "Hacer pedido por WhatsApp"}</button>`;
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
    "No excuses. Just REPX.",
  ].join("\n");
}
async function enviar() {
  leer();
  leerCarrito();
  if (!cart.length || cart.some(l => !prod(l.id))) { renderCart(); return; }
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
    const ref = await crear("pedidos", {
      estado: "pendiente", origen: "web", items, total: total(),
      cliente: { nombre: datos.nombre, telefono: datos.telefono },
      envio: datos.envio, zona: datos.envio === "delivery" ? datos.zona : "",
      pago: datos.pago, nota: datos.nota, creado: new Date(),
    });
    const url = `https://wa.me/${WHATSAPP_REPX}?text=${encodeURIComponent(mensaje(ref.id))}`;
    cart = []; save(); count();
    $("#cartBody").innerHTML = `<div class="empty"><img src="img/bulldog.webp" alt=""><h2 style="font-size:36px">Pedido #${codigo(ref.id)}</h2>
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
function abrirCarrito() { renderCart(); open("#cart"); }
$("#openCart").addEventListener("click", abrirCarrito);
$("#tabCart").addEventListener("click", abrirCarrito);
if (location.hash === "#carrito") { abrirCarrito(); history.replaceState(null, "", location.pathname); }
// al volver atrás o cambiar de pestaña, actualiza el carrito
addEventListener("pageshow", () => { count(); if (!$("#cart").hidden) renderCart(); });
addEventListener("storage", e => { if (e.key === "repx-cart2") { count(); if (!$("#cart").hidden) renderCart(); } });

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
} else if (!visto && !location.hash) {
  setTimeout(() => { if ($("#cart").hidden) abrirInstalar(); }, 1500);
}
const tabs = [...document.querySelectorAll(".tabbar a")];
addEventListener("scroll", () => {
  const enTienda = $("#tienda").getBoundingClientRect().top < innerHeight * 0.5;
  tabs[0].classList.toggle("on", !enTienda); tabs[1].classList.toggle("on", enTienda);
}, { passive: true });
try { if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {}); } catch (e) {}

count();
cargar();
if (location.hash === "#app") { abrirInstalar(); history.replaceState(null, "", location.pathname); }
