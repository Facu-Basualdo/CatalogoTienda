#!/usr/bin/env node
// Genera y sube imágenes de demo (ilustraciones en blanco y negro) para los
// productos y combos sin imágenes y crea los banners de la home si no hay ninguno.
//
//   cd web && node scripts/sembrar-imagenes.mjs
//
// Herramienta LOCAL: usa SUPABASE_SECRET_KEY de web/.env para escribir en Storage
// sin sesión de admin. La app nunca importa esa clave y no va a Vercel.
// Es idempotente: sólo actúa sobre productos sin imágenes y si no hay banners.
// Con --regenerar reemplaza las imágenes de todos los productos.

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

// Tres variantes de fondo por producto: claro, oscuro, gris. Sin texto: el nombre ya
// está en la tarjeta y en la ficha; escrito en la imagen se duplica y se superpone.
const ESTILOS = [
  { fondo: '#f4f4f4', trazo: '#0a0a0a' },
  { fondo: '#0f0f0f', trazo: '#fafafa' },
  { fondo: '#e4e4e4', trazo: '#0a0a0a' },
];

function svgProducto({ fam, estilo, indice }) {
  const [w, h] = [1200, 1500];
  const escala = indice === 2 ? 4.2 : 3.2;
  const x = (w - 200 * escala) / 2;
  const y = (h - 200 * escala) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="${estilo.fondo}"/>
  <g transform="translate(${x} ${y}) scale(${escala})" fill="none" stroke="${estilo.trazo}" stroke-width="${2.2 / (escala / 3.2)}" stroke-linejoin="round" stroke-linecap="round">
    <path d="${ILUSTRACIONES[fam]}"/>
  </g>
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

// --regenerar: borra las imágenes de demo existentes (archivos y filas) y las vuelve a
// generar. Nombres nuevos siempre: sobrescribir un path deja la versión vieja en el CDN.
const regenerar = process.argv.includes('--regenerar');

let subidas = 0;
for (const p of productos) {
  // Los borradores creados desde el panel ("Nuevo producto") son del admin: no se tocan.
  if (p.slug.startsWith('borrador-')) continue;
  if (p.producto_imagenes.length > 0 && !regenerar) continue;
  if (regenerar && p.producto_imagenes.length > 0) {
    const { data: archivos } = await supabase.storage.from(BUCKET).list(`productos/${p.id}`);
    if (archivos?.length) {
      const { error: e } = await supabase.storage.from(BUCKET).remove(archivos.map((a) => `productos/${p.id}/${a.name}`));
      if (e) throw e;
    }
    const { error: e } = await supabase.from('producto_imagenes').delete().eq('producto_id', p.id);
    if (e) throw e;
  }
  const fam = familia(p.slug, p.categoria?.slug);
  const filas = [];
  for (let i = 0; i < ESTILOS.length; i++) {
    const path = `productos/${p.id}/${randomUUID()}.webp`;
    const svg = svgProducto({ fam, estilo: ESTILOS[i], indice: i });
    const { ancho, alto } = await subir(path, svg);
    filas.push({ producto_id: p.id, path, alt: `${p.nombre} — vista ${i + 1}`, orden: i, ancho, alto });
    subidas++;
  }
  const { error: e } = await supabase.from('producto_imagenes').insert(filas);
  if (e) throw e;
  console.log(`✓ ${p.slug}`);
}

// ---------------------------------------------------------------- combos
// Una imagen por combo sin imágenes: las ilustraciones de sus productos en grilla.
function svgCombo(fams, oscuro) {
  const [w, h] = [1200, 1500];
  const fondo = oscuro ? '#0f0f0f' : '#f4f4f4';
  const trazo = oscuro ? '#fafafa' : '#0a0a0a';
  const columnas = fams.length === 1 ? 1 : 2;
  const filas = Math.ceil(fams.length / columnas);
  const celdaW = w / columnas;
  const celdaH = h / filas;
  const escala = Math.min(celdaW, celdaH) / 200 * 0.7;
  const dibujos = fams
    .map((fam, i) => {
      const x = (i % columnas) * celdaW + (celdaW - 200 * escala) / 2;
      const y = Math.floor(i / columnas) * celdaH + (celdaH - 200 * escala) / 2;
      return `<g transform="translate(${x} ${y}) scale(${escala})"><path d="${ILUSTRACIONES[fam]}"/></g>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="${fondo}"/>
  <g fill="none" stroke="${trazo}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke">${dibujos}</g>
</svg>`;
}

const { data: combos, error: eCombos } = await supabase
  .from('combos')
  .select('id, nombre, combo_imagenes(id), combo_items(orden, cantidad, producto:productos(slug, categoria:categorias(slug)))');
if (eCombos) throw eCombos;
for (const [n, c] of combos.entries()) {
  if (c.combo_imagenes.length > 0 || !c.combo_items.length) continue;
  const fams = [...c.combo_items]
    .sort((a, b) => a.orden - b.orden)
    .flatMap((i) => Array(Math.min(i.cantidad, 2)).fill(familia(i.producto.slug, i.producto.categoria?.slug)))
    .slice(0, 4);
  const path = `combos/${c.id}/${randomUUID()}.webp`;
  const { ancho, alto } = await subir(path, svgCombo(fams, n % 2 === 1));
  const { error: e } = await supabase.from('combo_imagenes').insert({ combo_id: c.id, path, alt: c.nombre, orden: 0, ancho, alto });
  if (e) throw e;
  subidas++;
  console.log(`✓ combo ${c.nombre}`);
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
      imagen_path, imagen_mobile_path, orden: i, activo: true, texto_claro: b.oscuro,
    });
    if (e) throw e;
    subidas += 2;
    console.log(`✓ banner ${b.titulo}`);
  }
}

console.log(`${subidas} imágenes subidas`);
