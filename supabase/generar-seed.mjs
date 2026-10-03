// Genera supabase/seed.sql: un único bloque DO (idempotente) con datos de demo.
// Uso: node supabase/generar-seed.mjs supabase/seed.sql — ver claude/supabase/migraciones.md#seed
import { writeFileSync } from 'node:fs';
const MARCAS = {"remera-basica":"Norte","remera-oversize":"Alba","buzo-canguro":"Alba","buzo-cuello-redondo":"Norte","pantalon-cargo":"Raíz","jean-recto":"Raíz","campera-rompevientos":"Alba","medias-pack-x3":"Norte","monitor-24-144-hz-ips":"Vértice","monitor-27-165-hz-va":"Vértice","monitor-27-4k":"Orbe","monitor-32-curvo-240-hz":"Vértice","notebook-14":"Orbe","notebook-16-gamer":"Pulsar","auriculares-inalambricos":"Sonar","auriculares-con-cable":"Sonar","teclado-mecanico":"Pulsar","mouse-inalambrico":"Pulsar","parlante-bluetooth":"Sonar","monitor-34-ultrawide":"Orbe"};
const ICONOS = {"talle":"LayoutCells","color":"Palette","memoria":"Cpu","almacenamiento":"HardDrive","material":"Layers","refresco":"Speedometer","panel":"Display","resolucion":"Picture","conectividad":"Signal"};


const q = (s) => (s === null || s === undefined ? 'null' : `'${String(s).replaceAll("'", "''")}'`);

// ---------------------------------------------------------------- TipTap helpers
const txt = (t, marks) => ({ type: 'text', text: t, ...(marks ? { marks } : {}) });
const p = (...c) => ({ type: 'paragraph', content: c.map((x) => (typeof x === 'string' ? txt(x) : x)) });
const b = (t) => txt(t, [{ type: 'bold' }]);
const h = (level, t) => ({ type: 'heading', attrs: { level }, content: [txt(t)] });
const ul = (...items) => ({ type: 'bulletList', content: items.map((i) => ({ type: 'listItem', content: [p(i)] })) });
const table = (encabezado, filas) => ({
  type: 'table',
  content: [
    { type: 'tableRow', content: encabezado.map((c) => ({ type: 'tableHeader', content: [p(c)] })) },
    ...filas.map((f) => ({ type: 'tableRow', content: f.map((c) => ({ type: 'tableCell', content: [p(c)] })) })),
  ],
});
const doc = (...content) => ({ type: 'doc', content });
function textoPlano(n) {
  if (n.type === 'text') return n.text;
  const hijos = (n.content ?? []).map(textoPlano);
  const bloque = ['paragraph', 'heading', 'tableRow', 'listItem'].includes(n.type);
  return hijos.join(n.type === 'tableRow' ? ' ' : bloque ? '' : '\n') + (bloque ? '\n' : '');
}
const plano = (d) => textoPlano(d).replace(/\n{2,}/g, '\n').trim();

// ---------------------------------------------------------------- catálogo
const categorias = [
  ['ropa', 'Ropa', null, 1], ['remeras', 'Remeras', 'ropa', 1], ['buzos', 'Buzos', 'ropa', 2],
  ['pantalones', 'Pantalones', 'ropa', 3], ['abrigos', 'Abrigos', 'ropa', 4], ['accesorios', 'Accesorios', 'ropa', 5],
  ['electronica', 'Electrónica', null, 2], ['monitores', 'Monitores', 'electronica', 1],
  ['notebooks', 'Notebooks', 'electronica', 2], ['audio', 'Audio', 'electronica', 3], ['perifericos', 'Periféricos', 'electronica', 4],
];

