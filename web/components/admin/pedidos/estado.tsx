import { Chip } from "@heroui/react";
import type { EstadoPedido } from "@/app/admin/(panel)/pedidos/acciones";

export const NOMBRE_ESTADO: Record<EstadoPedido, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

// Blanco y negro: pendiente resalta (acción requerida), el resto gris.
export function ChipEstado({ estado }: { estado: EstadoPedido }) {
  return (
    <Chip size="sm" variant={estado === "pendiente" ? "primary" : "secondary"} className={estado === "cancelado" ? "line-through" : ""}>
      {NOMBRE_ESTADO[estado]}
    </Chip>
  );
}
