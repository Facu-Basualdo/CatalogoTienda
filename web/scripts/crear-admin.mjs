#!/usr/bin/env node
// Crea (o reutiliza) un usuario de Supabase Auth y lo agrega a `admins`.
//
//   cd web && node scripts/crear-admin.mjs tu@email.com
//
// Herramienta LOCAL: usa SUPABASE_SECRET_KEY de web/.env. La contraseña se genera al
// azar y se guarda en web/.env como ADMIN_EMAIL / ADMIN_PASSWORD. NUNCA se imprime:
// la salida de la terminal puede quedar en logs o transcripciones.

import { randomBytes } from 'node:crypto';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

process.loadEnvFile('.env');
const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Uso: node scripts/crear-admin.mjs email@dominio.com');
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

// ¿Ya existe?
let usuario = null;
for (let pagina = 1; !usuario; pagina++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: pagina, perPage: 200 });
  if (error) throw error;
  usuario = data.users.find((u) => u.email === email) ?? null;
  if (data.users.length < 200) break;
}

let passwordNueva = null;
if (!usuario) {
  passwordNueva = randomBytes(18).toString('base64url');
  const { data, error } = await supabase.auth.admin.createUser({ email, password: passwordNueva, email_confirm: true });
  if (error) throw error;
  usuario = data.user;
  console.log(`✓ usuario creado: ${email}`);
} else {
  console.log(`= el usuario ${email} ya existía (no se cambió su contraseña)`);
}

// admins no tiene grants para la API pública, pero la secret key los saltea.
const { error: e } = await supabase.from('admins').upsert({ user_id: usuario.id }, { onConflict: 'user_id' });
if (e) throw e;
console.log('✓ agregado a admins');

if (passwordNueva) {
  let env = readFileSync('.env', 'utf8');
  env = env.replace(/^ADMIN_(EMAIL|PASSWORD)=.*\n?/gm, '');
  writeFileSync('.env', env.endsWith('\n') ? env : `${env}\n`);
  appendFileSync('.env', `ADMIN_EMAIL=${email}\nADMIN_PASSWORD=${passwordNueva}\n`);
  console.log('✓ credenciales guardadas en web/.env (ADMIN_EMAIL / ADMIN_PASSWORD)');
}
