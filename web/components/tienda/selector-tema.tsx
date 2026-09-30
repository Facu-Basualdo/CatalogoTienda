"use client";

import { Moon, Sun } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const suscribir = () => () => {};

export function SelectorTema() {
  const { resolvedTheme, setTheme } = useTheme();
  // El tema real sólo se conoce en el cliente: hasta montar, un botón neutro.
  const montado = useSyncExternalStore(suscribir, () => true, () => false);
  const oscuro = montado && resolvedTheme === "dark";

  return (
    <Button
      isIconOnly
      variant="ghost"
      aria-label={oscuro ? "Usar tema claro" : "Usar tema oscuro"}
      onPress={() => setTheme(oscuro ? "light" : "dark")}
    >
      {oscuro ? <Sun /> : <Moon />}
    </Button>
  );
}
