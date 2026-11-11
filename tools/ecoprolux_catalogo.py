#!/usr/bin/env python3
"""Duraznito · catálogo vivo desde Ecoprolux (ERP) vía Supabase (tb_erp_productos + tb_productos).

Qué hace: para cada SKU adulto de Ecoprolux trae foto, stock real de BODEGA, tallas y colores
y los deja en assets/duraznito-ecoprolux.json. Además actualiza en assets/desvelo-productos.json
el stock (disponible / pocos / agotado con unidades), la foto de Ecoprolux, tallas y colores
de cada producto que tenga SKU de Ecoprolux; los packs toman el MÍNIMO de sus componentes.

Uso:  SUPABASE_URL=… SUPABASE_KEY=… python3 tools/ecoprolux_catalogo.py [--no-fotos]
(No guarda claves en el repo. Solo lee; nunca escribe en Supabase.)
"""
import json, os, re, sys, urllib.request, urllib.parse, concurrent.futures as cf, datetime, pathlib
RAIZ = pathlib.Path(__file__).resolve().parent.parent
U, K = os.environ['SUPABASE_URL'], os.environ['SUPABASE_KEY']
POCOS = 12          # hasta 12 unidades = «quedan pocos» (igual que el catálogo de Max: 11 pocos, 15 disponible)
FOTO = 'https://tecnoboxchile.cl/images/{}.jpg'
COLORES = {'NEGRO':'Negro','NEGRA':'Negro','ROJO':'Rojo','ROJA':'Rojo','BLANCO':'Blanco','BLANCA':'Blanco','ROSADO':'Rosado','ROSADA':'Rosado','ROSA':'Rosado',
 'AZUL':'Azul','VERDE':'Verde','MORADO':'Morado','MORADA':'Morado','FUCSIA':'Fucsia','CELESTE':'Celeste','AMARILLO':'Amarillo','NARANJA':'Naranja','BURDEO':'Burdeo',
 'GRIS':'Gris','BEIGE':'Beige','PIEL':'Piel','DORADO':'Dorado','PLATEADO':'Plateado','TRANSPARENTE':'Transparente','LILA':'Lila','CAFE':'Café'}
ADULTO = ['vibrador','masturbador','consolador','plug','lenceria','bondage','anillo vib','arnes','succionador','huevo vib','disfraz','funda expansora','lubricante','estimulador','dildo','esposas','antifaz']

def q(path):
    r = urllib.request.Request(U + '/rest/v1/' + path, headers={'apikey': K, 'Authorization': 'Bearer ' + K})
    return json.load(urllib.request.urlopen(r, timeout=60))
def todo(path):
    out, off = [], 0
    while True:
        b = q(f'{path}&limit=1000&offset={off}'); out += b
        if len(b) < 1000: return out
        off += 1000
def tallas(t):
    t = t.upper(); o = []
    if re.search(r'TALLA\s*[UÚ]NICA|UNITALLA', t): o.append('Única')
    m = re.search(r'TALLAS?\s*[:\-]?\s*((?:XXXL|XXL|XL|XS|S|M|L)(?:\s*[-/,Y]\s*(?:XXXL|XXL|XL|XS|S|M|L))*)', t)
    if m: o += [x for x in re.split(r'\s*[-/,Y]\s*', m.group(1)) if x]
    return o
def colores(t):
    t = t.upper(); return sorted({v for k, v in COLORES.items() if re.search(r'\b' + k + r'\b', t)})
def estado(n):
    if n is None: return {'estado': 'consultar'}
    if n <= 0: return {'estado': 'agotado'}
    return {'estado': 'pocos', 'unidades': n} if n <= POCOS else {'estado': 'disponible', 'unidades': n}
def head(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, method='HEAD', headers={'User-Agent': 'Mozilla/5.0'}), timeout=15) as x: return x.status == 200
    except Exception: return False

sel = 'id,ident,nombre,descripcion,tb_categoria,stock_bodega,costo_neto,precio_franquicia_neto,capturado_en'
erp = {r['id']: r for r in todo(f'tb_erp_productos?select={sel}&tb_categoria=eq.SEXSHOP&order=id')}
orf = ','.join(f'nombre.ilike.*{urllib.parse.quote(w)}*' for w in ADULTO)
for r in todo(f'tb_erp_productos?select={sel}&tb_categoria=is.null&estado=eq.1&or=({orf})&order=id'): erp.setdefault(r['id'], r)
tbp = {r['sku']: r for r in todo('tb_productos?select=sku,nombre,stock_bodega,stock_publicado,foto&adulto=eq.true&order=sku')}
prods = json.load(open(RAIZ / 'assets/desvelo-productos.json', encoding='utf-8'))
for p in prods['productos']:       # SKUs de Max que existan en el ERP aunque no estén en las listas anteriores
    s = p['sku']
    if not s.startswith('PACK') and s not in erp:
        r = q(f'tb_erp_productos?select={sel}&id=eq.{s}')
        if r: erp[s] = r[0]
