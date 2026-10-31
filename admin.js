import { db, auth, ADMINS, METODOS_PAGO, dinero, codigo, telWa, esc, stockTotal } from "./firebase.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, doc, onSnapshot, query, orderBy, limit, where, addDoc, setDoc, updateDoc, deleteDoc, getDoc,
  runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = s => document.querySelector(s);
const toast = msg => { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => t.hidden = true, 2600); };
const fecha = ts => ts?.toDate ? ts.toDate().toLocaleString("es-VE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "ahora";
const mesDe = ts => { const d = ts?.toDate ? ts.toDate() : new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const nombreMes = m => { const [y, mm] = m.split("-"); return new Date(+y, +mm - 1, 1).toLocaleString("es-VE", { month: "long", year: "numeric" }); };

let productos = [], pedidos = [], pagados = [];
let unsubs = [];

/* ---------------- acceso ---------------- */
onAuthStateChanged(auth, user => {
  unsubs.forEach(u => u()); unsubs = [];
  const ok = user && ADMINS.includes((user.email || "").toLowerCase());
  if (user && !ok) { signOut(auth); mostrarError("Este correo no tiene acceso al panel."); }
  $("#loginView").hidden = !!ok; $("#appView").hidden = !ok;
  if (ok) { $("#whoEmail").textContent = user.email; iniciar(); }
});
function mostrarError(m) { const e = $("#lErr"); e.textContent = m; e.hidden = false; }
$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  $("#lErr").hidden = true; $("#lBtn").disabled = true; $("#lBtn").textContent = "Entrando…";
  try { await signInWithEmailAndPassword(auth, $("#lEmail").value.trim(), $("#lPass").value); }
  catch (err) {
    mostrarError(/invalid-credential|wrong-password|user-not-found|invalid-email/.test(err.code || "")
      ? "Correo o contraseña incorrectos." : err.code === "auth/too-many-requests"
      ? "Demasiados intentos. Espera unos minutos y vuelve a probar." : "No se pudo entrar. Revisa tu conexión.");
  }
  $("#lBtn").disabled = false; $("#lBtn").textContent = "Entrar";
});
$("#lReset").addEventListener("click", async () => {
  const email = $("#lEmail").value.trim();
  if (!email) { mostrarError("Escribe tu correo arriba y vuelve a tocar el botón."); return; }
  try { await sendPasswordResetEmail(auth, email); toast("Te enviamos un correo para cambiar la contraseña"); }
  catch (e) { mostrarError("No se pudo enviar el correo. Revisa que esté bien escrito."); }
});
$("#logout").addEventListener("click", () => signOut(auth));

/* ---------------- pestañas ---------------- */
document.querySelectorAll(".tabs button").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll(".tabs button").forEach(x => x.setAttribute("aria-selected", x === b));
  ["pedidos", "productos", "ventas"].forEach(t => $("#tab-" + t).hidden = t !== b.dataset.tab);
}));
function abrir(id) { $("#scrim").hidden = false; $(id).hidden = false; }
function cerrar() { $("#scrim").hidden = true; document.querySelectorAll(".sheet").forEach(s => s.hidden = true); }
document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", cerrar));
$("#scrim").addEventListener("click", cerrar);

function iniciar() {
  unsubs.push(onSnapshot(collection(db, "productos"), s => {
    productos = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.creado?.seconds || 0) - (a.creado?.seconds || 0));
    renderProductos();
  }, e => toast("Error cargando productos")));
  unsubs.push(onSnapshot(query(collection(db, "pedidos"), orderBy("creado", "desc"), limit(300)), s => {
    pedidos = s.docs.map(d => ({ id: d.id, ...d.data() }));
    renderPedidos();
  }, e => toast("Error cargando pedidos")));
  unsubs.push(onSnapshot(query(collection(db, "pedidos"), where("estado", "==", "pagado")), s => {
    pagados = s.docs.map(d => ({ id: d.id, ...d.data() }));
    renderVentas();
  }));
}

