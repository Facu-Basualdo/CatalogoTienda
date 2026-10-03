# Plan — Punto de venta de escritorio y clientes unificados

Segundo producto sobre la misma base: un **punto de venta (POS) de escritorio en Python**
para ventas presenciales, con varias cajas a la vez, clientes, pagos, caja y facturación.
Comparte productos, stock, precios y clientes con la tienda online. Para eso, la web suma
**login de clientes**, y un cliente registrado en la web se encuentra en el local por su DNI
(y al revés).

El plan de la tienda online está en [plan-implementacion.md](plan-implementacion.md).

## Objetivo

Es un **sistema genérico de portafolio, pero completo**: tiene que poder mostrarse sin
hardware ni certificados reales (impresión a PDF y facturación simulada) y funcionar en un
local de verdad sólo con configurarlo.

- Un `.exe` portable: se ejecuta, el vendedor se loguea y empieza a vender. Sin instalador.
- Hasta **4 cajas** vendiendo al mismo tiempo sin vender dos veces la última unidad.
- Funciona **sólo con internet**: sin conexión no se vende (no hay modo offline).
- Un solo registro de clientes para la web y el local: en el mostrador alcanza con el DNI.
- Stock único compartido por la tienda online y el local, con historial de cada movimiento.
- Caja con apertura, cierre y arqueo; varios medios de pago por venta; devoluciones.
- Facturación electrónica (ARCA, ex AFIP).

## Fuera de alcance (por ahora)

- Modo offline y sincronización.
- Varias sucursales: **un solo local** (confirmado), con un único stock compartido con la web.
- Integración con posnets o Mercado Pago Point: el cobro con tarjeta se registra a mano.
- Instalador, auto-actualización y tienda de apps: el `.exe` se reemplaza a mano, y la app
  avisa cuando quedó vieja.

---

## Decisiones de arquitectura

| Tema | Decisión | Por qué |
|---|---|---|
| Repo | **Este mismo repo**, carpeta `pos/` | La base tiene un solo dueño: `supabase/migrations`. Un cambio de esquema y sus dos usos (web y POS) van en el mismo commit |
| Base | La misma de Supabase. El POS usa **funciones RPC** para todo lo que escribe; casi no toca tablas directo | Las reglas (stock, precios, numeración) viven en la base y las comparten la web y el POS. Si el POS escribiera tablas a mano, duplicaría lógica en Python |
| Lenguaje y UI | Python 3.12 + **PySide6 (Qt)** | Tablas, atajos de teclado, foco e impresión maduros; el lector de código de barras funciona como teclado. Tkinter se queda corto para un POS completo; Flet/Flutter pesa más y madura menos |
| Empaquetado | **PyInstaller `--onefile`** → un solo `.exe` (~60–90 MB). Plan B: Nuitka | Es lo más probado con PySide6. Contras conocidos: tarda unos segundos en abrir (descomprime a una carpeta temporal) y algún antivirus lo marca. Firmar el `.exe` lo reduce |
| Cliente de la base | `supabase-py` (auth + PostgREST + RPC); Realtime opcional | Es el cliente oficial. Login con la misma Auth de Supabase |
| Credenciales | El `.exe` lleva la URL y la **publishable key** (pública por diseño). **Nunca la secret key** | El `.exe` se copia a cualquier máquina: todo lo que lleve adentro es público. La seguridad la ponen los roles y RLS, igual que en la web |
| Sesión | Login por usuario de cada vendedor. "Recordar usuario" guarda sólo el email; el refresh token, si se guarda, va en el Administrador de credenciales de Windows (`keyring`) | Un archivo de texto con el token en la carpeta del `.exe` lo copia cualquiera |
| Concurrencia | Toda venta pasa por **una sola función** de la base, atómica e idempotente (ver más abajo) | La base serializa las cajas; ninguna caja "reserva" en memoria |
| Versiones | Tabla `pos_version_minima`: el POS la consulta al abrir y no deja vender si es más viejo | Con la base compartida, un `.exe` viejo que llama una RPC que cambió puede romper datos |
| Facturación | La emite un **servicio del lado del servidor** (Edge Function o worker), nunca el `.exe` | El certificado digital de ARCA identifica al negocio: no puede viajar dentro de un ejecutable portable |

