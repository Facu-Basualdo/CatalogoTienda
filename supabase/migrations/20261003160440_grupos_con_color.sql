-- Si los valores de un grupo son colores (muestra de color en el panel, la ficha y los
-- filtros). Antes el panel ofrecía elegir color en todo grupo de variante, incluida la
-- memoria RAM. Se marca en los grupos que ya tienen algún valor con color_hex.
alter table public.grupos_etiqueta add column con_color boolean not null default false;

update public.grupos_etiqueta g
set con_color = true
where exists (select 1 from public.etiquetas e where e.grupo_id = g.id and e.color_hex is not null);
