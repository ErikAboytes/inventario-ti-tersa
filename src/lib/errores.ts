type ErrorBD = { code?: string; message?: string; details?: string | null }

/** Mensajes para restricciones con nombre propio (docs/04 §9: errores del servidor en lenguaje humano). */
const POR_RESTRICCION: Record<string, string> = {
  empresas_clave_key: 'Ya existe una empresa con esa clave.',
  contratos_operacion_key: 'Ya existe un contrato con esa operación.',
  ubicaciones_nombre_uidx: 'Ya existe una ubicación con ese nombre.',
  unidades_negocio_nombre_uidx: 'Ya existe una unidad de negocio con ese nombre.',
  subcategorias_nombre_uidx: 'Ya existe una subcategoría con ese nombre.',
  colaboradores_numero_empleado_key: 'Ya existe un colaborador con ese número de empleado.',
  equipos_serie_uidx: 'Ya existe un equipo con esa serie.',
  equipos_apartado_requiere_etiqueta: 'Indica para quién o para qué está apartado.',
  equipos_desactivado_requiere_motivo: 'Indica el motivo de la desactivación.',
  equipos_subcategoria_solo_otro: 'La subcategoría solo aplica a equipos de categoría «Otro».',
  equipos_empresa_del_contrato: 'La empresa no coincide con la del contrato.',
  equipos_asignado_solo_por_flujo:
    'El estado «Asignado» solo cambia al registrar una entrega o devolución.',
  equipos_detalle_requiere_observaciones:
    'Faltan las observaciones del estado físico: con «Con detalles» o «Dañado» hay que describir qué tiene el equipo.',
  asignacion_equipos_detalle_requiere_observaciones:
    'Faltan las observaciones de la devolución: con «Con detalles» o «Dañado» hay que describir en qué condición regresa el equipo.',
  perfiles_ultimo_admin: 'Debe quedar al menos un Administrador activo.',
}

/** Campo del formulario al que apunta cada restricción, para mostrar el error junto a él. */
const CAMPO_POR_RESTRICCION: Record<string, string> = {
  equipos_serie_uidx: 'serie',
  equipos_apartado_requiere_etiqueta: 'apartado_para',
  equipos_desactivado_requiere_motivo: 'motivo_desactivacion',
  equipos_subcategoria_solo_otro: 'subcategoria_id',
  equipos_detalle_requiere_observaciones: 'observaciones_estado',
  asignacion_equipos_detalle_requiere_observaciones: 'observaciones_devolucion',
}

const textoDe = (error: unknown) => {
  const e = (error ?? {}) as ErrorBD
  return `${e.message ?? ''} ${e.details ?? ''}`
}

// El nombre más largo primero: «asignacion_equipos_detalle…» contiene a «equipos_detalle…».
const restriccionDe = (texto: string, nombres: string[]) =>
  [...nombres].sort((a, b) => b.length - a.length).find((n) => texto.includes(n))

/** Nombre del campo que causó el error, o undefined si no se sabe (el error va arriba del formulario). */
export function campoDeError(error: unknown): string | undefined {
  const r = restriccionDe(textoDe(error), Object.keys(CAMPO_POR_RESTRICCION))
  return r ? CAMPO_POR_RESTRICCION[r] : undefined
}

export function mensajeDeError(error: unknown): string {
  const e = (error ?? {}) as ErrorBD
  const texto = textoDe(error)

  const r = restriccionDe(texto, Object.keys(POR_RESTRICCION))
  if (r) return POR_RESTRICCION[r]

  switch (e.code) {
    case '23505':
      return 'Ya existe un registro con esos datos.'
    case '23503':
      return 'No se puede eliminar porque está en uso. Desactívalo en su lugar.'
    case '23514':
    case '23502':
      return 'Hay datos que no cumplen las reglas. Revisa el formulario.'
    case '42501':
      return 'No tienes permiso para hacer este cambio.'
    case 'PGRST116':
      return 'No se encontró el registro.'
  }

  if (/fetch|network/i.test(texto)) return 'No hay conexión con el servidor. Inténtalo de nuevo.'
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.'
}
