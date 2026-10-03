-- Plantillas de características: un conjunto con nombre de grupos de etiquetas
-- ("Notebook" = memoria, almacenamiento, refresco, conectividad) que se asigna a varias
-- categorías de una vez. Es un vínculo, no una copia: cambiar la plantilla cambia lo que
-- piden todas sus categorías. Como categoria_grupos, sólo guía el formulario del panel.
-- Ver claude/supabase/etiquetas.md#grupos-por-categoría

create table public.plantillas (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null unique check (length(trim(nombre)) between 1 and 60),
  creado_en timestamptz not null default now()
);

create table public.plantilla_grupos (
  plantilla_id uuid not null references public.plantillas (id) on delete cascade,
  grupo_id     uuid not null references public.grupos_etiqueta (id) on delete cascade,
  primary key (plantilla_id, grupo_id)
);
create index plantilla_grupos_grupo_idx on public.plantilla_grupos (grupo_id);

create table public.categoria_plantillas (
  categoria_id uuid not null references public.categorias (id) on delete cascade,
  plantilla_id uuid not null references public.plantillas (id) on delete cascade,
  primary key (categoria_id, plantilla_id)
);
create index categoria_plantillas_plantilla_idx on public.categoria_plantillas (plantilla_id);

grant select on public.plantillas, public.plantilla_grupos, public.categoria_plantillas to anon, authenticated;
grant insert, update, delete on public.plantillas to authenticated;
grant insert, delete on public.plantilla_grupos, public.categoria_plantillas to authenticated;

alter table public.plantillas enable row level security;
create policy "todos leen" on public.plantillas for select to anon, authenticated using (true);
create policy "admin inserta" on public.plantillas for insert to authenticated with check ((select private.es_admin()));
create policy "admin actualiza" on public.plantillas for update to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));
create policy "admin borra" on public.plantillas for delete to authenticated using ((select private.es_admin()));

alter table public.plantilla_grupos enable row level security;
create policy "todos leen" on public.plantilla_grupos for select to anon, authenticated using (true);
create policy "admin inserta" on public.plantilla_grupos for insert to authenticated with check ((select private.es_admin()));
create policy "admin borra" on public.plantilla_grupos for delete to authenticated using ((select private.es_admin()));

alter table public.categoria_plantillas enable row level security;
create policy "todos leen" on public.categoria_plantillas for select to anon, authenticated using (true);
create policy "admin inserta" on public.categoria_plantillas for insert to authenticated with check ((select private.es_admin()));
create policy "admin borra" on public.categoria_plantillas for delete to authenticated using ((select private.es_admin()));

-- Guarda nombre, grupos y categorías en una transacción. p_id null = crear.
create function public.guardar_plantilla(p_id uuid, p_nombre text, p_grupos uuid[], p_categorias uuid[])
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := p_id;
begin
  if v_id is null then
    insert into public.plantillas (nombre) values (trim(p_nombre)) returning id into v_id;
  else
    update public.plantillas set nombre = trim(p_nombre) where id = v_id;
    if not found then
      raise exception 'La plantilla no existe';
    end if;
  end if;

  delete from public.plantilla_grupos where plantilla_id = v_id and grupo_id <> all (p_grupos);
  insert into public.plantilla_grupos (plantilla_id, grupo_id)
  select v_id, g from unnest(p_grupos) g on conflict do nothing;

  delete from public.categoria_plantillas where plantilla_id = v_id and categoria_id <> all (p_categorias);
  insert into public.categoria_plantillas (categoria_id, plantilla_id)
  select c, v_id from unnest(p_categorias) c on conflict do nothing;

  return v_id;
end;
$$;

revoke execute on function public.guardar_plantilla(uuid, text, uuid[], uuid[]) from public, anon;
grant execute on function public.guardar_plantilla(uuid, text, uuid[], uuid[]) to authenticated;
