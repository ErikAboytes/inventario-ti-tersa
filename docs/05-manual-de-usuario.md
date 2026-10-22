# 05 — Manual de usuario

Inventario de equipos de cómputo de Grupo Tersa. Este manual explica las tareas del día a día. Hay dos roles:

- **Administrador** (área de Sistemas): registra equipos, entregas y devoluciones, imprime cartas y etiquetas
  y administra a los usuarios.
- **Lector** (p. ej. Contabilidad o Dirección): consulta el inventario, el panel y el historial, y exporta a
  CSV. No puede hacer cambios.

Lo que se ve en pantalla depende del rol: si un botón no aparece, es porque tu rol no lo permite.

---

## 1. Acceso

### Primera vez: invitación
1. Un Administrador te invita desde **Usuarios**. Te llega un correo «Tu acceso al inventario de TI de Grupo
   Tersa».
2. Abre el botón **Crear mi contraseña**. Escribe una contraseña de **al menos 8 caracteres** y confírmala.
3. Entras directo al panel. Las siguientes veces inicia sesión con tu correo y esa contraseña.

Si el enlace venció, pide al Administrador que use **Reenviar invitación**.

### Olvidé mi contraseña
En la pantalla de inicio de sesión elige **¿Olvidaste tu contraseña?**, escribe tu correo y sigue el enlace
que te llega para crear una nueva.

### Cerrar sesión
Botón **Cerrar sesión** arriba a la derecha. Hazlo siempre en computadoras compartidas.

---

## 2. Panel

Es la pantalla de inicio. Responde cinco preguntas:

| Bloque | Qué muestra |
|---|---|
| Cifras clave | Equipos activos, asignados (% del activo), disponibles en Stock y No localizados |
| Requiere atención | Pendientes de revisar, mantenimientos de más de 30 días, apartados de más de 15 días, contratos vencidos o por vencer, equipos de colaboradores dados de baja |
| Distribución por empresa | Equipos activos de cada razón social por estado |
| Avance de localización | Cómo bajan los No localizados semana a semana |
| Actividad reciente | Los últimos movimientos y quién los hizo |

**Todo es un enlace:** al tocar una cifra, un renglón o un estado se abre el inventario ya filtrado. Para quitar
el filtro que viene del panel usa **Quitar este filtro**. El botón **Actualizar** vuelve a calcular las cifras.

---

## 3. Buscar un equipo

