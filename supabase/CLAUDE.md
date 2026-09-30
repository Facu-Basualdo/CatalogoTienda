# supabase/

Postgres + RLS + Storage + funciones RPC, gestionado con Supabase CLI
(`supabase/migrations/`, `supabase/seed.sql`).

- Índice del área: [claude/supabase/INDICE.md](../claude/supabase/INDICE.md)
- Hub del proyecto: [CLAUDE.md](../CLAUDE.md)

**Regla que se carga siempre:** toda tabla nueva nace con RLS habilitado y sus
policies en la misma migración. Detalle en
[seguridad-rls](../claude/supabase/seguridad-rls.md).

No agregues documentación a este archivo: cada tema va como una nota.
