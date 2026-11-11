// Duraznito · comportamiento del tema (sin dependencias)
// Modo Shopify: usa el carrito real (/cart/*.js). Modo vista previa: bolsa en localStorage + desvelo-productos.json.
document.documentElement.classList.add('js');
(() => {
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BASE = new URL('.', document.currentScript.src).href; // carpeta de assets
  const V = new URL(document.currentScript.src).searchParams.get('v') || String(Date.now()); // versión: evita caché de datos
  const SHOPIFY = !!(window.Shopify && window.Shopify.shop);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const plata = (n) => '$' + Math.round(n).toLocaleString('es-CL');
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };
  const leer = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const icono = (id) => `<svg class="icono" aria-hidden="true"><use href="#${id}"/></svg>`;
  const MONO = `<svg viewBox="-60.8 -678 689.1 689.1" aria-hidden="true"><use href="${BASE}desvelo-sprite.svg?v=dpunto#d" x="-60.8" y="-678" width="689.1" height="689.1" fill="currentColor"/></svg>`;

  // Íconos que usan las piezas inyectadas (por si la página no los trae)
  if (!document.getElementById('i-mas')) {
    document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
      <symbol id="i-mas" viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></symbol>
      <symbol id="i-check" viewBox="0 0 24 24"><path d="m5.5 12.5 4 4 9-9"/></symbol>
      <symbol id="i-cerrar" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></symbol></svg>`);
  } else if (!document.getElementById('i-cerrar')) {
    document.body.insertAdjacentHTML('afterbegin', '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="i-cerrar" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></symbol></svg>');
  }

  // ————————————————— Datos de la vista previa —————————————————
  let catalogo = null;
  const datos = () => catalogo || (catalogo = fetch(BASE + 'desvelo-productos.json?v=' + V).then((r) => r.json()).catch(() => ({ productos: [] })));
  window.Desvelo = { datos, plata, BASE, MONO, V };

  // ————————————————— Bolsa —————————————————
  let metaLista = false; // para animar el punto solo cuando la meta recién se cumple
  const Bolsa = {
    async leer() {
      if (SHOPIFY) {
        const c = await fetch('/cart.js').then((r) => r.json());
        return c.items.map((i) => ({ clave: i.key, nombre: i.product_title + (i.variant_title ? ` · Talla ${i.variant_title}` : ''), foto: i.image, cantidad: i.quantity, precio: i.final_line_price / 100, unitario: i.final_price / 100, categoria: /lencer/i.test(i.product_type || '') ? 'lenceria' : '', prop: i.properties || null, id: String(i.product_id) }));
      }
      const { productos } = await datos();
      const lista = JSON.parse(leer('desvelo-bolsa') || '[]');
      return lista.map((l) => {
        const p = productos.find((x) => x.slug === l.slug);
        return p && { clave: [p.slug, l.color, l.talla].filter(Boolean).join('|'), nombre: p.nombre + (l.color ? ` · ${l.color}` : '') + (l.talla ? ` · Talla ${l.talla}` : ''), foto: (() => { const v = l.color && (p.variantes || []).find((x) => x.nombre === l.color); const f = v ? v.foto : p.galeria[0]; return f ? `${BASE}desvelo-${f}.jpg` : null; })(), cantidad: l.cantidad, precio: p.precio * l.cantidad, unitario: p.precio, categoria: p.categoria, prop: l.properties || null, id: p.slug };
      }).filter(Boolean);
    },
    async agregar(items) { // items: [{slug | variante, cantidad}]
      if (SHOPIFY) {
        await fetch('/cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: items.map((i) => ({ id: i.variante, quantity: i.cantidad || 1, ...(i.properties ? { properties: i.properties } : {}) })) }) });
      } else {
        const lista = JSON.parse(leer('desvelo-bolsa') || '[]');
        items.forEach((i) => { const e = lista.find((l) => l.slug === i.slug && (l.talla || '') === (i.talla || '') && (l.color || '') === (i.color || '')); e ? (e.cantidad += i.cantidad || 1) : lista.push({ slug: i.slug, cantidad: i.cantidad || 1, ...(i.talla ? { talla: i.talla } : {}), ...(i.color ? { color: i.color } : {}), ...(i.properties ? { properties: i.properties } : {}) }); });
        guardar('desvelo-bolsa', JSON.stringify(lista));
      }
      await pintarContador();
    },
    async cambiar(clave, cantidad) {
      if (SHOPIFY) {
        await fetch('/cart/change.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: clave, quantity: cantidad }) });
      } else {
        let lista = JSON.parse(leer('desvelo-bolsa') || '[]');
        const [sl, ta] = clave.split('|');
        lista = lista.map((l) => (l.slug === sl && (l.talla || '') === (ta || '') ? { ...l, cantidad } : l)).filter((l) => l.cantidad > 0);
        guardar('desvelo-bolsa', JSON.stringify(lista));
      }
      await pintarContador();
    },
  };
  window.Desvelo.Bolsa = Bolsa;

  const botonBolsa = () => $('[data-bolsa]') || $('.header-action[aria-label^="Bolsa"]');
  async function pintarContador() {
    setTimeout(() => document.dispatchEvent(new CustomEvent('desvelo:bolsa')), 0);
    const b = botonBolsa(); if (!b) return;
    const items = await Bolsa.leer();
    const n = items.reduce((s, i) => s + i.cantidad, 0);
    let c = b.querySelector('.header-action__count');
    if (!n) { c?.remove(); return; }
    if (!c) { c = document.createElement('span'); c.className = 'header-action__count'; b.append(c); }
    c.textContent = String(n);
  }

  // Cajón lateral (se inyecta en todas las páginas)
  document.body.insertAdjacentHTML('beforeend', `
    <div class="velo" data-velo></div>
    <aside class="bolsa" role="dialog" aria-modal="true" aria-label="Tu bolsa" data-cajon tabindex="-1">
      <div class="bolsa__cabeza"><p class="bolsa__titulo">tu bolsa.</p><button class="bolsa__cerrar" type="button" data-cerrar-bolsa aria-label="Cerrar">${icono('i-cerrar')}</button></div>
      <div class="bolsa__cuerpo" data-bolsa-cuerpo></div>
      <div class="bolsa__pie" data-bolsa-pie></div>
    </aside>`);
  const cajon = $('[data-cajon]'), velo = $('[data-velo]');
  let foco = null;
  async function abrirBolsa() {
    foco = document.activeElement;
    await pintarBolsa();
    cajon.classList.add('is-abierta'); velo.classList.add('is-visible');
    document.documentElement.style.overflow = 'hidden';
    setTimeout(() => cajon.focus(), 60);
  }
  function cerrarBolsa() {
    cajon.classList.remove('is-abierta'); velo.classList.remove('is-visible');
    document.documentElement.style.overflow = '';
    foco?.focus?.();
  }
  window.Desvelo.abrirBolsa = abrirBolsa;
  velo.addEventListener('click', cerrarBolsa);
  $('[data-cerrar-bolsa]').addEventListener('click', cerrarBolsa);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && cajon.classList.contains('is-abierta')) cerrarBolsa(); });

  async function pintarBolsa() {
    const items = await Bolsa.leer();
    const cuerpo = $('[data-bolsa-cuerpo]'), pie = $('[data-bolsa-pie]');
    if (!items.length) {
      cuerpo.innerHTML = `<div class="bolsa__vacia">${MONO}<p>Todavía nada.<br>Hay mucha fruta jugosa para elegir.</p><a class="boton" href="${SHOPIFY ? '/collections/all' : 'coleccion.html'}">Explorar la tienda</a></div>`;
      pie.innerHTML = '';
      return;
    }
    let total = items.reduce((s, i) => s + i.precio, 0);
    const promo = SHOPIFY ? { categoria: 'lenceria', minimo: 2, descuento: (+(window.DesveloConfig || {}).lleva2 || 15) / 100 } : (await datos()).promo;
    let lineaPromo = '', metaLen = '', nLen = 0;
    if (promo) {
      const unidades = items.filter((i) => i.categoria === promo.categoria).flatMap((i) => Array(i.cantidad).fill(i.unitario));
      nLen = unidades.length;
      const pct = Math.round(promo.descuento * 100);
      const ranuras = `<span class="lleva2__ranuras" aria-hidden="true">${Array.from({ length: promo.minimo }, (_, k) => `<i class="${k < nLen ? 'is-llena' : ''}"></i>`).join('')}</span>`;
      if (nLen >= promo.minimo) {
        const desc = Math.round(unidades.reduce((a, b) => a + b, 0) * promo.descuento);
        if (!SHOPIFY) { total -= desc; lineaPromo = `<div class="bolsa__promo"><span>${promo.texto}</span><b>−${plata(desc)}</b></div>`; }
        metaLen = `<div class="meta-len is-lista${metaLista ? '' : ' is-recien'}">${ranuras}<span><b>Tu ${pct} % de lencería está activo.</b> Ahorras ${plata(desc)}.</span><i class="meta-len__punto" aria-hidden="true"></i></div>`;
        metaLista = true;
      } else if (nLen) {
        metaLen = `<div class="meta-len">${ranuras}<span><b>Te falta ${promo.minimo - nLen} prenda de lencería</b> para el ${pct} % en todas.</span></div>`;
        metaLista = false;
      } else metaLista = false;
    }
    const env = (window.DesveloConfig || {}).envio;
    const meta = env && env.meta ? (() => {
      const falta = env.meta - total, pct = Math.min(100, (total / env.meta) * 100);
      return `<div class="envio-meta"><span>${falta > 0 ? `Te faltan <b>${plata(falta)}</b> para ${env.texto}` : `<b>Listo:</b> tu pedido tiene ${env.texto}`}</span><span class="envio-meta__barra"><i style="width:${pct}%"></i></span></div>`;
    })() : '';
    const regaloTxt = (p) => (p && (p['Para regalo'] || p.Nota) ? `<p class="linea__regalo">${icono('i-caja')}Para regalo${p.Nota ? ` · <em>${p.Nota.replace(/[<>&«»]/g, '')}</em>` : ''}</p>` : '');
    const completar = promo && nLen === promo.minimo - 1 ? await completarLenceria(items) : '';
    cuerpo.innerHTML = metaLen + meta + items.map((i) => `
      <div class="linea">
        <div class="linea__foto">${i.foto ? `<img src="${i.foto}" alt="">` : `<span class="foto-en-camino">${MONO}</span>`}</div>
        <div><p class="linea__nombre">${i.nombre}</p>${regaloTxt(i.prop)}
          <div class="linea__cantidad"><button type="button" data-cant="${i.clave}" data-n="${i.cantidad - 1}" aria-label="Quitar uno">−</button><span>${i.cantidad}</span><button type="button" data-cant="${i.clave}" data-n="${i.cantidad + 1}" aria-label="Sumar uno">+</button></div>
          <button class="linea__quitar" type="button" data-cant="${i.clave}" data-n="0">Quitar</button></div>
        <p class="linea__precio">${plata(i.precio)}</p>
      </div>`).join('') + (completar || (SHOPIFY ? '' : await sumarEnBolsa(items)));
    pie.innerHTML = `${lineaPromo}<div class="bolsa__subtotal"><span>Subtotal</span><span>${plata(total)}</span></div>
      <a class="boton" href="${SHOPIFY ? '/checkout' : '#'}" data-pagar>Ir a pagar · ${plata(total)}</a>
      <p class="bolsa__nota">Llega discreto · Pago seguro · Envío se calcula al pagar</p>`;
  }
  // «Completa tu 15 %»: con 1 prenda en la bolsa, 3 de lencería con su talla a un toque
  async function completarLenceria(items) {
    const ya = new Set(items.map((i) => i.id));
    let lista = [];
    if (SHOPIFY) {
      const r = await fetch('/collections/lenceria/products.json?limit=12').then((x) => x.json()).catch(() => ({ products: [] }));
      lista = r.products.filter((p) => !ya.has(String(p.id))).slice(0, 3).map((p) => ({ nombre: p.title, foto: p.images[0]?.src, precio: +p.variants[0].price, tallas: p.variants.filter((v) => v.available).map((v) => ({ t: v.option1, v: v.id })) }));
    } else {
      const { productos } = await datos();
      lista = productos.filter((p) => p.categoria === 'lenceria' && p.tipo !== 'disfraces' && !ya.has(p.slug) && p.galeria[0]).sort((a, b) => !!b.precioAntes - !!a.precioAntes).slice(0, 3)
        .map((p) => ({ nombre: p.nombre, foto: `${BASE}desvelo-${p.galeria[0]}.jpg`, precio: p.precio, tallas: ['S', 'M', 'L', 'XL'].map((t) => ({ t, slug: p.slug })) }));
    }
    if (!lista.length) return '';
    return `<div class="bolsa__sumar bolsa__completar"><p>Completa tu 15 %</p><div class="completar">${lista.map((p) => `
      <div class="completar__item"><img src="${p.foto}" alt=""><div><span class="completar__nombre">${p.nombre}</span><span class="completar__precio">${plata(p.precio)}</span>
        <div class="completar__tallas" role="group" aria-label="Agregar ${p.nombre} en talla">${p.tallas.map((x) => `<button type="button" data-completar ${x.v ? `data-variante="${x.v}"` : `data-slug="${x.slug}"`} data-talla="${x.t}">${x.t}</button>`).join('')}</div></div></div>`).join('')}</div></div>`;
  }
  // «Súmalo» dentro de la bolsa: los productos solo-en-carrito que aún no están
  async function sumarEnBolsa(items) {
    const { productos } = await datos();
    const ya = new Set(items.map((i) => i.clave));
    const extras = productos.filter((p) => p.soloCarrito && p.precio <= 10990 && p.galeria[0] && !ya.has(p.slug)).slice(0, 6);
    if (!extras.length) return '';
    return `<div class="bolsa__sumar"><p>Súmalo a tu pedido</p><div class="bolsa__sumar-lista">${extras.map((p) => `
      <div class="mini-sumar"><div class="mini-sumar__foto"><img src="${BASE}desvelo-${p.galeria[0]}.jpg" alt=""><button class="vidrio" type="button" data-sumar="${p.slug}" aria-label="Agregar ${p.nombre}">${icono('i-mas')}</button></div><span>${p.nombre}</span><span>${plata(p.precio)}</span></div>`).join('')}</div></div>`;
  }
  cajon.addEventListener('click', async (e) => {
    const c = e.target.closest('[data-cant]');
    if (c) { await Bolsa.cambiar(c.dataset.cant, +c.dataset.n); pintarBolsa(); return; }
    const k = e.target.closest('[data-completar]');
    if (k) { k.classList.add('is-listo'); await Bolsa.agregar([{ slug: k.dataset.slug, variante: k.dataset.variante, talla: k.dataset.talla }]); pintarBolsa(); return; }
    const s = e.target.closest('[data-sumar]');
    if (s) { await Bolsa.agregar([{ slug: s.dataset.sumar }]); pintarBolsa(); return; }
    if (e.target.closest('[data-pagar]') && !SHOPIFY) { e.preventDefault(); avisar(null, 'Vista previa: aquí empieza el pago de Shopify'); }
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-bolsa], .header-action[aria-label^="Bolsa"]');
    if (b) { e.preventDefault(); abrirBolsa(); }
  });

  // ————————————————— Aviso (toast) —————————————————
  let aviso;
  function avisar(foto, html, accion = true) {
    if (!aviso) { aviso = document.createElement('div'); aviso.className = 'aviso vidrio'; aviso.setAttribute('role', 'status'); document.body.append(aviso); }
    aviso.innerHTML = `${foto ? `<img src="${foto}" alt="">` : ''}<span>${html}</span>${accion ? '<a href="#" data-bolsa>Ver bolsa</a>' : ''}`;
    aviso.classList.add('is-visible'); clearTimeout(aviso._t); aviso._t = setTimeout(() => aviso.classList.remove('is-visible'), 2800);
  }
  window.Desvelo.avisar = avisar;

  // ————————————————— Línea de entrega (fechas referenciales, días hábiles) —————————————————
  const habiles = (desde, n) => { const d = new Date(desde); let k = 0; while (k < n) { d.setDate(d.getDate() + 1); if (d.getDay() % 6 !== 0) k++; } return d; };
  const fecha = (d) => d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');
  window.Desvelo.entregaHTML = () => {
    const e = (window.DesveloConfig || {}).entrega; if (!e) return '';
    const ahora = new Date();
    const prep = ahora.getHours() >= e.corte || ahora.getDay() % 6 === 0 ? habiles(ahora, 1) : ahora;
    const env = [habiles(prep, e.enviar[0]), habiles(prep, e.enviar[1])];
    const rec = [habiles(env[0], e.recibir[0]), habiles(env[1], e.recibir[1])];
    const hoy = prep.toDateString() === ahora.toDateString();
    return `<div class="entrega"><p class="entrega__titulo">Si lo pides ${hoy ? 'hoy' : 'ahora'}, lo preparamos <b>${hoy ? 'hoy mismo' : 'el ' + fecha(prep)}</b>.</p>
      <div class="entrega__pasos"><div class="entrega__paso is-hecho"><span>${icono('i-bolsa')}</span><b>Pedido</b>${hoy ? 'Hoy' : fecha(prep)}</div>
      <div class="entrega__paso"><span>${icono('i-caja')}</span><b>Enviado</b>${fecha(env[0])} – ${fecha(env[1])}</div>
      <div class="entrega__paso"><span>${icono('i-envio')}</span><b>Recibes</b>${fecha(rec[0])} – ${fecha(rec[1])}</div></div>
      <p class="entrega__nota">Fechas referenciales en días hábiles. Te avisamos por correo en cada etapa.</p></div>`;
  };

  // ————————————————— Agregar rápido (tarjetas) —————————————————
  document.addEventListener('click', async (e) => {
    const vt = e.target.closest('[data-ver-tallas]');
    if (vt) { e.preventDefault(); const c = vt.closest('.product-card'); const ab = !c.classList.contains('is-tallas'); document.querySelectorAll('.product-card.is-tallas').forEach((x) => { x.classList.remove('is-tallas'); x.querySelector('[data-ver-tallas]')?.setAttribute('aria-expanded', 'false'); }); c.classList.toggle('is-tallas', ab); vt.setAttribute('aria-expanded', String(ab)); return; }
    const b = e.target.closest('[data-agregar]');
    if (!b) return;
    e.preventDefault();
    const card = b.closest('.product-card') || b.closest('.look__ficha') || b.closest('.campana__ficha');
    const nombre = card?.querySelector('.product-card__title, b')?.textContent || 'Producto';
    const foto = card?.querySelector('img')?.getAttribute('src');
    b.classList.add('is-listo'); b.querySelector('use')?.setAttribute('href', '#i-check');
    const t = b.querySelector('span'); if (t) t.textContent = 'Agregado';
    setTimeout(() => { b.classList.remove('is-listo'); b.querySelector('use')?.setAttribute('href', '#i-mas'); if (t) t.textContent = 'Agregar'; }, 1800);
    const talla = b.dataset.talla;
    if (talla) { b.closest('.product-card')?.classList.remove('is-tallas'); }
    if (b.dataset.slug || b.dataset.variante) await Bolsa.agregar([{ slug: b.dataset.slug, variante: b.dataset.variante, ...(talla ? { talla } : {}), ...(b.dataset.color ? { color: b.dataset.color } : {}) }]);
    avisar(foto, `<strong>${nombre}</strong>${talla ? ` · talla ${talla}` : ''} quedó en tu bolsa`);
  });

  // ————————————————— Aviso de edad (+18), una vez —————————————————
  if (!document.body.hasAttribute('data-sin-edad') && leer('desvelo-18') !== 'si' && !new URLSearchParams(location.search).has('mayor')) {
    document.body.insertAdjacentHTML('beforeend', `<div class="edad" role="dialog" aria-modal="true" aria-labelledby="edad-t" data-edad>
      <div class="edad__caja"><svg class="edad__logo" viewBox="3 -690 2599 713.1" role="img" aria-label="Duraznito"><use href="${BASE}desvelo-sprite.svg?v=dpunto#wordmark" x="3" y="-690" width="2599" height="713.1" fill="currentColor"/></svg><p class="marca-titulo" id="edad-t">¿tienes 18 o más?</p><p>Duraznito vende juguetes y lencería para adultos. Confirma tu edad para entrar.</p>
      <div class="edad__acciones"><a class="boton boton--claro" href="https://www.google.cl">No, salir</a><button class="boton" type="button" data-edad-si>Sí, entrar</button></div></div></div>`);
    $('[data-edad-si]').addEventListener('click', () => { guardar('desvelo-18', 'si'); $('[data-edad]').remove(); });
  }

  // ————————————————— Lista común de productos (vista previa o Shopify) —————————————————
  const sinTildes = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const CATS = { vibradores: 'Vibradores', consoladores: 'Consoladores', 'para-el': 'Para él', anal: 'Anal', bondage: 'Bondage', lenceria: 'Lencería' };
  let listaCache = null;
  const lista = () => listaCache || (listaCache = (async () => {
    if (SHOPIFY) {
      const r = await fetch('/collections/all/products.json?limit=250').then((x) => x.json()).catch(() => ({ products: [] }));
      return r.products.map((p) => {
        const tipo = sinTildes(p.product_type);
        const cat = Object.keys(CATS).find((k) => sinTildes(CATS[k]) === tipo) || 'vibradores';
        const v = p.variants[0] || {};
        return { slug: p.handle, nombre: p.title, categoria: cat, precio: Math.round(+v.price), foto: p.images[0]?.src, url: `/products/${p.handle}`, disponible: p.variants.some((x) => x.available), texto: sinTildes(`${p.title} ${p.product_type} ${p.tags.join(' ')}`), para: ['ella', 'el', 'pareja'].filter((k) => { const t = p.tags.map((x) => x.toLowerCase()); return t.includes(k) || t.includes(`para-${k}`) || (k === 'pareja' && t.includes('para-parejas')); }) };
      });
    }
    const { productos } = await datos();
    return productos.map((p) => ({ slug: p.slug, nombre: p.nombre, categoria: p.categoria, precio: p.precio, foto: p.galeria[0] ? `${BASE}desvelo-${p.galeria[0]}.jpg` : null, url: `producto.html?p=${p.slug}`, disponible: p.stock.estado !== 'agotado', texto: sinTildes(`${p.nombre} ${CATS[p.categoria]} ${p.bajada}`), para: p.para || [] }));
  })());
  window.Desvelo.lista = lista;
  const tarjetaMini = (p, extra = '') => `<a class="resultado" href="${p.url}"><span class="resultado__foto">${p.foto ? `<img src="${p.foto}" alt="" loading="lazy">` : `<span class="foto-en-camino">${MONO}</span>`}</span><b>${extra || p.nombre}</b><span>${plata(p.precio)}</span></a>`;

  // ————————————————— Buscador —————————————————
  document.body.insertAdjacentHTML('beforeend', `<div class="buscador" role="dialog" aria-modal="true" aria-label="Buscar" data-buscador>
    <div class="page-width buscador__in">
      <label class="buscador__barra"><svg class="icono" aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4.5 4.5"/></svg>
        <input type="search" placeholder="¿Qué tienes ganas de probar?" aria-label="Buscar productos" data-buscar-input autocomplete="off" enterkeyhint="search">
        <button class="buscador__cerrar" type="button" data-buscar-cerrar aria-label="Cerrar">${icono('i-cerrar')}</button></label>
      <div class="buscador__sugerencias" data-sugerencias><span>Lo más buscado</span>${['Succionador', 'Varita', 'Lencería', 'Esposas', 'Plug', 'Para él'].map((t) => `<button class="chip" type="button" data-sugerir="${t}">${t}</button>`).join('')}</div>
      <div class="buscador__resultados" data-resultados></div>
      <a class="enlace buscador__todos" data-buscar-todos hidden href="#"></a>
    </div></div>`);
  const buscador = $('[data-buscador]'), entrada = $('[data-buscar-input]');
  const urlBusqueda = (q) => (SHOPIFY ? `/search?q=${encodeURIComponent(q)}&type=product` : `coleccion.html?q=${encodeURIComponent(q)}`);
  const abrirBuscador = () => { buscador.classList.add('is-abierto'); velo.classList.add('is-visible'); setTimeout(() => entrada.focus(), 80); };
  const cerrarBuscador = () => { buscador.classList.remove('is-abierto'); if (!cajon.classList.contains('is-abierta')) velo.classList.remove('is-visible'); };
  window.Desvelo.abrirBuscador = abrirBuscador;
  let reloj;
  const buscar = async (q) => {
    const caja = $('[data-resultados]'), todos = $('[data-buscar-todos]');
    const t = sinTildes(q).trim();
    if (t.length < 2) { caja.innerHTML = ''; todos.hidden = true; return; }
    const palabras = t.split(/\s+/);
    const hallados = (await lista()).filter((p) => palabras.every((w) => p.texto.includes(w)))
      .sort((a, b) => (sinTildes(b.nombre).startsWith(t) - sinTildes(a.nombre).startsWith(t)) || (!!b.foto - !!a.foto) || (b.disponible - a.disponible));
    const marcar = (n) => n.replace(new RegExp(`(${q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i'), '<mark>$1</mark>');
    caja.innerHTML = hallados.slice(0, 5).map((p) => tarjetaMini(p, marcar(p.nombre))).join('') || `<p class="buscador__vacio">No encontramos «${q}». Prueba con otra palabra o explora las categorías.</p>`;
    todos.hidden = !hallados.length;
    todos.href = urlBusqueda(q);
    todos.innerHTML = `Ver ${hallados.length === 1 ? 'el resultado' : `los ${hallados.length} resultados`} ${icono('i-flecha')}`;
  };
  entrada.addEventListener('input', () => { clearTimeout(reloj); reloj = setTimeout(() => buscar(entrada.value), 120); });
  entrada.addEventListener('keydown', (e) => { if (e.key === 'Enter' && entrada.value.trim()) location.href = urlBusqueda(entrada.value.trim()); });
  $('[data-sugerencias]').addEventListener('click', (e) => { const b = e.target.closest('[data-sugerir]'); if (b) { entrada.value = b.dataset.sugerir; buscar(entrada.value); entrada.focus(); } });
  $('[data-buscar-cerrar]').addEventListener('click', (e) => { e.preventDefault(); cerrarBuscador(); });
  velo.addEventListener('click', cerrarBuscador);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && buscador.classList.contains('is-abierto')) cerrarBuscador(); });
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-buscar], .header-action[aria-label="Buscar"]'); if (b) { e.preventDefault(); abrirBuscador(); } });

  // ————————————————— Test «encuentra el tuyo» (3 preguntas → 3 productos) —————————————————
  const PREGUNTAS = [
    { id: 'para', titulo: '¿para quién es?', opciones: [['mi', 'Para mí', 'algo solo para mí'], ['pareja', 'Para la pareja', 'para jugar de a dos'], ['regalo', 'Para regalar', 'quiero sorprender a alguien']] },
    { id: 'genero', titulo: '¿para alguien femenino o masculino?', opciones: [['fem', 'Femenino', 'juguetes y lencería para ella'], ['masc', 'Masculino', 'lo que es para él'], ['ambos', 'Para los dos', 'lo que se usa de a dos']] },
    { id: 'exp', titulo: '¿cuánta experiencia?', opciones: [['primera', 'Primera vez', 'quiero partir simple'], ['algo', 'Ya tengo algo', 'busco subir un nivel'], ['nuevo', 'Quiero algo distinto', 'probar algo nuevo']] },
    { id: 'plata', titulo: '¿cuánto quieres gastar?', opciones: [['bajo', 'Hasta $20.000', 'un detalle'], ['medio', '$20.000 a $45.000', 'algo bueno'], ['alto', 'Más de $45.000', 'lo mejor'], ['igual', 'Da lo mismo', 'muéstrame todo']] },
  ];
  const puntaje = (p, r) => {
    const s = sinTildes(p.slug + ' ' + p.nombre); let n = 0;
    const tiene = (...w) => w.some((x) => s.includes(x));
    const para = p.para || [];
    // Género: femenino / masculino / para los dos («pareja» = se usa entre dos, curado en productos.py)
    if (r.genero === 'fem') n += ({ vibradores: 4, consoladores: 3, lenceria: r.para === 'mi' ? 1 : 3 }[p.categoria] || 0) + (para.includes('ella') ? 2 : 0) - (p.categoria === 'para-el' ? 8 : 0);
    if (r.genero === 'masc') n += ({ 'para-el': 5, anal: 1 }[p.categoria] || 0) + (para.includes('el') ? 3 : 0) - (p.categoria === 'lenceria' ? 8 : 0) - (p.categoria === 'vibradores' && !para.includes('el') ? 2 : 0);
    if (r.genero === 'ambos') n += (para.includes('pareja') ? 5 : -3) + (p.categoria === 'bondage' ? 2 : 0);
    if (r.para === 'pareja') n += para.includes('pareja') ? 3 : 0;
    if (r.para === 'regalo') n += (tiene('rosa', 'esposas', 'body', 'conjunto', 'babydoll', 'corse', 'bala', 'varita') ? 4 : 0) + (p.categoria === 'lenceria' && r.genero !== 'masc' ? 2 : 0);
    if (r.exp === 'primera') n += (tiene('bala', 'varita', 'rosa', 'mini', 'clasico', 'joya-mini', 'esposas', 'lilo') ? 3 : 0) - (tiene('xl', 'grande', 'amarre', 'arnes') ? 3 : 0);
    if (r.exp === 'algo') n += (tiene('succionador', 'punto-g', 'doble', 'remoto', 'vidrio') ? 3 : 0);
    if (r.exp === 'nuevo') n += (tiene('vidrio', 'cristal', 'remoto', 'kit', 'amarre', 'arnes', 'cola', 'plug') ? 3 : 0);
    return n + (p.foto ? 2 : -10) + (p.disponible ? 0 : -20);
  };
  const enRango = (p, plata) => ({ bajo: p.precio <= 20000, medio: p.precio > 20000 && p.precio <= 45000, alto: p.precio > 45000, igual: true }[plata]);
  document.body.insertAdjacentHTML('beforeend', `<div class="test" role="dialog" aria-modal="true" aria-labelledby="test-t" data-test-modal><div class="test__caja" data-test-caja></div></div>`);
  const test = $('[data-test-modal]'), testCaja = $('[data-test-caja]');
  let resp = {}, paso = 0;
  const pintarTest = async () => {
    const prog = `<div class="test__progreso" aria-hidden="true">${PREGUNTAS.map((_, i) => `<i class="${i < paso || paso === PREGUNTAS.length ? 'is-hecho' : ''}"></i>`).join('')}</div>`;
    const cerrar = `<button class="test__cerrar" type="button" data-test-cerrar aria-label="Cerrar">${icono('i-cerrar')}</button>`;
    if (paso < PREGUNTAS.length) {
      const q = PREGUNTAS[paso];
      testCaja.innerHTML = `${cerrar}${prog}<p class="antetitulo">Pregunta ${paso + 1} de ${PREGUNTAS.length}</p><p class="marca-titulo test__pregunta" id="test-t">${q.titulo}</p>
        <div class="test__opciones">${q.opciones.map(([v, t, s]) => `<button class="opcion" type="button" data-resp="${v}"><b>${t}</b><span>${s}</span></button>`).join('')}</div>
        ${paso ? '<button class="test__volver" type="button" data-test-volver>Volver</button>' : ''}`;
      return;
    }
    const todos = (await lista()).filter((p) => enRango(p, resp.plata));
    // Un resultado por familia (no tres versiones del mismo producto)
    const familia = (p) => sinTildes(p.nombre.split(' · ')[0]).replace(/\b(clasico|intenso|suave|mini|xl)\b/g, '').trim();
    const vistos = new Set();
    const top = todos.map((p) => [puntaje(p, resp), p]).sort((a, b) => b[0] - a[0]).map((x) => x[1]).filter((p) => !vistos.has(familia(p)) && vistos.add(familia(p))).slice(0, 3);
    testCaja.innerHTML = `${cerrar}${prog}<p class="antetitulo">Tu resultado</p><p class="marca-titulo test__pregunta" id="test-t">${top.length ? 'esto es para ti.' : 'casi.'}</p>
      ${top.length ? `<div class="test__resultados">${top.map((p) => tarjetaMini(p)).join('')}</div>` : '<p class="bajada">No hay productos en ese rango. Prueba con otro presupuesto.</p>'}
      <div class="test__acciones">${top[0] ? `<a class="boton" href="${top[0].url}">Ver ${top[0].nombre.toLowerCase().startsWith('kit') ? 'el kit' : 'el primero'}</a>` : ''}<button class="boton boton--claro" type="button" data-test-otra>Hacer de nuevo</button></div>`;
  };
  const abrirTest = () => { resp = {}; paso = 0; pintarTest(); test.classList.add('is-abierto'); document.documentElement.style.overflow = 'hidden'; };
  const cerrarTest = () => { test.classList.remove('is-abierto'); document.documentElement.style.overflow = ''; };
  testCaja.addEventListener('click', (e) => {
    const r = e.target.closest('[data-resp]');
    if (r) { resp[PREGUNTAS[paso].id] = r.dataset.resp; paso++; pintarTest(); return; }
    if (e.target.closest('[data-test-volver]')) { paso = Math.max(0, paso - 1); pintarTest(); return; }
    if (e.target.closest('[data-test-otra]')) { resp = {}; paso = 0; pintarTest(); return; }
    if (e.target.closest('[data-test-cerrar]')) cerrarTest();
  });
  test.addEventListener('click', (e) => { if (e.target === test) cerrarTest(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && test.classList.contains('is-abierto')) cerrarTest(); });
  document.addEventListener('click', (e) => { if (e.target.closest('[data-test]')) { e.preventDefault(); abrirTest(); } });
  window.Desvelo.abrirTest = abrirTest;

  // ————————————————— Suscripción (pie) —————————————————
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-suscribir]'); if (!f || SHOPIFY) return; // en Shopify lo envía el formulario nativo
    e.preventDefault();
    f.innerHTML = '<p class="suscribir__ok">Listo, quedaste en la lista. (Vista previa: no se envió nada.)</p>';
  });

  // ————————————————— Bienvenida: «elige una carta» (una vez, a cambio del correo) —————————————————
  function bienvenida() {
    const cfg = (window.DesveloConfig || {}).bienvenida;
    if (!cfg || !cfg.activa || leer('desvelo-bienvenida') || document.body.hasAttribute('data-sin-edad')) return;
    let lanzada = false;
    const lanzar = () => {
      if (lanzada || $('[data-edad]') || cajon.classList.contains('is-abierta')) return;
      lanzada = true; guardar('desvelo-bienvenida', 'vista');
      const dorso = `<svg viewBox="65 -714 849 746" aria-hidden="true"><use href="${BASE}desvelo-sprite.svg?v=dpunto#amp" x="65" y="-714" width="849" height="746" fill="currentColor"/></svg>`;
      document.body.insertAdjacentHTML('beforeend', `<div class="bienvenida" role="dialog" aria-modal="true" aria-labelledby="bv-t" data-bienvenida>
        <div class="bienvenida__caja">
          <button class="bienvenida__cerrar" type="button" data-bv-cerrar aria-label="Cerrar">${icono('i-cerrar')}</button>
          <p class="marca-titulo bienvenida__titulo" id="bv-t">elige una carta.</p>
          <p data-bv-txt>Déjanos tu correo y da vuelta una: cada carta esconde un regalo para tu primera compra.</p>
          <div class="cartas">${cfg.cartas.map((c, i) => `<button class="carta" type="button" data-carta="${i}" disabled aria-label="Carta ${i + 1}"><span class="carta__cara carta__dorso">${dorso}</span><span class="carta__cara carta__frente"><span>${c.grande}</span>${c.texto}</span></button>`).join('')}</div>
          <form data-bv-form><input type="email" name="email" required placeholder="tucorreo@ejemplo.cl" autocomplete="email" aria-label="Correo"><button class="boton" type="submit">Quiero mi carta</button></form>
          <p class="bienvenida__legal gv-nota">Al participar aceptas recibir novedades. Puedes darte de baja cuando quieras. Solo mayores de 18.</p>
          <button class="bienvenida__no" type="button" data-bv-cerrar>Ahora no</button>
        </div></div>`);
      const m = $('[data-bienvenida]');
      requestAnimationFrame(() => m.classList.add('is-visible'));
      const cerrar = () => { m.classList.remove('is-visible'); setTimeout(() => m.remove(), 400); };
      $$('[data-bv-cerrar]', m).forEach((x) => x.addEventListener('click', cerrar));
      m.addEventListener('click', (e) => { if (e.target === m) cerrar(); });
      $('[data-bv-form]', m).addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = e.target.email.value;
        if (SHOPIFY) {
          const f = new FormData(); f.append('form_type', 'customer'); f.append('utf8', '✓'); f.append('contact[email]', email); f.append('contact[tags]', 'bienvenida,newsletter');
          fetch('/contact', { method: 'POST', body: f }).catch(() => {});
        }
        guardar('desvelo-bienvenida', 'correo');
        e.target.hidden = true;
        $('[data-bv-txt]', m).textContent = 'Listo. Ahora elige una.';
        $$('[data-carta]', m).forEach((c) => (c.disabled = false));
      });
      $$('[data-carta]', m).forEach((c) => c.addEventListener('click', () => {
        $$('[data-carta]', m).forEach((x) => (x.disabled = true));
        c.classList.add('is-volteada');
        const premio = cfg.cartas[+c.dataset.carta];
        setTimeout(() => {
          $('[data-bv-txt]', m).innerHTML = `Te salió <b>${premio.grande} ${premio.texto}</b>. Usa este código al pagar:`;
          $('[data-bv-txt]', m).insertAdjacentHTML('afterend', `<span class="bienvenida__codigo">${premio.codigo}<button class="boton boton--claro" type="button" style="min-height:34px;padding:0 14px;font-size:12px" data-bv-copiar>Copiar</button></span>`);
          $('[data-bv-copiar]', m).addEventListener('click', async (ev) => { try { await navigator.clipboard.writeText(premio.codigo); ev.target.textContent = 'Copiado'; } catch { ev.target.textContent = premio.codigo; } });
          $('.bienvenida__no', m).textContent = 'Seguir mirando';
          guardar('desvelo-codigo', premio.codigo);
        }, 750);
      }));
    };
    setTimeout(lanzar, (cfg.segundos || 12) * 1000);
    document.addEventListener('mouseout', (e) => { if (!e.relatedTarget && e.clientY <= 0) lanzar(); });
  }

  document.addEventListener('DOMContentLoaded', () => {
    pintarContador();
    bienvenida();

    // — Menú del celular —
    const toggle = $('[data-nav-toggle]'), nav = $('#MobileNav');
    if (toggle && nav) {
      // Panel lateral: sale del encabezado (su backdrop-filter atrapa lo fijo) y entra desde la izquierda con un velo
      document.body.append(nav);
      nav.setAttribute('role', 'dialog'); nav.setAttribute('aria-modal', 'true');
      const logo = $('.brand-logo img');
      nav.insertAdjacentHTML('afterbegin', `<div class="mobile-nav__cabeza">${logo ? `<img src="${logo.getAttribute('src')}" alt="Duraznito" class="mobile-nav__logo">` : ''}<button class="mobile-nav__cerrar" type="button" data-nav-cerrar aria-label="Cerrar menú"><svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>`);
      const veloNav = document.createElement('div'); veloNav.className = 'mobile-nav__velo'; document.body.append(veloNav);
      const fijar = (a) => {
        nav.classList.toggle('is-open', a); veloNav.classList.toggle('is-visible', a);
        toggle.setAttribute('aria-expanded', String(a)); document.documentElement.style.overflow = a ? 'hidden' : '';
        nav.style.transform = ''; veloNav.style.opacity = '';
        if (a) setTimeout(() => $('[data-nav-cerrar]', nav).focus({ preventScroll: true }), 50);
      };
      toggle.addEventListener('click', () => fijar(!nav.classList.contains('is-open')));
      veloNav.addEventListener('click', () => fijar(false));
      nav.addEventListener('click', (e) => { if (e.target.closest('[data-nav-cerrar], a, [data-test]')) fijar(false); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { fijar(false); toggle.focus(); } });
      // Deslizar a la izquierda para cerrar (sigue al dedo)
      let x0 = null, y0 = 0, dx = 0, horizontal = null;
      nav.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; horizontal = null; }, { passive: true });
      nav.addEventListener('touchmove', (e) => {
        if (x0 === null) return;
        const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
        if (horizontal === null && Math.abs(mx) + Math.abs(my) > 8) horizontal = Math.abs(mx) > Math.abs(my) && !e.target.closest('.mobile-nav__tipos');
        if (!horizontal) return;
        dx = Math.min(0, mx); nav.classList.add('is-arrastre'); nav.style.transform = `translateX(${dx}px)`; veloNav.style.opacity = String(1 + dx / nav.offsetWidth);
      }, { passive: true });
      nav.addEventListener('touchend', () => { nav.classList.remove('is-arrastre'); if (horizontal && dx < -70) fijar(false); else { nav.style.transform = ''; veloNav.style.opacity = ''; } x0 = null; });
    }

    // — Carrusel: scroll-snap (deslizar nativo) + avance automático pausable —
    $$('[data-carrusel]').forEach((c) => {
      const pista = $('.carrusel__pista', c), slides = [...pista.children], puntos = $('[data-puntos]', c), pausa = $('[data-pausa]', c);
      if (!puntos) return;
      const intervalo = parseFloat(getComputedStyle(c).getPropertyValue('--intervalo')) * 1000 || 5000;
      let actual = 0, reloj = null, pausado = reducido;
      slides.forEach((_, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'carrusel__punto'; b.setAttribute('aria-label', `Ir al ${i + 1}`); b.addEventListener('click', () => { ir(i); reiniciar(); }); puntos.append(b); });
      const marcar = (i) => { actual = i; [...puntos.children].forEach((p, k) => { p.classList.toggle('is-activo', k === i); if (k === i) { p.style.animation = 'none'; void p.offsetWidth; p.style.animation = ''; } }); };
      const ir = (i) => { const n = (i + slides.length) % slides.length; pista.scrollTo({ left: slides[n].offsetLeft, behavior: reducido ? 'auto' : 'smooth' }); marcar(n); };
      const reiniciar = () => { clearInterval(reloj); if (!pausado) reloj = setInterval(() => ir(actual + 1), intervalo); };
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.intersectionRatio > 0.6) marcar(slides.indexOf(e.target)); }), { root: pista, threshold: [0.6] });
      slides.forEach((s) => io.observe(s));
      $('[data-prev]', c)?.addEventListener('click', () => { ir(actual - 1); reiniciar(); });
      $('[data-next]', c)?.addEventListener('click', () => { ir(actual + 1); reiniciar(); });
      pausa?.addEventListener('click', () => { pausado = !pausado; c.classList.toggle('is-pausado', pausado); pausa.setAttribute('aria-label', pausado ? 'Reanudar' : 'Pausar'); pausa.querySelector('use')?.setAttribute('href', pausado ? '#i-play' : '#i-pausa'); reiniciar(); });
      pista.addEventListener('pointerdown', () => clearInterval(reloj));
      pista.addEventListener('pointerup', reiniciar);
      c.classList.toggle('is-pausado', pausado); marcar(0); reiniciar();
    });

    // — Hoja de filtros del catálogo en Shopify (la vista previa la maneja tienda-demo.js) —
    if (SHOPIFY) document.addEventListener('click', (e) => {
      const h = $('[data-hoja]'); if (!h) return;
      if (e.target.closest('[data-abrir-filtros]')) h.classList.add('is-abierta');
      if (e.target.closest('[data-cerrar-hoja]')) h.classList.remove('is-abierta');
    });

    // — Menú «Todas las categorías» —
    const btnCat = $('[data-catalogo]'), menuCat = $('[data-catalogo-menu]');
    if (btnCat && menuCat) {
      const fijarCat = (a) => { menuCat.classList.toggle('is-abierto', a); btnCat.setAttribute('aria-expanded', String(a)); };
      btnCat.addEventListener('click', (e) => { e.stopPropagation(); fijarCat(!menuCat.classList.contains('is-abierto')); });
      document.addEventListener('click', (e) => { if (!e.target.closest('[data-catalogo-menu]')) fijarCat(false); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fijarCat(false); });
    }

    // — Pestañas de productos —
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-pestana]'); if (!t) return;
      const grupo = t.closest('[role="tablist"]'), seccion = t.closest('section');
      $$('[data-pestana]', grupo).forEach((b) => b.setAttribute('aria-selected', String(b === t)));
      $$('.panel-productos', seccion).forEach((pn) => { pn.hidden = pn.id !== t.getAttribute('aria-controls'); });
      window.Desvelo.observarApariciones?.(seccion);
    });

    // — Shop the look: punto → ficha de vidrio con el producto —
    $$('[data-look]').forEach((look) => {
      const fichaEl = $('[data-look-ficha]', look), escena = $('.look__escena', look);
      const cerrar = () => { fichaEl.classList.remove('is-visible'); $$('[data-punto]', look).forEach((b) => b.setAttribute('aria-expanded', 'false')); };
      look.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-punto]');
        if (!b) { if (!e.target.closest('[data-look-ficha]')) cerrar(); return; }
        const abierto = b.getAttribute('aria-expanded') === 'true';
        cerrar(); if (abierto) return;
        b.setAttribute('aria-expanded', 'true');
        const item = $(`[data-look-item="${b.dataset.punto}"]`, look);
        $$('[data-look-item]', look).forEach((x) => x.classList.toggle('is-activo', x === item));
        item?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        const p = (await lista()).find((x) => x.slug === b.dataset.punto); if (!p) return;
        fichaEl.innerHTML = `<img src="${p.foto}" alt=""><span><b>${p.nombre}</b>${plata(p.precio)}</span><span class="look__ficha-acciones"><a class="boton boton--claro" href="${p.url}">Ver</a><button class="boton" type="button" data-agregar data-slug="${p.slug}">Agregar</button></span>`;
        const ex = b.offsetLeft, ey = b.offsetTop, w = escena.clientWidth, h = escena.clientHeight;
        const izq = ex + 270 > w ? ex - 268 : ex + 22, arr = Math.min(Math.max(ey - 60, 12), h - 160);
        fichaEl.style.left = `${izq}px`; fichaEl.style.top = `${arr}px`;
        fichaEl.classList.add('is-visible');
      });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });
    });

    // — Rieles de productos: flechas que avanzan una «página» —
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-riel]'); if (!b) return;
      const pista = b.closest('section')?.querySelector('[data-riel-pista]'); if (!pista) return;
      pista.scrollBy({ left: +b.dataset.riel * pista.clientWidth * 0.9, behavior: reducido ? 'auto' : 'smooth' });
    });

    // — Página de producto en Shopify (la vista previa la arma tienda-demo.js) —
    const pdp = SHOPIFY && $('[data-pdp]');
    if (pdp) {
      const principal = $('[data-variante-principal]', pdp);
      let cantidad = 1, precioBase = +($('[data-precio-base]', pdp)?.dataset.precioBase || 0);
      const marcados = () => $$('[data-completa] input:checked', pdp);
      const pintarTotal = () => {
        const total = precioBase * cantidad + marcados().reduce((t, i) => t + +i.dataset.precio, 0), n = cantidad + marcados().length;
        const t = $('[data-total]', pdp); if (t) t.textContent = plata(total / 100);
        const tt = $('[data-total-txt]', pdp); if (tt) tt.textContent = n > 1 ? `Total · ${n} productos` : 'Total';
      };
      $$('[data-cant-pdp]', pdp).forEach((b) => b.addEventListener('click', () => { cantidad = Math.max(1, Math.min(9, cantidad + +b.dataset.cantPdp)); $('[data-cantidad]', pdp).textContent = cantidad; pintarTotal(); }));
      $('[data-completa]', pdp)?.addEventListener('change', pintarTotal);
      $('[data-variantes]', pdp)?.addEventListener('change', (e) => { const o = e.target.selectedOptions[0]; principal.value = o.value; precioBase = +o.dataset.precio; pintarTotal(); });
      // Opciones como botones (color y talla): se busca la variante que calza con lo elegido
      const variantesJSON = JSON.parse($('[data-variantes-json]', pdp)?.textContent || '[]');
      pdp.addEventListener('click', (e) => {
        const b = e.target.closest('[data-opcion-indice]'); if (!b || b.disabled) return;
        const grupo = b.closest('[role="radiogroup"]');
        $$('[data-opcion-indice]', grupo).forEach((x) => x.setAttribute('aria-checked', String(x === b)));
        const v = grupo.querySelector('[data-opcion-valor]'); if (v) v.textContent = b.dataset.valor;
        const elegido = []; $$('[data-opcion-indice][aria-checked="true"]', pdp).forEach((x) => { elegido[+x.dataset.opcionIndice] = x.dataset.valor; });
        const vari = variantesJSON.find((x) => x.options.every((o, k) => elegido[k] === undefined || elegido[k] === o));
        if (!vari) return;
        principal.value = vari.id; precioBase = vari.price; pintarTotal();
        const id = vari.featured_media?.id; if (id) { const figs = $$('[data-pista] figure', pdp); const k = figs.findIndex((f) => f.dataset.mediaId === String(id)); if (k >= 0) ir(k); }
      });
      const comprar = async (b) => {
        const prop = window.Desvelo.propiedadesRegalo(pdp);
        await Bolsa.agregar([{ variante: principal.value, cantidad, ...(prop ? { properties: prop } : {}) }, ...marcados().map((i) => ({ variante: i.value }))]);
        if (b.dataset.comprar === 'ahora') location.href = '/checkout'; else abrirBolsa();
      };
      $$('[data-comprar]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); comprar(b); }));
      const pista = $('[data-pista]', pdp), n = pista ? pista.children.length : 0;
      if (n > 1 && matchMedia('(max-width: 989px)').matches) pista.classList.add('is-deslizable');
      let actual = 0;
      const ir = (i) => { actual = (i + n) % n; pista.scrollTo({ left: pista.clientWidth * actual, behavior: 'smooth' }); $$('[data-mini]', pdp).forEach((b, k) => b.setAttribute('aria-current', String(k === actual))); $$('.galeria__puntos i', pdp).forEach((b, k) => b.classList.toggle('is-activo', k === actual)); };
      $$('[data-mini]', pdp).forEach((b) => b.addEventListener('click', () => ir(+b.dataset.mini)));
      $$('[data-ir]', pdp).forEach((b) => b.addEventListener('click', () => ir(actual + +b.dataset.ir)));
      $$('[data-entrega]', pdp).forEach((el) => { el.outerHTML = window.Desvelo.entregaHTML(); });
      window.Desvelo.activarFicha(pdp);
      const barra = $('[data-barra]'), acciones = $('.compra__acciones', pdp);
      if (barra && acciones) new IntersectionObserver(([e]) => barra.classList.toggle('is-visible', !e.isIntersecting && e.boundingClientRect.top < 0)).observe(acciones);
    }
    // Recomendaciones de Shopify (se cargan aparte para no frenar la página)
    $$('[data-recomendaciones]').forEach(async (s) => {
      if (!SHOPIFY || s.children.length) return;
      const html = await fetch(s.dataset.url).then((r) => r.text());
      const nuevo = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-recomendaciones]');
      if (nuevo) s.innerHTML = nuevo.innerHTML;
    });

    // — Sin apariciones al hacer scroll (Max, 2-nov): todo queda visible de inmediato —
    $$('.aparece').forEach((el) => el.classList.add('is-visible'));
    window.Desvelo.observarApariciones = (raiz) => $$('.aparece:not(.is-visible)', raiz).forEach((el) => el.classList.add('is-visible'));
  });

  // ═════════ v5 · F3 — La ficha que vende (compartido: vista previa y Shopify) ═════════
  const D5 = window.Desvelo;
  const TALLAS = ['S', 'M', 'L', 'XL'];

  // «Lleva 2» vivo: cuánto te falta y cuánto ahorras, con los precios reales
  D5.lleva2HTML = (precio, desde, descuento = 15, minimo = 2, producto = '') => `<div class="lleva2" data-lleva2 data-producto="${producto}" data-precio="${precio}" data-desde="${desde}" data-descuento="${descuento}" data-minimo="${minimo}">
      <span class="lleva2__ranuras" aria-hidden="true">${'<i></i>'.repeat(minimo)}</span>
      <p data-lleva2-txt>Lleva ${minimo} prendas de lencería y ahorra ${descuento} %.</p></div>`;
  async function lenceriaEnBolsa() {
    if (SHOPIFY) {
      const c = await fetch('/cart.js').then((r) => r.json()).catch(() => ({ items: [] }));
      const its = c.items.filter((i) => /lencer/i.test(i.product_type || ''));
      return { n: its.reduce((t, i) => t + i.quantity, 0), suma: its.reduce((t, i) => t + (i.final_price / 100) * i.quantity, 0), ids: its.map((i) => String(i.product_id)) };
    }
    const { productos } = await datos();
    const lista = JSON.parse(leer('desvelo-bolsa') || '[]');
    let n = 0, suma = 0; const ids = [];
    lista.forEach((l) => { const p = productos.find((x) => x.slug === l.slug); if (p && p.categoria === 'lenceria') { n += l.cantidad; suma += p.precio * l.cantidad; ids.push(p.slug); } });
    return { n, suma, ids };
  }
  async function pintarLleva2(el) {
    const precio = +el.dataset.precio, desde = +el.dataset.desde, pct = +el.dataset.descuento, min = +el.dataset.minimo;
    const { n, suma, ids } = await lenceriaEnBolsa();
    const yaEsta = ids.includes(el.dataset.producto);
    const txt = $('[data-lleva2-txt]', el);
    $$('.lleva2__ranuras i', el).forEach((r, k) => r.classList.toggle('is-llena', k < n));
    el.classList.toggle('is-activa', n >= min);
    if (n >= min) txt.innerHTML = `<b>Tu ${pct} % ya está activo en la bolsa.</b> Esta prenda también baja ${pct} %: queda en ${plata(precio * (1 - pct / 100))}.`;
    else if (n === min - 1 && yaEsta) txt.innerHTML = `<b>Esta ya está en tu bolsa.</b> Suma otra prenda y ahorras desde ${plata((precio + desde) * pct / 100)}.`;
    else if (n === min - 1) txt.innerHTML = `<b>Ya tienes ${n} prenda en tu bolsa.</b> Suma esta y ahorras ${plata((precio + suma) * pct / 100)} en las dos.`;
    else txt.innerHTML = `<b>Lleva ${min} prendas y ahorra ${pct} %.</b> Con esta y otra, ahorras desde ${plata((precio + desde) * pct / 100)}.`;
  }
  document.addEventListener('desvelo:bolsa', () => $$('[data-lleva2]').forEach(pintarLleva2));

  // Modo regalo: nota en una tarjeta; viaja como propiedades de la línea (Shopify: properties[...])
  D5.regaloHTML = () => `<div class="regalo" data-regalo-caja>
      <label class="regalo__toggle"><input type="checkbox" name="properties[Para regalo]" value="Sí" data-regalo><span class="regalo__switch" aria-hidden="true"></span>
        <span class="regalo__txt"><b>Es para regalar</b><small>Tu nota va escrita en una tarjeta. Sin precios dentro del paquete.</small></span></label>
      <div class="regalo__nota" data-regalo-nota hidden><label class="sr-only" for="nota-regalo">Nota para la tarjeta</label>
        <textarea id="nota-regalo" name="properties[Nota]" maxlength="140" rows="3" placeholder="Tu nota (opcional)" data-nota></textarea><small><span data-nota-cuenta>0</span>/140</small></div></div>`;
  D5.propiedadesRegalo = (raiz = document) => {
    if (!$('[data-regalo]', raiz)?.checked) return null;
    const nota = ($('[data-nota]', raiz)?.value || '').trim();
    return { 'Para regalo': 'Sí', ...(nota ? { Nota: nota } : {}) };
  };

  // «¿Qué talla soy?»: 3 preguntas → talla recomendada (y la marca)
  const PREG_TALLA = [
    { k: 'usa', t: '¿Qué talla usas en ropa interior?', o: [['0', 'XS o S'], ['1', 'M'], ['2', 'L'], ['3', 'XL o más']] },
    { k: 'queda', t: '¿Cómo te gusta que quede?', o: [['0', 'Ajustado, que marque'], ['0', 'Justo'], ['1', 'Suelto, cómodo']] },
    { k: 'para', t: '¿Para quién es?', o: [['mi', 'Para mí'], ['regalo', 'Para regalar']] },
  ];
  function abrirTallador(tipo, raiz) {
    const r = {}; let paso = 0;
    document.body.insertAdjacentHTML('beforeend', `<div class="tallador" role="dialog" aria-modal="true" aria-labelledby="tallador-t" data-tallador>
      <div class="tallador__caja"><button class="tallador__cerrar" type="button" aria-label="Cerrar" data-tallador-cerrar>×</button>
        <p class="marca-titulo tallador__titulo" id="tallador-t">¿qué talla soy?</p><div class="tallador__pasos" aria-hidden="true">${PREG_TALLA.map(() => '<i></i>').join('')}</div>
        <div class="tallador__cuerpo" data-tallador-cuerpo></div></div></div>`);
    const m = $('[data-tallador]'), cuerpo = $('[data-tallador-cuerpo]', m);
    const cerrar = () => { m.classList.remove('is-visible'); setTimeout(() => m.remove(), 350); };
    const pintar = () => {
      $$('.tallador__pasos i', m).forEach((i, k) => i.classList.toggle('is-hecho', k <= paso));
      if (paso < PREG_TALLA.length) {
        const q = PREG_TALLA[paso];
        cuerpo.innerHTML = `<p class="tallador__q">${q.t}</p><div class="tallador__op">${q.o.map(([v, t]) => `<button type="button" class="chip" data-v="${v}">${t}</button>`).join('')}</div>`;
        $$('[data-v]', cuerpo).forEach((b) => b.addEventListener('click', () => { r[q.k] = b.dataset.v; paso++; pintar(); }));
        return;
      }
      const i = Math.min(3, +r.usa + +r.queda);
      const talla = TALLAS[i];
      const extra = tipo === 'corses' ? 'En corsé, si estás entre dos tallas, elige la más grande: se ajusta con los broches.' : 'En encaje elástico, si estás entre dos tallas, elige la más chica.';
      cuerpo.innerHTML = `<p class="tallador__resultado"><span>tu talla</span><b class="tallador__talla">${talla}<span class="punto-final">.</span></b></p>
        <p class="tallador__nota">${extra}${r.para === 'regalo' ? ' ¿No sabes su talla? Mira la etiqueta de una prenda suya.' : ''} Si dudas, escríbenos y te ayudamos.</p>
        <button class="boton" type="button" data-usar-talla="${talla}">Elegir talla ${talla}</button>`;
      $('[data-usar-talla]', cuerpo).addEventListener('click', () => {
        const chip = $(`.talla[data-talla="${talla}"]`, raiz);
        chip ? chip.click() : null; cerrar();
        avisar(null, `Talla <strong>${talla}</strong> elegida`, false);
      });
    };
    pintar();
    requestAnimationFrame(() => m.classList.add('is-visible'));
    m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-tallador-cerrar]')) cerrar(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { cerrar(); document.removeEventListener('keydown', esc); } });
  }

  // Lupa de encaje: la foto se amplía donde apuntas (mouse) o donde tocas (celular)
  function activarLupa(g) {
    const origen = (e) => { const img = e.target.closest('figure')?.querySelector('img'); if (!img) return null; const b = img.getBoundingClientRect(); img.style.transformOrigin = `${((e.clientX - b.left) / b.width) * 100}% ${((e.clientY - b.top) / b.height) * 100}%`; return img; };
    if (matchMedia('(hover: hover)').matches) {
      g.addEventListener('pointermove', (e) => { if (e.target.closest('button')) { g.classList.remove('is-lupa'); return; } if (origen(e)) g.classList.add('is-lupa'); });
      g.addEventListener('pointerleave', () => g.classList.remove('is-lupa'));
    } else g.addEventListener('click', (e) => { if (e.target.closest('button')) return; if (origen(e)) g.classList.toggle('is-lupa'); });
  }

  D5.activarFicha = (raiz = document) => {
    $$('[data-lupa]', raiz).forEach(activarLupa);
    $$('[data-que-talla]', raiz).forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); abrirTallador(b.dataset.tipo, raiz); }));
    const reg = $('[data-regalo]', raiz), nota = $('[data-nota]', raiz);
    reg?.addEventListener('change', () => { $('[data-regalo-nota]', raiz).hidden = !reg.checked; if (reg.checked) nota?.focus(); });
    nota?.addEventListener('input', () => { $('[data-nota-cuenta]', raiz).textContent = nota.value.length; });
    $$('[data-lleva2]', raiz).forEach(pintarLleva2);
  };

  // — Solo modo claro (Max, 5-nov): sin interruptor ni modo noche; se limpia el estado guardado de antes —
  delete document.documentElement.dataset.luz;
  try { localStorage.removeItem('desvelo-luz'); } catch (e) {}

  // Tarjeta: pasar por una miniatura de color muestra esa foto arriba (y vuelve al salir)
  document.addEventListener('pointerover', (e) => {
    const m = e.target.closest?.('.miniatura[data-foto]'); if (!m) return;
    const img = m.closest('.product-card')?.querySelector('.product-card__principal'); if (!img) return;
    if (!img.dataset.original) img.dataset.original = img.src;
    img.src = m.dataset.foto; m.closest('.product-card').classList.add('is-miniatura');
  });
  document.addEventListener('pointerout', (e) => {
    const m = e.target.closest?.('.miniatura[data-foto]'); if (!m || m.contains(e.relatedTarget)) return;
    const c = m.closest('.product-card'), img = c?.querySelector('.product-card__principal'); if (!img?.dataset.original) return;
    img.src = img.dataset.original; c.classList.remove('is-miniatura');
  });

  // Banners: se puede tocar en cualquier parte y lleva a lo que dice su botón (menos en los controles del carrusel)
  document.addEventListener('click', (e) => {
    const ban = e.target.closest('.banner'); if (!ban || e.target.closest('a, button, .carrusel__controles')) return;
    const link = ban.querySelector('.banner__copy a[href]'); if (!link) return;
    if (e.metaKey || e.ctrlKey) window.open(link.href, '_blank'); else location.href = link.href;
  });
  // Banner: el titular se escribe (como teclado) y el punto vino cae al final, el gesto del logo «d.».
  // La frase completa ya ocupa su lugar (invisible) y las letras se encienden en su sitio: nada salta de línea ni se corta.
  const tituloH = $('.banner .banner__titulo');
  if (tituloH && !reducido && /\.$/.test(tituloH.textContent.trim())) {
    const texto = tituloH.textContent.trim().slice(0, -1);
    tituloH.setAttribute('aria-label', texto + '.');
    tituloH.innerHTML = `<span class="escribe" aria-hidden="true">${texto.split(/(\s+)/).map((w) => (/^\s+$/.test(w) ? w : `<span class="escribe__palabra">${[...w].map((ch) => `<span class="letra">${ch}</span>`).join('')}</span>`)).join('')}<span class="punto-final punto-cae">.</span></span>`;
    const letras = $$('.letra', tituloH); let i = 0;
    const paso = () => { letras[i - 1]?.classList.remove('is-cursor'); if (i < letras.length) { letras[i].classList.add('is-on', 'is-cursor'); i++; setTimeout(paso, 38 + Math.random() * 40); } else tituloH.classList.add('is-escrito'); };
    setTimeout(paso, 350);
  }

  // ═════════ v5 · F6 — «Me lo guardo» (sin cuenta, en este navegador) ═════════
  const MARCA_SVG = '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5h10v15.5l-5-3.6-5 3.6z"/></svg>';
  const guardados = () => { try { return JSON.parse(leer('desvelo-guardados') || '[]'); } catch (e) { return []; } };
  D5.guardarHTML = (h, nombre, ficha = false) => `<button class="guardar${ficha ? ' guardar--ficha' : ''}" type="button" data-guardar="${h}" aria-pressed="${guardados().includes(h)}" aria-label="Guardar ${String(nombre).replace(/"/g, '')}">${MARCA_SVG}${ficha ? '<span>Me lo guardo</span>' : ''}</button>`;
  const pintarGuardados = () => {
    const g = guardados();
    $$('[data-guardar]').forEach((b) => { const on = g.includes(b.dataset.guardar); if (b.getAttribute('aria-pressed') !== String(on)) b.setAttribute('aria-pressed', String(on)); const t = b.querySelector('span'), txt = on ? 'Guardado' : 'Me lo guardo'; if (t && t.textContent !== txt) t.textContent = txt; });
    let h = $('[data-ver-guardados]');
    const acciones = $('.header-actions');
    if (!h && acciones) {
      acciones.insertAdjacentHTML('afterbegin', `<button class="header-action header-action--guardados" type="button" data-ver-guardados aria-label="Guardados">${MARCA_SVG}</button>`);
      h = $('[data-ver-guardados]');
    }
    if (h) { if (h.hidden !== !g.length) h.hidden = !g.length; let c = h.querySelector('.header-action__count'); if (!c) { h.insertAdjacentHTML('beforeend', '<span class="header-action__count"></span>'); c = h.querySelector('.header-action__count'); } if (c.textContent !== String(g.length)) c.textContent = g.length; }
  };
  async function fichasGuardadas() {
    const g = guardados();
    if (SHOPIFY) return (await Promise.all(g.map((h) => fetch(`/products/${h}.js`).then((r) => (r.ok ? r.json() : null)).catch(() => null)))).filter(Boolean).map((p) => ({ h: p.handle, nombre: p.title, precio: p.price / 100, foto: p.featured_image, url: p.url }));
    const { productos } = await datos();
    return g.map((h) => productos.find((p) => p.slug === h)).filter(Boolean).map((p) => ({ h: p.slug, nombre: p.nombre, precio: p.precio, foto: p.galeria[0] ? `${BASE}desvelo-${p.galeria[0]}.jpg` : '', url: `producto.html?p=${p.slug}` }));
  }
  async function abrirGuardados() {
    $('[data-guardados]')?.remove();
    const items = await fichasGuardadas();
    document.body.insertAdjacentHTML('beforeend', `<div class="guardados" data-guardados role="dialog" aria-modal="true" aria-labelledby="guardados-t"><div class="guardados__caja">
      <div class="guardados__cabeza"><p class="marca-titulo" id="guardados-t">guardados<span class="punto-final">.</span></p><button class="bolsa__cerrar" type="button" data-cerrar-guardados aria-label="Cerrar">×</button></div>
      <div class="guardados__lista">${items.length ? items.map((p) => `<div class="linea"><a class="linea__foto" href="${p.url}">${p.foto ? `<img src="${p.foto}" alt="">` : ''}</a><div><a class="linea__nombre" href="${p.url}">${p.nombre}</a><p class="guardados__precio">${plata(p.precio)}</p></div><button class="linea__quitar" type="button" data-guardar="${p.h}" aria-pressed="true">Quitar</button></div>`).join('') : '<p class="guardados__vacio">Nada guardado todavía. Toca el marcador en lo que te guste y vuelve cuando quieras.</p>'}</div>
      <p class="bolsa__nota">Se guardan en este navegador. Nadie más los ve.</p></div></div>`);
    const m = $('[data-guardados]'); requestAnimationFrame(() => m.classList.add('is-abierta'));
    m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-cerrar-guardados]')) { m.classList.remove('is-abierta'); setTimeout(() => m.remove(), 400); } });
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-guardar]');
    if (b) {
      e.preventDefault(); e.stopPropagation();
      const h = b.dataset.guardar, g = guardados(), on = !g.includes(h);
      guardar('desvelo-guardados', JSON.stringify(on ? [...g, h] : g.filter((x) => x !== h)));
      pintarGuardados();
      if (b.closest('[data-guardados]')) { b.closest('.linea').remove(); return; }
      if (on) { b.classList.remove('is-pulso'); void b.offsetWidth; b.classList.add('is-pulso'); avisar(null, 'Guardado. Lo encuentras arriba, en el marcador.', false); }
      return;
    }
    if (e.target.closest('[data-ver-guardados]')) { e.preventDefault(); abrirGuardados(); }
  }, true);
  D5.pintarGuardados = pintarGuardados;
  pintarGuardados();
  new MutationObserver(() => { clearTimeout(pintarGuardados._t); pintarGuardados._t = setTimeout(pintarGuardados, 60); }).observe(document.body, { childList: true, subtree: true });
})();
