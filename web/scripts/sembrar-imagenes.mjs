#!/usr/bin/env node
// Genera y sube imágenes de demo (ilustraciones en blanco y negro) para los
// productos sin imágenes y crea los banners de la home si no hay ninguno.
//
//   cd web && node scripts/sembrar-imagenes.mjs
//
// Herramienta LOCAL: usa SUPABASE_SECRET_KEY de web/.env para escribir en Storage
// sin sesión de admin. La app nunca importa esa clave y no va a Vercel.
// Es idempotente: sólo actúa sobre productos sin imágenes y si no hay banners.

import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

process.loadEnvFile('.env');
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRETA = process.env.SUPABASE_SECRET_KEY;
if (!URL || !SECRETA) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en web/.env');

const supabase = createClient(URL, SECRETA, { auth: { persistSession: false } });
const BUCKET = 'catalogo';

// ---------------------------------------------------------------- ilustraciones
// Trazos simples por familia de categoría, en un lienzo de 200x200.
const ILUSTRACIONES = {
  remera: 'M60 40 L85 30 Q100 45 115 30 L140 40 L170 70 L150 90 L140 80 L140 170 L60 170 L60 80 L50 90 L30 70 Z',
  pantalon: 'M65 30 L135 30 L145 175 L110 175 L100 80 L90 175 L55 175 Z',
  media: 'M80 25 L120 25 L120 120 Q120 150 150 155 Q175 160 170 180 L95 180 Q80 180 80 160 Z',
  monitor: 'M25 40 L175 40 L175 135 L25 135 Z M85 135 L80 165 L120 165 L115 135 M65 170 L135 170',
  notebook: 'M45 50 L155 50 L155 125 L45 125 Z M25 135 L175 135 L165 150 L35 150 Z',
  auricular: 'M45 120 Q45 45 100 45 Q155 45 155 120 M40 110 L60 110 L60 160 L40 160 Z M140 110 L160 110 L160 160 L140 160 Z',
  parlante: 'M65 30 L135 30 L135 170 L65 170 Z M100 70 m-18 0 a18 18 0 1 0 36 0 a18 18 0 1 0 -36 0 M100 125 m-28 0 a28 28 0 1 0 56 0 a28 28 0 1 0 -56 0',
  teclado: 'M20 70 L180 70 L180 135 L20 135 Z M35 85 L165 85 M35 100 L165 100 M35 115 L165 115 M60 125 L140 125',
  mouse: 'M70 60 Q70 30 100 30 Q130 30 130 60 L130 140 Q130 175 100 175 Q70 175 70 140 Z M100 30 L100 75',
};

function familia(slug, categoria) {
  if (/auricular/.test(slug)) return 'auricular';
  if (/parlante/.test(slug)) return 'parlante';
  if (/teclado/.test(slug)) return 'teclado';
  if (/mouse/.test(slug)) return 'mouse';
  if (/medias/.test(slug)) return 'media';
  return { remeras: 'remera', buzos: 'remera', abrigos: 'remera', pantalones: 'pantalon', monitores: 'monitor', notebooks: 'notebook' }[categoria] ?? 'remera';
}

const escapar = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Tres variantes de fondo por producto: claro, oscuro, gris.
const ESTILOS = [
  { fondo: '#f4f4f4', trazo: '#0a0a0a', texto: '#0a0a0a', sub: '#6b6b6b' },
  { fondo: '#0f0f0f', trazo: '#fafafa', texto: '#fafafa', sub: '#a3a3a3' },
  { fondo: '#e4e4e4', trazo: '#0a0a0a', texto: '#0a0a0a', sub: '#525252' },
];

