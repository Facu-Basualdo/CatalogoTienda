-- Guardar una promoción y su alcance en una sola transacción: si el alcance falla, la
-- promoción no queda a medias (sin alcance = no aplica a nada). Ver
-- claude/supabase/promociones.md

-- p_promo:   {nombre, tipo, valor, lleva, paga, alcance_todo, activa, desde, hasta}
-- p_alcance: [{producto_id} | {categoria_id} | {etiqueta_id}, …]
-- p_id null = crear. Invoker: las policies exigen es_admin.
create function public.guardar_promocion(p_id uuid, p_promo jsonb, p_alcance jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := p_id;
begin
  if jsonb_typeof(p_alcance) <> 'array' then
    raise exception 'Alcance inválido';
  end if;
  if not coalesce((p_promo ->> 'alcance_todo')::boolean, false) and jsonb_array_length(p_alcance) = 0 then
    raise exception 'Elegí a qué productos aplica la promoción';
  end if;

  if v_id is null then
    insert into public.promociones (nombre, tipo, valor, lleva, paga, alcance_todo, activa, desde, hasta)
    values (
      p_promo ->> 'nombre',
      (p_promo ->> 'tipo')::public.tipo_promocion,
      (p_promo ->> 'valor')::numeric,
      (p_promo ->> 'lleva')::int,
      (p_promo ->> 'paga')::int,
      coalesce((p_promo ->> 'alcance_todo')::boolean, false),
      coalesce((p_promo ->> 'activa')::boolean, true),
      (p_promo ->> 'desde')::timestamptz,
      (p_promo ->> 'hasta')::timestamptz
    )
    returning id into v_id;
  else
    update public.promociones set
      nombre       = p_promo ->> 'nombre',
      tipo         = (p_promo ->> 'tipo')::public.tipo_promocion,
      valor        = (p_promo ->> 'valor')::numeric,
      lleva        = (p_promo ->> 'lleva')::int,
      paga         = (p_promo ->> 'paga')::int,
      alcance_todo = coalesce((p_promo ->> 'alcance_todo')::boolean, false),
      activa       = coalesce((p_promo ->> 'activa')::boolean, true),
      desde        = (p_promo ->> 'desde')::timestamptz,
      hasta        = (p_promo ->> 'hasta')::timestamptz
    where id = v_id;
    if not found then
      raise exception 'La promoción no existe';
    end if;
    delete from public.promocion_alcance where promocion_id = v_id;
  end if;

  insert into public.promocion_alcance (promocion_id, producto_id, categoria_id, etiqueta_id)
  select v_id, (a ->> 'producto_id')::uuid, (a ->> 'categoria_id')::uuid, (a ->> 'etiqueta_id')::uuid
  from jsonb_array_elements(p_alcance) a;

  return v_id;
end;
$$;

revoke execute on function public.guardar_promocion(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.guardar_promocion(uuid, jsonb, jsonb) to authenticated;
