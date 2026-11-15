// Desvelo · motor de la VISTA PREVIA (no va a Shopify: allá lo hacen las plantillas Liquid).
// Arma producto.html?p=<slug> y coleccion.html?c=<categoria> desde desvelo-productos.json.
(() => {
  const D = window.Desvelo;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const foto = (p, i = 0) => (p.galeria[i] ? `${D.BASE}desvelo-${p.galeria[i]}.jpg` : null);
  const enCamino = () => `<span class="foto-en-camino">${D.MONO}<span>Foto en producción</span></span>`;
  const params = new URLSearchParams(location.search);
  const icono = (id) => `<svg class="icono" aria-hidden="true"><use href="#${id}"/></svg>`;

  let RES = { productos: {} };
  const cargarResenas = () => fetch(`${D.BASE}desvelo-resenas-demo.json?v=${D.V}`).then((r) => r.json()).then((x) => (RES = x)).catch(() => RES);
  const estrellas = (v) => `<span class="estrellas" style="--v:${v}" aria-label="${String(v).replace('.', ',')} de 5">★★★★★</span>`;
  const pct = (p) => (p.precioAntes ? Math.round((1 - p.precio / p.precioAntes) * 100) : 0);
  const insignia = (p) => (p.precioAntes ? `-${pct(p)}%` : null) || (p.categoria === 'lenceria' ? 'Lleva 2 · −15 %' : null) || insigniaBase(p);
  const esOferta = (p) => !!(p.precioAntes || p.pack || p.categoria === 'lenceria');
  const insigniaBase = (p) => (p.slug === 'succionador-de-velocidad-regulable' ? 'Favorito de la casa' : p.pack ? `Ahorras ${Math.round((p.ahorro / p.precioSuelto) * 100)} %` : p.stock.estado === 'agotado' ? 'Agotado' : p.stock.estado === 'pocos' ? `Quedan ${p.stock.unidades}` : p.primeraVez ? 'Primera vez' : '');
  const textoStock = (s) => ({ disponible: 'Disponible · despacho a todo Chile', pocos: `Quedan ${s.unidades} · se están yendo`, consultar: 'Confirmamos stock antes de despachar', agotado: 'Agotado por ahora' }[s.estado]);

  // Tarjeta (Max, 5-nov): sin agregar rápido (se elige bien en la ficha), sin píldoras sobre la foto;
  // el descuento va en el precio y los colores como miniaturas reales.
  const notaTarjeta = (p) => (p.stock.estado === 'agotado' ? 'Agotado por ahora' : p.pack ? `Ahorras ${D.plata(p.ahorro)} vs. por separado` : p.categoria === 'lenceria' ? 'Lleva 2 y paga 15 % menos' : p.stock.estado === 'pocos' ? `Quedan ${p.stock.unidades}` : '');
  const segundaFoto = (p) => (p.variantes && p.variantes.length > 1 ? p.variantes[1].foto : p.galeria.slice(1).find((g) => !g.startsWith('catalogo-')));
  const miniaturas = (p) => (p.variantes && p.variantes.length > 1 ? `<div class="product-card__miniaturas">${p.variantes.slice(0, 5).map((v) => `<a class="miniatura" href="producto.html?p=${p.slug}&amp;color=${v.codigo}" data-foto="${D.BASE}desvelo-${v.foto}.jpg" title="${esc(v.nombre)}" aria-label="${esc(p.nombre)} en ${esc(v.nombre.toLowerCase())}"><img src="${D.BASE}desvelo-${v.foto}.jpg" width="1024" height="1536" loading="lazy" alt=""></a>`).join('')}${p.variantes.length > 5 ? `<span class="miniaturas__mas">+${p.variantes.length - 5}</span>` : ''}</div>` : '');

  function tarjeta(p, cats) {
    const f = foto(p), sg = segundaFoto(p), n = notaTarjeta(p), url = `producto.html?p=${p.slug}`;
    return `<article class="product-card${p.categoria === 'lenceria' ? ' product-card--lenceria' : p.pack ? ' product-card--pack' : ''}" data-handle="${p.slug}">
      <div class="product-card__media"><a href="${url}" class="product-card__enlace" aria-label="${esc(p.nombre)}">${f ? `<img class="product-card__principal" src="${f}" width="1024" height="1536" loading="lazy" alt="${esc(p.nombre)}">` : enCamino()}${sg ? `<img class="product-card__segunda" src="${D.BASE}desvelo-${sg}.jpg" width="1024" height="1536" loading="lazy" alt="">` : ''}</a>
        ${D.guardarHTML(p.slug, p.nombre)}</div>
      <div class="product-card__info"><h3 class="product-card__title"><a href="${url}">${esc(p.nombre)}</a></h3>
      ${RES.productos[p.slug] ? `<p class="product-card__estrellas">${estrellas(RES.productos[p.slug].promedio)}<span>(${RES.productos[p.slug].total})</span></p>` : ''}
      <p class="product-card__precio${p.stock.estado === 'agotado' ? ' product-card__precio--agotado' : ''}${p.precioAntes || p.pack ? ' product-card__precio--oferta' : ''}">${D.plata(p.precio)}${p.precioAntes ? `<s>${D.plata(p.precioAntes)}</s><span class="product-card__dcto">−${pct(p)} %</span>` : ''}${p.pack ? `<s>${D.plata(p.precioSuelto)}</s>` : ''}</p>
      ${n ? `<p class="product-card__nota${p.categoria === 'lenceria' || p.pack ? ' product-card__nota--oferta' : ''}">${n}</p>` : ''}${miniaturas(p)}</div></article>`;
  }

  // ————————— Página de producto v2 (rediseño uxpeak, 15-nov) —————————
  // Móvil: galería con íconos en contenedor, tarjeta que sube sobre la foto, título que pasa a la barra superior,
  // barra inferior fija con cantidad + «Agregar a la bolsa · $total». Escritorio: galería izquierda, panel fijo derecha.
  const CFG = () => window.DesveloConfig || {};
  const entrega = () => (D.entregaHTML ? D.entregaHTML() : '');
  // Reseñas: el JSON actual es de DEMO. No se muestran estrellas ni conteos hasta tener reseñas reales.
  // TODO(Desvelo): poner RESENAS_REALES = true cuando desvelo-resenas-*.json traiga reseñas verificadas.
  const RESENAS_REALES = false;
  const COLOR_HEX = { negro: '#141213', verde: '#2F5A45', azul: '#25365F', rojo: '#9B1C2E', blanco: '#F4F1EC', rosado: '#E9B8C0', rosada: '#E9B8C0', fucsia: '#C2185B', morado: '#5B3A8C', lila: '#B49BD6', amarilla: '#E8C547', gris: '#9A9A9A', celeste: '#9CCBE6' };
  const ic = (id) => `<svg class="icono" aria-hidden="true"><use href="#${id}"/></svg>`;
  // Estatus sobre el título: solo si es verdad. TODO(Desvelo): «Más vendido» cuando haya ventas reales por producto.
  const estatus = (p) => (p.pack ? 'Pack con descuento' : p.slug === 'succionador-de-velocidad-regulable' ? 'Favorito de la casa' : p.primeraVez ? 'Ideal primera vez' : '');

  async function producto(raiz) {
    const { productos, categorias, uso, cuidado, promo } = await D.datos();
    const FICHAS = await fetch(`${D.BASE}desvelo-lenceria-fichas.json?v=${D.V}`).then((r) => r.json()).catch(() => ({}));
    if (RESENAS_REALES) await cargarResenas();
    const p = productos.find((x) => x.slug === params.get('p')) || productos.find((x) => x.slug === 'succionador-de-velocidad-regulable');
    const cat = categorias[p.categoria];
    const esLen = p.categoria === 'lenceria';
    const fi = FICHAS[p.slug] || null;
    const comps = (p.pack ? [] : p.complementos).map((s) => productos.find((x) => x.slug === s)).filter(Boolean);
    const relacionados = productos.filter((x) => x.categoria === p.categoria && x.slug !== p.slug).sort((a, b) => (a.stock.estado === 'agotado') - (b.stock.estado === 'agotado') || (b.galeria.length > 0) - (a.galeria.length > 0) || b.precio - a.precio).slice(0, 4);
    const agotado = p.stock.estado === 'agotado';
    document.title = `${p.nombre} · Desvelo`;
    document.body.classList.add('con-pdp2');

    // Fotos: estudio sobre blanco si existen; si no, las de siempre
    const fotos = (fi && fi.fotos.length ? fi.fotos : p.galeria).map((g) => `${D.BASE}desvelo-${g}.jpg`);
    const varias = fotos.length > 1;
    // Colores: muestras visibles (lencería con su tono; juguetes con su foto)
    const colores = fi && fi.colores.length ? fi.colores.map((c) => ({ nombre: c.nombre, hex: c.hex, foto: c.foto }))
      : (p.variantes || []).map((v) => ({ nombre: v.nombre, hex: COLOR_HEX[v.codigo.split('-')[0]] || null, img: `${D.BASE}desvelo-${v.foto}.jpg`, foto: p.galeria.indexOf(v.foto), codigo: v.codigo }));
    const tallas = esLen ? (fi ? fi.tallas : ['S', 'M', 'L', 'XL'].map((t) => ({ t, hay: true }))) : [];
    const tallaInicial = (tallas.find((t) => t.t === 'M' && t.hay) || tallas.find((t) => t.hay) || {}).t;
    const tallaUnica = tallas.length === 1 && tallas[0].t === 'Única';
    // «Lleva 2 prendas» (promo real de la tienda) como tarjeta de selección
    const otrasLen = esLen && promo ? productos.filter((x) => x.categoria === 'lenceria' && x.slug !== p.slug && x.stock.estado !== 'agotado').sort((a, b) => a.precio - b.precio) : [];
    const pctPromo = promo ? Math.round(promo.descuento * 100) : 0;
    const est = estatus(p);

    const guia = esLen ? `<details class="p2-guia"><summary>Guía de tallas${ic('i-next')}</summary><div class="p2-guia__c">
      ${fi && fi.tabla ? `<div class="p2-tabla-envoltura"><table class="p2-tabla"><thead><tr>${fi.tabla.columnas.map((c) => `<th>${esc(c.charAt(0).toUpperCase() + c.slice(1))}</th>`).join('')}</tr></thead><tbody>${fi.tabla.filas.map((f) => `<tr>${f.map((v) => `<td>${esc(String(v).replace('.', ','))}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="p2-nota">Medidas en centímetros, publicadas por el fabricante del modelo. Es talla asiática: si estás entre dos tallas, elige la mayor.</p>`
      : '<p class="p2-nota"><b>Talla asiática:</b> te recomendamos pedir una talla más.</p>'}
    </div></details>` : '';

    raiz.innerHTML = `
      <div class="p2-top" data-p2-top aria-hidden="true"><a class="p2-ico" href="coleccion.html?c=${p.categoria}" tabindex="-1" aria-label="Volver">${ic('i-prev')}</a><span class="p2-top__t">${esc(p.nombre)}</span><b class="p2-top__p">${D.plata(p.precio)}</b></div>
      <nav class="migas page-width" aria-label="Migas"><a href="index.html">Inicio</a><span aria-hidden="true">/</span><a href="coleccion.html?c=${p.categoria}">${cat.nombre}</a><span aria-hidden="true">/</span><span>${esc(p.nombre)}</span></nav>
      <div class="pdp2 page-width">
        <section class="p2-gal" aria-label="Fotos de ${esc(p.nombre)}">
          <div class="p2-gal__marco">
            <div class="p2-gal__pista" data-pista tabindex="0">${fotos.length ? fotos.map((f, i) => `<figure><img src="${f}" width="1200" height="1200" alt="${esc(p.nombre)} · foto ${i + 1} de ${fotos.length}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}></figure>`).join('') : `<figure>${enCamino()}</figure>`}</div>
            <div class="p2-gal__iconos">
              <a class="p2-ico" href="coleccion.html?c=${p.categoria}" data-atras aria-label="Volver">${ic('i-prev')}</a>
              <span class="p2-gal__der"><button class="p2-ico" type="button" data-compartir aria-label="Compartir"><svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5v11M7.5 8 12 3.5 16.5 8M5.5 13v5a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-5"/></svg></button>${D.guardarHTML(p.slug, p.nombre).replace('class="guardar', 'class="p2-ico guardar')}</span>
            </div>
            ${varias ? `<div class="p2-gal__puntos" role="tablist" aria-label="Fotos">${fotos.map((_, i) => `<button type="button" role="tab" data-ir="${i}" aria-label="Foto ${i + 1}"${i ? '' : ' class="is-on" aria-selected="true"'}></button>`).join('')}</div>
            <button class="p2-ico p2-gal__flecha p2-gal__flecha--prev" type="button" data-paso="-1" aria-label="Foto anterior">${ic('i-prev')}</button><button class="p2-ico p2-gal__flecha p2-gal__flecha--next" type="button" data-paso="1" aria-label="Foto siguiente">${ic('i-next')}</button>` : ''}
          </div>
          ${varias ? `<div class="p2-gal__mini">${fotos.map((f, i) => `<button type="button" data-ir="${i}" aria-label="Ver foto ${i + 1}"${i ? '' : ' aria-current="true"'}><img src="${f}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
        </section>

        <div class="p2-tarjeta">
          <div class="p2-panel">
            <div class="p2-tirador" aria-hidden="true"></div>
            ${est ? `<p class="p2-estatus">${esc(est)}</p>` : ''}
            <div class="p2-etiquetas"><a class="p2-eyebrow" href="coleccion.html?c=${p.categoria}">${esc(cat.nombre)}</a>${p.precioAntes ? `<span class="p2-badge">−${pct(p)}%</span>` : ''}</div>
            <div class="p2-cabeza">
              <h1 class="p2-titulo" data-titulo>${esc(p.nombre)}</h1>
              <p class="p2-precio">${p.precioAntes ? `<s>${D.plata(p.precioAntes)}</s>` : p.pack ? `<s>${D.plata(p.precioSuelto)}</s>` : ''}<b>${D.plata(p.precio)}</b></p>
            </div>
            <p class="p2-confianza">${ic('i-caja')}Envío discreto en caja lisa</p>
            ${RESENAS_REALES && RES.productos[p.slug] ? `<a class="p2-prueba" href="#resenas">${estrellas(RES.productos[p.slug].promedio)}<b>${String(RES.productos[p.slug].promedio).replace('.', ',')}</b><span>· ${RES.productos[p.slug].total} reseñas</span></a>` : '<p class="p2-prueba" hidden></p>'}
            ${p.pack ? `<p class="p2-ahorro">Ahorras ${D.plata(p.ahorro)} vs. comprar por separado</p>` : ''}
            <p class="p2-bajada">${esc(p.bajada || p.descripcion)}</p>

            ${colores.length > 1 ? `<div class="p2-grupo"><p class="p2-grupo__t">Color <span data-color-nombre>${esc(colores[0].nombre)}</span></p>
              <div class="p2-muestras" role="radiogroup" aria-label="Color">${colores.map((c, i) => `<button type="button" class="p2-muestra${c.hex ? '' : ' p2-muestra--foto'}" role="radio" aria-checked="${i === 0}" aria-label="${esc(c.nombre)}" data-tip="${esc(c.nombre)}" data-color="${esc(c.nombre)}" data-foto="${c.foto}"${c.codigo ? ` data-codigo="${c.codigo}"` : ''}>${c.hex ? `<i style="--c:${c.hex}"></i>` : `<img src="${c.img}" alt="">`}</button>`).join('')}</div></div>` : ''}

            ${tallas.length ? `<div class="p2-grupo"><p class="p2-grupo__t">Talla ${tallaUnica ? '<span>Única</span>' : `<span data-talla-nombre>${esc(tallaInicial || '')}</span>`}</p>
              <div class="p2-tallas" role="radiogroup" aria-label="Talla">${tallas.map((t) => `<button type="button" class="p2-talla" role="radio" aria-checked="${t.t === tallaInicial}" data-talla="${esc(t.t)}" data-tip="${!t.hay ? 'Agotada por ahora' : tallaUnica ? 'Talla única' : 'Si estás entre dos tallas, elige la mayor'}"${t.hay ? '' : ' disabled'}>${esc(t.t)}</button>`).join('')}</div>
              ${guia}</div>` : ''}

            ${otrasLen.length && !agotado ? `<div class="p2-sel" role="radiogroup" aria-label="Cuántas prendas">
              <button type="button" class="p2-sel__op" role="radio" aria-checked="false" data-modo="solo"><b>Solo esta prenda</b><span class="p2-sel__p">${D.plata(p.precio)}</span><span class="p2-sel__d">Sin descuento</span></button>
              <button type="button" class="p2-sel__op p2-sel__op--promo" role="radio" aria-checked="true" data-modo="dos" data-tip="${esc(promo.texto)}"><span class="p2-sel__tag">Más conveniente</span><b>Lleva 2 prendas</b><span class="p2-sel__p" data-dos-precio></span><span class="p2-sel__d" data-dos-ahorro>${pctPromo}% menos en las dos</span></button>
            </div>
            <div class="p2-segunda" data-segunda><p class="p2-grupo__t">Elige la segunda prenda <span>en tu misma talla</span></p>
              <div class="p2-segunda__fila">${otrasLen.slice(0, 6).map((x, i) => `<button type="button" class="p2-prenda" role="radio" aria-checked="${i === 0}" data-otra="${x.slug}" data-precio="${x.precio}"><img src="${FICHAS[x.slug]?.fotos[0] ? `${D.BASE}desvelo-${FICHAS[x.slug].fotos[0]}.jpg` : foto(x)}" alt="" loading="lazy"><span>${esc(x.nombre)}</span><b>${D.plata(x.precio)}</b></button>`).join('')}</div></div>` : ''}

            ${stockLinea(p)}

            ${agotado ? '<div class="p2-compra"><button class="boton p2-agregar" type="button" data-avisame>Avísame cuando vuelva</button></div>' : `
            <div class="p2-compra" data-compra>
              <div class="p2-cant" role="group" aria-label="Cantidad"><button type="button" data-cant-pdp="-1" aria-label="Uno menos">−</button><output data-cantidad aria-live="polite">1</output><button type="button" data-cant-pdp="1" aria-label="Uno más">+</button></div>
              <button class="p2-agregar" type="button" data-comprar="bolsa">Agregar a la bolsa <span aria-hidden="true">·</span> <span data-total>${D.plata(p.precio)}</span></button>
            </div>`}
            <ul class="p2-garantias">
              <li>${ic('i-caja')}Envío discreto en caja lisa</li>
              <li>${ic('i-pago')}Pago seguro</li>
              <li>${ic('i-envio')}Despacho a todo Chile</li>
            </ul>

          </div>

          <div class="p2-detalles">
            <div class="p2-texto"><p>${esc(p.descripcion || p.bajada)}</p></div>
            ${comps.length && !agotado ? `<div class="completa p2-completa" data-completa>
              <p class="completa__titulo">Completa tu pedido <span>llega en la misma caja</span></p>
              ${comps.map((c) => `<label class="complemento"><input type="checkbox" value="${c.slug}" data-precio="${c.precio}">
                <span class="complemento__foto">${foto(c) ? `<img src="${foto(c)}" alt="">` : enCamino()}</span>
                <span class="complemento__nombre">${esc(c.nombre)}<small>${esc(c.bajada)}</small></span>
                <span class="complemento__precio">+ ${D.plata(c.precio)}</span></label>`).join('')}
            </div>` : ''}
            ${agotado ? '' : D.regaloHTML()}
            ${p.pack ? `<div class="incluye"><p class="completa__titulo">Este pack incluye <span>${p.pack.length} productos</span></p>${p.pack.map((s) => productos.find((x) => x.slug === s)).filter(Boolean).map((x) => `<a class="incluye__item" href="producto.html?p=${x.slug}"><span class="complemento__foto">${foto(x) ? `<img src="${foto(x)}" alt="">` : enCamino()}</span><span class="complemento__nombre">${esc(x.nombre)}<small>${esc(x.bajada)}</small></span><span class="complemento__precio">${D.plata(x.precio)}</span></a>`).join('')}</div>` : ''}
            ${agotado ? '' : entrega()}
            <div class="acordeon">
              ${p.elegimos ? `<div class="elegimos">${D.MONO}<p><b>Por qué lo elegimos</b>${esc(p.elegimos)}</p></div>` : ''}
              <details><summary>Cuidado</summary><div class="acordeon__cuerpo"><p>${cuidado}</p></div></details>
              <details><summary>Cómo llega</summary><div class="acordeon__cuerpo"><p>Como cualquier compra online: envuelto en negro, con la etiqueta del courier y a nombre de una empresa. Nada dice Desvelo ni lo que hay dentro. Ni el conserje se entera, y mira que el conserje se entera de todo. Despachamos a todo Chile y el costo se calcula al pagar.</p></div></details>
              <details><summary>Ficha</summary><div class="acordeon__cuerpo"><dl><dt>Categoría</dt><dd>${cat.nombre}</dd><dt>Código</dt><dd>${p.sku}</dd><dt>Material y medidas</dt><dd>Se confirman con la ficha del proveedor antes de publicar.</dd></dl></div></details>
            </div>
            <div class="consulta"><span><b>¿Dudas antes de comprar?</b>Te respondemos con total discreción.</span><a class="boton boton--claro" href="mailto:${CFG().contacto || 'contacto.desvelo@gmail.com'}?subject=${encodeURIComponent('Consulta: ' + p.nombre)}">Preguntar</a></div>
          </div>
        </div>
      </div>

      ${esLen ? '' : `<section class="seccion--compacta page-width">
        <div class="seccion-cabeza"><div class="seccion-cabeza__textos"><p class="seccion-cabeza__que">Uso y cuidado</p><h2>Cómo usarlo y cuidarlo.</h2><p class="seccion-cabeza__porque">Tres pasos para que te dure y esté siempre listo.</p></div></div>
        <div class="pasos pasos--foto">${(PASOS[p.categoria] || PASOS.vibradores).map(([img, titulo], k) => `<div class="paso"><img class="paso__foto" src="${D.BASE}desvelo-${img}.jpg" alt="" loading="lazy" onerror="this.remove()"><b>${titulo}</b><p>${(uso[p.categoria] || [])[k] || ''}</p></div>`).join('')}</div>
      </section>`}

      ${RESENAS_REALES ? resenasHTML(p) : ''}
      ${faqHTML(p, categorias)}
      ${relacionados.length ? `<section class="seccion page-width">
        <div class="seccion-cabeza aparece"><div class="seccion-cabeza__textos"><p class="seccion-cabeza__que">${cat.nombre}</p><h2>combina con esto<span class="punto-final">.</span></h2></div><a class="ver-todo" href="coleccion.html?c=${p.categoria}">Ver todo ${icono('i-flecha')}</a></div>
        <div class="product-grid">${relacionados.map((r) => tarjeta(r, categorias)).join('')}</div>
      </section>` : ''}
      <section class="seccion--compacta page-width" data-recientes hidden></section>`;

    // Galería deslizable con puntos (y flechas/miniaturas en escritorio)
    const pista = $('[data-pista]', raiz);
    let actual = 0;
    const marcar = (i) => {
      actual = i;
      raiz.querySelectorAll('.p2-gal__puntos [data-ir]').forEach((b, k) => { b.classList.toggle('is-on', k === i); b.setAttribute('aria-selected', String(k === i)); });
      raiz.querySelectorAll('.p2-gal__mini [data-ir]').forEach((b, k) => b.setAttribute('aria-current', String(k === i)));
    };
    const ir = (i) => { if (!fotos.length || i < 0) return; i = (i + fotos.length) % fotos.length; pista.scrollTo({ left: pista.clientWidth * i, behavior: 'smooth' }); marcar(i); };
    raiz.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => ir(+b.dataset.ir)));
    raiz.querySelectorAll('[data-paso]').forEach((b) => b.addEventListener('click', () => ir(actual + +b.dataset.paso)));
    pista.addEventListener('scroll', () => { const i = Math.round(pista.scrollLeft / pista.clientWidth); if (i !== actual) marcar(i); }, { passive: true });

    // Selección: color, talla, «solo» vs «2 prendas», cantidad y complementos → total dentro del botón
    let cantidad = 1, modo = otrasLen.length && !agotado ? 'dos' : 'solo';
    const otra = () => raiz.querySelector('[data-otra][aria-checked="true"]');
    const marcados = () => [...raiz.querySelectorAll('[data-completa] input:checked')];
    const pintar = () => {
      const o = modo === 'dos' ? otra() : null;
      const prendas = cantidad + (o ? 1 : 0);
      let len = p.precio * cantidad + (o ? +o.dataset.precio : 0);
      if (esLen && promo && prendas >= promo.minimo) len = Math.floor((len * (1 - promo.descuento) + 10) / 1000) * 1000 - 10;   // precio terminado en 990
      const total = len + marcados().reduce((s, i) => s + +i.dataset.precio, 0);
      const t = $('[data-total]', raiz); if (t) t.textContent = D.plata(total);
      const dp = $('[data-dos-precio]', raiz); if (dp && otra()) { const par = p.precio + +otra().dataset.precio; const dos = Math.floor((par * (1 - promo.descuento) + 10) / 1000) * 1000 - 10; dp.textContent = D.plata(dos); $('[data-dos-ahorro]', raiz).textContent = `Ahorras ${D.plata(par - dos)} (−${Math.round((1 - dos / par) * 100)}%)`; }
      const seg = $('[data-segunda]', raiz); if (seg) seg.hidden = modo !== 'dos';
      const menos = raiz.querySelector('[data-cant-pdp="-1"]'); if (menos) menos.disabled = cantidad === 1;
    };
    raiz.addEventListener('click', (e) => {
      const tip = e.target.closest('[data-tip]');
      if (tip) { tip.classList.add('tip-on'); clearTimeout(tip._t); tip._t = setTimeout(() => tip.classList.remove('tip-on'), 1800); }
      const m = e.target.closest('.p2-muestra');
      if (m) { raiz.querySelectorAll('.p2-muestra').forEach((b) => b.setAttribute('aria-checked', String(b === m))); $('[data-color-nombre]', raiz).textContent = m.dataset.color; ir(+m.dataset.foto); }
      const t = e.target.closest('.p2-talla');
      if (t && !t.disabled) { raiz.querySelectorAll('.p2-talla').forEach((b) => b.setAttribute('aria-checked', String(b === t))); const n = $('[data-talla-nombre]', raiz); if (n) n.textContent = t.dataset.talla; }
      const op = e.target.closest('[data-modo]');
      if (op) { modo = op.dataset.modo; raiz.querySelectorAll('[data-modo]').forEach((b) => b.setAttribute('aria-checked', String(b === op))); pintar(); }
      const pr = e.target.closest('[data-otra]');
      if (pr) { raiz.querySelectorAll('[data-otra]').forEach((b) => b.setAttribute('aria-checked', String(b === pr))); pintar(); }
    });
    raiz.querySelectorAll('[data-cant-pdp]').forEach((b) => b.addEventListener('click', () => { cantidad = Math.max(1, Math.min(9, cantidad + +b.dataset.cantPdp)); $('[data-cantidad]', raiz).textContent = cantidad; pintar(); }));
    raiz.querySelector('[data-completa]')?.addEventListener('change', pintar);
    pintar();

    raiz.querySelectorAll('[data-comprar]').forEach((b) => b.addEventListener('click', async () => {
      const talla = raiz.querySelector('.p2-talla[aria-checked="true"]')?.dataset.talla;
      const prop = D.propiedadesRegalo(raiz);
      const color = raiz.querySelector('.p2-muestra[aria-checked="true"]')?.dataset.color;
      const o = modo === 'dos' ? otra() : null;
      const items = [{ slug: p.slug, cantidad, ...(talla ? { talla } : {}), ...(color ? { color } : {}), ...(prop ? { properties: prop } : {}) }, ...(o ? [{ slug: o.dataset.otra, cantidad: 1, ...(talla ? { talla } : {}) }] : []), ...marcados().map((i) => ({ slug: i.value }))];
      const original = b.innerHTML;
      b.innerHTML = 'Agregando…';
      await D.Bolsa.agregar(items);
      setTimeout(() => { b.innerHTML = original; D.abrirBolsa(); }, 450);
    }));
    raiz.querySelector('[data-avisame]')?.addEventListener('click', () => D.avisar(null, 'Te avisaremos cuando vuelva (vista previa)', false));
    $('[data-compartir]', raiz)?.addEventListener('click', async () => { try { if (navigator.share) await navigator.share({ title: p.nombre, url: location.href }); else { await navigator.clipboard.writeText(location.href); D.avisar?.(null, 'Enlace copiado', false); } } catch (e) { /* cancelado */ } });
    $('[data-atras]', raiz)?.addEventListener('click', (e) => { if (document.referrer.startsWith(location.origin) && history.length > 1) { e.preventDefault(); history.back(); } });

    D.activarFicha?.(raiz);
    // Llegó desde una miniatura de color de la tarjeta: se abre con ese color elegido
    const colorUrl = params.get('color');
    if (colorUrl) raiz.querySelector(`.p2-muestra[data-codigo="${colorUrl}"], .p2-muestra[data-color="${colorUrl.charAt(0).toUpperCase() + colorUrl.slice(1)}"]`)?.click();
    recientes(raiz, p, productos, categorias);

    // Altura de la cabecera (la galería queda fija bajo ella en celular) y título que pasa a la barra superior
    const cab = document.querySelector('.site-header');
    const medir = () => document.documentElement.style.setProperty('--p2-cab', `${cab ? cab.getBoundingClientRect().bottom : 0}px`);
    medir(); addEventListener('resize', medir);
    const top = $('[data-p2-top]', raiz), h1 = $('[data-titulo]', raiz);
    const revisar = () => { const on = h1.getBoundingClientRect().bottom < (cab ? cab.getBoundingClientRect().bottom : 0); top.classList.toggle('is-on', on); top.setAttribute('aria-hidden', String(!on)); };
    addEventListener('scroll', () => { revisar(); medir(); }, { passive: true }); revisar();
    D.observarApariciones?.(raiz);
  }
  const stockLinea = (p) => ({ pocos: `<p class="p2-stock">Quedan ${p.stock.unidades} unidades</p>`, consultar: '<p class="p2-stock p2-stock--suave">Confirmamos stock antes de despachar</p>', agotado: '<p class="p2-stock">Agotado por ahora</p>' }[p.stock.estado] || '');

  // ————————— Pasos «cómo empezar»: ilustración + título por categoría (el texto sale de «uso») —————————
  const PASOS = {
    vibradores: [['cuidado-lavar', 'Lávalo antes y después'], ['cuidado-lubricante', 'Siempre a base de agua'], ['cuidado-cargar', 'Cárgalo y guárdalo seco']],
    consoladores: [['cuidado-lavar', 'Lávalo antes y después'], ['cuidado-lubricante', 'Lubricante a base de agua'], ['cuidado-secar', 'Sécalo bien']],
    'para-el': [['cuidado-el-lavar', 'Lávalo por dentro'], ['cuidado-lubricante', 'Harto lubricante'], ['cuidado-el-secar', 'Déjalo secar abierto']],
    anal: [['cuidado-lavar', 'Lávalo antes y después'], ['cuidado-lubricante', 'Harto lubricante, con calma'], ['cuidado-guardar', 'Sécalo y guárdalo aparte']],
    bondage: [['cuidado-bondage-limpiar', 'Un paño húmedo basta'], ['cuidado-secar', 'Secar al aire'], ['cuidado-bondage-guardar', 'Guárdalo junto']],
    // lencería: sin pasos con fotos (Max, 1-nov: «no hace sentido»); el cuidado va en el acordeón
    packs: [['cuidado-lavar', 'Lava cada pieza'], ['cuidado-lubricante', 'Siempre a base de agua'], ['cuidado-guardar', 'Guárdalo todo junto']],
  };

  // ————————— Reels (fotos propias en movimiento; en Shopify se suben videos reales) —————————
  const ESCENAS = { vibradores: ['escena-velador-manana', 'escena-look-cama'], consoladores: ['escena-noche-satin', 'textura-encaje-noche'], 'para-el': ['paquete-puerta', 'escena-bano-cuidado'], anal: ['escena-noche-satin', 'escena-pareja-remoto'], bondage: ['escena-look-cama', 'textura-encaje-noche'], lenceria: ['escena-cama-lenceria', 'textura-encaje-noche'], packs: ['escena-regalo', 'paquete-puerta'] };
  const TITULOS = ['de cerca.', 'en su lugar.', 'para esta noche.', 'a esta hora.', 'sin apuro.'];
  function reelsHTML(p, productos) {
    const fotos = [...p.galeria.map((g) => `desvelo-${g}.jpg`), ...ESCENAS[p.categoria].map((e) => `desvelo-${e}.jpg`), 'desvelo-paquete-puerta.jpg'];
    const unicos = [...new Set(fotos)].slice(0, 5);
    if (unicos.length < 3) return '';
    const mini = foto(p);
    return `<section class="seccion--compacta page-width"><div class="seccion-cabeza"><div class="seccion-cabeza__textos"><p class="seccion-cabeza__que">Reels</p><h2>Míralo en la casa Desvelo.</h2><p class="seccion-cabeza__porque">Cómo se ve, cómo llega y dónde vive.</p></div></div>
      <div class="reels" data-reels>${unicos.map((f, i) => `<div class="reel"><span class="reel__barra"></span><img src="${D.BASE}${f}" alt="" loading="lazy"><p class="reel__titulo">${f.includes('paquete') ? 'así llega. nadie se entera.' : TITULOS[i % TITULOS.length]}</p>
        <div class="reel__prod vidrio">${mini ? `<img src="${mini}" alt="">` : ''}<span><b>${esc(p.nombre)}</b>${D.plata(p.precio)}</span><button class="boton" type="button" data-agregar data-slug="${p.slug}">Agregar</button></div></div>`).join('')}</div></section>`;
  }

  // ————————— Reseñas (DEMO en la vista previa) —————————
  function resenaHTML(r) {
    const f = new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
    const iniciales = String(r.nombre).split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
    const cara = r.avatar ? `<img class="resena__avatar" src="${D.BASE}${r.avatar}" alt="" loading="lazy" width="44" height="44">` : `<span class="resena__avatar resena__avatar--letras" aria-hidden="true">${esc(iniciales)}</span>`;
    return `<article class="resena${r.propia ? ' resena--propia' : ''}" data-est="${r.estrellas}" data-foto="${r.fotoData ? 1 : 0}"><div class="resena__persona">${cara}<div><b>${esc(r.nombre)}</b>${r.propia ? '<span class="resena__nueva">Tu reseña</span>' : ''}<span class="resena__lugar">${esc(r.comuna)} · ${f}</span></div></div>
      <div class="resena__cabeza">${estrellas(r.estrellas)}</div>
      ${r.titulo ? `<p class="resena__titulo">${esc(r.titulo)}</p>` : ''}<p class="resena__texto">${esc(r.texto)}</p>
      ${r.fotoData ? `<img class="resena__foto" src="${r.fotoData}" alt="Foto de la reseña" loading="lazy">` : ''}
      <button class="resena__util" type="button" data-util="${r.util}">¿Te sirvió? · Sí (${r.util})</button></article>`;
  }
  const misResenas = () => { try { return JSON.parse(localStorage.getItem('desvelo-resenas-usuario') || '{}'); } catch (e) { return {}; } };
  function combinar(slug) {
    const base = RES.productos[slug] || { total: 0, promedio: 0, distribucion: [0, 0, 0, 0, 0], resenas: [] };
    const mias = misResenas()[slug] || [];
    if (!mias.length) return base;
    const dist = [...base.distribucion];
    mias.forEach((r) => { dist[5 - r.estrellas] += 1; });
    const total = base.total + mias.length;
    const promedio = Math.round((dist.reduce((s, c, i) => s + c * (5 - i), 0) / total) * 10) / 10;
    return { total, promedio, distribucion: dist, resenas: [...mias, ...base.resenas] };
  }
  function resenasHTML(p) {
    const R = combinar(p.slug);
    const max = Math.max(...R.distribucion, 1);
    return `<section class="seccion--compacta page-width" id="resenas"><div class="seccion-cabeza"><div class="seccion-cabeza__textos"><p class="seccion-cabeza__que">Opiniones</p><h2>Lo que dicen quienes lo compraron.</h2>${RES.demo ? '<p class="nota-demo">Reseñas de ejemplo · vista de diseño</p>' : ''}</div></div>
      <div class="resenas">
        <aside class="resenas__resumen"><div class="resenas__nota"><b>${String(R.promedio).replace('.', ',')}</b><span>${estrellas(R.promedio)}<br><span class="gv-nota">${R.total} reseñas</span></span></div>
          <div class="barras">${R.distribucion.map((c, i) => `<button class="barra" type="button" data-filtrar-est="${5 - i}" aria-pressed="false"><span>${5 - i} ★</span><i style="--p:${(c / max) * 100}%"></i><span>${c}</span></button>`).join('')}</div>
          <p class="gv-nota">${Math.round(((R.distribucion[0] + R.distribucion[1]) / R.total) * 100)} % lo recomienda</p>
          <button class="boton boton--claro" type="button" data-escribir>Escribir una reseña</button></aside>
        <div><div class="resenas__filtros"><button class="chip" type="button" aria-pressed="true" data-filtro-r="todas">Todas</button><button class="chip" type="button" aria-pressed="false" data-filtro-r="foto">Con foto</button><button class="chip" type="button" aria-pressed="false" data-filtro-r="recientes">Más recientes</button></div>
          <div class="resenas__lista" data-lista-r>${R.resenas.map(resenaHTML).join('')}</div>
          ${R.resenas.length > 4 ? '<div style="margin-top:var(--s-5)"><button class="boton boton--claro" type="button" data-mas-r>Ver más reseñas</button></div>' : ''}</div>
      </div></section>`;
  }
  function activarResenas(raiz, p) {
    const lista = $('[data-lista-r]', raiz); if (!lista) return;
    if (raiz._resenasActivas) { raiz._resenasPintar?.(lista); return; }
    raiz._resenasActivas = true;
    let est = 0, modo = 'todas', ver = 4;
    const pintar = () => {
      let n = 0;
      [...($('[data-lista-r]', raiz)?.children || [])].forEach((el) => {
        const ok = (!est || +el.dataset.est === est) && (modo !== 'foto' || el.dataset.foto === '1');
        el.hidden = !(ok && n++ < ver);
      });
      let total = 0; [...($('[data-lista-r]', raiz)?.children || [])].forEach((el) => { if ((!est || +el.dataset.est === est) && (modo !== 'foto' || el.dataset.foto === '1')) total++; });
      const mas = $('[data-mas-r]', raiz); if (mas) mas.hidden = total <= ver;
    };
    raiz._resenasPintar = () => { est = 0; modo = 'todas'; ver = 4; pintar(); };
    raiz.addEventListener('click', (e) => {
      const b = e.target.closest('[data-filtrar-est]');
      if (b) { est = est === +b.dataset.filtrarEst ? 0 : +b.dataset.filtrarEst; raiz.querySelectorAll('[data-filtrar-est]').forEach((x) => x.setAttribute('aria-pressed', String(+x.dataset.filtrarEst === est))); ver = 4; pintar(); return; }
      const f = e.target.closest('[data-filtro-r]');
      if (f) { modo = f.dataset.filtroR; raiz.querySelectorAll('[data-filtro-r]').forEach((x) => x.setAttribute('aria-pressed', String(x === f))); ver = 4; pintar(); return; }
      if (e.target.closest('[data-mas-r]')) { ver += 6; pintar(); return; }
      const u = e.target.closest('[data-util]');
      if (u && !u.classList.contains('is-hecho')) { u.classList.add('is-hecho'); u.textContent = `¿Te sirvió? · Sí (${+u.dataset.util + 1})`; return; }
      if (e.target.closest('[data-escribir]')) abrirFormulario(p, raiz);
    });
    pintar();
  }

  // ————————— Formulario de reseña (vista previa: se guarda en este navegador; en Shopify lo maneja la app) —————————
  function abrirFormulario(p, raiz) {
    document.querySelector('[data-form-resena]')?.remove();
    document.body.insertAdjacentHTML('beforeend', `<div class="test is-abierto" role="dialog" aria-modal="true" aria-labelledby="fr-t" data-form-resena>
      <form class="test__caja form-resena" novalidate>
        <button class="test__cerrar" type="button" data-fr-cerrar aria-label="Cerrar">${icono('i-cerrar')}</button>
        <p class="antetitulo">${esc(p.nombre)}</p><p class="marca-titulo test__pregunta" id="fr-t">¿qué te pareció?</p>
        <fieldset class="fr-estrellas"><legend>Tu calificación</legend>${[1, 2, 3, 4, 5].map((n) => `<input type="radio" name="estrellas" id="fr-e${n}" value="${n}" ${n === 5 ? 'checked' : ''}><label for="fr-e${n}" title="${n} de 5">★</label>`).join('')}</fieldset>
        <div class="fr-fila"><label>Tu nombre<input name="nombre" required maxlength="40" placeholder="Camila R."></label><label>Comuna<input name="comuna" maxlength="40" placeholder="Ñuñoa"></label></div>
        <label>Título<input name="titulo" maxlength="70" placeholder="En pocas palabras"></label>
        <label>Tu reseña<textarea name="texto" required minlength="10" maxlength="800" rows="4" placeholder="¿Cómo llegó? ¿Qué tal se siente? ¿Lo recomendarías?"></textarea></label>
        <label class="fr-foto"><input type="file" name="foto" accept="image/*" hidden><span class="boton boton--claro">${icono('i-mas')}Agregar foto</span><img alt="" hidden data-fr-preview></label>
        <label class="fr-check"><input type="checkbox" name="compra" required>Confirmo que compré este producto y tengo 18 años o más.</label>
        <p class="fr-error" data-fr-error hidden></p>
        <button class="boton" type="submit">Publicar reseña</button>
      </form></div>`);
    const modal = document.querySelector('[data-form-resena]'), form = modal.querySelector('form');
    let fotoData = null;
    const cerrar = () => modal.remove();
    modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-fr-cerrar]')) cerrar(); });
    form.foto.addEventListener('change', () => {
      const f = form.foto.files[0]; if (!f) return;
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 900 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        fotoData = c.toDataURL('image/jpeg', 0.8);
        const pv = modal.querySelector('[data-fr-preview]'); pv.src = fotoData; pv.hidden = false;
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(f);
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const err = modal.querySelector('[data-fr-error]');
      const falta = !form.nombre.value.trim() ? 'Escribe tu nombre.' : form.texto.value.trim().length < 10 ? 'Cuéntanos un poco más (mínimo 10 letras).' : !form.compra.checked ? 'Confirma que compraste el producto.' : '';
      if (falta) { err.textContent = falta; err.hidden = false; return; }
      const r = { nombre: form.nombre.value.trim(), comuna: form.comuna.value.trim() || 'Chile', estrellas: +form.estrellas.value, titulo: form.titulo.value.trim(), texto: form.texto.value.trim(), fecha: new Date().toISOString().slice(0, 10), verificada: false, util: 0, fotoData, propia: true };
      const todas = misResenas(); todas[p.slug] = [r, ...(todas[p.slug] || [])];
      try { localStorage.setItem('desvelo-resenas-usuario', JSON.stringify(todas)); } catch (x) { err.textContent = 'La foto es muy pesada para guardarla en este navegador. Prueba con otra.'; err.hidden = false; return; }
      cerrar();
      const sec = raiz.querySelector('#resenas');
      sec.outerHTML = resenasHTML(p);
      activarResenas(raiz, p);
      raiz.querySelector('#resenas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      D.avisar(null, '¡Gracias! Tu reseña quedó publicada.', false);
    });
    setTimeout(() => form.nombre.focus(), 50);
  }

  // ————————— Preguntas frecuentes por categoría —————————
  const FAQ = {
    _: [['¿Cómo llega el pedido?', 'Como cualquier compra online: envuelto en negro, con la etiqueta del courier y a nombre de una empresa. Nada dice Desvelo ni lo que hay dentro. Ni el conserje se entera, y mira que el conserje se entera de todo.'], ['¿Qué aparece en el cobro?', 'El cobro no detalla qué compraste.']],
    vibradores: [['¿Hace ruido?', 'Están pensados para ser discretos; en la intensidad baja casi no se escuchan.'], ['¿Qué lubricante uso?', 'Siempre a base de agua: los de silicona dañan la superficie del juguete.']],
    consoladores: [['¿Cómo se limpia el vidrio?', 'Con agua tibia y jabón neutro. Puedes entibiarlo o enfriarlo en agua antes de usarlo.']],
    'para-el': [['¿Cómo se lava por dentro?', 'Con agua tibia, sin jabones fuertes, y déjalo secar abierto antes de guardarlo.']],
    anal: [['¿Por cuál parto?', 'Por el tamaño más chico, con harto lubricante y con calma. Solo plugs con base ancha.']],
    bondage: [['¿Son cómodos?', 'Sí, son acolchados y se abren rápido. Acuerden una palabra de seguridad antes de empezar.']],
    lenceria: [['¿Qué talla elijo?', 'Elige tu talla habitual. Si estás entre dos, escríbenos y te ayudamos.']],
    packs: [['¿Puedo cambiar un producto del pack?', 'El pack viene armado así; si quieres otra combinación, arma tu pedido y usa «Completa tu pedido».']],
  };
  function faqHTML(p) {
    const qs = [...(FAQ[p.categoria] || []), ...FAQ._];
    return `<section class="seccion--compacta page-width"><div class="dudas"><div><div class="seccion-cabeza"><div class="seccion-cabeza__textos"><p class="seccion-cabeza__que">Preguntas frecuentes</p><h2>Antes de comprar.</h2><p class="seccion-cabeza__porque">Lo que más nos preguntan de este producto.</p></div></div></div>
      <div class="acordeon">${qs.map(([q, r], i) => `<details ${i ? '' : 'open'}><summary>${q}</summary><div class="acordeon__cuerpo"><p>${r}</p></div></details>`).join('')}</div></div></section>`;
  }

  // ————————— Vistos recientemente (real, en este navegador) —————————
  function recientes(raiz, p, productos, categorias) {
    let lista = [];
    try { lista = JSON.parse(localStorage.getItem('desvelo-vistos') || '[]'); } catch (e) { /* sin almacenamiento */ }
    const otros = lista.filter((s) => s !== p.slug).map((s) => productos.find((x) => x.slug === s)).filter(Boolean).slice(0, 4);
    try { localStorage.setItem('desvelo-vistos', JSON.stringify([p.slug, ...lista.filter((s) => s !== p.slug)].slice(0, 12))); } catch (e) { /* */ }
    const sec = $('[data-recientes]', raiz); if (!sec || !otros.length) return;
    sec.hidden = false;
    sec.innerHTML = `<div class="seccion-cabeza"><div class="seccion-cabeza__textos"><p class="seccion-cabeza__que">Historial</p><h2>Vistos recientemente.</h2></div></div><div class="product-grid">${otros.map((x) => tarjeta(x, categorias)).join('')}</div>`;
  }

  // ————————— Colección / catálogo —————————
  const PARA = { ella: 'Para ella', el: 'Para él', pareja: 'Para parejas' };
  const PRECIOS = { p1: ['Hasta $10.000', (x) => x <= 10000], p2: ['$10.000 a $20.000', (x) => x > 10000 && x <= 20000], p3: ['$20.000 a $45.000', (x) => x > 20000 && x <= 45000], p4: ['Más de $45.000', (x) => x > 45000] };
  async function coleccion(raiz) {
    const { productos, categorias, tipos = {}, promo } = await D.datos();
    await cargarResenas();
    const norm = (x) => String(x).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const lista = (k) => (params.get(k) ? params.get(k).split(',') : []);
    const e = { c: lista('c'), tipo: lista('tipo'), para: lista('para'), precio: lista('precio'), primera: params.has('primera'), disp: params.has('disp'), q: (params.get('q') || '').trim(), orden: params.get('orden') || 'destacados', ver: 24 };
    const POR_PAGINA = 24;

    // Título según lo que se está mirando (intención > categoría > búsqueda)
    const titulo = () => {
      if (e.q) return [`${e.q.toLowerCase()}.`, `Resultados de tu búsqueda «${e.q}».`];
      if (e.tipo.length === 1) return [`${tipos[e.tipo[0]].toLowerCase()}.`, 'Lencería que se usa poco rato. Vale cada peso igual.'];
      if (e.tipo.length > 1 || (e.c.length === 1 && e.c[0] === 'lenceria')) return ['lencería.', 'Se usa poco rato. Vale cada peso igual. Lleva 2 y ahorra 15 %.'];
      if (e.primera && !e.c.length) return ['primera vez.', 'Lo más simple para partir: fácil de usar, suave y a buen precio.'];
      if (e.para.length === 1 && !e.c.length) return [{ ella: 'para ella.', el: 'para él.', pareja: 'de a dos.' }[e.para[0]], { ella: 'Succionadores, varitas, vibradores y lencería.', el: 'Para el que nunca habría entrado a un sexshop. Tranquilo, aquí no hay vitrina.', pareja: 'Lo que se usa entre dos: control a distancia, anillos, bondage.' }[e.para[0]]];
      if (e.c.length === 1) return [categorias[e.c[0]].titulo, categorias[e.c[0]].intro];
      if (e.precio.length === 1 && !e.c.length) return ['regalos.', `Ideas ${PRECIOS[e.precio[0]][0].toLowerCase()}.`];
      return ['toda la tienda.', 'Juguetes, lencería y juego. Filtra por lo que buscas.'];
    };
    const pasa = (p, sin) => (sin === 'c' || !e.c.length || e.c.includes(p.categoria) || (e.tipo.length && p.tipo))
      && (sin === 'tipo' || !e.tipo.length || e.tipo.includes(p.tipo))
      && (sin === 'para' || !e.para.length || e.para.some((x) => p.para.includes(x)))
      && (sin === 'precio' || !e.precio.length || e.precio.some((k) => PRECIOS[k][1](p.precio)))
      && (sin === 'primera' || !e.primera || p.primeraVez)
      && (sin === 'disp' || !e.disp || p.stock.estado === 'disponible' || p.stock.estado === 'pocos')
      && (!e.q || norm(e.q).split(/\s+/).every((w) => norm(`${p.nombre} ${categorias[p.categoria].nombre} ${p.bajada}`).includes(w)));
    const cuenta = (sin, prueba) => productos.filter((p) => pasa(p, sin) && prueba(p)).length;

    const grupo = (id, tituloG, opciones) => `<div class="filtro-grupo"><p class="filtro-grupo__titulo">${tituloG}</p>${opciones.map(([v, nombre, n, activo]) => `<label class="opcion-filtro${activo ? ' is-activo' : ''}${n ? '' : ' is-vacio'}"><span><input type="checkbox" data-f="${id}" value="${v}" ${activo ? 'checked' : ''}>${nombre}</span><small>${n}</small></label>`).join('')}</div>`;
    const filtrosHTML = () => [
      grupo('tipo', 'Lencería · tipo de prenda', Object.entries(tipos).map(([k, v]) => [k, v, cuenta('tipo', (p) => p.tipo === k), e.tipo.includes(k)])),
      grupo('c', 'Categoría', Object.entries(categorias).map(([k, v]) => [k, v.nombre, cuenta('c', (p) => p.categoria === k), e.c.includes(k)])),
      grupo('para', 'Para quién', Object.entries(PARA).map(([k, v]) => [k, v, cuenta('para', (p) => p.para.includes(k)), e.para.includes(k)])),
      grupo('precio', 'Precio', Object.entries(PRECIOS).map(([k, [v, f]]) => [k, v, cuenta('precio', (p) => f(p.precio)), e.precio.includes(k)])),
      grupo('extra', 'Más filtros', [['primera', 'Ideal primera vez', cuenta('primera', (p) => p.primeraVez), e.primera], ['disp', 'Solo disponibles', cuenta('disp', (p) => p.stock.estado === 'disponible' || p.stock.estado === 'pocos'), e.disp]]),
    ].join('');

    raiz.innerHTML = `
      <nav class="migas page-width" aria-label="Migas"><a href="index.html">Inicio</a><span aria-hidden="true">/</span><a href="coleccion.html">Tienda</a><span aria-hidden="true" data-miga-sep>/</span><span data-miga></span></nav>
      <div class="page-width">
        <header class="coleccion__cabeza"><h1 class="marca-titulo coleccion__titulo" data-titulo></h1><p class="coleccion__intro" data-intro></p></header>
        <div class="len-tipos" data-len-tipos role="group" aria-label="Tipo de prenda"></div>
        <div class="catalogo">
          <aside class="filtros-lado" aria-label="Filtros" data-filtros-lado></aside>
          <div>
            <div class="resultados-barra">
              <button class="btn-filtrar" type="button" data-abrir-filtros><svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M7 12h10M10 17h4"/></svg>Filtrar</button>
              <span class="resultados-barra__n" data-n></span>
              <span data-activos style="display:contents"></span>
              <label class="filtros__orden">Ordenar <select data-orden><option value="destacados">Destacados</option><option value="menor">Precio: menor a mayor</option><option value="mayor">Precio: mayor a menor</option><option value="az">Nombre: A–Z</option></select></label>
            </div>
            <div class="product-grid" data-grilla></div>
            <div class="cargar-mas" data-mas></div>
          </div>
        </div>
      </div>
      <div class="hoja-filtros" role="dialog" aria-modal="true" aria-label="Filtrar y ordenar" data-hoja>
        <div class="hoja-filtros__cabeza">Filtrar <button class="bolsa__cerrar" type="button" data-cerrar-hoja aria-label="Cerrar">${icono('i-cerrar')}</button></div>
        <div class="hoja-filtros__cuerpo" data-filtros-hoja></div>
        <div class="hoja-filtros__pie"><button class="boton boton--claro" type="button" data-limpiar>Limpiar</button><button class="boton" type="button" data-cerrar-hoja data-ver-n>Ver resultados</button></div>
      </div>`;

    const pintar = () => {
      const peso = (p) => (p.galeria.length ? 0 : 2) + (p.stock.estado === 'agotado' ? 4 : 0) + (p.soloCarrito ? 1 : 0);
      const ord = { menor: (a, b) => a.precio - b.precio, mayor: (a, b) => b.precio - a.precio, az: (a, b) => a.nombre.localeCompare(b.nombre, 'es'), destacados: (a, b) => peso(a) - peso(b) || b.precio - a.precio }[e.orden];
      const res = productos.filter((p) => pasa(p)).sort(ord);
      const [t, intro] = titulo();
      $('[data-titulo]', raiz).textContent = t;
      $('[data-intro]', raiz).textContent = intro;
      $('[data-miga]', raiz).textContent = t.replace(/\.$/, '').replace(/^./, (x) => x.toUpperCase());
      document.title = `${$('[data-miga]', raiz).textContent} · Desvelo`;
      $('[data-n]', raiz).innerHTML = `<b>${res.length}</b> producto${res.length === 1 ? '' : 's'}`;
      const chips = [...e.tipo.map((k) => ['tipo', k, tipos[k]]), ...e.c.map((k) => ['c', k, categorias[k].nombre]), ...e.para.map((k) => ['para', k, PARA[k]]), ...e.precio.map((k) => ['precio', k, PRECIOS[k][0]]), ...(e.primera ? [['extra', 'primera', 'Primera vez']] : []), ...(e.disp ? [['extra', 'disp', 'Disponibles']] : []), ...(e.q ? [['q', '', `«${e.q}»`]] : [])];
      $('[data-activos]', raiz).innerHTML = chips.map(([f, v, n]) => `<button class="chip-activo" type="button" data-quitar="${f}" data-v="${v}">${n}${icono('i-cerrar')}</button>`).join('') + (chips.length > 1 ? '<button class="limpiar" type="button" data-limpiar>Limpiar todo</button>' : '');
      const html = res.slice(0, e.ver).map((p) => tarjeta(p, categorias));
      if (!e.q && !chips.length && e.orden === 'destacados' && html.length > 4) html.splice(3, 0, `<a class="tarjeta-guia aparece" href="#" data-test><svg class="amp" viewBox="65 -714 849 746" aria-hidden="true"><use href="${D.BASE}desvelo-sprite.svg?v=dpunto#amp" x="65" y="-714" width="849" height="746" fill="currentColor"/></svg><p class="marca-titulo">¿primera vez?</p><p>Tres preguntas y te mostramos por dónde partir. Sin datos personales.</p><span class="boton">Hacer el test</span></a>`);
      const enLenceria = e.tipo.length || e.c.includes('lenceria');
      // Portadas por tipo de prenda: se ven solo mirando lencería; tocar una = filtrar por esa prenda
      const IMG_TIPO = { conjuntos: 'real-conjunto-con-portaligas', bodies: 'real-body-de-encaje', babydolls: 'real-babydoll-de-satin', corses: 'real-corse-de-encaje', disfraces: 'real-disfraz-de-enfermera' };
      $('[data-len-tipos]', raiz).innerHTML = enLenceria ? Object.entries(tipos).map(([k, v]) => { const n = productos.filter((p) => p.tipo === k).length; return `<button class="len-tipo${e.tipo.includes(k) ? ' is-activo' : ''}" type="button" data-len-tipo="${k}" aria-pressed="${e.tipo.includes(k)}"><img src="${D.BASE}desvelo-${IMG_TIPO[k]}.jpg" alt="" loading="lazy"><b>${v.toLowerCase()}</b><span>${n} modelo${n === 1 ? '' : 's'}</span></button>`; }).join('') : '';
      if (promo && enLenceria && html.length) html.unshift(`<div class="promo-catalogo">${icono('i-mas')}<b>${promo.texto}.</b><span>Se descuenta solo en la bolsa.</span></div>`);
      $('[data-grilla]', raiz).innerHTML = html.join('') || '<p class="coleccion__vacio">No hay productos con esos filtros. <button class="limpiar" type="button" data-limpiar>Quitar filtros</button></p>';
      $('[data-mas]', raiz).innerHTML = res.length > e.ver ? `<span>Viendo ${e.ver} de ${res.length}</span><span class="cargar-mas__barra"><i style="width:${(e.ver / res.length) * 100}%"></i></span><button class="boton boton--claro" type="button" data-cargar>Cargar más</button>` : (res.length > POR_PAGINA ? `<span>Viste los ${res.length} productos</span>` : '');
      const f = filtrosHTML();
      $('[data-filtros-lado]', raiz).innerHTML = f;
      $('[data-filtros-hoja]', raiz).innerHTML = f;
      $('[data-ver-n]', raiz).textContent = `Ver ${res.length} resultado${res.length === 1 ? '' : 's'}`;
      $('[data-orden]', raiz).value = e.orden;
      const qs = new URLSearchParams();
      ['c', 'tipo', 'para', 'precio'].forEach((k) => e[k].length && qs.set(k, e[k].join(',')));
      if (e.primera) qs.set('primera', ''); if (e.disp) qs.set('disp', ''); if (e.q) qs.set('q', e.q); if (e.orden !== 'destacados') qs.set('orden', e.orden);
      history.replaceState(null, '', 'coleccion.html' + (qs.toString() ? `?${qs.toString().replace(/=(&|$)/g, '$1')}` : ''));
      D.observarApariciones?.(raiz);
    };
    raiz.addEventListener('change', (ev) => {
      const i = ev.target.closest('[data-f]');
      if (i) {
        const f = i.dataset.f, v = i.value;
        if (f === 'extra') e[v] = i.checked; else e[f] = i.checked ? [...new Set([...e[f], v])] : e[f].filter((x) => x !== v);
        e.ver = POR_PAGINA; pintar(); return;
      }
      if (ev.target.matches('[data-orden]')) { e.orden = ev.target.value; pintar(); }
    });
    raiz.addEventListener('click', (ev) => {
      const q = ev.target.closest('[data-quitar]');
      if (q) { const f = q.dataset.quitar, v = q.dataset.v; if (f === 'extra') e[v] = false; else if (f === 'q') e.q = ''; else e[f] = e[f].filter((x) => x !== v); pintar(); return; }
      if (ev.target.closest('[data-limpiar]')) { Object.assign(e, { c: [], tipo: [], para: [], precio: [], primera: false, disp: false, q: '', ver: POR_PAGINA }); pintar(); return; }
      const lt = ev.target.closest('[data-len-tipo]');
      if (lt) { const k = lt.dataset.lenTipo; e.tipo = e.tipo.length === 1 && e.tipo[0] === k ? [] : [k]; if (!e.tipo.length && !e.c.length) e.c = ['lenceria']; e.ver = POR_PAGINA; pintar(); return; }
      if (ev.target.closest('[data-cargar]')) { e.ver += POR_PAGINA; pintar(); return; }
      if (ev.target.closest('[data-abrir-filtros]')) { $('[data-hoja]', raiz).classList.add('is-abierta'); return; }
      if (ev.target.closest('[data-cerrar-hoja]')) { $('[data-hoja]', raiz).classList.remove('is-abierta'); }
    });
    pintar();
  }

  const arrancar = () => {
    const raiz = document.querySelector('[data-pagina]');
    if (!raiz) return;
    (raiz.dataset.pagina === 'producto' ? producto : coleccion)(raiz);
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', arrancar) : arrancar();
})();
