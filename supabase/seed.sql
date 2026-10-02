-- Datos de demo (generados). Idempotente: no hace nada si ya hay productos.
-- Local: corre solo con `supabase db reset`. Proyecto de demo: ver claude/supabase/migraciones.md#seed
do $seed$
declare
  v_id uuid;
begin
  if exists (select 1 from public.productos) then
    raise notice 'Ya hay productos: seed omitido';
    return;
  end if;

  insert into public.categorias (slug, nombre, padre_id, orden) values ('ropa', 'Ropa', null, 1);
  insert into public.categorias (slug, nombre, padre_id, orden) values ('remeras', 'Remeras', (select id from public.categorias where slug = 'ropa'), 1);
  insert into public.categorias (slug, nombre, padre_id, orden) values ('buzos', 'Buzos', (select id from public.categorias where slug = 'ropa'), 2);
  insert into public.categorias (slug, nombre, padre_id, orden) values ('pantalones', 'Pantalones', (select id from public.categorias where slug = 'ropa'), 3);
  insert into public.categorias (slug, nombre, padre_id, orden) values ('abrigos', 'Abrigos', (select id from public.categorias where slug = 'ropa'), 4);
  insert into public.categorias (slug, nombre, padre_id, orden) values ('accesorios', 'Accesorios', (select id from public.categorias where slug = 'ropa'), 5);
  insert into public.categorias (slug, nombre, padre_id, orden) values ('electronica', 'Electrónica', null, 2);
  insert into public.categorias (slug, nombre, padre_id, orden) values ('monitores', 'Monitores', (select id from public.categorias where slug = 'electronica'), 1);
  insert into public.categorias (slug, nombre, padre_id, orden) values ('notebooks', 'Notebooks', (select id from public.categorias where slug = 'electronica'), 2);
  insert into public.categorias (slug, nombre, padre_id, orden) values ('audio', 'Audio', (select id from public.categorias where slug = 'electronica'), 3);
  insert into public.categorias (slug, nombre, padre_id, orden) values ('perifericos', 'Periféricos', (select id from public.categorias where slug = 'electronica'), 4);

  insert into public.grupos_etiqueta (slug, nombre, orden, es_variante, visible_en_ficha, icono, es_marca) values ('marca', 'Marca', 0, false, true, 'Tag', true);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'marca'), 'Norte', 0, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'marca'), 'Alba', 1, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'marca'), 'Raíz', 2, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'marca'), 'Vértice', 3, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'marca'), 'Orbe', 4, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'marca'), 'Pulsar', 5, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'marca'), 'Sonar', 6, null);
  insert into public.grupos_etiqueta (slug, nombre, orden, es_variante, visible_en_ficha, icono, es_marca) values ('talle', 'Talle', 1, true, true, 'LayoutCells', false);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'talle'), 'S', 0, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'talle'), 'M', 1, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'talle'), 'L', 2, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'talle'), 'XL', 3, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'talle'), '38', 4, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'talle'), '40', 5, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'talle'), '42', 6, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'talle'), '44', 7, null);
  insert into public.grupos_etiqueta (slug, nombre, orden, es_variante, visible_en_ficha, icono, es_marca) values ('color', 'Color', 2, true, true, 'Palette', false);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'color'), 'Negro', 0, '#0a0a0a');
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'color'), 'Blanco', 1, '#ffffff');
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'color'), 'Gris', 2, '#9ca3af');
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'color'), 'Azul', 3, '#1e3a8a');
  insert into public.grupos_etiqueta (slug, nombre, orden, es_variante, visible_en_ficha, icono, es_marca) values ('memoria', 'Memoria RAM', 3, true, true, 'Cpu', false);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'memoria'), '16 GB', 0, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'memoria'), '32 GB', 1, null);
  insert into public.grupos_etiqueta (slug, nombre, orden, es_variante, visible_en_ficha, icono, es_marca) values ('almacenamiento', 'Almacenamiento', 4, true, true, 'HardDrive', false);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'almacenamiento'), '512 GB', 0, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'almacenamiento'), '1 TB', 1, null);
  insert into public.grupos_etiqueta (slug, nombre, orden, es_variante, visible_en_ficha, icono, es_marca) values ('material', 'Material', 5, false, true, 'Layers', false);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'material'), '100% algodón', 0, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'material'), 'Algodón y poliéster', 1, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'material'), 'Gabardina', 2, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'material'), 'Denim', 3, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'material'), 'Poliéster', 4, null);
  insert into public.grupos_etiqueta (slug, nombre, orden, es_variante, visible_en_ficha, icono, es_marca) values ('refresco', 'Tasa de refresco', 6, false, true, 'Speedometer', false);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'refresco'), '60 Hz', 0, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'refresco'), '144 Hz', 1, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'refresco'), '165 Hz', 2, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'refresco'), '240 Hz', 3, null);
  insert into public.grupos_etiqueta (slug, nombre, orden, es_variante, visible_en_ficha, icono, es_marca) values ('panel', 'Panel', 7, false, true, 'Display', false);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'panel'), 'IPS', 0, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'panel'), 'VA', 1, null);
  insert into public.grupos_etiqueta (slug, nombre, orden, es_variante, visible_en_ficha, icono, es_marca) values ('resolucion', 'Resolución', 8, false, true, 'Picture', false);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'resolucion'), 'Full HD', 0, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'resolucion'), 'QHD', 1, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'resolucion'), '4K', 2, null);
  insert into public.grupos_etiqueta (slug, nombre, orden, es_variante, visible_en_ficha, icono, es_marca) values ('conectividad', 'Conectividad', 9, false, true, 'Signal', false);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'conectividad'), 'Bluetooth', 0, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'conectividad'), 'Wi-Fi 6', 1, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'conectividad'), 'USB-C', 2, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'conectividad'), 'Cable 3.5 mm', 3, null);
  insert into public.etiquetas (grupo_id, valor, orden, color_hex) values ((select id from public.grupos_etiqueta where slug = 'conectividad'), 'Receptor 2.4 GHz', 4, null);

  -- Remera básica
  insert into public.productos (slug, nombre, descripcion, descripcion_texto, precio, precio_anterior, categoria_id, publicado, destacado, creado_en)
  values ('remera-basica', 'Remera básica', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Remera de corte recto en "},{"type":"text","text":"jersey 100% algodón","marks":[{"type":"bold"}]},{"type":"text","text":" peinado de 24/1. Cuello redondo con ribete y costuras reforzadas."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Tabla de talles"}]},{"type":"table","content":[{"type":"tableRow","content":[{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Talle"}]}]},{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Ancho (cm)"}]}]},{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Largo (cm)"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"S"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"48"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"68"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"M"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"51"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"71"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"L"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"54"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"74"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"XL"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"57"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"77"}]}]}]}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Cuidado"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Lavar con agua fría"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"No usar secarropas"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Planchar del revés"}]}]}]}]}'::jsonb, 'Remera de corte recto en jersey 100% algodón peinado de 24/1. Cuello redondo con ribete y costuras reforzadas.
