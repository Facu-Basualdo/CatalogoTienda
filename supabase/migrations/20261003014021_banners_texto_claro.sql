-- Color del texto sobre la imagen del banner. Antes el carrusel lo decidía por la
-- posición (pares negro, impares blanco), lo que sólo servía para las imágenes de demo.
-- true = texto blanco (imagen oscura).
alter table public.banners add column texto_claro boolean not null default false;