### Estructura del repo

```
supabase/        migraciones (únicas) y funciones de la base: ventas, caja, clientes
web/             tienda + panel (se suma: login de clientes, "Mi cuenta", gestión de cajas y vendedores)
pos/             punto de venta
  pyproject.toml   uv · ruff · pyright · pytest
  src/pos/
    app.py           arranque, chequeo de versión, login
    config.py        URL y publishable key (se inyectan al empaquetar)
    servicios/       base (RPC), sesión, impresión de tickets
    modelos/         dataclasses / pydantic de las respuestas de las RPC
    ui/              ventanas Qt: login, caja, venta, clientes, cierre
  tests/             unitarios + pruebas de concurrencia contra una base de prueba
  empaquetado/       spec de PyInstaller, ícono, script de build
claude/pos/      notas del grafo de documentación (cuando exista el código)
```

**Tipos**: Supabase genera tipos para TypeScript pero no para Python. El POS define a mano
los modelos de lo que devuelve cada RPC (pocas, porque casi todo pasa por funciones) y un
test los compara contra la base de prueba, para enterarse si una migración cambió un contrato.

---

## Modelo de datos (nuevo)

### Personas y permisos

| Tabla | Qué guarda |
|---|---|
| `clientes` | `id`, `user_id` (null si nunca se registró en la web; único), `dni` (único), `nombre`, `apellido`, `email`, `telefono`, `direccion`, `cuit` (opcional, si pide la factura a nombre de una empresa), timestamps |
| `staff` | Reemplaza a `admins`: `user_id`, `rol` (`admin` · `encargado` · `vendedor`), `activo` |
| `cajas` | `nombre` ("Caja 1"), `punto_venta` de ARCA, `impresora` sugerida, `activa` |

- `private.es_admin()` pasa a mirar `staff` con rol `admin`; se suman `private.es_staff()`
  y `private.tiene_rol(...)`. Los clientes también son usuarios de Auth: **ninguna regla
  puede dar permiso sólo por estar logueado**.
- Qué puede cada rol:

| Rol | Puede |
|---|---|
| Vendedor | Vender, buscar y crear clientes, abrir y cerrar su turno |
| Encargado | Lo del vendedor, más: anular ventas, aplicar descuentos manuales, devoluciones, retiros de caja |
| Admin | Todo, incluido el panel web |

### Ventas presenciales

| Tabla | Qué guarda |
|---|---|
| `turnos_caja` | Caja, vendedor, apertura (monto inicial) y cierre (monto contado, diferencia). **Un turno abierto por caja** (índice único parcial) |
| `movimientos_caja` | Ingresos y retiros de efectivo dentro de un turno, con motivo |
| `ventas` | `id` **generado por el POS** (sirve de clave de idempotencia), `numero`, caja, turno, vendedor, cliente (opcional), subtotal, descuentos, total, estado (`completada` · `anulada`) |
| `venta_items` | Igual que `pedido_items`: snapshot de nombre, variante y precio; combos como padre + hijas |
| `venta_pagos` | Varios por venta: medio (efectivo, débito, crédito, transferencia, Mercado Pago), monto, cuotas, referencia. Con el efectivo se calcula el vuelto |
| `devoluciones` · `devolucion_items` | Qué volvió y si repone stock; genera nota de crédito si la venta estaba facturada |
| `facturas` | Venta o pedido web, tipo (**C**; la columna queda por si cambia la condición fiscal), punto de venta, número, CAE y vencimiento, `modo` (`simulada` · `homologacion` · `produccion`), estado (`pendiente` · `autorizada` · `rechazada`), error |

### Stock

- **`movimientos_stock`**: cada cambio de stock deja una fila con variante, cantidad (+/−),
  motivo (`venta_local`, `pedido_web`, `devolucion`, `ajuste`, `ingreso`), referencia y
  usuario. Lo escriben **sólo las funciones de la base**. Con dos canales sobre el mismo
  stock, sin este historial no hay forma de explicar una diferencia.
