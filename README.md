# REPX · Tienda web

Tienda de ropa deportiva REPX con panel privado. Página estática (HTML, CSS y JavaScript sin compilar) + Firebase para datos y usuarios.

- **Tienda:** https://repx.repxve.workers.dev
- **Panel del equipo:** https://repx.repxve.workers.dev/admin.html
- **Publicación:** Cloudflare Workers (static assets). Cada cambio en la rama `main` de este repositorio se publica solo.
- **Datos:** Firebase, proyecto `repx-67f15` (Firestore + Authentication con correo y contraseña).

## Archivos

| Archivo | Qué hace |
|---|---|
| `index.html`, `tienda.js` | Portada, catálogo con filtros y buscador, carrito y pedido por WhatsApp |
| `producto.html`, `producto.js` | Página de cada producto (`producto.html?id=...`) con galería, tallas y cantidad |
| `admin.html`, `admin.js` | Panel privado: pedidos, productos e inventario, ventas por mes, ayuda |
| `comun.js` | Datos compartidos: correos del equipo, WhatsApp, métodos de pago, **tipos de prenda (FAMILIAS)** |
| `rest.js` | Lectura de productos y creación de pedidos sin cargar la librería de Firebase (más rápido) |
| `firebase.js` | Configuración de Firebase (solo la usa el panel) |
| `styles.css` | Estilos de toda la tienda |
| `sw.js`, `manifest.webmanifest` | App instalable y modo con mala señal. Subir `CACHE` en `sw.js` en cada cambio |
| `wrangler.jsonc`, `.assetsignore` | Configuración de Cloudflare |

## Base de datos (Firestore)

- `productos/{id}`: nombre, precio, categoria (`hombre`/`mujer`), tipo, descripcion, foto (miniatura en base64), tallas `[{t, stock}]`, agotado, creado.
- `galerias/{id}`: fotos `[base64]` del producto (hasta 6).
- `pedidos/{id}`: estado (`pendiente`/`pagado`/`cancelado`), items, total, cliente, envio, zona, pago, nota, creado, pagadoEn, stockAplicado.

Las fotos se guardan comprimidas dentro de Firestore para no pagar almacenamiento.

## Reglas de seguridad de Firestore

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function esAdmin() {
      return request.auth != null &&
        request.auth.token.email.lower() in
          ['abdallahgudi@gmail.com', 'samu_428@hotmail.com'];
    }
    match /productos/{id} { allow read: if true; allow write: if esAdmin(); }
    match /galerias/{id} { allow read: if true; allow write: if esAdmin(); }
    match /pedidos/{id} {
      allow create: if request.resource.data.estado == 'pendiente';
      allow read, update, delete: if esAdmin();
    }
  }
}
```

## Cambios frecuentes

- **Agregar a alguien al equipo:** crear el usuario en Firebase → Authentication, agregar su correo en `ADMINS` de `comun.js` y en `esAdmin()` de las reglas.
- **Cambiar el WhatsApp:** `WHATSAPP_REPX` en `comun.js` y el número visible en `index.html`, `producto.html` y `tienda.js`.
- **Nuevo tipo de prenda:** agregarlo a su familia en `FAMILIAS` (`comun.js`), con palabras de búsqueda en `sin`.
- **Nuevo link o dominio:** agregarlo en Firebase → Authentication → Configuración → Dominios autorizados.
