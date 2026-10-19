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
  perfiles_ultimo_admin: 'Debe quedar al menos un Administrador activo.',
}

export function mensajeDeError(error: unknown): string {
  const e = (error ?? {}) as ErrorBD
  const texto = `${e.message ?? ''} ${e.details ?? ''}`

  for (const [restriccion, mensaje] of Object.entries(POR_RESTRICCION)) {
    if (texto.includes(restriccion)) return mensaje
  }

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
