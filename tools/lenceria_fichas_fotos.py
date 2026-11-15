#!/usr/bin/env python3
"""Fotos de estudio (fondo blanco, 1:1) y fichas de talla de la lencería para producto.html.

Lee:
  ~/work/marketplace-publis/piloto_final/pijama_*_11.jpg
  ~/work/marketplace-publis/tandas/duraznito_01/final/*_11.jpg
  ~/work/marketplace-publis/duraznito/fichas_tecnicas.json   (tablas de tallas; si no hay, no se inventa)
Escribe:
  assets/desvelo-estudio-<slug>-<n>.jpg     (1200 px, calidad 82)
  assets/desvelo-estudio-<slug>--<color>.jpg (fotos de color existentes, llevadas a fondo blanco y cuadradas)
  assets/desvelo-lenceria-fichas.json
Uso: python3 tools/lenceria_fichas_fotos.py
"""
import glob
import json
import os

from PIL import Image

AQUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(AQUI, 'assets')
MP = os.path.expanduser('~/work/marketplace-publis')
FINAL = os.path.join(MP, 'tandas', 'duraznito_01', 'final')

HEX = {'Negro': '#141213', 'Verde': '#2F5A45', 'Azul': '#25365F', 'Rojo': '#9B1C2E', 'Blanco': '#F4F1EC', 'Rosado': '#E9B8C0'}

# slug -> (id de ficha, prefijo de foto, tallas del ERP [talla, hay_stock], color de las fotos de estudio, colores extra)
MODELOS = {
    'body-de-encaje': ('d27', 'body', [['S', 1], ['M', 1], ['L', 1], ['XL', 1], ['XXL', 1]], 'Negro', ['Verde', 'Azul', 'Rojo']),
    'babydoll-de-satin': ('d11/d14', 'pijama', [['S', 1], ['M', 1], ['L', 1], ['XL', 1], ['XXL', 1]], None, []),
    'corse-de-encaje': ('d18', 'corse', [['S', 1], ['M', 1], ['L', 1], ['XL', 1], ['XXL', 1]], None, []),
    'conjunto-abierto-de-encaje': ('d22', 'dividido', [['S', 1], ['M', 1], ['XL', 0], ['XXXL', 1]], None, []),
    'conjunto-con-portaligas': ('d32', 'trespiezas', [['S', 1], ['M', 1], ['XL', 1], ['XXL', 1]], 'Rojo', ['Negro', 'Blanco']),
    'disfraz-de-colegiala': ('d01', 'colegiala', [['S', 1], ['L', 1], ['XL', 1]], None, []),
    'disfraz-de-enfermera': ('d46', 'enfermera', [['Única', 1]], None, []),
    'disfraz-de-mucama': ('d49', 'nana', [['Única', 1]], None, []),
}
ORDEN = ['frente', 'espalda', 'detalle', 'plano']


def guardar(im, dst, lado=1200):
    im = im.convert('RGB')
    if im.width != im.height:
        L = max(im.size)
        lienzo = Image.new('RGB', (L, L), 'white')
        lienzo.paste(im, ((L - im.width) // 2, (L - im.height) // 2))
        im = lienzo
    im.thumbnail((lado, lado), Image.LANCZOS)
    im.save(dst, 'JPEG', quality=82, optimize=True, progressive=True)


def a_fondo_blanco(src):
    """Las fotos de color existentes vienen sobre nácar: se lleva el fondo a blanco (niveles por canal)."""
    im = Image.open(src).convert('RGB')
    w, h = im.size
    esquinas = [im.getpixel((x, y)) for x, y in [(8, 8), (w - 9, 8), (8, h - 9), (w - 9, h - 9)]]
    fondo = [sorted(c[i] for c in esquinas)[2] for i in range(3)]
    lut = []
    for i in range(3):
        f = max(fondo[i], 1)
        lut += [min(255, round(v * 255 / f)) for v in range(256)]
    return im.point(lut)


def main():
    fichas = {f['id']: f for f in json.load(open(os.path.join(MP, 'duraznito', 'fichas_tecnicas.json'), encoding='utf-8'))}
    productos = {p['slug']: p for p in json.load(open(os.path.join(ASSETS, 'desvelo-productos.json'), encoding='utf-8'))['productos']}
    out = {}
    for slug, (fid, pref, tallas, color_estudio, extras) in MODELOS.items():
        if pref == 'pijama':
            fuentes = sorted(glob.glob(os.path.join(MP, 'piloto_final', 'pijama_*_11.jpg')))
        else:
            fuentes = sorted(glob.glob(os.path.join(FINAL, f'{pref}_*_11.jpg')))
        fuentes.sort(key=lambda f: next((i for i, o in enumerate(ORDEN) if f'_{o}' in os.path.basename(f)), 9))
        fotos, colores = [], []
        for i, f in enumerate(fuentes, 1):
            nombre = f'estudio-{slug}-{i}'
            guardar(Image.open(f), os.path.join(ASSETS, f'desvelo-{nombre}.jpg'))
            fotos.append(nombre)
        if pref == 'pijama':  # pijama_01_frente_rosa / pijama_02_frente_negro
            colores = [{'nombre': 'Rosado', 'hex': HEX['Rosado'], 'foto': 0}, {'nombre': 'Negro', 'hex': HEX['Negro'], 'foto': 1}]
        elif color_estudio:
            colores = [{'nombre': color_estudio, 'hex': HEX[color_estudio], 'foto': 0}]
            variantes = {v['nombre']: v for v in productos[slug].get('variantes', [])}
            for c in extras:
                v = variantes.get(c)
                if not v:
                    continue
                nombre = f'estudio-{slug}--{v["codigo"]}'
                guardar(a_fondo_blanco(os.path.join(ASSETS, f'desvelo-{v["foto"]}.jpg')), os.path.join(ASSETS, f'desvelo-{nombre}.jpg'))
                colores.append({'nombre': c, 'hex': HEX[c], 'foto': len(fotos)})
                fotos.append(nombre)
        fi = fichas.get(fid, {})
        tabla = fi.get('tabla_tallas_cm')
        out[slug] = {
            'fotos': fotos,
            'colores': colores,
            'tallas': [{'t': t, 'hay': bool(h)} for t, h in tallas],
            # Solo tablas publicadas por un vendedor del mismo modelo; si no hay, la página muestra el aviso de talla asiática.
            'tabla': {'columnas': tabla['columnas'], 'filas': tabla['filas']} if tabla else None,
        }
    json.dump(out, open(os.path.join(ASSETS, 'desvelo-lenceria-fichas.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print({k: (len(v['fotos']), len(v['colores']), bool(v['tabla'])) for k, v in out.items()})


if __name__ == '__main__':
    main()
