"use client";

import { ShoppingCart } from "@gravity-ui/icons";
import { Button, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { carrito } from "@/lib/carrito/almacen";

type Props = {
  varianteId: string;
  nombre: string;
  cantidad?: number;
  isDisabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function BotonAgregar({ varianteId, nombre, cantidad = 1, isDisabled, size = "md", className }: Props) {
  const router = useRouter();

  return (
    <Button
      fullWidth
      size={size}
      isDisabled={isDisabled}
      className={className}
      onPress={() => {
        if (!carrito.agregar(varianteId, cantidad)) {
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