function svgProducto({ nombre, categoria, fam, estilo, indice }) {
  const [w, h] = [1200, 1500];
  const escala = indice === 2 ? 4.2 : 3.2;
  const x = (w - 200 * escala) / 2;
  const y = indice === 2 ? 260 : 330;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="${estilo.fondo}"/>
  <g transform="translate(${x} ${y}) scale(${escala})" fill="none" stroke="${estilo.trazo}" stroke-width="${2.2 / (escala / 3.2)}" stroke-linejoin="round" stroke-linecap="round">
    <path d="${ILUSTRACIONES[fam]}"/>
  </g>
  ${indice === 2 ? '' : `<text x="80" y="${h - 170}" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="700" fill="${estilo.texto}">${escapar(nombre)}</text>
  <text x="80" y="${h - 100}" font-family="Arial, Helvetica, sans-serif" font-size="34" letter-spacing="6" fill="${estilo.sub}">${escapar(categoria.toUpperCase())}</text>`}
</svg>`;
}

// Sin texto: título y subtítulo los superpone la web desde la tabla `banners`.
function svgBanner({ fam, w, h, oscuro }) {
  const fondo = oscuro ? '#0a0a0a' : '#efefef';
  const tinta = oscuro ? '#fafafa' : '#0a0a0a';
  const vertical = h > w;
  const escala = vertical ? 2.6 : 2.8;
  const ix = vertical ? (w - 200 * escala) / 2 : w - 200 * escala - 160;
  const iy = vertical ? h - 200 * escala - 80 : (h - 200 * escala) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="${fondo}"/>
  <g transform="translate(${ix} ${iy}) scale(${escala})" fill="none" stroke="${tinta}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" opacity="0.9">
    <path d="${ILUSTRACIONES[fam]}"/>
  </g>
</svg>`;
}

async function subir(path, svg) {
  const { data, info } = await sharp(Buffer.from(svg)).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const { error } = await supabase.storage.from(BUCKET).upload(path, data, { contentType: 'image/webp', upsert: false });
  if (error) throw new Error(`${path}: ${error.message}`);
  return { ancho: info.width, alto: info.height };
}

// ---------------------------------------------------------------- productos
const { data: productos, error } = await supabase
  .from('productos')
  .select('id, slug, nombre, categoria:categorias(slug, nombre), producto_imagenes(id)');
if (error) throw error;

let subidas = 0;
for (const p of productos) {
  if (p.producto_imagenes.length > 0) continue;
  const fam = familia(p.slug, p.categoria?.slug);
  const filas = [];
  for (let i = 0; i < ESTILOS.length; i++) {
    const path = `productos/${p.id}/${randomUUID()}.webp`;
    const svg = svgProducto({ nombre: p.nombre, categoria: p.categoria?.nombre ?? '', fam, estilo: ESTILOS[i], indice: i });
    const { ancho, alto } = await subir(path, svg);
    filas.push({ producto_id: p.id, path, alt: `${p.nombre} — vista ${i + 1}`, orden: i, ancho, alto });
    subidas++;
  }
  const { error: e } = await supabase.from('producto_imagenes').insert(filas);
  if (e) throw e;
  console.log(`✓ ${p.slug}`);
}

// ---------------------------------------------------------------- banners
const { count } = await supabase.from('banners').select('id', { count: 'exact', head: true });
if (!count) {
  const banners = [
    { titulo: 'Nueva temporada', subtitulo: 'Remeras y buzos de algodón', fam: 'remera', oscuro: false,
      enlace: '/catalogo?cat=ropa', texto_boton: 'Ver ropa' },
    { titulo: 'Alta frecuencia', subtitulo: 'Monitores de 144 Hz en adelante', fam: 'monitor', oscuro: true,
      enlace: '/catalogo?cat=monitores&refresco=144-hz,165-hz,240-hz', texto_boton: 'Ver monitores' },
  ];
  for (const [i, b] of banners.entries()) {
    const id = randomUUID();
    const imagen_path = `banners/${id}/${randomUUID()}.webp`;
    const imagen_mobile_path = `banners/${id}/${randomUUID()}.webp`;
    await subir(imagen_path, svgBanner({ ...b, w: 1920, h: 640 }));
    await subir(imagen_mobile_path, svgBanner({ ...b, w: 800, h: 1000 }));
    const { error: e } = await supabase.from('banners').insert({
      id, titulo: b.titulo, subtitulo: b.subtitulo, texto_boton: b.texto_boton, enlace: b.enlace,
      imagen_path, imagen_mobile_path, orden: i, activo: true,
    });
    if (e) throw e;
    subidas += 2;
    console.log(`✓ banner ${b.titulo}`);
  }
}

console.log(`${subidas} imágenes subidas`);