Tabla de talles
Talle
 Ancho (cm)
 Largo (cm)
S
 48
 68
M
 51
 71
L
 54
 74
XL
 57
 77
Cuidado
Lavar con agua fría
No usar secarropas
Planchar del revés', 18000, null,
    (select id from public.categorias where slug = 'remeras'), true, true, now() - interval '20 days')
  returning id into v_id;
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'marca' and e.slug = 'norte'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'material' and e.slug = '100-algodon'));
  perform public.guardar_variantes(v_id, jsonb_build_array(
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 's'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'negro')), 'sku', 'REMERA-BASICA-S-NEGRO', 'precio', null, 'stock', 6, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 's'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'blanco')), 'sku', 'REMERA-BASICA-S-BLANCO', 'precio', null, 'stock', 0, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'm'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'negro')), 'sku', 'REMERA-BASICA-M-NEGRO', 'precio', null, 'stock', 12, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'm'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'blanco')), 'sku', 'REMERA-BASICA-M-BLANCO', 'precio', null, 'stock', 4, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'l'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'negro')), 'sku', 'REMERA-BASICA-L-NEGRO', 'precio', null, 'stock', 9, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'l'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'blanco')), 'sku', 'REMERA-BASICA-L-BLANCO', 'precio', null, 'stock', 3, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'xl'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'negro')), 'sku', 'REMERA-BASICA-XL-NEGRO', 'precio', null, 'stock', 0, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'xl'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'blanco')), 'sku', 'REMERA-BASICA-XL-BLANCO', 'precio', null, 'stock', 2, 'activa', true)
  ));

  -- Remera oversize
  insert into public.productos (slug, nombre, descripcion, descripcion_texto, precio, precio_anterior, categoria_id, publicado, destacado, creado_en)
  values ('remera-oversize', 'Remera oversize', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Calce amplio con hombro caído. Algodón de "},{"type":"text","text":"gramaje pesado","marks":[{"type":"bold"}]},{"type":"text","text":" que no se deforma con los lavados."}]},{"type":"table","content":[{"type":"tableRow","content":[{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Talle"}]}]},{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Ancho (cm)"}]}]},{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Largo (cm)"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"M"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"58"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"72"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"L"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"61"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"75"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"XL"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"64"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"78"}]}]}]}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Lavar con agua fría"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"No usar secarropas"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Planchar del revés"}]}]}]}]}'::jsonb, 'Calce amplio con hombro caído. Algodón de gramaje pesado que no se deforma con los lavados.