/* ---------------- pedidos ---------------- */
let filtroPed = "pendiente";
document.querySelectorAll("#pedFiltro button").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll("#pedFiltro button").forEach(x => x.setAttribute("aria-pressed", x === b));
  filtroPed = b.dataset.f; renderPedidos();
}));
function renderPedidos() {
  const pend = pedidos.filter(p => p.estado === "pendiente").length;
  $("#pendCount").textContent = pend; $("#pendCount").hidden = !pend;
  const lista = pedidos.filter(p => filtroPed === "todos" || p.estado === filtroPed);
  if (!lista.length) {
    $("#pedidos").innerHTML = `<p class="hint">${{ pendiente: "No hay pedidos pendientes. Cuando alguien compre en la página, aparece aquí.", pagado: "Todavía no hay pedidos pagados.", cancelado: "No hay pedidos cancelados.", todos: "Todavía no hay pedidos." }[filtroPed]}</p>`;
    return;
  }
  $("#pedidos").innerHTML = lista.map(p => `
    <div class="item" data-id="${p.id}">
      <div class="item-head"><strong>#${codigo(p.id)} · ${dinero(p.total)}</strong><span class="pill ${p.estado}">${p.estado}</span></div>
      <ul>${(p.items || []).map(i => `<li>${i.qty} × ${esc(i.nombre)} (talla ${esc(i.talla)}) — ${dinero(i.precio * i.qty)}</li>`).join("")}</ul>
      <div class="kv">
        <span>Cliente: <b>${esc(p.cliente?.nombre || "—")}</b></span>
        ${p.cliente?.telefono ? `<span>Tel: <b>${esc(p.cliente.telefono)}</b></span>` : ""}
        <span>Entrega: <b>${p.envio === "delivery" ? "Delivery" + (p.zona ? " · " + esc(p.zona) : "") : p.envio === "pickup" ? "Pickup" : "—"}</b></span>
        <span>Pago: <b>${esc(p.pago || "—")}</b></span>
        <span>${p.origen === "manual" ? "Venta manual" : "Web"} · ${fecha(p.creado)}</span>
        ${p.nota ? `<span>Nota: <b>${esc(p.nota)}</b></span>` : ""}
      </div>
      <div class="actions">
        ${p.estado === "pendiente" ? `<button class="btn ok" data-a="pagar">Marcar pagado</button><button class="btn bad" data-a="cancelar">Cancelar</button>` : ""}
        ${p.estado === "pagado" ? `<button class="btn" data-a="pendiente">Volver a pendiente</button>` : ""}
        ${p.estado === "cancelado" ? `<button class="btn" data-a="pendiente">Reabrir</button><button class="btn bad" data-a="borrar">Eliminar</button>` : ""}
        ${p.cliente?.telefono ? `<a class="btn plum" target="_blank" rel="noopener" href="https://wa.me/${telWa(p.cliente.telefono)}?text=${encodeURIComponent(msgCliente(p))}">WhatsApp al cliente</a>` : ""}
      </div>
    </div>`).join("");
}
function msgCliente(p) {
  return [
    `Hola ${p.cliente?.nombre?.split(" ")[0] || ""}, te escribe *REPX* 💪`,
    `Recibimos tu pedido #${codigo(p.id)}:`,
    ...(p.items || []).map(i => `• ${i.qty} × ${i.nombre} (talla ${i.talla})`),
    `*Total: ${dinero(p.total)}*`,
    "",
    `Método de pago: ${p.pago}`,
    p.envio === "delivery" ? "Entrega: Delivery. Envíanos tu ubicación por aquí si aún no lo hiciste 📍" : "Entrega: Pickup. Te confirmamos punto y hora por aquí.",
    "",
    "Gracias por ser parte de los relentless. No excuses. Just reps.",
  ].join("\n");
}
$("#pedidos").addEventListener("click", async e => {
  const b = e.target.closest("button[data-a]"); if (!b) return;
  const id = b.closest(".item").dataset.id;
  const a = b.dataset.a;
  if ((a === "borrar" || a === "cancelar") && !b.dataset.sure) {
    b.dataset.sure = "1"; b.textContent = a === "borrar" ? "¿Seguro? Eliminar" : "¿Seguro? Cancelar"; return;
  }
  b.disabled = true;
  try {
    if (a === "pagar") { await pagar(id); toast("Pedido pagado. Inventario actualizado"); }
    if (a === "cancelar") { await cambiarEstado(id, "cancelado"); toast("Pedido cancelado"); }
    if (a === "pendiente") { await cambiarEstado(id, "pendiente"); toast("Pedido en pendiente"); }
    if (a === "borrar") { await deleteDoc(doc(db, "pedidos", id)); toast("Pedido eliminado"); }
  } catch (err) { console.error(err); toast("No se pudo guardar. Intenta de nuevo"); b.disabled = false; }
});