// [slug, nombre, orden, es_variante, visible_ficha, [[valor, color_hex]], icono, es_marca]
// Marcas ficticias: el proyecto es genérico y no usa marcas reales.
const grupos = [
  ['marca', 'Marca', 0, false, true, [['Norte'], ['Alba'], ['Raíz'], ['Vértice'], ['Orbe'], ['Pulsar'], ['Sonar']], 'Tag', true],
  ['talle', 'Talle', 1, true, true, [['S'], ['M'], ['L'], ['XL'], ['38'], ['40'], ['42'], ['44']]],
  ['color', 'Color', 2, true, true, [['Negro', '#0a0a0a'], ['Blanco', '#ffffff'], ['Gris', '#9ca3af'], ['Azul', '#1e3a8a']]],
  ['memoria', 'Memoria RAM', 3, true, true, [['16 GB'], ['32 GB']]],
  ['almacenamiento', 'Almacenamiento', 4, true, true, [['512 GB'], ['1 TB']]],
  ['material', 'Material', 5, false, true, [['100% algodón'], ['Algodón y poliéster'], ['Gabardina'], ['Denim'], ['Poliéster']]],
  ['refresco', 'Tasa de refresco', 6, false, true, [['60 Hz'], ['144 Hz'], ['165 Hz'], ['240 Hz']]],
  ['panel', 'Panel', 7, false, true, [['IPS'], ['VA']]],
  ['resolucion', 'Resolución', 8, false, true, [['Full HD'], ['QHD'], ['4K']]],
  ['conectividad', 'Conectividad', 9, false, true, [['Bluetooth'], ['Wi-Fi 6'], ['USB-C'], ['Cable 3.5 mm'], ['Receptor 2.4 GHz']]],
];

const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/([0-9])([a-z])/g, '$1-$2').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const tablaTalles = table(['Talle', 'Ancho (cm)', 'Largo (cm)'], [['S', '48', '68'], ['M', '51', '71'], ['L', '54', '74'], ['XL', '57', '77']]);
const cuidado = ul('Lavar con agua fría', 'No usar secarropas', 'Planchar del revés');

// variantes: null = variante única con `stock`; si no, lista [{e: [[grupo, valor]], stock, precio?}]
function combos(ejes, stockFn, precioFn) {
  const [a, ...resto] = ejes;
  let res = a[1].map((v) => [[a[0], v]]);
  for (const [g, vals] of resto) res = res.flatMap((c) => vals.map((v) => [...c, [g, v]]));
  return res.map((e, i) => ({ e, stock: stockFn(e, i), precio: precioFn ? precioFn(e) : null }));
}

