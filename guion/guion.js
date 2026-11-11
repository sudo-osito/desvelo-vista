// Duraznito · guion visual v3 — interacción del laboratorio (sin dependencias)
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reiniciar = (el, clase = 'is-animando') => {
    el.classList.remove(clase);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add(clase)));
  };

  // — Firma: el logo de la portada se escribe al cargar —
  const firma = $('.gv-portada [data-trazo]');
  if (firma && !reducido) reiniciar(firma);

  // — Pestañas de movimiento —
  const tabs = $$('[data-tab]');
  const mostrar = (tab) => {
    tabs.forEach((t) => {
      const activo = t === tab;
      t.setAttribute('aria-selected', String(activo));
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.hidden = !activo;
      if (activo) animarPanel(panel);
    });
  };
  const animarPanel = (panel) => {
    if (reducido) return;
    $$('[data-trazo]', panel).forEach((u) => reiniciar(u));
    const d = $('[data-despertar]', panel);
    if (d) reiniciar(d);
  };
  tabs.forEach((t) => t.addEventListener('click', () => mostrar(t)));
  $$('[data-repetir]').forEach((b) => b.addEventListener('click', () => animarPanel(document.getElementById(b.dataset.repetir))));

  // Despertar: palabra por palabra
  $$('[data-despertar]').forEach((el) => {
    el.innerHTML = el.textContent.trim().split(' ').map((w, i) => `<span style="animation-delay:${i * 90}ms">${w}</span>`).join(' ');
  });
  // primera escena visible al entrar en pantalla
  const escenaInicial = $('#m-trazo');
  if (escenaInicial) new IntersectionObserver((es, o) => es.forEach((e) => { if (e.isIntersecting) { animarPanel(escenaInicial); o.disconnect(); } }), { threshold: 0.4 }).observe(escenaInicial);

  // — Botón con carga: la d recorre su trazo dentro del botón —
  $$('[data-demo-carga]').forEach((b) => b.addEventListener('click', () => {
    if (b.classList.contains('is-cargando')) return;
    const original = b.innerHTML;
    b.classList.add('is-cargando');
    b.innerHTML = '<svg class="gv-loader gv-loader--chico" viewBox="-60.8 -678 689.1 689.1" aria-hidden="true"><use href="../assets/desvelo-sprite.svg#d" x="-60.8" y="-678" width="689.1" height="689.1"/></svg>Agregando';
    setTimeout(() => {
      b.innerHTML = '<svg class="icono"><use href="#i-check"/></svg>Quedó en tu bolsa';
      setTimeout(() => { b.innerHTML = original; b.classList.remove('is-cargando'); }, 1500);
    }, 1700);
  }));

  // — Contraste medido en vivo (WCAG 2.x) —
  const lum = (hex) => {
    const n = hex.replace('#', '').trim();
    const c = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const pintarContraste = () => {
    const caja = $('[data-contraste]'); if (!caja) return;
    const css = getComputedStyle(document.documentElement);
    const v = (n) => css.getPropertyValue(n).trim();
    const pares = [['--tinta', '--blanco', 'Texto sobre fondo'], ['--grafito', '--blanco', 'Secundario sobre fondo'], ['--grafito', '--nacar', 'Secundario sobre nácar'], ['--vino', '--blanco', 'Acento sobre fondo'], ['--blanco', '--tinta', 'Botón principal']];
    caja.innerHTML = pares.map(([f, b, nombre]) => {
      const r = ratio(v(f), v(b));
      const nivel = r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA grande' : 'No pasa';
      return `<div><i style="background:${v(b)};color:${v(f)}">Aa</i><span>${nombre}</span><span>${r.toFixed(1).replace('.', ',')}:1 · ${nivel}</span></div>`;
    }).join('');
  };
  pintarContraste();

  // — Día / noche —
  const tema = $('[data-tema]');
  tema?.addEventListener('click', () => {
    const noche = document.documentElement.dataset.tema !== 'noche';
    document.documentElement.dataset.tema = noche ? 'noche' : 'dia';
    tema.setAttribute('aria-label', noche ? 'Cambiar a modo día' : 'Cambiar a modo noche');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', noche ? '#121011' : '#ffffff');
    try { localStorage.setItem('desvelo-tema', noche ? 'noche' : 'dia'); } catch (e) { /* sin almacenamiento */ }
    pintarContraste();
  });

  // — Probador de letra —
  const prob = $('[data-probador]');
  $('[data-probador-input]')?.addEventListener('input', (e) => { prob.textContent = e.target.value || ' '; });
  $('[data-probador-tam]')?.addEventListener('input', (e) => { prob.style.fontSize = `${e.target.value}px`; });

  // — Juego de caracteres (los acentos dibujados por nosotros, marcados) —
  const nuevos = new Set([...'áéíóúüñ¿¡·–—']);
  const glifos = [...'abcdefghijklmnopqrstuvwxyz', ...'áéíóúüñ', ...'0123456789', ...'.,:;¿?¡!·–—&$%'];
  const g = $('[data-glifos]');
  if (g) g.innerHTML = glifos.map((c) => `<span class="gv-glifo${nuevos.has(c) ? ' is-nuevo' : ''}" title="${nuevos.has(c) ? 'Dibujado por nosotros' : 'Original'}">${c}</span>`).join('');

  // — Laboratorio de vidrio —
  const ficha = $('[data-ficha]');
  $$('[data-vidrio]').forEach((r) => r.addEventListener('input', () => {
    const k = r.dataset.vidrio; const val = +r.value;
    const out = $(`[data-out="${k}"]`);
    if (k === 'b') { ficha.style.setProperty('--b', `${val}px`); out.textContent = `${val} px`; }
    if (k === 'o') { ficha.style.setProperty('--o', val / 100); out.textContent = `${val} %`; }
    if (k === 's') { ficha.style.setProperty('--s', val / 10); out.textContent = String(val / 10).replace('.', ','); }
  }));

  // — Chips de filtro —
  $$('[data-chips]').forEach((grupo) => grupo.addEventListener('click', (e) => {
    const chip = e.target.closest('.gv-chip'); if (!chip) return;
    $$('.gv-chip', grupo).forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
  }));

  // — Aviso de prueba: usa el mismo «agregar» de la tarjeta —
  $('[data-agregar-demo]')?.addEventListener('click', () => $('#kit [data-agregar]')?.click());

  // — Copiar prompt —
  $$('[data-copiar]').forEach((b) => b.addEventListener('click', async () => {
    const t = $(b.dataset.copiar).textContent;
    try { await navigator.clipboard.writeText(t); b.textContent = 'Copiado'; } catch { b.textContent = 'Selecciona y copia'; }
    setTimeout(() => (b.textContent = 'Copiar prompt'), 1600);
  }));

  // — Dock: marca el capítulo visible —
  const enlaces = new Map($$('.gv-dock__links a').map((a) => [a.getAttribute('href').slice(1), a]));
  const visto = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    enlaces.forEach((a) => a.classList.remove('is-activo'));
    const a = enlaces.get(e.target.id);
    if (a) { a.classList.add('is-activo'); a.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); }
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('[data-cap]').forEach((s) => visto.observe(s));

  // — El dock aparece al dejar la portada —
  const dock = $('.gv-dock');
  const portada = $('.gv-portada');
  if (dock && portada) new IntersectionObserver(([e]) => dock.classList.toggle('is-oculto', e.intersectionRatio > 0.35), { threshold: [0, 0.35, 1] }).observe(portada);

  // — Lo que sale de vista se pausa (rendimiento) —
  const pausa = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('fuera', !e.isIntersecting)), { rootMargin: '80px' });
  $$('.gv-portada, .gv-escena, .gv-persiana-demo').forEach((el) => pausa.observe(el));
})();
