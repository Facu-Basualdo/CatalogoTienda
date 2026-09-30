"use client";

import { Alert, Button, Form, Input, Label, TextField } from "@heroui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseNavegador } from "@/lib/supabase/navegador";

export function FormularioLogin() {
  const router = useRouter();
  const sinPermiso = useSearchParams().get("error") === "sin-permiso";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Un usuario autenticado que no es admin llega acá desde requerirAdmin: se cierra su
  // sesión para que pueda entrar con otra cuenta.
  useEffect(() => {
    if (sinPermiso) void supabaseNavegador().auth.signOut();
  }, [sinPermiso]);

  async function ingresar() {
    setEnviando(true);
    setError(null);
    const { error: e } = await supabaseNavegador().auth.signInWithPassword({ email: email.trim(), password });
    if (e) {
      setEnviando(false);
      setError("Email o contraseña incorrectos.");
      return;
    }
    // refresh: el layout de /admin vuelve a leer la sesión (cookies) en el servidor.
    router.replace("/admin");
    router.refresh();
  }

  return (
    <Form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void ingresar();
      }}
    >
      {(error || sinPermiso) && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{error ?? "Ese usuario no tiene permisos de administrador."}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      <TextField isRequired type="email" name="email" value={email} onChange={setEmail} autoComplete="username">
        <Label>Email</Label>
        <Input placeholder="admin@tienda.com" />
      </TextField>
      <TextField isRequired type="password" name="password" value={password} onChange={setPassword} autoComplete="current-password">
        <Label>Contraseña</Label>
        <Input />
      </TextField>
      <Button type="submit" fullWidth size="lg" isPending={enviando}>
        Ingresar
      </Button>
    </Form>
  );
}
