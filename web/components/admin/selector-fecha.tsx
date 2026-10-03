"use client";

import { Xmark } from "@gravity-ui/icons";
import { Button, Calendar, DateField, DatePicker, Description, Label } from "@heroui/react";
import type { CalendarDate } from "@internationalized/date";

/** Día opcional (promociones, cupones). La conversión a instantes está en lib/admin/fechas.ts. */
export function SelectorFecha({
  etiqueta,
  valor,
  onChange,
  ayuda,
}: {
  etiqueta: string;
  valor: CalendarDate | null;
  onChange: (v: CalendarDate | null) => void;
  ayuda: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <DatePicker value={valor} onChange={onChange} className="flex-1">
        <Label>{etiqueta}</Label>
        <DateField.Group fullWidth>
          <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
          <DateField.Suffix>
            <DatePicker.Trigger>
              <DatePicker.TriggerIndicator />
            </DatePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>
        <Description>{ayuda}</Description>
        <DatePicker.Popover>
          <Calendar aria-label={etiqueta}>
            <Calendar.Header>
              <Calendar.Heading />
              <Calendar.NavButton slot="previous" />
              <Calendar.NavButton slot="next" />
            </Calendar.Header>
            <Calendar.Grid>
              <Calendar.GridHeader>{(dia) => <Calendar.HeaderCell>{dia}</Calendar.HeaderCell>}</Calendar.GridHeader>
              <Calendar.GridBody>{(fecha) => <Calendar.Cell date={fecha} />}</Calendar.GridBody>
            </Calendar.Grid>
          </Calendar>
        </DatePicker.Popover>
      </DatePicker>
      {valor && (
        <Button isIconOnly size="sm" variant="ghost" aria-label={`Quitar fecha: ${etiqueta}`} onPress={() => onChange(null)} className="mt-7">
          <Xmark />
        </Button>
      )}
    </div>
  );
}