const productos = [
  {
    slug: 'remera-basica', marca: 'Norte', nombre: 'Remera básica', cat: 'remeras', precio: 18000, destacado: true,
    etiquetas: [['material', '100% algodón']],
    variantes: combos([['talle', ['S', 'M', 'L', 'XL']], ['color', ['Negro', 'Blanco']]], (e, i) => [6, 0, 12, 4, 9, 3, 0, 2][i]),
    desc: doc(p('Remera de corte recto en ', b('jersey 100% algodón'), ' peinado de 24/1. Cuello redondo con ribete y costuras reforzadas.'),
      h(3, 'Tabla de talles'), tablaTalles, h(3, 'Cuidado'), cuidado),
  },
  {
    slug: 'remera-oversize', marca: 'Alba', nombre: 'Remera oversize', cat: 'remeras', precio: 22000, anterior: 26000,
    etiquetas: [['material', '100% algodón']],
    variantes: combos([['talle', ['M', 'L', 'XL']], ['color', ['Negro', 'Gris']]], (e, i) => [5, 2, 7, 0, 3, 1][i]),
    desc: doc(p('Calce amplio con hombro caído. Algodón de ', b('gramaje pesado'), ' que no se deforma con los lavados.'),
      table(['Talle', 'Ancho (cm)', 'Largo (cm)'], [['M', '58', '72'], ['L', '61', '75'], ['XL', '64', '78']]), cuidado),
  },
  {
    slug: 'buzo-canguro', marca: 'Alba', nombre: 'Buzo canguro', cat: 'buzos', precio: 45000, destacado: true,
    etiquetas: [['material', 'Algodón y poliéster']],
    variantes: combos([['talle', ['S', 'M', 'L', 'XL']], ['color', ['Negro', 'Gris']]], (e, i) => [2, 4, 6, 5, 3, 0, 1, 2][i]),
    desc: doc(p('Frisa invisible 80% algodón / 20% poliéster, capucha forrada y bolsillo canguro.'),
      h(3, 'Tabla de talles'), table(['Talle', 'Ancho (cm)', 'Largo (cm)'], [['S', '54', '66'], ['M', '57', '69'], ['L', '60', '72'], ['XL', '63', '75']])),
  },
  {
    slug: 'buzo-cuello-redondo', marca: 'Norte', nombre: 'Buzo cuello redondo', cat: 'buzos', precio: 39000,
    etiquetas: [['material', '100% algodón']],
    variantes: combos([['talle', ['S', 'M', 'L']], ['color', ['Blanco', 'Negro']]], (e, i) => [3, 3, 5, 0, 2, 4][i]),
    desc: doc(p('Buzo liviano de rústico, ideal para media estación. Puños y cintura con elastano.')),
  },
  {
    slug: 'pantalon-cargo', marca: 'Raíz', nombre: 'Pantalón cargo', cat: 'pantalones', precio: 52000,
    etiquetas: [['material', 'Gabardina']],
    variantes: combos([['talle', ['38', '40', '42', '44']], ['color', ['Negro']]], (e, i) => [2, 5, 4, 1][i]),
    desc: doc(p('Gabardina elastizada con seis bolsillos y ruedo con cordón regulable.'),
      table(['Talle', 'Cintura (cm)', 'Largo (cm)'], [['38', '76', '102'], ['40', '80', '103'], ['42', '84', '104'], ['44', '88', '105']])),
  },
  {
    slug: 'jean-recto', marca: 'Raíz', nombre: 'Jean recto', cat: 'pantalones', precio: 58000, anterior: 64000, destacado: true,
    etiquetas: [['material', 'Denim']],
    variantes: combos([['talle', ['40', '42', '44']], ['color', ['Azul']]], (e, i) => [4, 6, 2][i]),
    desc: doc(p('Denim rígido de 13 oz con lavado medio. Tiro medio y pierna recta.')),
  },
  {
    slug: 'campera-rompevientos', marca: 'Alba', nombre: 'Campera rompevientos', cat: 'abrigos', precio: 68000,
    etiquetas: [['material', 'Poliéster']],
    variantes: combos([['talle', ['M', 'L', 'XL']], ['color', ['Negro']]], () => 0),
    desc: doc(p('Rompevientos liviana con capucha guardable. ', b('Sin stock'), ' por el momento: ejemplo de producto agotado.')),
  },
  {
    slug: 'medias-pack-x3', marca: 'Norte', nombre: 'Medias pack x3', cat: 'accesorios', precio: 9500,
    etiquetas: [['material', '100% algodón']], stock: 40,
    desc: doc(p('Pack de tres pares de medias de algodón con puño acanalado. Talle único (39 a 44).')),
  },
  {
    slug: 'monitor-24-144-hz-ips', marca: 'Vértice', nombre: 'Monitor 24" 144 Hz IPS', cat: 'monitores', precio: 280000, destacado: true,
    etiquetas: [['refresco', '144 Hz'], ['panel', 'IPS'], ['resolucion', 'Full HD']], stock: 8,
    desc: doc(p('Panel IPS de 24" con ', b('144 Hz'), ' y 1 ms (MPRT). Colores fieles para trabajar y fluidez para jugar.'),
      h(3, 'Especificaciones'),
      table(['Característica', 'Valor'], [['Tamaño', '23,8"'], ['Resolución', '1920 × 1080'], ['Frecuencia', '144 Hz'], ['Tiempo de respuesta', '1 ms MPRT'], ['Entradas', '2 × HDMI 2.0, 1 × DisplayPort 1.2'], ['VESA', '100 × 100']])),
  },
  {
    slug: 'monitor-27-165-hz-va', marca: 'Vértice', nombre: 'Monitor 27" 165 Hz QHD', cat: 'monitores', precio: 390000, anterior: 430000,
    etiquetas: [['refresco', '165 Hz'], ['panel', 'VA'], ['resolucion', 'QHD']], stock: 5,
    desc: doc(p('27" QHD con panel VA de alto contraste y 165 Hz.'),
      table(['Característica', 'Valor'], [['Resolución', '2560 × 1440'], ['Frecuencia', '165 Hz'], ['Contraste', '3000:1'], ['Curvatura', 'Plano']])),
  },
  {
    slug: 'monitor-27-4k', marca: 'Orbe', nombre: 'Monitor 27" 4K', cat: 'monitores', precio: 520000,
    etiquetas: [['refresco', '60 Hz'], ['panel', 'IPS'], ['resolucion', '4K']], stock: 3,
    desc: doc(p('Nitidez 4K para edición de foto y video, con cobertura 99% sRGB y USB-C con carga de 65 W.'),
      table(['Característica', 'Valor'], [['Resolución', '3840 × 2160'], ['Frecuencia', '60 Hz'], ['Color', '99% sRGB'], ['USB-C', 'Power Delivery 65 W']])),
  },
  {
    slug: 'monitor-32-curvo-240-hz', marca: 'Vértice', nombre: 'Monitor 32" curvo 240 Hz', cat: 'monitores', precio: 610000,
    etiquetas: [['refresco', '240 Hz'], ['panel', 'VA'], ['resolucion', 'QHD']], stock: 0,
    desc: doc(p('Curvatura 1000R y 240 Hz para juegos competitivos. Ejemplo de producto sin stock.')),
  },
  {
    slug: 'notebook-14', marca: 'Orbe', nombre: 'Notebook 14"', cat: 'notebooks', precio: 950000, anterior: 1050000, destacado: true,
    etiquetas: [['conectividad', 'Wi-Fi 6'], ['conectividad', 'USB-C']],
    variantes: combos([['memoria', ['16 GB', '32 GB']]], (e, i) => [4, 2][i], (e) => (e[0][1] === '32 GB' ? 1150000 : null)),
    desc: doc(p('Ultraliviana de 1,3 kg con pantalla 14" 2.8K y batería para toda la jornada.'),
      h(3, 'Configuraciones'),
      table(['Memoria', 'Almacenamiento', 'Precio'], [['16 GB', '512 GB SSD', '$ 950.000'], ['32 GB', '512 GB SSD', '$ 1.150.000']])),
  },
  {
    slug: 'notebook-16-gamer', marca: 'Pulsar', nombre: 'Notebook 16" gamer', cat: 'notebooks', precio: 1480000,
    etiquetas: [['conectividad', 'Wi-Fi 6'], ['refresco', '165 Hz']],
    variantes: combos([['memoria', ['16 GB', '32 GB']], ['almacenamiento', ['512 GB', '1 TB']]], (e, i) => [3, 0, 2, 1][i],
      (e) => 1480000 + (e[0][1] === '32 GB' ? 220000 : 0) + (e[1][1] === '1 TB' ? 120000 : 0)),
    desc: doc(p('Pantalla 16" a 165 Hz, placa dedicada y refrigeración con doble ventilador.')),
  },
  {
    slug: 'auriculares-inalambricos', marca: 'Sonar', nombre: 'Auriculares inalámbricos', cat: 'audio', precio: 85000, anterior: 99000, destacado: true,
    etiquetas: [['conectividad', 'Bluetooth']],
    variantes: combos([['color', ['Negro', 'Blanco']]], (e, i) => [7, 3][i]),
    desc: doc(p('Cancelación activa de ruido, 30 horas de batería y carga rápida por USB-C.'),
      ul('Bluetooth 5.3 con multipunto', 'Modo transparencia', 'Estuche rígido incluido')),
  },
  {
    slug: 'auriculares-con-cable', marca: 'Sonar', nombre: 'Auriculares con cable', cat: 'audio', precio: 25000,
    etiquetas: [['conectividad', 'Cable 3.5 mm']], stock: 15,
    desc: doc(p('Auriculares cerrados livianos con micrófono en línea.')),
  },
  {
    slug: 'teclado-mecanico', marca: 'Pulsar', nombre: 'Teclado mecánico', cat: 'perifericos', precio: 72000, anterior: 80000,
    etiquetas: [['conectividad', 'USB-C'], ['conectividad', 'Bluetooth']],
    variantes: combos([['color', ['Negro', 'Blanco']]], (e, i) => [5, 0][i]),
    desc: doc(p('Formato 75% con switches lineales hot-swap, conexión por cable o Bluetooth.')),
  },
  {
    slug: 'mouse-inalambrico', marca: 'Pulsar', nombre: 'Mouse inalámbrico', cat: 'perifericos', precio: 30000,
    etiquetas: [['conectividad', 'Receptor 2.4 GHz'], ['conectividad', 'Bluetooth']], stock: 20,
    desc: doc(p('Sensor de 26.000 DPI y 60 g de peso. Hasta 70 horas de batería.')),
  },
  {
    slug: 'parlante-bluetooth', marca: 'Sonar', nombre: 'Parlante bluetooth', cat: 'audio', precio: 48000, anterior: 55000,
    etiquetas: [['conectividad', 'Bluetooth']], stock: 6,
    desc: doc(p('Parlante portátil resistente al agua (IP67) con 12 horas de autonomía.')),
  },
  {
    slug: 'monitor-34-ultrawide', marca: 'Orbe', nombre: 'Monitor 34" ultrawide', cat: 'monitores', precio: 700000, publicado: false,
    etiquetas: [['refresco', '144 Hz'], ['panel', 'IPS']], stock: 2,
    desc: doc(p('Borrador: no aparece en la tienda hasta que se publique desde el dashboard.')),
  },
];