// Marca pagado y descuenta las unidades vendidas del inventario
async function pagar(id) {
  await runTransaction(db, async tx => {
    const pref = doc(db, "pedidos", id);
    const ps = await tx.get(pref);
    if (!ps.exists() || ps.data().estado === "pagado") return;
    const items = ps.data().items || [];
    const ids = [...new Set(items.map(i => i.id).filter(Boolean))];
    const snaps = {};
    for (const pid of ids) snaps[pid] = await tx.get(doc(db, "productos", pid));
    for (const pid of ids) {
      if (!snaps[pid].exists()) continue;
      const tallas = (snaps[pid].data().tallas || []).map(t => ({ ...t }));
      items.filter(i => i.id === pid).forEach(i => {
        const t = tallas.find(x => x.t === i.talla);
        if (t) t.stock = Math.max(0, (Number(t.stock) || 0) - i.qty);
      });
      tx.update(doc(db, "productos", pid), { tallas });
    }
    tx.update(pref, { estado: "pagado", pagadoEn: serverTimestamp(), stockAplicado: true });
  });
}
// Cambia estado; si estaba pagado, devuelve las unidades al inventario
async function cambiarEstado(id, estado) {
  await runTransaction(db, async tx => {
    const pref = doc(db, "pedidos", id);
    const ps = await tx.get(pref);
    if (!ps.exists()) return;
    const d = ps.data();
    if (d.stockAplicado) {
      const items = d.items || [];
      const ids = [...new Set(items.map(i => i.id).filter(Boolean))];
      const snaps = {};
      for (const pid of ids) snaps[pid] = await tx.get(doc(db, "productos", pid));
      for (const pid of ids) {
        if (!snaps[pid].exists()) continue;
        const tallas = (snaps[pid].data().tallas || []).map(t => ({ ...t }));
        items.filter(i => i.id === pid).forEach(i => {
          const t = tallas.find(x => x.t === i.talla);
          if (t) t.stock = (Number(t.stock) || 0) + i.qty;
        });
        tx.update(doc(db, "productos", pid), { tallas });
      }
    }
    tx.update(pref, { estado, stockAplicado: false });
  });
}