Talle
 Ancho (cm)
 Largo (cm)
M
 58
 72
L
 61
 75
XL
 64
 78
Lavar con agua fría
No usar secarropas
Planchar del revés', 22000, 26000,
    (select id from public.categorias where slug = 'remeras'), true, false, now() - interval '19 days')
  returning id into v_id;
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'marca' and e.slug = 'alba'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'material' and e.slug = '100-algodon'));
  perform public.guardar_variantes(v_id, jsonb_build_array(
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'm'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'negro')), 'sku', 'REMERA-OVERSIZE-M-NEGRO', 'precio', null, 'stock', 5, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'm'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'gris')), 'sku', 'REMERA-OVERSIZE-M-GRIS', 'precio', null, 'stock', 2, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'l'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'negro')), 'sku', 'REMERA-OVERSIZE-L-NEGRO', 'precio', null, 'stock', 7, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'l'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'gris')), 'sku', 'REMERA-OVERSIZE-L-GRIS', 'precio', null, 'stock', 0, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'xl'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'negro')), 'sku', 'REMERA-OVERSIZE-XL-NEGRO', 'precio', null, 'stock', 3, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'xl'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'gris')), 'sku', 'REMERA-OVERSIZE-XL-GRIS', 'precio', null, 'stock', 1, 'activa', true)
  ));

  -- Buzo canguro
  insert into public.productos (slug, nombre, descripcion, descripcion_texto, precio, precio_anterior, categoria_id, publicado, destacado, creado_en)
  values ('buzo-canguro', 'Buzo canguro', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Frisa invisible 80% algodón / 20% poliéster, capucha forrada y bolsillo canguro."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Tabla de talles"}]},{"type":"table","content":[{"type":"tableRow","content":[{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Talle"}]}]},{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Ancho (cm)"}]}]},{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Largo (cm)"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"S"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"54"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"66"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"M"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"57"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"69"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"L"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"60"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"72"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"XL"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"63"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"75"}]}]}]}]}]}'::jsonb, 'Frisa invisible 80% algodón / 20% poliéster, capucha forrada y bolsillo canguro.
Tabla de talles
Talle
 Ancho (cm)
 Largo (cm)
S
 54
 66
M
 57
 69
L
 60
 72
XL
 63
 75', 45000, null,
    (select id from public.categorias where slug = 'buzos'), true, true, now() - interval '18 days')
  returning id into v_id;
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'marca' and e.slug = 'alba'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'material' and e.slug = 'algodon-y-poliester'));
  perform public.guardar_variantes(v_id, jsonb_build_array(
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 's'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'negro')), 'sku', 'BUZO-CANGURO-S-NEGRO', 'precio', null, 'stock', 2, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 's'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'gris')), 'sku', 'BUZO-CANGURO-S-GRIS', 'precio', null, 'stock', 4, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'm'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'negro')), 'sku', 'BUZO-CANGURO-M-NEGRO', 'precio', null, 'stock', 6, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'm'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'gris')), 'sku', 'BUZO-CANGURO-M-GRIS', 'precio', null, 'stock', 5, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'l'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'negro')), 'sku', 'BUZO-CANGURO-L-NEGRO', 'precio', null, 'stock', 3, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'l'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'gris')), 'sku', 'BUZO-CANGURO-L-GRIS', 'precio', null, 'stock', 0, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'xl'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'negro')), 'sku', 'BUZO-CANGURO-XL-NEGRO', 'precio', null, 'stock', 1, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'xl'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'gris')), 'sku', 'BUZO-CANGURO-XL-GRIS', 'precio', null, 'stock', 2, 'activa', true)
  ));

  -- Buzo cuello redondo
  insert into public.productos (slug, nombre, descripcion, descripcion_texto, precio, precio_anterior, categoria_id, publicado, destacado, creado_en)
  values ('buzo-cuello-redondo', 'Buzo cuello redondo', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Buzo liviano de rústico, ideal para media estación. Puños y cintura con elastano."}]}]}'::jsonb, 'Buzo liviano de rústico, ideal para media estación. Puños y cintura con elastano.', 39000, null,
    (select id from public.categorias where slug = 'buzos'), true, false, now() - interval '17 days')
  returning id into v_id;
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'marca' and e.slug = 'norte'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'material' and e.slug = '100-algodon'));
  perform public.guardar_variantes(v_id, jsonb_build_array(
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 's'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'blanco')), 'sku', 'BUZO-CUELLO-REDONDO-S-BLANCO', 'precio', null, 'stock', 3, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 's'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'negro')), 'sku', 'BUZO-CUELLO-REDONDO-S-NEGRO', 'precio', null, 'stock', 3, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'm'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'blanco')), 'sku', 'BUZO-CUELLO-REDONDO-M-BLANCO', 'precio', null, 'stock', 5, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'm'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'negro')), 'sku', 'BUZO-CUELLO-REDONDO-M-NEGRO', 'precio', null, 'stock', 0, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'l'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'blanco')), 'sku', 'BUZO-CUELLO-REDONDO-L-BLANCO', 'precio', null, 'stock', 2, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'l'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'negro')), 'sku', 'BUZO-CUELLO-REDONDO-L-NEGRO', 'precio', null, 'stock', 4, 'activa', true)
  ));

  -- Pantalón cargo
  insert into public.productos (slug, nombre, descripcion, descripcion_texto, precio, precio_anterior, categoria_id, publicado, destacado, creado_en)
  values ('pantalon-cargo', 'Pantalón cargo', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Gabardina elastizada con seis bolsillos y ruedo con cordón regulable."}]},{"type":"table","content":[{"type":"tableRow","content":[{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Talle"}]}]},{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Cintura (cm)"}]}]},{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Largo (cm)"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"38"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"76"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"102"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"40"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"80"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"103"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"42"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"84"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"104"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"44"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"88"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"105"}]}]}]}]}]}'::jsonb, 'Gabardina elastizada con seis bolsillos y ruedo con cordón regulable.
