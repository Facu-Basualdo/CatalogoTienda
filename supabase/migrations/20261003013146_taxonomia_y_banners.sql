-- ABM de etiquetas, categorías y banners (fase 9). Reglas en claude/supabase/etiquetas.md.

-- ---------------------------------------------------------------------------
-- 1. La clave de una variante sigue a sus etiquetas
-- ---------------------------------------------------------------------------
-- producto_variantes.clave = slugs de sus etiquetas ordenados por grupo (orden, slug),
-- el mismo cálculo que guardar_variantes. Renombrar una etiqueta (cambia su slug) o
-- cambiar orden/slug de un grupo la dejaba vieja, y el siguiente guardar_variantes
-- borraba esas variantes y las recreaba con otro id (carritos rotos, stock re-cargado).

create function private.recalcular_claves(p_variantes uuid[])
returns void
language sql
set search_path = ''
as $$
  update public.producto_variantes v
  set clave = (
    select coalesce(string_agg(e.slug, '/' order by g.orden, g.slug), '')
    from public.variante_etiquetas ve
    join public.etiquetas e on e.id = ve.etiqueta_id
    join public.grupos_etiqueta g on g.id = ve.grupo_id
    where ve.variante_id = v.id
  )
  where v.id = any (p_variantes)
$$;

create function private.claves_tras_etiqueta()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform private.recalcular_claves(array(
    select variante_id from public.variante_etiquetas where etiqueta_id = new.id));
  return null;
end;
$$;

create trigger etiquetas_recalcular_claves
after update of valor on public.etiquetas
for each row when (old.valor is distinct from new.valor)
execute function private.claves_tras_etiqueta();

create function private.claves_tras_grupo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform private.recalcular_claves(array(
    select variante_id from public.variante_etiquetas where grupo_id = new.id));
  return null;
end;
$$;

create trigger grupos_recalcular_claves
after update of orden, slug on public.grupos_etiqueta
for each row when (old.orden is distinct from new.orden or old.slug is distinct from new.slug)
execute function private.claves_tras_grupo();

-- ---------------------------------------------------------------------------
-- 2. "Es variante" no cambia si el grupo está en uso
-- ---------------------------------------------------------------------------
-- Las etiquetas de variante viven en variante_etiquetas y las demás en
-- producto_etiquetas (lo exige validar_tipo_etiqueta al insertar). Cambiar el tipo de
-- un grupo usado dejaría filas en la tabla equivocada.
create function private.validar_cambio_tipo_grupo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.es_variante is distinct from new.es_variante and (
       exists (select 1 from public.variante_etiquetas where grupo_id = old.id)
       or exists (select 1 from public.producto_etiquetas pe join public.etiquetas e on e.id = pe.etiqueta_id
                  where e.grupo_id = old.id)) then
    raise exception 'El grupo "%" ya está en uso: no se puede cambiar si es de variante', old.nombre;
  end if;
  return new;
end;
$$;

create trigger grupos_validar_cambio_tipo
before update of es_variante on public.grupos_etiqueta
for each row execute function private.validar_cambio_tipo_grupo();

-- ---------------------------------------------------------------------------
-- 3. Fusionar etiquetas duplicadas ("Algodon" y "Algodón 100%" → una)
-- ---------------------------------------------------------------------------
-- Mueve todo lo que apunta a p_origen hacia p_destino (mismo grupo) y borra p_origen.
-- Si dos variantes de un producto quedan con la misma combinación, el unique de
-- (producto_id, clave) aborta todo.
create function public.fusionar_etiquetas(p_origen uuid, p_destino uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_variantes uuid[];
begin
  if p_origen = p_destino then
    raise exception 'Elegí dos etiquetas distintas';
  end if;
  if (select grupo_id from public.etiquetas where id = p_origen)
     is distinct from (select grupo_id from public.etiquetas where id = p_destino) then
    raise exception 'Sólo se fusionan etiquetas del mismo grupo';
  end if;

  insert into public.producto_etiquetas (producto_id, etiqueta_id)
  select producto_id, p_destino from public.producto_etiquetas where etiqueta_id = p_origen
  on conflict do nothing;
  delete from public.producto_etiquetas where etiqueta_id = p_origen;

  v_variantes := array(select variante_id from public.variante_etiquetas where etiqueta_id = p_origen);
  update public.variante_etiquetas set etiqueta_id = p_destino where etiqueta_id = p_origen;
  begin
    perform private.recalcular_claves(v_variantes);
  exception when unique_violation then
    raise exception 'Fusionarlas dejaría dos variantes iguales en un mismo producto: corregí ese producto primero';
  end;

  update public.promocion_alcance set etiqueta_id = p_destino where etiqueta_id = p_origen;
  delete from public.etiquetas where id = p_origen;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Reordenar (flechas en el panel): reescribe `orden` según la posición en el array
-- ---------------------------------------------------------------------------
create function public.reordenar_grupos(p_ids uuid[])
returns void language sql set search_path = '' as $$
  update public.grupos_etiqueta set orden = array_position(p_ids, id) where id = any (p_ids)
$$;

create function public.reordenar_etiquetas(p_grupo_id uuid, p_ids uuid[])
returns void language sql set search_path = '' as $$
  update public.etiquetas set orden = array_position(p_ids, id) - 1 where grupo_id = p_grupo_id and id = any (p_ids)
$$;

create function public.reordenar_categorias(p_ids uuid[])
returns void language sql set search_path = '' as $$
  update public.categorias set orden = array_position(p_ids, id) - 1 where id = any (p_ids)
$$;

create function public.reordenar_banners(p_ids uuid[])
returns void language sql set search_path = '' as $$
  update public.banners set orden = array_position(p_ids, id) - 1 where id = any (p_ids)
$$;

-- La marca va siempre primera en los filtros (orden 0): reordenar_grupos numera desde 1
-- y la marca se fija en 0.
create function private.marca_primero()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.es_marca then
    new.orden := 0;
  end if;
  return new;
end;
$$;

create trigger grupos_marca_primero
before insert or update of orden, es_marca on public.grupos_etiqueta
for each row execute function private.marca_primero();

-- ---------------------------------------------------------------------------
-- Grants: invoker, sólo authenticated (las policies exigen es_admin)
-- ---------------------------------------------------------------------------
revoke execute on function
  private.recalcular_claves(uuid[]),
  public.fusionar_etiquetas(uuid, uuid),
  public.reordenar_grupos(uuid[]),
  public.reordenar_etiquetas(uuid, uuid[]),
  public.reordenar_categorias(uuid[]),
  public.reordenar_banners(uuid[])
from public, anon;

grant execute on function
  private.recalcular_claves(uuid[]),
  public.fusionar_etiquetas(uuid, uuid),
  public.reordenar_grupos(uuid[]),
  public.reordenar_etiquetas(uuid, uuid[]),
  public.reordenar_categorias(uuid[]),
  public.reordenar_banners(uuid[])
to authenticated;