/* ---------------- venta manual ---------------- */
$("#vPago").innerHTML = METODOS_PAGO.map(m => `<option>${m}</option>`).join("");
function llenarTallasVenta() {
  const p = productos.find(x => x.id === $("#vProd").value);
  $("#vTalla").innerHTML = (p?.tallas || []).map(t => `<option value="${esc(t.t)}">${esc(t.t)} (${t.stock} disp.)</option>`).join("");
  $("#vPrecio").value = p?.precio ?? "";
}
$("#nuevaVenta").addEventListener("click", () => {
  if (!productos.length) { toast("Primero agrega productos en la pestaña Productos"); return; }
  $("#vProd").innerHTML = productos.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join("");
  llenarTallasVenta(); $("#vQty").value = 1; $("#vCliente").value = ""; $("#vErr").hidden = true;
  abrir("#ventaSheet");
});
$("#vProd").addEventListener("change", llenarTallasVenta);
$("#vGuardar").addEventListener("click", async () => {
  const p = productos.find(x => x.id === $("#vProd").value);
  const qty = parseInt($("#vQty").value, 10), precio = parseFloat($("#vPrecio").value);
  if (!p || !$("#vTalla").value || !(qty > 0) || !(precio >= 0)) { $("#vErr").textContent = "Revisa producto, talla, cantidad y precio."; $("#vErr").hidden = false; return; }
  $("#vGuardar").disabled = true;
  try {
    const ref = await addDoc(collection(db, "pedidos"), {
      estado: "pendiente", origen: "manual",
      items: [{ id: p.id, nombre: p.nombre, talla: $("#vTalla").value, qty, precio }],
      total: qty * precio, cliente: { nombre: $("#vCliente").value.trim(), telefono: "" },
      envio: "", zona: "", pago: $("#vPago").value, nota: "", creado: serverTimestamp(),
    });
    await pagar(ref.id);
    cerrar(); toast("Venta registrada");
  } catch (e) { console.error(e); $("#vErr").textContent = "No se pudo registrar. Intenta de nuevo."; $("#vErr").hidden = false; }
  $("#vGuardar").disabled = false;
});

/* ---------------- productos ---------------- */
function renderProductos() {
  const unidades = productos.reduce((a, p) => a + stockTotal(p), 0);
  const valor = productos.reduce((a, p) => a + stockTotal(p) * (Number(p.precio) || 0), 0);
  $("#invResumen").innerHTML = `<span>Productos: <b>${productos.length}</b></span><span>Unidades en inventario: <b>${unidades}</b></span><span>Valor a precio de venta: <b>${dinero(valor)}</b></span>`;
  if (!productos.length) { $("#productos").innerHTML = `<p class="hint">Todavía no hay productos. Toca "+ Nuevo producto" para agregar el primero.</p>`; return; }
  $("#productos").innerHTML = productos.map(p => {
    const total = stockTotal(p), out = p.agotado || total <= 0;
    return `<div class="item prod" data-id="${p.id}">
      ${p.foto ? `<img src="${p.foto}" alt="">` : `<div class="noimg"></div>`}
      <div style="display:grid;gap:8px;min-width:0">
        <div class="item-head"><strong>${esc(p.nombre)}</strong><span class="price">${dinero(p.precio)}</span></div>
        <div class="inv">${(p.tallas || []).map((t, i) => `<div class="inv-row ${t.stock <= 0 ? "cero" : t.stock <= 2 ? "bajo" : ""}">
          <b>${esc(t.t)}</b><button type="button" data-a="menos" data-i="${i}" aria-label="Restar una ${esc(t.t)}">−</button>
          <span>${t.stock}</span><button type="button" data-a="mas" data-i="${i}" aria-label="Sumar una ${esc(t.t)}">+</button>
          <em>${t.stock <= 0 ? "agotada" : t.stock <= 2 ? "quedan pocas" : "disponibles"}</em></div>`).join("") || `<span class="hint">Sin tallas. Toca Editar para agregarlas.</span>`}</div>
        <div class="kv"><span>${{ hombre: "Hombre", mujer: "Mujer" }[p.categoria] || ""}</span><span>Total: <b>${total}</b></span>${out ? `<span class="pill cancelado">Agotado</span>` : ""}</div>
        <div class="actions"><button class="btn" data-a="editar">Editar</button>
          <button class="btn ${p.agotado ? "ok" : ""}" data-a="agotado">${p.agotado ? "Quitar agotado" : "Marcar agotado"}</button></div>
      </div></div>`;
  }).join("");
}
$("#productos").addEventListener("click", async e => {
  const b = e.target.closest("button[data-a]"); if (!b) return;
  const p = productos.find(x => x.id === b.closest(".item").dataset.id);
  if (b.dataset.a === "editar") editar(p);
  if (b.dataset.a === "mas" || b.dataset.a === "menos") {
    const tallas = (p.tallas || []).map(t => ({ ...t }));
    const t = tallas[+b.dataset.i];
    t.stock = Math.max(0, (Number(t.stock) || 0) + (b.dataset.a === "mas" ? 1 : -1));
    b.disabled = true;
    try { await updateDoc(doc(db, "productos", p.id), { tallas }); }
    catch (err) { toast("No se pudo guardar"); b.disabled = false; }
  }
  if (b.dataset.a === "agotado") {
    try { await updateDoc(doc(db, "productos", p.id), { agotado: !p.agotado }); toast(p.agotado ? "Disponible otra vez" : "Marcado como agotado"); }
    catch (err) { toast("No se pudo guardar"); }
  }
});