- **Barra superior:** escribe una serie, el nombre de un colaborador (no importan los acentos) o un folio
  (`CC-26-0001`, `CD-…`, `SIS…`, `HIST-…`) y presiona Enter. Una serie o folio exactos abren su ficha; lo demás
  muestra resultados agrupados. Atajo: tecla **/**.
- **En el celular:** la lupa abre la búsqueda.
- **Escanear QR:** el botón **Escanear QR** usa la cámara del celular o la computadora. Apunta al código de la
  etiqueta y se abre la ficha del equipo. Si el navegador no permite la cámara, escribe la serie.

---

## 4. Inventario

- **Filtros:** categoría, estado (puedes elegir varios) y empresa están a la vista; contrato, ubicación,
  subcategoría, condición, estado histórico y **Agrupar por empresa** (ordena la tabla por razón social)
  están en **Más filtros**. En el teléfono todos están en el botón **Filtros**, que abre un panel; **Ver N
  resultados** lo cierra.
- **Filtros activos:** aparecen como etiquetas azules debajo de la búsqueda; la **×** quita ese filtro y
  **Limpiar todo** los quita todos (la vista agrupada se conserva).
- **Exportar CSV:** descarga todos los equipos del resultado filtrado (no solo la página) para abrirlos en
  Excel.
- **Imprimir etiquetas de varios equipos:** marca las casillas de los equipos (se conservan al cambiar de
  página) y elige **Imprimir etiquetas (N)**.

- **Columna Estado:** la etiqueta de color dice el estado; debajo, en gris, el motivo de la desactivación o
  para quién está apartado (pasa el mouse para leerlo completo si es largo).
- **Estado histórico** (ícono de reloj junto al estado): el equipo conserva el estado con el que llegó del
  Excel y nadie lo ha revisado. El filtro **Estado histórico → Solo históricos** los reúne para corregirlos
  por lotes. La marca se quita sola al cambiar el estado, entregar o devolver el equipo, o con **Confirmar
  estado** en la ficha cuando el estado ya es correcto.

### Ficha del equipo
Muestra primero a quién está asignado (con el folio de su carta), luego sus datos, especificaciones, estado
físico e historial completo.

Acciones del Administrador:

| Acción | Para qué |
|---|---|
| **Editar** | Corregir datos, especificaciones o estado físico |
| **Confirmar estado** | Solo en equipos con estado histórico: el estado del Excel es correcto. Queda en el historial, con una nota opcional |
| **Cambiar estado** | Stock, Mantenimiento, Apartado (para quién), Pendiente, No localizado o Desactivado (con motivo). «Asignado» solo cambia con una entrega |
| **Entregar** | Abre la entrega con este equipo ya elegido |
| **Registrar devolución** | Si el equipo está asignado |
| **Imprimir etiqueta** | Hoja con la etiqueta QR del equipo (también para el Lector) |

### Alta de equipo
**Inventario → Nuevo equipo.** Categoría, serie (o «No tiene serie visible»), marca, modelo, contrato,
ubicación y estado inicial. En Desktop y Laptop puedes capturar procesador, RAM, almacenamiento y sistema
operativo. Con «Con detalles» o «Dañado» hay que describir el estado físico.

---

## 5. Entregar equipos (carta custodia)

**Entregas y devoluciones → Nueva entrega**, o **Entregar** desde la ficha de un equipo o **Nueva entrega**
desde la de un colaborador. Son cuatro pasos; si recargas la página no se pierde lo capturado.

1. **Colaborador:** búscalo por nombre o número de empleado. Si no existe, **Nuevo colaborador**. Si le falta
   la unidad de negocio, se pide aquí.
2. **Equipos:** sin escribir nada aparece la lista **Disponibles para entregar** (Stock por omisión; puedes
   cambiar el estado o la categoría y **Ver más**). También puedes escribir la serie o **Escanear QR**: si la
   serie es de un equipo que no se puede entregar (asignado, desactivado…), aparece con la razón. Un equipo
   **Apartado** pide confirmar que se entrega a la persona del apartado.
3. **Datos de carta:** fecha de entrega (hoy o pasada; es la que queda en el historial), **Fecha en la
   carta** (opcional, puede ser futura, p. ej. el día en que se firmará), lugar y firmas **Entrega** y
   **Recibe** (vienen prellenadas y se pueden editar).
4. **Confirmar:** revisa y elige **Registrar entrega**.

Al terminar se abren los **Documentos de la entrega**:
- **Imprimir todo:** carta custodia y hoja de etiquetas.
- **Imprimir carta** / **Imprimir etiquetas** por separado.
- **Datos de firma** para corregir nombres o puestos antes de reimprimir.
- **Fecha en la carta**, solo justo después de registrar: ajusta la fecha impresa. Si después vuelves a
  imprimir la carta desde la entrega, saldrá con la fecha de entrega.

Al guardar como PDF, el nombre del archivo se propone solo
(`F.TI-006-02 Carta Custodia CC-26-0001 <serie> <nombre>`).

---

## 6. Devoluciones

Desde la entrega: **Registrar devolución**.

1. Marca los equipos que regresan (puede ser una parte).
2. Elige el destino de cada equipo (**Stock** o **Mantenimiento**; empieza en «Elegir…») y la condición. Con «Con detalles» o «Dañado» escribe qué
   tiene el equipo; el error aparece junto al equipo que lo necesita.
3. Confirma. Cuando se devuelve el último equipo, la entrega queda cerrada.

**Carta de devolución:** no se genera sola. En el detalle de la devolución usa **Generar carta de
devolución**.

**Cierre por incidencia** (extravío o baja): en la misma pantalla elige «Cierre por incidencia», escribe el
motivo y el destino (No localizado o Desactivado). No genera carta y usa folio `CI-…`.

---

## 7. Etiquetas QR

- Hoja **carta normal**, 24 etiquetas (3 × 8) con guías de corte.
- Imprime al **100 %** («Tamaño real»), sin «Ajustar a la página», para que las medidas sean exactas.
- **Empezar en la etiqueta N** aprovecha una hoja a la que ya le despegaste algunas.
- El QR abre la ficha del equipo; quien no tenga sesión debe iniciar sesión primero.

---

## 8. Historial

**Historial** muestra todos los movimientos: altas, ediciones, cambios de estado, entregas, devoluciones e
importación. Filtra por serie, colaborador o folio, por fechas, por tipo y por usuario. Toca el resumen de un
movimiento para ver qué cambió campo por campo. **Exportar CSV** descarga el resultado filtrado.

---

## 9. Colaboradores y catálogos

- **Colaboradores:** alta y edición, búsqueda sin acentos. La ficha muestra los equipos que tiene ahora y sus
  entregas. Un colaborador dado de baja ya no recibe entregas; sus equipos aparecen en «Requiere atención».
- **Catálogos:** empresas, contratos (operaciones), ubicaciones, unidades de negocio y subcategorías.

---

## 10. Usuarios (solo Administrador)

**Usuarios** lista quién tiene acceso, su rol, su estado y su último acceso.

| Acción | Notas |
|---|---|
| **Invitar usuario** | Correo, nombre, puesto (opcional) y rol. Le llega el correo de invitación |
| **Reenviar invitación** | Si la persona no ha creado su contraseña |
| **Cambiar rol** | Administrador o Lector |
| **Desactivar** (en «Más acciones») | Pierde el acceso en su siguiente acción. Lo que registró se conserva |
| **Reactivar** | Vuelve a entrar con su contraseña |

Nadie puede desactivarse ni quitarse el rol a sí mismo, y el sistema no permite quedarse sin Administradores.

---

## 11. Preguntas frecuentes

**No veo el botón para editar o entregar.** Tu rol es Lector. Pide el cambio a un Administrador.

**«No se puede entregar: está Asignado».** Primero registra la devolución de la entrega anterior.

**La etiqueta impresa salió más chica o más grande.** Revisa que la impresión esté al 100 % y sin márgenes
automáticos.

**El escáner dice que no hay permiso para la cámara.** Toca el candado junto a la dirección del sitio,
permite la cámara y vuelve a abrir el escáner. La cámara solo funciona en la dirección segura (https).

**«Se alcanzó el límite de correos por hora».** Espera unos minutos y vuelve a intentar la invitación.