// ---------------------------------------------------------------- SQL
const etiquetaId = (g, v) =>
  `(select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = ${q(g)} and e.slug = ${q(slugify(v))})`;

let sql = `-- Datos de demo (generados). Idempotente: no hace nada si ya hay productos.
-- Local: corre solo con \`supabase db reset\`. Proyecto de demo: ver claude/supabase/migraciones.md#seed
do $seed$
declare
  v_id uuid;
begin
  if exists (select 1 from public.productos) then
    raise notice 'Ya hay productos: seed omitido';
    return;
  end if;

`;

for (const [slug, nombre, padre, orden] of categorias) {
  sql += `  insert into public.categorias (slug, nombre, padre_id, orden) values (${q(slug)}, ${q(nombre)}, ${padre ? `(select id from public.categorias where slug = ${q(padre)})` : 'null'}, ${orden});\n`;
}
sql += '\n';
for (const [slug, nombre, orden, esVar, ficha, valores, icono, esMarca] of grupos) {
  sql += `  insert into public.grupos_etiqueta (slug, nombre, orden, es_variante, visible_en_ficha, icono, es_marca) values (${q(slug)}, ${q(nombre)}, ${orden}, ${esVar}, ${ficha}, ${q(icono ?? ICONOS[slug] ?? null)}, ${esMarca ?? false});\n`;
  valores.forEach(([valor, hex], i) => {
    sql += `  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = ${q(slug)}), ${q(valor)}, ${i}, ${q(hex ?? null)});\n`;
  });
}
sql += '\n';

