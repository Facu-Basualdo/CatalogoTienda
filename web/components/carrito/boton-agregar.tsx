"use client";

import { ShoppingCart } from "@gravity-ui/icons";
import { Button, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { carrito } from "@/lib/carrito/almacen";

type Props = {
  /** Una variante suelta, o un combo con la variante elegida de cada producto. */
  varianteId?: string;
  combo?: { id: string; variantes: string[] };
  nombre: string;
  cantidad?: number;
  isDisabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function BotonAgregar({ varianteId, combo, nombre, cantidad = 1, isDisabled, size = "md", className }: Props) {
  const router = useRouter();

  return (
    <Button
      fullWidth
      size={size}
      isDisabled={isDisabled}
      className={className}
      onPress={() => {
        const sumado = combo
          ? carrito.agregarCombo(combo.id, combo.variantes, cantidad)
          : varianteId
            ? carrito.agregar(varianteId, cantidad)
            : true;
        if (!sumado) {
          toast.danger("El carrito admite hasta 30 productos distintos");
          return;
        }
        toast(`${nombre} se sumó al carrito`, {
          actionProps: { children: "Ver carrito", onPress: () => router.push("/carrito"), variant: "tertiary" },
        });
      }}
    >
      <ShoppingCart />
      Sumar al carrito
    </Button>
  );
}
