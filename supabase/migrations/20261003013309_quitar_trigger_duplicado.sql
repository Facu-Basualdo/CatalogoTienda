-- taxonomia_y_banners agregó grupos_validar_cambio_tipo, pero el esquema inicial ya
-- tenía grupos_etiqueta_bloquear_es_variante con la misma regla. Queda la original.
drop trigger grupos_validar_cambio_tipo on public.grupos_etiqueta;
drop function private.validar_cambio_tipo_grupo();