let editando = null, fotos = [], fotosCambiadas = false;
const QUICK = ["XS", "S", "M", "L", "XL", "XXL", "Única"];
function filaTalla(t = "", s = 0) {
  const div = document.createElement("div");
  div.className = "talla-row";
  div.innerHTML = `<input aria-label="Talla" value="${esc(t)}" placeholder="Talla"><input aria-label="Unidades" type="number" min="0" inputmode="numeric" value="${s}"><button type="button" aria-label="Quitar talla">×</button>`;
  div.querySelector("button").addEventListener("click", () => div.remove());
  $("#pTallas").appendChild(div);
}
$("#pQuick").innerHTML = QUICK.map(q => `<button type="button">+ ${q}</button>`).join("");
$("#pQuick").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  const t = b.textContent.replace("+ ", "");
  if ([...$("#pTallas").querySelectorAll("input:first-child")].some(i => i.value.trim().toUpperCase() === t.toUpperCase())) return;
  filaTalla(t, 0);
});
async function editar(p) {
  editando = p || null; fotos = p?.foto ? [p.foto] : []; fotosCambiadas = false;
  $("#psTitle").textContent = p ? "Editar producto" : "Nuevo producto";
  $("#pNombre").value = p?.nombre || ""; $("#pPrecio").value = p?.precio ?? "";
  $("#pCat").value = p?.categoria || "hombre"; $("#pDesc").value = p?.descripcion || "";
  $("#pAgotado").checked = !!p?.agotado; $("#pFoto").value = "";
  pintarFotos();
  $("#pTallas").innerHTML = "";
  (p?.tallas?.length ? p.tallas : [{ t: "S", stock: 0 }, { t: "M", stock: 0 }, { t: "L", stock: 0 }]).forEach(t => filaTalla(t.t, t.stock));
  $("#pBorrar").hidden = !p; $("#pBorrar").textContent = "Eliminar producto"; delete $("#pBorrar").dataset.sure;
  $("#pErr").hidden = true;
  abrir("#prodSheet");
  if (p) {
    try {
      const g = await getDoc(doc(db, "galerias", p.id));
      if (editando === p && !fotosCambiadas && g.exists() && g.data().fotos?.length) { fotos = g.data().fotos; pintarFotos(); }
    } catch (e) {}
  }
}
function pintarFotos() {
  $("#pFotos").innerHTML = fotos.map((f, i) => `<figure><img src="${f}" alt="Foto ${i + 1}">
    <button type="button" class="f-x" data-i="${i}" aria-label="Quitar foto">×</button>
    <button type="button" class="f-main${i === 0 ? " on" : ""}" data-main="${i}">${i === 0 ? "Principal" : "Hacer principal"}</button></figure>`).join("");
}
$("#pFotos").addEventListener("click", e => {
  const x = e.target.closest(".f-x"), m = e.target.closest(".f-main");
  if (x) { fotos.splice(+x.dataset.i, 1); fotosCambiadas = true; pintarFotos(); }
  if (m && +m.dataset.main > 0) { const [f] = fotos.splice(+m.dataset.main, 1); fotos.unshift(f); fotosCambiadas = true; pintarFotos(); }
});
$("#nuevoProd").addEventListener("click", () => editar(null));