Talle
 Cintura (cm)
 Largo (cm)
38
 76
 102
40
 80
 103
42
 84
 104
44
 88
 105', 52000, null,
    (select id from public.categorias where slug = 'pantalones'), true, false, now() - interval '16 days')
  returning id into v_id;
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'marca' and e.slug = 'raiz'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'material' and e.slug = 'gabardina'));
  perform public.guardar_variantes(v_id, jsonb_build_array(
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = '38'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'negro')), 'sku', 'PANTALON-CARGO-38-NEGRO', 'precio', null, 'stock', 2, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = '40'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'negro')), 'sku', 'PANTALON-CARGO-40-NEGRO', 'precio', null, 'stock', 5, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = '42'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'negro')), 'sku', 'PANTALON-CARGO-42-NEGRO', 'precio', null, 'stock', 4, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = '44'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'negro')), 'sku', 'PANTALON-CARGO-44-NEGRO', 'precio', null, 'stock', 1, 'activa', true)
  ));

  -- Jean recto
  insert into public.productos (slug, nombre, descripcion, descripcion_texto, precio, precio_anterior, categoria_id, publicado, destacado, creado_en)
  values ('jean-recto', 'Jean recto', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Denim rígido de 13 oz con lavado medio. Tiro medio y pierna recta."}]}]}'::jsonb, 'Denim rígido de 13 oz con lavado medio. Tiro medio y pierna recta.', 58000, 64000,
    (select id from public.categorias where slug = 'pantalones'), true, true, now() - interval '15 days')
  returning id into v_id;
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'marca' and e.slug = 'raiz'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'material' and e.slug = 'denim'));
  perform public.guardar_variantes(v_id, jsonb_build_array(
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = '40'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'azul')), 'sku', 'JEAN-RECTO-40-AZUL', 'precio', null, 'stock', 4, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = '42'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'azul')), 'sku', 'JEAN-RECTO-42-AZUL', 'precio', null, 'stock', 6, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = '44'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'azul')), 'sku', 'JEAN-RECTO-44-AZUL', 'precio', null, 'stock', 2, 'activa', true)
  ));

  -- Campera rompevientos
  insert into public.productos (slug, nombre, descripcion, descripcion_texto, precio, precio_anterior, categoria_id, publicado, destacado, creado_en)
  values ('campera-rompevientos', 'Campera rompevientos', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Rompevientos liviana con capucha guardable. "},{"type":"text","text":"Sin stock","marks":[{"type":"bold"}]},{"type":"text","text":" por el momento: ejemplo de producto agotado."}]}]}'::jsonb, 'Rompevientos liviana con capucha guardable. Sin stock por el momento: ejemplo de producto agotado.', 68000, null,
    (select id from public.categorias where slug = 'abrigos'), true, false, now() - interval '14 days')
  returning id into v_id;
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'marca' and e.slug = 'alba'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'material' and e.slug = 'poliester'));
  perform public.guardar_variantes(v_id, jsonb_build_array(
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'm'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'negro')), 'sku', 'CAMPERA-ROMPEVIENTOS-M-NEGRO', 'precio', null, 'stock', 0, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'l'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'negro')), 'sku', 'CAMPERA-ROMPEVIENTOS-L-NEGRO', 'precio', null, 'stock', 0, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'talle' and e.slug = 'xl'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'negro')), 'sku', 'CAMPERA-ROMPEVIENTOS-XL-NEGRO', 'precio', null, 'stock', 0, 'activa', true)
  ));

  -- Medias pack x3
  insert into public.productos (slug, nombre, descripcion, descripcion_texto, precio, precio_anterior, categoria_id, publicado, destacado, creado_en)
  values ('medias-pack-x3', 'Medias pack x3', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Pack de tres pares de medias de algodón con puño acanalado. Talle único (39 a 44)."}]}]}'::jsonb, 'Pack de tres pares de medias de algodón con puño acanalado. Talle único (39 a 44).', 9500, null,
    (select id from public.categorias where slug = 'accesorios'), true, false, now() - interval '13 days')
  returning id into v_id;
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'marca' and e.slug = 'norte'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'material' and e.slug = '100-algodon'));
  update public.producto_variantes set stock = 40, sku = 'MEDIAS-PACK-X3' where producto_id = v_id;

  -- Monitor 24" 144 Hz IPS
  insert into public.productos (slug, nombre, descripcion, descripcion_texto, precio, precio_anterior, categoria_id, publicado, destacado, creado_en)
  values ('monitor-24-144-hz-ips', 'Monitor 24" 144 Hz IPS', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Panel IPS de 24\" con "},{"type":"text","text":"144 Hz","marks":[{"type":"bold"}]},{"type":"text","text":" y 1 ms (MPRT). Colores fieles para trabajar y fluidez para jugar."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Especificaciones"}]},{"type":"table","content":[{"type":"tableRow","content":[{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Característica"}]}]},{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Valor"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"Tamaño"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"23,8\""}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"Resolución"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"1920 × 1080"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"Frecuencia"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"144 Hz"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"Tiempo de respuesta"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"1 ms MPRT"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"Entradas"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"2 × HDMI 2.0, 1 × DisplayPort 1.2"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"VESA"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"100 × 100"}]}]}]}]}]}'::jsonb, 'Panel IPS de 24" con 144 Hz y 1 ms (MPRT). Colores fieles para trabajar y fluidez para jugar.
