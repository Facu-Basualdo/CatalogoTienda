---
description: Actualiza las notas de claude/ segun los cambios de la rama actual
argument-hint: "[rama base, default main]"
allowed-tools: Bash(git diff:*), Bash(git log:*), Bash(git status:*), Bash(git merge-base:*), Bash(node scripts/verificar-docs.mjs), Read, Edit, Write, Grep, Glob
---

Actualizá el grafo de documentación `claude/` según lo que cambió en esta rama.
Rama base: `$ARGUMENTS` (si está vacío, `main`).

## 1. Mirá qué cambió

- `git merge-base <base> HEAD`
- `git diff --stat <base>...HEAD`
- `git log --oneline <base>..HEAD`
- `git status` (cambios sin commitear también cuentan)

Después leé el **diff real** de lo sustantivo (migraciones, `lib/`, Server Actions,
componentes nuevos). No te guíes por los nombres de archivo.

## 2. Decidí qué merece documentarse

Criterio literal: **¿alguien que toque esto dentro de seis meses se va a equivocar si
no lo sabe?**

SÍ documentar:
- decisiones con un porqué no obvio, sobre todo si ya hubo un bug;
- invariantes y orden de operaciones;
- contratos entre capas (forma de un RPC, columnas nuevas, tags de caché, claves de URL);
- migraciones que cambian la forma de una tabla (actualizar `claude/supabase/esquema.md`);
- variables de entorno y flags;
- endpoints / RPC / Server Actions nuevos o con cambio de forma.

NO documentar:
- lo que el código ya dice solo;
- refactors sin efecto observable;
- la historia del cambio;
- cualquier cosa deducible de `git log`.

**"No hay nada que documentar" es un resultado válido y común.** No inventes notas
para justificar haber corrido.

## 3. Ubicá dónde va cada cosa

- `grep -ril "<palabra clave>" claude/` antes de crear nada.
- **Preferí editar sobre crear**: una nota por tema.
- Si el tema ya existe en otra área, **reusá exactamente el mismo nombre de archivo**
  (`claude/web/imagenes.md` ↔ `claude/supabase/imagenes.md`).
- Si una nota pasa de ~400 líneas, son dos temas: partila y enlazalas.

## 4. Escribí en el estilo del vault

Leé primero una nota existente del área. Reglas:
- Arrancá por el síntoma o el bug, no por la definición.
- **Negrita para la regla**, prosa para el porqué.
- Nombres reales de archivos, funciones, tablas, RPC.
- Tablas para los repartos.
- Cómo es hoy, no cómo llegó a ser.
- Español rioplatense, como el resto del proyecto.

## 5. Cerrá el grafo (no es opcional)

- Breadcrumb `[← Índice <área>](INDICE.md)` debajo del título.
- Fila en la tabla del `INDICE.md` del área, con una descripción que **cargue el
  gotcha** (afirmaciones separadas por ` · `), no un rótulo.
- Si cambió el contenido de una nota existente, revisá que su descripción en el índice
  siga siendo cierta.
- `## Ver también` actualizado **en las dos puntas**, incluidas las notas de la otra área.
- Si la feature cruza áreas, fila en "Features que cruzan áreas" de `CLAUDE.md`.

## 6. Verificá

`node scripts/verificar-docs.mjs` tiene que dar OK. Si no, corregí y volvé a correr.

## 7. Informá

Lista corta: qué notas creaste o editaste, y qué dejaste **sin documentar a propósito**
y por qué. **No commitees salvo que te lo pidan.**