- `producto_variantes.codigo_barras` (EAN, opcional, único): el lector escanea y la venta
  encuentra la variante exacta. El SKU queda como código interno.
- `cambiar_estado_pedido` (web) pasa a registrar sus movimientos en el mismo historial.

---

## Concurrencia: varias cajas a la vez

**Regla: el POS nunca descuenta stock por su cuenta.** Arma la venta en memoria y llama a
`registrar_venta(...)`, una función de la base que en una sola transacción hace lo siguiente:

1. Verifica que el usuario tenga un **turno abierto** en esa caja.
2. Recalcula precios con el mismo motor que la web (`cotizar`). El total que se cobra lo
   decide la base, no la pantalla. Los descuentos manuales sólo con rol encargado.
3. Descuenta el stock **variante por variante, en orden por id**, con
   `update … set stock = stock - n where id = … and stock >= n`. Si una no alcanza, falla
   toda la venta con un mensaje claro ("Queda 1 de Remera M negra"). Ordenar por id evita
   que dos cajas se bloqueen mutuamente al vender las mismas variantes en otro orden.
4. Verifica que los pagos sumen el total, y guarda venta, ítems, pagos y movimientos de stock.
5. Es **idempotente**: si llega otra vez el mismo `id` de venta (un reintento porque se
   cortó internet justo después de vender), devuelve la venta ya registrada en lugar de
   cobrar dos veces.

Además:

- **Numeración**: `numero` sale de una secuencia de la base, así que nunca se repite entre
  cajas. La numeración fiscal la asigna ARCA por punto de venta (ver facturación).
- **Precios y stock en pantalla**: el POS los consulta al agregar un producto. Con Realtime
  (opcional) se refrescan solos cuando otra caja vende, pero **la autoridad es siempre la
  función al confirmar**: la pantalla puede estar un segundo atrasada, la venta no.
- **Pedidos web y local compiten por el mismo stock**: un pedido web pendiente no reserva
  (igual que hoy). Si el local vende la última unidad, el pedido web falla al confirmarlo
  y el panel lo avisa. Si hace falta reservar, se agrega después como decisión explícita.
- **Prueba obligatoria**: un script simula **4 cajas** (y pedidos web confirmándose a la vez)
  peleando por las últimas unidades, y verifica que se vendan exactamente las que había y
  que el historial cierre.

## Sin conexión

- El POS hace ping al abrir y antes de cada venta. Sin conexión, bloquea "Cobrar" y muestra
  "Sin conexión: no se puede vender" (no hay ventas en papel que después se sincronicen).
- Si se corta **durante** el cobro, el POS reintenta con el **mismo id** de venta. Gracias a
  la idempotencia, nunca queda una venta duplicada ni un cobro sin registrar.
- El token de sesión se refresca solo; si vence, pide el login de nuevo sin perder la venta
  en curso.

---

## Clientes: web y local con los mismos datos

### En la web

- Se **habilitan los registros** en Supabase Auth (hoy están desactivados, porque sólo
  había admins). Registro con email y contraseña, email verificado, recuperar contraseña.
  Más adelante, login con Google.
- Al registrarse se crea su fila en `clientes`. Para comprar se pide DNI, nombre y teléfono;
  en el checkout los datos se completan solos.
- "Mi cuenta": mis datos, mis pedidos (web) y mis compras en el local.
- `pedidos.cliente_id` (opcional): se puede seguir comprando sin cuenta, como hoy.

### En el local

- El vendedor escribe (o escanea del documento) el DNI: si existe, trae nombre y contacto.
  Si no existe, lo crea en el momento con lo mínimo (DNI y nombre). Sin cliente, la venta
  sale a "consumidor final".
- La venta queda asociada al cliente y aparece en su historial web.

### Vincular un cliente del local con una cuenta web

El problema: alguien se registra en la web con el **DNI de otra persona** y se queda con sus
datos e historial. Por eso el vínculo nunca se hace sólo por DNI:

- Si en la web alguien se registra con un DNI que ya existe del local **y ese cliente tiene
  email**, se manda un código al email que se cargó en el local; con el código, se vinculan.
- Si el cliente del local **no tiene email**, no se vincula automáticamente: se hace en el
  mostrador ("¿querés asociar tu cuenta web?"), con el vendedor verificando la identidad.