productos.forEach((pr, idx) => {
  const d = pr.desc;
  sql += `  -- ${pr.nombre}\n`;
  sql += `  insert into public.productos (slug, nombre, descripcion, descripcion_texto, precio, precio_anterior, categoria_id, publicado, destacado, creado_en)
  values (${q(pr.slug)}, ${q(pr.nombre)}, ${q(JSON.stringify(d))}::jsonb, ${q(plano(d))}, ${pr.precio}, ${pr.anterior ?? 'null'},
    (select id from public.categorias where slug = ${q(pr.cat)}), ${pr.publicado ?? true}, ${pr.destacado ?? false}, now() - interval '${productos.length - idx} days')
  returning id into v_id;\n`;
  for (const [g, v] of [['marca', pr.marca], ...pr.etiquetas]) {
    sql += `  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, ${etiquetaId(g, v)});\n`;
  }
  if (pr.variantes) {
    const items = pr.variantes.map((va) => {
      const sku = `${pr.slug}-${va.e.map(([, v]) => slugify(v)).join('-')}`.toUpperCase();
      return `jsonb_build_object('etiquetas', jsonb_build_array(${va.e.map(([g, v]) => etiquetaId(g, v)).join(', ')}), 'sku', ${q(sku)}, 'precio', ${va.precio ?? 'null'}, 'stock', ${va.stock}, 'activa', true)`;
    });
    sql += `  perform public.guardar_variantes(v_id, jsonb_build_array(\n    ${items.join(',\n    ')}\n  ));\n`;
  } else {
    sql += `  update public.producto_variantes set stock = ${pr.stock ?? 0}, sku = ${q(pr.slug.toUpperCase())} where producto_id = v_id;\n`;
  }
  sql += '\n';
});