// Comprime las fotos para guardarlas en la base de datos (sin pagar almacenamiento)
async function cargarImagen(src) {
  const url = src instanceof Blob ? URL.createObjectURL(src) : src;
  const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
  if (src instanceof Blob) URL.revokeObjectURL(url);
  return img;
}
async function comprimir(src, lado = 1000, limite = 140000) {
  const img = await cargarImagen(src);
  let q = 0.78, out = "";
  for (let intento = 0; intento < 10; intento++) {
    const f = Math.min(1, lado / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    out = c.toDataURL("image/webp", q);
    if (!out.startsWith("data:image/webp")) out = c.toDataURL("image/jpeg", q);
    if (out.length < limite) return out;
    q -= 0.08; if (q < 0.5) { q = 0.72; lado -= 150; }
  }
  return out;
}
$("#pFoto").addEventListener("change", async () => {
  const files = [...$("#pFoto").files];
  $("#pFoto").value = "";
  const libres = 6 - fotos.length;
  if (files.length > libres) toast(libres > 0 ? `Solo caben ${libres} fotos más` : "Ya tienes 6 fotos. Quita una para agregar otra");
  for (const f of files.slice(0, Math.max(0, libres))) {
    try { fotos.push(await comprimir(f)); fotosCambiadas = true; pintarFotos(); }
    catch (e) { toast("No se pudo leer una de las fotos. Prueba con otra"); }
  }
});
$("#pGuardar").addEventListener("click", async () => {
  const err = $("#pErr");
  const nombre = $("#pNombre").value.trim(), precio = parseFloat($("#pPrecio").value);
  const tallas = [...$("#pTallas").children].map(r => {
    const [t, s] = r.querySelectorAll("input");
    return { t: t.value.trim().toUpperCase().replace("ÚNICA", "Única"), stock: Math.max(0, parseInt(s.value, 10) || 0) };
  }).filter(t => t.t);
  if (!nombre || !(precio >= 0) || !tallas.length) { err.textContent = "Falta nombre, precio o al menos una talla."; err.hidden = false; return; }
  if (!fotos.length) { err.textContent = "Agrega al menos una foto del producto."; err.hidden = false; return; }
  err.hidden = true; $("#pGuardar").disabled = true; $("#pGuardar").textContent = "Guardando…";
  const data = { nombre, precio, categoria: $("#pCat").value, descripcion: $("#pDesc").value.trim(), tallas, agotado: $("#pAgotado").checked, actualizado: serverTimestamp() };
  try {
    if (fotosCambiadas || !editando) data.foto = await comprimir(fotos[0], 640, 90000);
    const ref = editando ? doc(db, "productos", editando.id) : doc(collection(db, "productos"));
    if (editando) await updateDoc(ref, data);
    else await setDoc(ref, { ...data, creado: serverTimestamp() });
    if (fotosCambiadas || !editando) {
      try { await setDoc(doc(db, "galerias", ref.id), { fotos }); }
      catch (e) {
        console.error(e);
        err.textContent = e.code === "permission-denied"
          ? "El producto se guardó, pero las fotos extra no. Falta actualizar las reglas de Firebase."
          : "El producto se guardó, pero las fotos extra no. Prueba quitando una foto.";
        err.hidden = false; $("#pGuardar").disabled = false; $("#pGuardar").textContent = "Guardar producto"; return;
      }
    }
    cerrar(); toast("Producto guardado");
  } catch (e) { console.error(e); err.textContent = "No se pudo guardar. Revisa tu conexión e intenta de nuevo."; err.hidden = false; }
  $("#pGuardar").disabled = false; $("#pGuardar").textContent = "Guardar producto";
});
$("#pBorrar").addEventListener("click", async () => {
  const b = $("#pBorrar");
  if (!b.dataset.sure) { b.dataset.sure = "1"; b.textContent = "¿Seguro? Toca otra vez para eliminar"; return; }
  try {
    await deleteDoc(doc(db, "productos", editando.id));
    deleteDoc(doc(db, "galerias", editando.id)).catch(() => {});
    cerrar(); toast("Producto eliminado");
  }
  catch (e) { toast("No se pudo eliminar"); }
});

/* ---------------- ventas por mes ---------------- */
$("#mes").value = mesDe();
$("#mes").addEventListener("change", renderVentas);
function renderVentas() {
  const mes = $("#mes").value || mesDe();
  const delMes = pagados.filter(p => mesDe(p.pagadoEn || p.creado) === mes);
  const ingresos = delMes.reduce((a, p) => a + (Number(p.total) || 0), 0);
  const piezas = delMes.reduce((a, p) => a + (p.items || []).reduce((b, i) => b + i.qty, 0), 0);
  $("#stats").innerHTML = [
    ["Vendido", dinero(ingresos)], ["Pedidos", delMes.length], ["Piezas", piezas],
    ["Ticket promedio", dinero(delMes.length ? ingresos / delMes.length : 0)],
  ].map(([k, v]) => `<div class="stat"><span class="label">${k}</span><b>${v}</b></div>`).join("");

  const porProd = {};
  delMes.forEach(p => (p.items || []).forEach(i => {
    const k = i.nombre; porProd[k] = porProd[k] || { piezas: 0, monto: 0 };
    porProd[k].piezas += i.qty; porProd[k].monto += i.qty * i.precio;
  }));
  const filasP = Object.entries(porProd).sort((a, b) => b[1].piezas - a[1].piezas);
  $("#tProd").innerHTML = `<tr><th>Producto</th><th class="n">Piezas</th><th class="n">Monto</th></tr>` +
    (filasP.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="n">${v.piezas}</td><td class="n">${dinero(v.monto)}</td></tr>`).join("") || `<tr><td colspan="3" class="hint">Sin ventas en ${nombreMes(mes)}.</td></tr>`);

  const porPago = {};
  delMes.forEach(p => { const k = p.pago || "—"; porPago[k] = porPago[k] || { n: 0, monto: 0 }; porPago[k].n++; porPago[k].monto += Number(p.total) || 0; });
  $("#tPago").innerHTML = `<tr><th>Método</th><th class="n">Pedidos</th><th class="n">Monto</th></tr>` +
    (Object.entries(porPago).sort((a, b) => b[1].monto - a[1].monto).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="n">${v.n}</td><td class="n">${dinero(v.monto)}</td></tr>`).join("") || `<tr><td colspan="3" class="hint">Sin ventas este mes.</td></tr>`);

  const meses = {};
  pagados.forEach(p => { const m = mesDe(p.pagadoEn || p.creado); meses[m] = meses[m] || { n: 0, piezas: 0, monto: 0 }; meses[m].n++; meses[m].monto += Number(p.total) || 0; meses[m].piezas += (p.items || []).reduce((b, i) => b + i.qty, 0); });
  $("#tMeses").innerHTML = `<tr><th>Mes</th><th class="n">Pedidos</th><th class="n">Piezas</th><th class="n">Vendido</th></tr>` +
    (Object.entries(meses).sort((a, b) => b[0].localeCompare(a[0])).map(([m, v]) => `<tr><td>${nombreMes(m)}</td><td class="n">${v.n}</td><td class="n">${v.piezas}</td><td class="n">${dinero(v.monto)}</td></tr>`).join("") || `<tr><td colspan="4" class="hint">Todavía no hay ventas pagadas.</td></tr>`);
}