- Un cliente sólo ve su propia fila (`user_id = auth.uid()`). El staff busca por DNI; la
  lista completa de clientes no se puede bajar desde la web.

**Datos personales** (Ley 25.326): se guarda lo mínimo necesario, el cliente puede ver y
corregir sus datos desde "Mi cuenta", y hay una forma de pedir la baja.

---

## Facturación electrónica (ARCA)

- **Sólo factura C** (monotributo, confirmado): no discrimina IVA y el receptor es
  consumidor final salvo que el cliente dé su CUIT. Notas de crédito C para devoluciones.
- **Tres modos**, por configuración del sistema:

| Modo | Para qué | Qué hace |
|---|---|---|
| `simulada` | Demo de portafolio y desarrollo | Numera y genera un CAE ficticio; el PDF dice "COMPROBANTE NO VÁLIDO". Sin ARCA ni certificado |
| `homologacion` | Probar contra ARCA de prueba | Habla con el entorno de testing de ARCA, con un certificado de prueba |
| `produccion` | Un local real | ARCA de verdad, con el certificado del negocio |

- Cada caja usa **su propio punto de venta** de ARCA. Así la numeración de cada caja es
  independiente y dos cajas nunca piden el mismo número a la vez.
- La factura la emite un **servicio del servidor** con el certificado guardado como
  secreto; el POS sólo pide "facturar la venta X" y muestra el resultado:
  - Opción A: Edge Function de Supabase más un proveedor que habla con ARCA (por ejemplo,
    Afip SDK). Lo más rápido de implementar, con costo mensual.
  - Opción B: un worker propio en Python con `pyafipws`. Sin costo de proveedor, pero hay
    que alojarlo y mantenerlo.
  - Se decide con una prueba corta (fase 7) en el **entorno de homologación** de ARCA. El
    modo `simulada` no depende de esa decisión y está desde la fase 4.
- Si ARCA no responde, la venta igual se completa: la factura queda `pendiente` y se
  reintenta. El ticket indica que la factura se envía después.
- Las devoluciones de ventas facturadas generan **nota de crédito**.

## Impresión

- **Impresora de referencia: térmica de 80 mm compatible ESC/POS** (Epson TM-T20, Xprinter
  XP-80 y equivalentes: es el estándar de casi todas las térmicas). Ticket no fiscal con el
  detalle, los pagos y el vuelto, con la librería `python-escpos` por USB o red. También
  abre el cajón de dinero conectado a la impresora.
- **Sin impresora térmica**: el mismo ticket sale como PDF o por cualquier impresora de
  Windows. Así la demo funciona en cualquier máquina.
- La factura C se genera en PDF (con el QR que exige ARCA), se imprime y/o se manda por email.
- La impresora se elige por caja y se guarda en la máquina, no en la base.

## Lector de código de barras

- Se usan lectores USB en modo teclado (HID), los más comunes: el lector "escribe" el
  código y manda Enter. El POS tiene el foco en el campo de búsqueda: un código exacto
  agrega la variante directo al carrito; si no coincide, busca por nombre o SKU.
- `producto_variantes.codigo_barras` (EAN-13 u otro, opcional y único). El panel web lo
  carga en el editor de variantes. Para productos sin código propio, el panel puede
  generar un código interno e imprimir etiquetas (fase 8).

---

## Fases

Cada fase termina con lo suyo probado y commiteado, igual que la tienda.

### Fase 0 — Decisiones y pruebas de concepto (corta)

- [ ] `.exe` mínimo con PySide6 + PyInstaller: abre, se loguea contra Supabase y lista
      productos. Medir tamaño, tiempo de arranque y si Windows Defender lo marca.
- [ ] Decidir el enfoque de facturación (opción A o B) con una consulta a homologación.

### Fase 1 — Roles, historial de stock y seguridad

- [ ] `staff` con roles (migra los admins actuales); helpers `es_staff` y `tiene_rol`.
- [ ] **Auditoría de policies y grants** antes de habilitar registros: nada puede quedar
      abierto "para cualquier usuario logueado".