// promociones de demo: una de cada tipo de las que se ven en la tienda
sql += `  -- Promociones de demo
  insert into public.promociones (nombre, tipo, valor) values ('20% off en monitores', 'porcentaje', 20) returning id into v_id;
  insert into public.promocion_alcance (promocion_id, categoria_id) select v_id, id from public.categorias where slug = 'monitores';
  insert into public.promociones (nombre, tipo, lleva, paga) values ('3x2 en remeras', 'nxm', 3, 2) returning id into v_id;
  insert into public.promocion_alcance (promocion_id, categoria_id) select v_id, id from public.categorias where slug = 'remeras';
  insert into public.promociones (nombre, tipo, valor) values ('2da unidad al 50% en buzos', 'segunda_unidad', 50) returning id into v_id;
  insert into public.promocion_alcance (promocion_id, categoria_id) select v_id, id from public.categorias where slug = 'buzos';

  -- combos de demo: precio menor que comprar los productos por separado (con sus promos)
  insert into public.combos (slug, nombre, precio, publicado, destacado, descripcion_texto)
  values ('combo-gamer', 'Combo gamer: monitor + teclado + mouse', 319000, true, true,
          'Monitor de 24 pulgadas a 144 Hz, teclado mecánico y mouse inalámbrico.')
  returning id into v_id;
  insert into public.combo_items (combo_id, producto_id, cantidad, orden)
  select v_id, p.id, 1, x.o from (values ('monitor-24-144-hz-ips', 0), ('teclado-mecanico', 1), ('mouse-inalambrico', 2)) x(s, o)
  join public.productos p on p.slug = x.s;
  insert into public.combos (slug, nombre, precio, publicado, destacado, descripcion_texto)
  values ('combo-abrigo', 'Combo abrigo: buzo + pantalón cargo', 85000, true, true,
          'Buzo canguro y pantalón cargo. Elegí talle y color de cada uno.')
  returning id into v_id;
  insert into public.combo_items (combo_id, producto_id, cantidad, orden)
  select v_id, p.id, 1, x.o from (values ('buzo-canguro', 0), ('pantalon-cargo', 1)) x(s, o)
  join public.productos p on p.slug = x.s;
  insert into public.combos (slug, nombre, precio, publicado, destacado, descripcion_texto)
  values ('pack-remeras-y-medias', 'Pack 2 remeras básicas + medias', 39900, true, false,
          'Dos remeras básicas (elegís talle y color) y un pack de 3 pares de medias.')
  returning id into v_id;
  insert into public.combo_items (combo_id, producto_id, cantidad, orden)
  select v_id, p.id, x.c, x.o from (values ('remera-basica', 2, 0), ('medias-pack-x3', 1, 1)) x(s, c, o)
  join public.productos p on p.slug = x.s;

`;
sql += `end;
$seed$;
`;

writeFileSync(process.argv[2], sql);
console.log(`${productos.length} productos, ${categorias.length} categorías, ${grupos.length} grupos`);