Especificaciones
Característica
 Valor
Tamaño
 23,8"
Resolución
 1920 × 1080
Frecuencia
 144 Hz
Tiempo de respuesta
 1 ms MPRT
Entradas
 2 × HDMI 2.0, 1 × DisplayPort 1.2
VESA
 100 × 100', 280000, null,
    (select id from public.categorias where slug = 'monitores'), true, true, now() - interval '12 days')
  returning id into v_id;
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'marca' and e.slug = 'vertice'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'refresco' and e.slug = '144-hz'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'panel' and e.slug = 'ips'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'resolucion' and e.slug = 'full-hd'));
  update public.producto_variantes set stock = 8, sku = 'MONITOR-24-144-HZ-IPS' where producto_id = v_id;

  -- Monitor 27" 165 Hz QHD
  insert into public.productos (slug, nombre, descripcion, descripcion_texto, precio, precio_anterior, categoria_id, publicado, destacado, creado_en)
  values ('monitor-27-165-hz-va', 'Monitor 27" 165 Hz QHD', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"27\" QHD con panel VA de alto contraste y 165 Hz."}]},{"type":"table","content":[{"type":"tableRow","content":[{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Característica"}]}]},{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Valor"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"Resolución"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"2560 × 1440"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"Frecuencia"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"165 Hz"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"Contraste"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"3000:1"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"Curvatura"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"Plano"}]}]}]}]}]}'::jsonb, '27" QHD con panel VA de alto contraste y 165 Hz.