- [ ] `movimientos_stock` + `codigo_barras`; `cambiar_estado_pedido` registra movimientos.
- [ ] Panel web: gestión de usuarios del staff y sus roles; alta de cajas.

### Fase 2 — Clientes y login en la web

- [ ] `clientes` con RLS (cada uno ve lo suyo; el staff busca por DNI).
- [ ] Registro, login, verificación de email, recuperar contraseña; "Mi cuenta".
- [ ] Checkout con datos completados solos y `pedidos.cliente_id`.
- [ ] Vínculo con un cliente del local por código al email.
- [ ] Habilitar sign-ups en Supabase Auth (recién acá, con la auditoría hecha).

### Fase 3 — POS: esqueleto

- [ ] Proyecto `pos/` (uv, ruff, pyright, pytest) y build a `.exe` en un script.
- [ ] Login, chequeo de versión mínima, elección de caja, apertura de turno.
- [ ] Búsqueda de productos por nombre, SKU o código de barras; selector de variante;
      carrito con precios de `cotizar`.

### Fase 4 — POS: vender

- [ ] `registrar_venta` (atómica, idempotente, con historial de stock) y su prueba de
      concurrencia.
- [ ] Cliente por DNI (buscar o crear al vuelo), varios medios de pago, vuelto.
- [ ] Ticket ESC/POS y su alternativa a PDF; facturación en modo `simulada`.
- [ ] Manejo de cortes de conexión con reintento por id.

### Fase 5 — POS: caja

- [ ] Cierre de turno con arqueo (contado contra esperado por medio de pago).
- [ ] Ingresos y retiros de efectivo; reporte de turno.

### Fase 6 — Devoluciones y anulaciones

- [ ] Devolución parcial o total que repone stock (con historial); permisos de encargado.

### Fase 7 — Facturación electrónica

- [ ] Servicio de facturación en homologación; puntos de venta por caja; reintentos.
- [ ] Factura C con QR, notas de crédito C, PDF y envío por email.
- [ ] Facturar también pedidos web desde el panel.

### Fase 8 — Reportes

- [ ] Panel web: ventas por canal (web / local), por caja, por vendedor y por medio de
      pago; stock bajo; historial de movimientos de una variante; clientes frecuentes.
- [ ] Códigos de barras internos para productos sin EAN e impresión de etiquetas.

### Fase 9 — Distribución

- [ ] `.exe` firmado (certificado de firma de código), número de versión visible y aviso
      de versión mínima.
- [ ] Instructivo de uso para cajeros.

---

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Locales | **Uno solo**: un stock único compartido con la web |
| Facturación | **Sólo factura C** (monotributo); modos simulada, homologación y producción |
| Impresora | Térmica 80 mm ESC/POS de referencia; PDF o impresora de Windows como alternativa |
| Lector | **Sí**, lector USB en modo teclado; `codigo_barras` por variante |
| Precios en el local | **Los mismos que en la web**, con las mismas promociones y combos (`cotizar`) |
| Login de clientes | **Sólo email** (y contraseña) |
| Cajas simultáneas | **4** (dimensiona la prueba de concurrencia) |
| Alcance | Sistema genérico de portafolio, completo: demostrable sin hardware ni certificados |

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Vender dos veces la última unidad (dos cajas, o caja + web) | Una sola función atómica con descuento condicional; prueba de concurrencia en cada cambio |
| Venta duplicada por un reintento tras un corte | Id de venta generado por el POS e idempotencia en la base |
| Un `.exe` viejo rompe datos tras una migración | Versión mínima en la base; las RPC se cambian agregando, no rompiendo |
| Alguien se apropia de los datos de un cliente con su DNI | Vínculo sólo con código al email registrado o en el mostrador |
| Habilitar registros abre datos a cualquier usuario | Auditoría de policies (fase 1) antes de habilitarlos (fase 2) |
| ARCA caído o lento | Factura en estado pendiente con reintento; la venta no se bloquea |
| Antivirus que marca el `.exe` | Firmar el ejecutable; Nuitka como alternativa |
| Supabase gratuito se pausa o queda chico con uso real | Plan pago antes de usarlo en un local de verdad |
