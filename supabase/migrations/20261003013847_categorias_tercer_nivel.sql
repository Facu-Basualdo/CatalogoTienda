-- validar_nivel_categoria sólo miraba hacia arriba (que el padre no tenga padre). Faltaba
-- hacia abajo: mover bajo otra una categoría que ya tiene hijas dejaba tres niveles.
create or replace function private.validar_nivel_categoria()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.padre_id is not null and exists (
    select 1 from public.categorias where id = new.padre_id and padre_id is not null
  ) then
    raise exception 'Las categorías admiten sólo dos niveles';
  end if;
  if new.padre_id is not null and exists (
    select 1 from public.categorias where padre_id = new.id
  ) then
    raise exception 'Una categoría con subcategorías no puede ir dentro de otra (serían tres niveles)';
  end if;
  return new;
end;
$$;
