export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  public: {
    Tables: {
      asignacion_equipos: {
        Row: {
          asignacion_id: string
          condicion_devolucion: Database['public']['Enums']['condicion_equipo'] | null
          destino_devolucion: Database['public']['Enums']['destino_devolucion'] | null
          devolucion_id: string | null
          equipo_id: string
          id: string
          observaciones_devolucion: string | null
        }
        Insert: {
          asignacion_id: string
          condicion_devolucion?: Database['public']['Enums']['condicion_equipo'] | null
          destino_devolucion?: Database['public']['Enums']['destino_devolucion'] | null
          devolucion_id?: string | null
          equipo_id: string
          id?: string
          observaciones_devolucion?: string | null
        }
        Update: {
          asignacion_id?: string
          condicion_devolucion?: Database['public']['Enums']['condicion_equipo'] | null
          destino_devolucion?: Database['public']['Enums']['destino_devolucion'] | null
          devolucion_id?: string | null
          equipo_id?: string
          id?: string
          observaciones_devolucion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'asignacion_equipos_asignacion_id_fkey'
            columns: ['asignacion_id']
            isOneToOne: false
            referencedRelation: 'asignaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'asignacion_equipos_devolucion_id_fkey'
            columns: ['devolucion_id']
            isOneToOne: false
            referencedRelation: 'devoluciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'asignacion_equipos_equipo_id_fkey'
            columns: ['equipo_id']
            isOneToOne: false
            referencedRelation: 'equipos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'asignacion_equipos_equipo_id_fkey'
            columns: ['equipo_id']
            isOneToOne: false
            referencedRelation: 'v_equipos'
            referencedColumns: ['id']
          },
        ]
      }
      asignaciones: {
        Row: {
          cerrada_en: string | null
          colaborador_id: string
          creado_en: string
          datos_colaborador: Json
          entregado_por: string | null
          es_historica: boolean
          fecha_entrega: string
          firma_entrega_nombre: string | null
          firma_entrega_puesto: string | null
          firma_recibe_nombre: string | null
          firma_recibe_puesto: string | null
          folio: string
          id: string
          lugar_expedicion: string
          observaciones: string | null
        }
        Insert: {
          cerrada_en?: string | null
          colaborador_id: string
          creado_en?: string
          datos_colaborador?: Json
          entregado_por?: string | null
          es_historica?: boolean
          fecha_entrega?: string
          firma_entrega_nombre?: string | null
          firma_entrega_puesto?: string | null
          firma_recibe_nombre?: string | null
          firma_recibe_puesto?: string | null
          folio: string
          id?: string
          lugar_expedicion?: string
          observaciones?: string | null
        }
        Update: {
          cerrada_en?: string | null
          colaborador_id?: string
          creado_en?: string
          datos_colaborador?: Json
          entregado_por?: string | null
          es_historica?: boolean
          fecha_entrega?: string
          firma_entrega_nombre?: string | null
          firma_entrega_puesto?: string | null
          firma_recibe_nombre?: string | null
          firma_recibe_puesto?: string | null
          folio?: string
          id?: string
          lugar_expedicion?: string
          observaciones?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'asignaciones_colaborador_id_fkey'
            columns: ['colaborador_id']
            isOneToOne: false
            referencedRelation: 'colaboradores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'asignaciones_colaborador_id_fkey'
            columns: ['colaborador_id']
            isOneToOne: false
            referencedRelation: 'v_equipos'
            referencedColumns: ['colaborador_id']
          },
          {
            foreignKeyName: 'asignaciones_entregado_por_fkey'
            columns: ['entregado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      colaboradores: {
        Row: {
          activo: boolean
          actualizado_en: string
          actualizado_por: string | null
          area: string | null
          busqueda: string | null
          creado_en: string
          creado_por: string | null
          email: string | null
          empresa_id: string | null
          id: string
          nombre_completo: string
          numero_empleado: string | null
          puesto: string | null
          tipo: string
          ubicacion_id: string | null
          unidad_negocio_id: string | null
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          area?: string | null
          busqueda?: string | null
          creado_en?: string
          creado_por?: string | null
          email?: string | null
          empresa_id?: string | null
          id?: string
          nombre_completo: string
          numero_empleado?: string | null
          puesto?: string | null
          tipo?: string
          ubicacion_id?: string | null
          unidad_negocio_id?: string | null
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          area?: string | null
          busqueda?: string | null
          creado_en?: string
          creado_por?: string | null
          email?: string | null
          empresa_id?: string | null
          id?: string
          nombre_completo?: string
          numero_empleado?: string | null
          puesto?: string | null
          tipo?: string
          ubicacion_id?: string | null
          unidad_negocio_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'colaboradores_actualizado_por_fkey'
            columns: ['actualizado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'colaboradores_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'colaboradores_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'colaboradores_ubicacion_id_fkey'
            columns: ['ubicacion_id']
            isOneToOne: false
            referencedRelation: 'ubicaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'colaboradores_unidad_negocio_id_fkey'
            columns: ['unidad_negocio_id']
            isOneToOne: false
            referencedRelation: 'unidades_negocio'
            referencedColumns: ['id']
          },
        ]
      }
      contratos: {
        Row: {
          actualizado_en: string
          actualizado_por: string | null
          creado_en: string
          creado_por: string | null
          descripcion: string | null
          empresa_id: string
          estatus: string | null
          fecha_vencimiento: string | null
          id: string
          notas: string | null
          numero_contrato: string | null
          operacion: string
        }
        Insert: {
          actualizado_en?: string
          actualizado_por?: string | null
          creado_en?: string
          creado_por?: string | null
          descripcion?: string | null
          empresa_id: string
          estatus?: string | null
          fecha_vencimiento?: string | null
          id?: string
          notas?: string | null
          numero_contrato?: string | null
          operacion: string
        }
        Update: {
          actualizado_en?: string
          actualizado_por?: string | null
          creado_en?: string
          creado_por?: string | null
          descripcion?: string | null
          empresa_id?: string
          estatus?: string | null
          fecha_vencimiento?: string | null
          id?: string
          notas?: string | null
          numero_contrato?: string | null
          operacion?: string
        }
        Relationships: [
          {
            foreignKeyName: 'contratos_actualizado_por_fkey'
            columns: ['actualizado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'contratos_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'contratos_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          },
        ]
      }
      devoluciones: {
        Row: {
          asignacion_id: string
          creado_en: string
          es_cierre_incidencia: boolean
          fecha: string
          firma_entrega_nombre: string | null
          firma_entrega_puesto: string | null
          firma_recibe_nombre: string | null
          firma_recibe_puesto: string | null
          folio: string
          id: string
          lugar_expedicion: string
          observaciones: string | null
          recibido_por: string | null
        }
        Insert: {
          asignacion_id: string
          creado_en?: string
          es_cierre_incidencia?: boolean
          fecha?: string
          firma_entrega_nombre?: string | null
          firma_entrega_puesto?: string | null
          firma_recibe_nombre?: string | null
          firma_recibe_puesto?: string | null
          folio: string
          id?: string
          lugar_expedicion?: string
          observaciones?: string | null
          recibido_por?: string | null
        }
        Update: {
          asignacion_id?: string
          creado_en?: string
          es_cierre_incidencia?: boolean
          fecha?: string
          firma_entrega_nombre?: string | null
          firma_entrega_puesto?: string | null
          firma_recibe_nombre?: string | null
          firma_recibe_puesto?: string | null
          folio?: string
          id?: string
          lugar_expedicion?: string
          observaciones?: string | null
          recibido_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'devoluciones_asignacion_id_fkey'
            columns: ['asignacion_id']
            isOneToOne: false
            referencedRelation: 'asignaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'devoluciones_recibido_por_fkey'
            columns: ['recibido_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      empresas: {
        Row: {
          activa: boolean
          actualizado_en: string
          actualizado_por: string | null
          clave: string
          creado_en: string
          creado_por: string | null
          id: string
          razon_social: string
          rfc: string | null
        }
        Insert: {
          activa?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          clave: string
          creado_en?: string
          creado_por?: string | null
          id?: string
          razon_social: string
          rfc?: string | null
        }
        Update: {
          activa?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          clave?: string
          creado_en?: string
          creado_por?: string | null
          id?: string
          razon_social?: string
          rfc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'empresas_actualizado_por_fkey'
            columns: ['actualizado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'empresas_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      equipos: {
        Row: {
          actualizado_en: string
          actualizado_por: string | null
          almacenamiento: string | null
          apartado_para: string | null
          categoria: Database['public']['Enums']['categoria_equipo']
          condicion: Database['public']['Enums']['condicion_equipo'] | null
          contrato_id: string | null
          cpu: string | null
          creado_en: string
          creado_por: string | null
          descripcion: string | null
          empresa_id: string | null
          estado: Database['public']['Enums']['estado_equipo']
          gpu: string | null
          id: string
          marca: string
          modelo: string
          motivo_desactivacion: string | null
          notas: string | null
          numero_producto: string | null
          observaciones_estado: string | null
          ram_gb: number | null
          serie: string
          sistema_operativo: string | null
          subcategoria_id: string | null
          ubicacion_detalle: string | null
          ubicacion_id: string | null
        }
        Insert: {
          actualizado_en?: string
          actualizado_por?: string | null
          almacenamiento?: string | null
          apartado_para?: string | null
          categoria: Database['public']['Enums']['categoria_equipo']
          condicion?: Database['public']['Enums']['condicion_equipo'] | null
          contrato_id?: string | null
          cpu?: string | null
          creado_en?: string
          creado_por?: string | null
          descripcion?: string | null
          empresa_id?: string | null
          estado?: Database['public']['Enums']['estado_equipo']
          gpu?: string | null
          id?: string
          marca: string
          modelo: string
          motivo_desactivacion?: string | null
          notas?: string | null
          numero_producto?: string | null
          observaciones_estado?: string | null
          ram_gb?: number | null
          serie: string
          sistema_operativo?: string | null
          subcategoria_id?: string | null
          ubicacion_detalle?: string | null
          ubicacion_id?: string | null
        }
        Update: {
          actualizado_en?: string
          actualizado_por?: string | null
          almacenamiento?: string | null
          apartado_para?: string | null
          categoria?: Database['public']['Enums']['categoria_equipo']
          condicion?: Database['public']['Enums']['condicion_equipo'] | null
          contrato_id?: string | null
          cpu?: string | null
          creado_en?: string
          creado_por?: string | null
          descripcion?: string | null
          empresa_id?: string | null
          estado?: Database['public']['Enums']['estado_equipo']
          gpu?: string | null
          id?: string
          marca?: string
          modelo?: string
          motivo_desactivacion?: string | null
          notas?: string | null
          numero_producto?: string | null
          observaciones_estado?: string | null
          ram_gb?: number | null
          serie?: string
          sistema_operativo?: string | null
          subcategoria_id?: string | null
          ubicacion_detalle?: string | null
          ubicacion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'equipos_actualizado_por_fkey'
            columns: ['actualizado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'equipos_contrato_id_fkey'
            columns: ['contrato_id']
            isOneToOne: false
            referencedRelation: 'contratos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'equipos_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'equipos_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'equipos_subcategoria_id_fkey'
            columns: ['subcategoria_id']
            isOneToOne: false
            referencedRelation: 'subcategorias'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'equipos_ubicacion_id_fkey'
            columns: ['ubicacion_id']
            isOneToOne: false
            referencedRelation: 'ubicaciones'
            referencedColumns: ['id']
          },
        ]
      }
      folios_control: {
        Row: {
          anio: number
          tipo: string
          ultimo: number
        }
        Insert: {
          anio: number
          tipo: string
          ultimo?: number
        }
        Update: {
          anio?: number
          tipo?: string
          ultimo?: number
        }
        Relationships: []
      }
      movimientos: {
        Row: {
          asignacion_id: string | null
          cambios: Json
          creado_en: string
          devolucion_id: string | null
          equipo_id: string
          estado_anterior: Database['public']['Enums']['estado_equipo'] | null
          estado_nuevo: Database['public']['Enums']['estado_equipo'] | null
          id: number
          nota: string | null
          tipo: Database['public']['Enums']['tipo_movimiento']
          usuario_id: string | null
        }
        Insert: {
          asignacion_id?: string | null
          cambios?: Json
          creado_en?: string
          devolucion_id?: string | null
          equipo_id: string
          estado_anterior?: Database['public']['Enums']['estado_equipo'] | null
          estado_nuevo?: Database['public']['Enums']['estado_equipo'] | null
          id?: never
          nota?: string | null
          tipo: Database['public']['Enums']['tipo_movimiento']
          usuario_id?: string | null
        }
        Update: {
          asignacion_id?: string | null
          cambios?: Json
          creado_en?: string
          devolucion_id?: string | null
          equipo_id?: string
          estado_anterior?: Database['public']['Enums']['estado_equipo'] | null
          estado_nuevo?: Database['public']['Enums']['estado_equipo'] | null
          id?: never
          nota?: string | null
          tipo?: Database['public']['Enums']['tipo_movimiento']
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'movimientos_asignacion_id_fkey'
            columns: ['asignacion_id']
            isOneToOne: false
            referencedRelation: 'asignaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'movimientos_devolucion_id_fkey'
            columns: ['devolucion_id']
            isOneToOne: false
            referencedRelation: 'devoluciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'movimientos_equipo_id_fkey'
            columns: ['equipo_id']
            isOneToOne: false
            referencedRelation: 'equipos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'movimientos_equipo_id_fkey'
            columns: ['equipo_id']
            isOneToOne: false
            referencedRelation: 'v_equipos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'movimientos_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      perfiles: {
        Row: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          email: string
          id: string
          nombre: string
          puesto: string | null
          rol: Database['public']['Enums']['rol_usuario']
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          email: string
          id: string
          nombre?: string
          puesto?: string | null
          rol?: Database['public']['Enums']['rol_usuario']
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          email?: string
          id?: string
          nombre?: string
          puesto?: string | null
          rol?: Database['public']['Enums']['rol_usuario']
        }
        Relationships: []
      }
      subcategorias: {
        Row: {
          activa: boolean
          actualizado_en: string
          actualizado_por: string | null
          creado_en: string
          creado_por: string | null
          id: string
          nombre: string
        }
        Insert: {
          activa?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          creado_en?: string
          creado_por?: string | null
          id?: string
          nombre: string
        }
        Update: {
          activa?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          creado_en?: string
          creado_por?: string | null
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subcategorias_actualizado_por_fkey'
            columns: ['actualizado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'subcategorias_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      ubicaciones: {
        Row: {
          activa: boolean
          actualizado_en: string
          actualizado_por: string | null
          ciudad: string | null
          creado_en: string
          creado_por: string | null
          estado_republica: string | null
          id: string
          nombre: string
          tipo: string
        }
        Insert: {
          activa?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          ciudad?: string | null
          creado_en?: string
          creado_por?: string | null
          estado_republica?: string | null
          id?: string
          nombre: string
          tipo?: string
        }
        Update: {
          activa?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          ciudad?: string | null
          creado_en?: string
          creado_por?: string | null
          estado_republica?: string | null
          id?: string
          nombre?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ubicaciones_actualizado_por_fkey'
            columns: ['actualizado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ubicaciones_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      unidades_negocio: {
        Row: {
          activa: boolean
          actualizado_en: string
          actualizado_por: string | null
          creado_en: string
          creado_por: string | null
          id: string
          nombre: string
        }
        Insert: {
          activa?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          creado_en?: string
          creado_por?: string | null
          id?: string
          nombre: string
        }
        Update: {
          activa?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          creado_en?: string
          creado_por?: string | null
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: 'unidades_negocio_actualizado_por_fkey'
            columns: ['actualizado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'unidades_negocio_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      v_equipos: {
        Row: {
          actualizado_en: string | null
          almacenamiento: string | null
          apartado_para: string | null
          asignacion_fecha: string | null
          asignacion_folio: string | null
          asignacion_id: string | null
          busqueda: string | null
          categoria: Database['public']['Enums']['categoria_equipo'] | null
          colaborador_id: string | null
          colaborador_nombre: string | null
          condicion: Database['public']['Enums']['condicion_equipo'] | null
          contrato_id: string | null
          contrato_operacion: string | null
          contrato_vencimiento: string | null
          cpu: string | null
          creado_en: string | null
          descripcion: string | null
          empresa_clave: string | null
          empresa_id: string | null
          empresa_razon_social: string | null
          estado: Database['public']['Enums']['estado_equipo'] | null
          gpu: string | null
          id: string | null
          marca: string | null
          modelo: string | null
          motivo_desactivacion: string | null
          notas: string | null
          numero_producto: string | null
          observaciones_estado: string | null
          ram_gb: number | null
          serie: string | null
          sistema_operativo: string | null
          subcategoria: string | null
          subcategoria_id: string | null
          ubicacion: string | null
          ubicacion_detalle: string | null
          ubicacion_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'asignacion_equipos_asignacion_id_fkey'
            columns: ['asignacion_id']
            isOneToOne: false
            referencedRelation: 'asignaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'equipos_contrato_id_fkey'
            columns: ['contrato_id']
            isOneToOne: false
            referencedRelation: 'contratos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'equipos_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'empresas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'equipos_subcategoria_id_fkey'
            columns: ['subcategoria_id']
            isOneToOne: false
            referencedRelation: 'subcategorias'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'equipos_ubicacion_id_fkey'
            columns: ['ubicacion_id']
            isOneToOne: false
            referencedRelation: 'ubicaciones'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      cambiar_estado: {
        Args: {
          p_apartado_para?: string
          p_equipo: string
          p_estado: Database['public']['Enums']['estado_equipo']
          p_motivo?: string
          p_nota?: string
        }
        Returns: undefined
      }
      historial_equipo: {
        Args: { p_equipo: string }
        Returns: {
          autor: string
          cambios: Json
          creado_en: string
          estado_anterior: Database['public']['Enums']['estado_equipo']
          estado_nuevo: Database['public']['Enums']['estado_equipo']
          id: number
          nota: string
          tipo: Database['public']['Enums']['tipo_movimiento']
        }[]
      }
      normalizar_texto: { Args: { texto: string }; Returns: string }
      siguiente_folio: { Args: { p_tipo: string }; Returns: string }
    }
    Enums: {
      categoria_equipo: 'desktop' | 'laptop' | 'monitor' | 'otro'
      condicion_equipo: 'buen_estado' | 'con_detalles' | 'danado'
      destino_devolucion: 'stock' | 'mantenimiento' | 'no_localizado' | 'desactivado'
      estado_equipo:
        | 'stock'
        | 'asignado'
        | 'mantenimiento'
        | 'apartado'
        | 'desactivado'
        | 'no_localizado'
        | 'pendiente'
      rol_usuario: 'admin' | 'lector'
      tipo_movimiento:
        | 'alta'
        | 'edicion'
        | 'cambio_estado'
        | 'asignacion'
        | 'devolucion'
        | 'cierre_incidencia'
        | 'importacion'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      categoria_equipo: ['desktop', 'laptop', 'monitor', 'otro'],
      condicion_equipo: ['buen_estado', 'con_detalles', 'danado'],
      destino_devolucion: ['stock', 'mantenimiento', 'no_localizado', 'desactivado'],
      estado_equipo: [
        'stock',
        'asignado',
        'mantenimiento',
        'apartado',
        'desactivado',
        'no_localizado',
        'pendiente',
      ],
      rol_usuario: ['admin', 'lector'],
      tipo_movimiento: [
        'alta',
        'edicion',
        'cambio_estado',
        'asignacion',
        'devolucion',
        'cierre_incidencia',
        'importacion',
      ],
    },
  },
} as const