Característica
 Valor
Resolución
 2560 × 1440
Frecuencia
 165 Hz
Contraste
 3000:1
Curvatura
 Plano', 390000, 430000,
    (select id from public.categorias where slug = 'monitores'), true, false, now() - interval '11 days')
  returning id into v_id;
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'marca' and e.slug = 'vertice'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'refresco' and e.slug = '165-hz'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'panel' and e.slug = 'va'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'resolucion' and e.slug = 'qhd'));
  update public.producto_variantes set stock = 5, sku = 'MONITOR-27-165-HZ-VA' where producto_id = v_id;

  -- Monitor 27" 4K
  insert into public.productos (slug, nombre, descripcion, descripcion_texto, precio, precio_anterior, categoria_id, publicado, destacado, creado_en)
  values ('monitor-27-4k', 'Monitor 27" 4K', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Nitidez 4K para edición de foto y video, con cobertura 99% sRGB y USB-C con carga de 65 W."}]},{"type":"table","content":[{"type":"tableRow","content":[{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Característica"}]}]},{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Valor"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"Resolución"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"3840 × 2160"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"Frecuencia"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"60 Hz"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"Color"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"99% sRGB"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"USB-C"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"Power Delivery 65 W"}]}]}]}]}]}'::jsonb, 'Nitidez 4K para edición de foto y video, con cobertura 99% sRGB y USB-C con carga de 65 W.
Característica
 Valor
Resolución
 3840 × 2160
Frecuencia
 60 Hz
Color
 99% sRGB
USB-C
 Power Delivery 65 W', 520000, null,
    (select id from public.categorias where slug = 'monitores'), true, false, now() - interval '10 days')
  returning id into v_id;
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'marca' and e.slug = 'orbe'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'refresco' and e.slug = '60-hz'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'panel' and e.slug = 'ips'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'resolucion' and e.slug = '4-k'));
  update public.producto_variantes set stock = 3, sku = 'MONITOR-27-4K' where producto_id = v_id;

  -- Monitor 32" curvo 240 Hz
  insert into public.productos (slug, nombre, descripcion, descripcion_texto, precio, precio_anterior, categoria_id, publicado, destacado, creado_en)
  values ('monitor-32-curvo-240-hz', 'Monitor 32" curvo 240 Hz', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Curvatura 1000R y 240 Hz para juegos competitivos. Ejemplo de producto sin stock."}]}]}'::jsonb, 'Curvatura 1000R y 240 Hz para juegos competitivos. Ejemplo de producto sin stock.', 610000, null,
    (select id from public.categorias where slug = 'monitores'), true, false, now() - interval '9 days')
  returning id into v_id;
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'marca' and e.slug = 'vertice'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'refresco' and e.slug = '240-hz'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'panel' and e.slug = 'va'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'resolucion' and e.slug = 'qhd'));
  update public.producto_variantes set stock = 0, sku = 'MONITOR-32-CURVO-240-HZ' where producto_id = v_id;

  -- Notebook 14"
  insert into public.productos (slug, nombre, descripcion, descripcion_texto, precio, precio_anterior, categoria_id, publicado, destacado, creado_en)
  values ('notebook-14', 'Notebook 14"', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Ultraliviana de 1,3 kg con pantalla 14\" 2.8K y batería para toda la jornada."}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Configuraciones"}]},{"type":"table","content":[{"type":"tableRow","content":[{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Memoria"}]}]},{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Almacenamiento"}]}]},{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Precio"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"16 GB"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"512 GB SSD"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"$ 950.000"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"32 GB"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"512 GB SSD"}]}]},{"type":"tableCell","content":[{"type":"paragraph","content":[{"type":"text","text":"$ 1.150.000"}]}]}]}]}]}'::jsonb, 'Ultraliviana de 1,3 kg con pantalla 14" 2.8K y batería para toda la jornada.
Configuraciones
Memoria
 Almacenamiento
 Precio
16 GB
 512 GB SSD
 $ 950.000