skus = sorted(set(erp) | set(tbp))
fotos = {s: (tbp.get(s, {}).get('foto') or FOTO.format(s)) for s in skus}
if '--no-fotos' in sys.argv: ok = {s: True for s in skus}
else:
    with cf.ThreadPoolExecutor(12) as ex: ok = dict(zip(fotos, ex.map(head, fotos.values())))
def familia(sku, nombre, desc):
    t = f'{nombre} {desc}'.upper()
    if 'SEDA' in t: return 'seda'
    if sku == '1914231017' or '3 PIEZAS' in t: return 'tres-piezas'
    if sku == '1903231017' or 'BODY' in t or re.search(r'LENCERIA EROTICA\s+TALLA', t): return 'body'
    if 'CORS' in t and 'GOTICO' in t.replace('Ó', 'O'): return 'corse'
    if 'DIVIDIDO' in t: return 'dividido'
    return None
cat = {}
for s in skus:
    e, t = erp.get(s, {}), tbp.get(s, {})
    txt = f"{e.get('nombre','')} {e.get('descripcion') or ''} {t.get('nombre','')}"
    stock = t.get('stock_bodega') if t.get('stock_bodega') is not None else e.get('stock_bodega')
    cat[s] = {'sku': s, 'nombre': (t.get('nombre') or e.get('nombre') or '').strip(), 'tipo': e.get('ident'),
              'descripcion': (e.get('descripcion') or '').replace('\n', ' ').strip(), 'tallas': tallas(txt), 'colores': colores(txt),
              'stock': stock, 'familia': familia(s, e.get('nombre', ''), e.get('descripcion') or ''), 'foto': fotos[s] if ok[s] else None}
(RAIZ / 'assets/duraznito-ecoprolux.json').write_text(json.dumps(
    {'generado': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'), 'fuente': 'Ecoprolux ERP (tb_erp_productos + tb_productos) · stock de BODEGA',
     'productos': list(cat.values())}, ensure_ascii=False, indent=1), encoding='utf-8')
# --- aplicar al catálogo de la tienda
por_slug = {p['slug']: p for p in prods['productos']}
def stock_de(p):
    if p['sku'].startswith('PACK'):
        hijos = [stock_de(por_slug[h]) for h in p.get('pack', []) if h in por_slug]
        hijos = [h for h in hijos if h is not None]
        return min(hijos) if hijos and len(hijos) == len(p.get('pack', [])) else None
    c = cat.get(p['sku'])
    if c is None: return None
    if c.get('familia'):
        fam = [x for x in cat.values() if x.get('familia') == c['familia']]
        return sum(x['stock'] or 0 for x in fam)
    return c['stock']
n = {'stock': 0, 'foto': 0, 'sin_sku': []}
for p in prods['productos']:
    s = stock_de(p)
    if s is not None: p['stock'] = estado(s); n['stock'] += 1
    c = cat.get(p['sku'])
    if c is None and not p['sku'].startswith('PACK'): n['sin_sku'].append(p['sku'])
    if c:
        if c['foto']: p['fotoEcoprolux'] = c['foto']; n['foto'] += 1
        if c['tallas']: p['tallas'] = c['tallas']
        if c.get('familia'):
            fam = [x for x in cat.values() if x.get('familia') == c['familia']]
            p['tallasStock'] = sorted(({'sku': x['sku'], 'talla': (x['tallas'] or ['surtido'])[0] if len(x['tallas']) <= 1 else 'surtido',
                                        'color': (x['colores'] or [None])[0] if len(x['colores']) <= 1 else 'surtido', 'stock': x['stock'] or 0} for x in fam),
                                      key=lambda v: (v['color'] or '', ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'].index(v['talla']) if v['talla'] in ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'] else 9))
        if c['colores']: p['coloresEcoprolux'] = c['colores']
(RAIZ / 'assets/desvelo-productos.json').write_text(json.dumps(prods, ensure_ascii=False), encoding='utf-8')
print(f"SKUs Ecoprolux: {len(cat)} · fotos ok: {sum(1 for c in cat.values() if c['foto'])} · con stock>0: {sum(1 for c in cat.values() if (c['stock'] or 0) > 0)}")
print(f"Tienda: stock actualizado en {n['stock']} productos · foto Ecoprolux en {n['foto']} · sin SKU en ERP: {n['sin_sku']}")