32 GB
 512 GB SSD
 $ 1.150.000', 950000, 1050000,
    (select id from public.categorias where slug = 'notebooks'), true, true, now() - interval '8 days')
  returning id into v_id;
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'marca' and e.slug = 'orbe'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'conectividad' and e.slug = 'wi-fi-6'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'conectividad' and e.slug = 'usb-c'));
  perform public.guardar_variantes(v_id, jsonb_build_array(
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'memoria' and e.slug = '16-gb')), 'sku', 'NOTEBOOK-14-16-GB', 'precio', null, 'stock', 4, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'memoria' and e.slug = '32-gb')), 'sku', 'NOTEBOOK-14-32-GB', 'precio', 1150000, 'stock', 2, 'activa', true)
  ));

  -- Notebook 16" gamer
  insert into public.productos (slug, nombre, descripcion, descripcion_texto, precio, precio_anterior, categoria_id, publicado, destacado, creado_en)
  values ('notebook-16-gamer', 'Notebook 16" gamer', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Pantalla 16\" a 165 Hz, placa dedicada y refrigeración con doble ventilador."}]}]}'::jsonb, 'Pantalla 16" a 165 Hz, placa dedicada y refrigeración con doble ventilador.', 1480000, null,
    (select id from public.categorias where slug = 'notebooks'), true, false, now() - interval '7 days')
  returning id into v_id;
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'marca' and e.slug = 'pulsar'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'conectividad' and e.slug = 'wi-fi-6'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'refresco' and e.slug = '165-hz'));
  perform public.guardar_variantes(v_id, jsonb_build_array(
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'memoria' and e.slug = '16-gb'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'almacenamiento' and e.slug = '512-gb')), 'sku', 'NOTEBOOK-16-GAMER-16-GB-512-GB', 'precio', 1480000, 'stock', 3, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'memoria' and e.slug = '16-gb'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'almacenamiento' and e.slug = '1-tb')), 'sku', 'NOTEBOOK-16-GAMER-16-GB-1-TB', 'precio', 1600000, 'stock', 0, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'memoria' and e.slug = '32-gb'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'almacenamiento' and e.slug = '512-gb')), 'sku', 'NOTEBOOK-16-GAMER-32-GB-512-GB', 'precio', 1700000, 'stock', 2, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'memoria' and e.slug = '32-gb'), (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'almacenamiento' and e.slug = '1-tb')), 'sku', 'NOTEBOOK-16-GAMER-32-GB-1-TB', 'precio', 1820000, 'stock', 1, 'activa', true)
  ));

  -- Auriculares inalámbricos
  insert into public.productos (slug, nombre, descripcion, descripcion_texto, precio, precio_anterior, categoria_id, publicado, destacado, creado_en)
  values ('auriculares-inalambricos', 'Auriculares inalámbricos', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Cancelación activa de ruido, 30 horas de batería y carga rápida por USB-C."}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Bluetooth 5.3 con multipunto"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Modo transparencia"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Estuche rígido incluido"}]}]}]}]}'::jsonb, 'Cancelación activa de ruido, 30 horas de batería y carga rápida por USB-C.
Bluetooth 5.3 con multipunto
Modo transparencia
Estuche rígido incluido', 85000, 99000,
    (select id from public.categorias where slug = 'audio'), true, true, now() - interval '6 days')
  returning id into v_id;
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'marca' and e.slug = 'sonar'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'conectividad' and e.slug = 'bluetooth'));
  perform public.guardar_variantes(v_id, jsonb_build_array(
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'negro')), 'sku', 'AURICULARES-INALAMBRICOS-NEGRO', 'precio', null, 'stock', 7, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'blanco')), 'sku', 'AURICULARES-INALAMBRICOS-BLANCO', 'precio', null, 'stock', 3, 'activa', true)
  ));

  -- Auriculares con cable
  insert into public.productos (slug, nombre, descripcion, descripcion_texto, precio, precio_anterior, categoria_id, publicado, destacado, creado_en)
  values ('auriculares-con-cable', 'Auriculares con cable', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Auriculares cerrados livianos con micrófono en línea."}]}]}'::jsonb, 'Auriculares cerrados livianos con micrófono en línea.', 25000, null,
    (select id from public.categorias where slug = 'audio'), true, false, now() - interval '5 days')
  returning id into v_id;
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'marca' and e.slug = 'sonar'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'conectividad' and e.slug = 'cable-3-5-mm'));
  update public.producto_variantes set stock = 15, sku = 'AURICULARES-CON-CABLE' where producto_id = v_id;

  -- Teclado mecánico
  insert into public.productos (slug, nombre, descripcion, descripcion_texto, precio, precio_anterior, categoria_id, publicado, destacado, creado_en)
  values ('teclado-mecanico', 'Teclado mecánico', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Formato 75% con switches lineales hot-swap, conexión por cable o Bluetooth."}]}]}'::jsonb, 'Formato 75% con switches lineales hot-swap, conexión por cable o Bluetooth.', 72000, 80000,
    (select id from public.categorias where slug = 'perifericos'), true, false, now() - interval '4 days')
  returning id into v_id;
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'marca' and e.slug = 'pulsar'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'conectividad' and e.slug = 'usb-c'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'conectividad' and e.slug = 'bluetooth'));
  perform public.guardar_variantes(v_id, jsonb_build_array(
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'negro')), 'sku', 'TECLADO-MECANICO-NEGRO', 'precio', null, 'stock', 5, 'activa', true),
    jsonb_build_object('etiquetas', jsonb_build_array((select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'color' and e.slug = 'blanco')), 'sku', 'TECLADO-MECANICO-BLANCO', 'precio', null, 'stock', 0, 'activa', true)
  ));

  -- Mouse inalámbrico
  insert into public.productos (slug, nombre, descripcion, descripcion_texto, precio, precio_anterior, categoria_id, publicado, destacado, creado_en)
  values ('mouse-inalambrico', 'Mouse inalámbrico', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Sensor de 26.000 DPI y 60 g de peso. Hasta 70 horas de batería."}]}]}'::jsonb, 'Sensor de 26.000 DPI y 60 g de peso. Hasta 70 horas de batería.', 30000, null,
    (select id from public.categorias where slug = 'perifericos'), true, false, now() - interval '3 days')
  returning id into v_id;
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'marca' and e.slug = 'pulsar'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'conectividad' and e.slug = 'receptor-2-4-ghz'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'conectividad' and e.slug = 'bluetooth'));
  update public.producto_variantes set stock = 20, sku = 'MOUSE-INALAMBRICO' where producto_id = v_id;

  -- Parlante bluetooth
  insert into public.productos (slug, nombre, descripcion, descripcion_texto, precio, precio_anterior, categoria_id, publicado, destacado, creado_en)
  values ('parlante-bluetooth', 'Parlante bluetooth', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Parlante portátil resistente al agua (IP67) con 12 horas de autonomía."}]}]}'::jsonb, 'Parlante portátil resistente al agua (IP67) con 12 horas de autonomía.', 48000, 55000,
    (select id from public.categorias where slug = 'audio'), true, false, now() - interval '2 days')
  returning id into v_id;
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'marca' and e.slug = 'sonar'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'conectividad' and e.slug = 'bluetooth'));
  update public.producto_variantes set stock = 6, sku = 'PARLANTE-BLUETOOTH' where producto_id = v_id;

  -- Monitor 34" ultrawide
  insert into public.productos (slug, nombre, descripcion, descripcion_texto, precio, precio_anterior, categoria_id, publicado, destacado, creado_en)
  values ('monitor-34-ultrawide', 'Monitor 34" ultrawide', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Borrador: no aparece en la tienda hasta que se publique desde el dashboard."}]}]}'::jsonb, 'Borrador: no aparece en la tienda hasta que se publique desde el dashboard.', 700000, null,
    (select id from public.categorias where slug = 'monitores'), false, false, now() - interval '1 days')
  returning id into v_id;
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'marca' and e.slug = 'orbe'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'refresco' and e.slug = '144-hz'));
  insert into public.producto_etiquetas (producto_id, etiqueta_id) values (v_id, (select e.id from public.etiquetas e join public.grupos_etiqueta g on g.id = e.grupo_id where g.slug = 'panel' and e.slug = 'ips'));
  update public.producto_variantes set stock = 2, sku = 'MONITOR-34-ULTRAWIDE' where producto_id = v_id;

  -- Promociones de demo
  insert into public.promociones (nombre, tipo, valor) values ('20% off en monitores', 'porcentaje', 20) returning id into v_id;
  insert into public.promocion_alcance (promocion_id, categoria_id) select v_id, id from public.categorias where slug = 'monitores';
  insert into public.promociones (nombre, tipo, lleva, paga) values ('3x2 en remeras', 'nxm', 3, 2) returning id into v_id;
  insert into public.promocion_alcance (promocion_id, categoria_id) select v_id, id from public.categorias where slug = 'remeras';
  insert into public.promociones (nombre, tipo, valor) values ('2da unidad al 50% en buzos', 'segunda_unidad', 50) returning id into v_id;
  insert into public.promocion_alcance (promocion_id, categoria_id) select v_id, id from public.categorias where slug = 'buzos';

end;
$seed$;
