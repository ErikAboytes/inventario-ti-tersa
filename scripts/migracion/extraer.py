"""Etapa 4 · Migración del Excel (docs/03-analisis-y-migracion-de-datos.md).

Lee los dos Excel en modo solo lectura, aplica los mapeos de `mapeos/*.csv` y genera en `salida/`:

- equipos.csv, colaboradores.csv, asignaciones.csv: lo que se cargará, para revisarlo en Excel;
- incidencias.csv: cada caso que requiere una decisión humana, con su motivo;
- resumen.md: conteos para la conciliación;
- carga.sql: la carga completa en una sola transacción (se ejecuta con `supabase db query`).

La columna LogMeIn (usuarios y contraseñas en texto plano) nunca se lee.
`salida/` está en .gitignore: contiene datos personales.

Uso:
    python scripts/migracion/extraer.py [--consolidado RUTA] [--original RUTA] [--generar-mapeos]
"""

from __future__ import annotations

import argparse
import collections
import csv
import datetime as dt
import difflib
import json
import re
import sys
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

import openpyxl

AQUI = Path(__file__).resolve().parent
MAPEOS = AQUI / "mapeos"
SALIDA = AQUI / "salida"

CONSOLIDADO = Path.home() / "OneDrive/Documentos/ITT/Residencia/Recursos/Inventario_consolidado_HP_TERSA_v2.xlsx"
ORIGINAL = Path.home() / "OneDrive/Desktop/Docs/INVENTARIO TERSA ACTUALIZADO 20-07-26.xlsx"

HOY = dt.date.today().isoformat()


# ── Texto ─────────────────────────────────────────────────────────────────────────────────────────


def limpio(valor) -> str:
    """Texto sin espacios sobrantes; None y celdas vacías → ''."""
    if valor is None:
        return ""
    return re.sub(r"\s+", " ", str(valor)).strip()


def clave(valor) -> str:
    """Igual que normalizar_texto() de la BD, pero en mayúsculas: «Martín  Muñoz» → «MARTIN MUNOZ»."""
    sin_acentos = unicodedata.normalize("NFD", limpio(valor))
    sin_acentos = "".join(c for c in sin_acentos if unicodedata.category(c) != "Mn")
    return sin_acentos.upper()


MINUSCULAS = {"de", "del", "la", "las", "los", "y", "e", "da", "van", "von"}


def nombre_propio(valor: str) -> str:
    """«JOSE CARLOS LOPEZ» → «Jose Carlos Lopez»; conserva acentos y ñ del original."""
    def mayuscula(s: str) -> str:
        # «(violeta» → «(Violeta»: la primera letra, aunque no sea el primer carácter.
        return re.sub(r"[^\W\d_]", lambda m: m.group(0).upper(), s, count=1)

    palabras = limpio(valor).lower().split(" ")
    return " ".join(
        p if (i and p in MINUSCULAS) else "-".join(mayuscula(s) for s in p.split("-"))
        for i, p in enumerate(palabras)
    )


def acentos(n: str) -> int:
    return sum(1 for c in n if ord(c) > 127)


# ── Lectura de Excel ──────────────────────────────────────────────────────────────────────────────


def hoja_como_dicts(ws) -> list[dict]:
    """Filas de una hoja como dicts con encabezados normalizados (clave()). Omite filas vacías."""
    filas = ws.iter_rows(values_only=True)
    encabezados = [clave(c) for c in next(filas)]
    resultado = []
    for n, fila in enumerate(filas, start=2):
        if not any(limpio(c) for c in fila):
            continue
        d = {e: v for e, v in zip(encabezados, fila) if e and e != "LOGMEIN"}
        d["_fila"] = n
        resultado.append(d)
    return resultado


def leer_csv(nombre: str) -> list[dict]:
    ruta = MAPEOS / nombre
    if not ruta.exists():
        return []
    with ruta.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def escribir_csv(ruta: Path, filas: list[dict], columnas: list[str]):
    ruta.parent.mkdir(parents=True, exist_ok=True)
    # BOM: Excel abre los acentos bien.
    with ruta.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=columnas, extrasaction="ignore")
        w.writeheader()
        w.writerows(filas)


# ── Reglas de los mapeos (sugerencias para --generar-mapeos) ──────────────────────────────────────

PALABRAS_ACENTUADAS = {
    "CULIACAN": "Culiacán", "MAZATLAN": "Mazatlán", "OBREGON": "Obregón", "PERIFERICO": "Periférico",
    "TORREON": "Torreón", "LAZARO": "Lázaro", "CARDENAS": "Cárdenas", "CONSTITUCION": "Constitución",
    "JUAREZ": "Juárez", "BENITEZ": "Benítez", "LOPEZ": "López", "CUAUHTEMOC": "Cuauhtémoc",
    "RIO": "Río", "QUINTIN": "Quintín", "VIA": "Vía", "RAPIDA": "Rápida", "MEXICO": "México",
    "ALMACEN": "Almacén", "RECEPCION": "Recepción", "GARANTIAS": "Garantías", "LEON": "León",
    "JOSE": "José", "SJC": "SJC", "MRT": "MRT", "CEDIS": "CEDIS", "GDL": "GDL", "MXL": "MXL",
    "JAC": "JAC", "CGE": "CGE", "TJ": "TJ", "BIBB": "Bibb", "CAJON": "Cajón", "CARTON": "Cartón",
    "FUNDACION": "Fundación", "RECOLECCION": "Recolección", "DFAC": "DFAC", "PLNA": "PLNA",
}
# En nombres de lugar los artículos forman parte del nombre («La Mesa», «Los Cabos»).
MINUSCULAS_LUGAR = {"de", "del", "y"}


def titulo_lugar(texto: str) -> str:
    palabras = clave(texto).split(" ")
    return " ".join(
        PALABRAS_ACENTUADAS.get(p, p.lower() if (i and p.lower() in MINUSCULAS_LUGAR) else p.capitalize())
        for i, p in enumerate(palabras)
        if p
    )


def sugerir_ubicacion(original: str) -> dict:
    """Regla inicial de docs/03 §4. El resultado se revisa a mano en mapeos/ubicaciones.csv."""
    k = clave(original)
    sin = {"ubicacion": "", "tipo": "", "detalle": ""}
    if not k or k in {"NO LOCALIZADO", "PENDIENTE ENCONTRAR"} or k.startswith(("DONATIVO", "AGENCIA CGE")):
        return sin
    m = re.match(r"^(STOCK SIST(?:EMAS|\.)?|OFICINA SISTEMAS|SISTEMAS)\s*(.*)$", k)
    if m:
        detalle = m.group(2).strip(" .")
        detalle = re.sub(r"\bPRACT(ICANTE|IC|)\.?$", "PRACTICANTE", detalle)
        if m.group(1) == "OFICINA SISTEMAS":
            detalle = "OFICINA"
        return {"ubicacion": "Almacén Sistemas", "tipo": "almacen", "detalle": titulo_lugar(detalle) if detalle else ""}
    m = re.match(r"^INV\. (.+?) (CAJA\d+)$", k)
    if m:
        return {"ubicacion": f"Almacén {titulo_lugar(m.group(1))}", "tipo": "almacen", "detalle": m.group(2)}
    if k.startswith("INV. "):
        return {"ubicacion": f"Almacén {titulo_lugar(k[5:])}", "tipo": "almacen", "detalle": ""}
    if k in {"CORPORATIVO VIA RAPIDA", "CORPORATIVO", "TERSA CORPORATIVO"}:
        return {"ubicacion": "Corporativo Vía Rápida", "tipo": "corporativo", "detalle": ""}
    # «TERSA PERIFERICO-EN RESG.» → Tersa Periférico, detalle «En resguardo».
    detalle = ""
    m = re.match(r"^(.*?)\s*-\s*(EN RES.*|RESG\.?)$", k)
    if m:
        k, detalle = m.group(1), "En resguardo"
    if k == "TERSA":
        return sin  # sin sucursal; el texto original queda en la nota de importación
    k = re.sub(r"^TERSA24-\s*", "TERSA ", k)
    k = re.sub(r"^TERSA?\s*-?\s*(?=[A-Z])", "TERSA ", k)  # TERSATEPIC, TERS ABASOLO, TERSA-MOCHIS
    k = re.sub(r"^RENAUL\b", "RENAULT", k)
    k = re.sub(r"^RENAULT\s*-\s*", "RENAULT ", k)
    m = re.match(r"^RENAULT (OBREGON|HMO|TJ) (.+)$", k)
    if m:
        ciudad = {"HMO": "HERMOSILLO", "TJ": "TIJUANA"}.get(m.group(1), m.group(1))
        return {"ubicacion": titulo_lugar(f"RENAULT {ciudad}"), "tipo": "sucursal", "detalle": titulo_lugar(m.group(2))}
    if not k.startswith(("TERSA", "RENAULT", "PEUGEOT", "AGENCIA")):
        k = f"TERSA {k}"
    return {"ubicacion": titulo_lugar(k), "tipo": "sucursal", "detalle": detalle}


def sugerir_modelo(descripcion: str) -> dict:
    """Marca y modelo legibles a partir de la descripción libre del Excel (docs/03 §2)."""
    d = clave(descripcion)
    if re.fullmatch(r"[0-9A-Z]{7}", d) and re.search(r"\d", d) and re.search(r"[A-Z]", d):
        # 2F3X8LT, 476T2LT, 3Y0Q4AA: número de parte HP, no descripción.
        return {"marca": "HP", "modelo": "Por identificar", "numero_producto": d}
    if "IPAD" in d:
        modelo = "iPad Pro 11" if "PRO11" in d else "iPad Air 2" if "AIR 2" in d else "iPad"
        return {"marca": "Apple", "modelo": modelo, "numero_producto": ""}
    if "SURFACE" in d:
        return {"marca": "Microsoft", "modelo": "Surface Pro 4", "numero_producto": ""}
    marca = "HP"
    reglas = [
        (r"PRO\s?BOOK\s?(\d{3})\s?(G\d+)?", lambda m: f"ProBook {m.group(1)}" + (f" {m.group(2)}" if m.group(2) else "")),
        (r"(\d{3}) PROBOOK (G\d+)", lambda m: f"ProBook {m.group(1)} {m.group(2)}"),
        (r"PROBOOK (G\d+)", lambda m: f"ProBook {m.group(1)}"),
        (r"(250) PRODE[SK]+S? (G\d+)", lambda m: f"ProBook {m.group(1)} {m.group(2)}"),
        (r"ELITEBOOK X360(?: (\d{4})\s?(G\d+))?", lambda m: "EliteBook x360" + (f" {m.group(1)} {m.group(2)}" if m.group(1) else "")),
        (r"ELITEBOOK (\d{3}) (G\d+)", lambda m: f"EliteBook {m.group(1)} {m.group(2)}"),
        (r"ELITEBOOK (\d{3})", lambda m: f"EliteBook {m.group(1)}"),
        (r"ZBOOK FIREFLY", lambda m: "ZBook Firefly"),
        (r"PRODESK (\d{3}) (G\d+)", lambda m: f"ProDesk {m.group(1)} {m.group(2)}"),
        (r"PRODESK (\d{3})(G\d+)", lambda m: f"ProDesk {m.group(1)} {m.group(2)}"),
        (r"(\d{3}) (G\d+) PRODESK", lambda m: f"ProDesk {m.group(1)} {m.group(2)}"),
        (r"(\d{3}) PRODESK (?:DM |MINI )?(G\d+)", lambda m: f"ProDesk {m.group(1)} {m.group(2)}"),
        (r"(\d{3}) SFF (G\d+)", lambda m: f"ProDesk {m.group(1)} {m.group(2)}"),
        (r"PRO SFF (\d{3}) (G\d+)", lambda m: f"Pro SFF {m.group(1)} {m.group(2)}"),
        (r"(?:PROMO )?(\d{3}) (?:G\d+ )?PRODESK", lambda m: f"ProDesk {m.group(1)}"),
        (r"PRODESK (\d{3})", lambda m: f"ProDesk {m.group(1)}"),
        (r"\bZ2 G5 MINI", lambda m: "Z2 Mini G5"),
        (r"\bZ238", lambda m: "Z238"),
        (r"\b(Z2[34]N?F?) (G\d)", lambda m: f"{m.group(1).replace('N', 'n').replace('F', 'f')} {m.group(2)}"),
        (r"PRO\s?DISPLAY (P20[02])", lambda m: f"ProDisplay {m.group(1)}"),
        (r"MONITOR (P20[02])", lambda m: f"ProDisplay {m.group(1)}"),
        (r"\b(P24V|P24|P24A) ?(G\d)?", lambda m: m.group(1).replace("V", "v").replace("A", "a") + (f" {m.group(2)}" if m.group(2) else "")),
        (r"\b(V244H)", lambda m: "V244h"),
        (r"\b(N246V)", lambda m: "N246v"),
        (r"MONITOR LED 23\.8", lambda m: "Monitor LED 23.8"),
        (r"MONITOR LED 24", lambda m: "Monitor LED 24"),
    ]
    for patron, modelo in reglas:
        m = re.search(patron, d)
        if m:
            return {"marca": marca, "modelo": modelo(m), "numero_producto": ""}
    return {"marca": marca, "modelo": titulo_lugar(descripcion)[:60], "numero_producto": ""}


# Palabras que indican un usuario genérico (puesto, área o equipo), no una persona (D8).
PALABRAS_GENERICAS = {
    "SERVIDOR", "VACANTE", "VENTAS", "VENTAS1", "VENTAS2", "ASESOR", "CONTABILIDAD", "GERENTE",
    "FACTURISTA", "ADMINISTRADOR", "ADMINISTRACION", "CAMION", "TIENDA", "CAJA", "CAJERO", "ALMACEN",
    "RECEPCION", "SISTEMAS", "CDN", "COMPRAS", "CREDITO", "COBRANZA", "NUEVO", "AUXILIAR", "JEFE",
    "SUPERVISOR", "COORDINADOR", "EJECUTIVO", "CONTADOR", "PRACTICANTE", "GARANTIAS", "TALLER",
    "REFACCIONES", "SERVICIO", "SERVICIOS", "MOSTRADOR", "INVENTARIOS", "NOMINAS", "MERCADOTECNIA",
    "ALMACENISTA", "DIRECTOR", "TERSA",
}
CONECTORES = {"DE", "DEL", "LA", "EL", "Y", "EN", "TIENE", "LO", "LOS", "LAS"}


def es_generico(usuario: str) -> bool:
    palabras = [p for p in re.split(r"[^A-Z0-9]+", clave(usuario)) if p]
    if not palabras:
        return False
    if palabras[0] in {"SERVIDOR", "VACANTE"} or palabras[0].isdigit():
        return True  # «02 - Ens Plaza Ventas02»: etiqueta de equipo, no persona
    resto = [p for p in palabras if p not in CONECTORES and not p.isdigit()]
    # «VENTAS3», «VENTTAS», «TI»: variantes de puesto o área que no son nombres.
    generica = lambda p: p in PALABRAS_GENERICAS or p == "TI" or re.fullmatch(r"VENT+AS?\d*", p)
    return bool(resto) and sum(bool(generica(p)) for p in resto) >= max(1, len(resto) - 1)


def no_es_colaborador(usuario: str) -> bool:
    """Textos de la columna Usuario que son notas, no personas ni puestos."""
    k = clave(usuario)
    return k.startswith(("DONATIVO", "NO ASIGNADA", "PENDIENTE")) or "RECOLECCION" in k


# Comentarios que describen el estado físico (docs/03 §2, fila Comentarios).
def condicion_de(comentario: str) -> str:
    k = clave(comentario)
    if not k:
        return ""
    if re.search(r"DANAD", k):
        return "danado"
    if re.search(r"DETALLE EN|FALTAN TECLAS|CHECAR TECLADO|NO TIENE DISCO|ALMACENAMIENTO FALTANTE|MUY LENTA|POCO LENTA", k):
        return "con_detalles"
    if re.match(r"^FUNCIONAL\b", k):
        return "buen_estado"
    return ""


PALABRAS_PUESTO = PALABRAS_GENERICAS | {
    "DIRECTOR", "CONTRALOR", "GENERALISTA", "RH", "FISCAL", "JURIDICO", "TESORERIA", "ZONA",
    "ALMACENISTA", "CHOFER", "VALUADOR", "VENDEDOR", "ASISTENTE", "ANALISTA", "ENLACE", "FINANCIERO",
    "DESARROLLO", "ORGANIZACIONAL", "RECLUTAMIENTO", "MANTENIMIENTO", "SEMINUEVOS", "CALIDAD",
    "COMERCIAL", "INMOBILIARIA", "ADMINISTRATIVO", "TI", "HYP", "COORD", "ABASTECIMIENTO", "JR",
}


def parece_puesto(comentario: str) -> bool:
    palabras = [p for p in re.split(r"[^A-Z0-9]+", clave(comentario)) if p]
    if not palabras or len(palabras) > 6 or any(c.isdigit() for c in clave(comentario)):
        return False
    resto = [p for p in palabras if p not in CONECTORES]
    return bool(resto) and resto[0] in PALABRAS_PUESTO


# ── Modelo de datos de la salida ──────────────────────────────────────────────────────────────────


@dataclass
class Equipo:
    serie: str
    origen: str  # «Consolidado fila N» u «Otros equipos fila N»
    categoria: str
    subcategoria: str = ""
    marca: str = ""
    modelo: str = ""
    numero_producto: str = ""
    descripcion: str = ""
    operacion: str = ""
    ubicacion: str = ""
    ubicacion_detalle: str = ""
    estado: str = "pendiente"
    apartado_para: str = ""
    motivo_desactivacion: str = ""
    condicion: str = ""
    observaciones_estado: str = ""
    notas: list[str] = field(default_factory=list)
    nota_importacion: str = ""
    colaborador: str = ""  # clave del colaborador (asignación activa o histórica)
    folio: str = ""


@dataclass
class Colaborador:
    clave: str
    nombre: str
    tipo: str
    puestos: collections.Counter = field(default_factory=collections.Counter)
    empresas: collections.Counter = field(default_factory=collections.Counter)
    ubicaciones: collections.Counter = field(default_factory=collections.Counter)
    variantes: set = field(default_factory=set)


class Migracion:
    def __init__(self):
        self.incidencias: list[dict] = []
        self.equipos: list[Equipo] = []
        self.colaboradores: dict[str, Colaborador] = {}
        self.contratos: dict[str, dict] = {}
        self.ubicaciones: dict[str, dict] = {}

    def incidencia(self, tipo: str, serie: str, detalle: str, origen: str = ""):
        self.incidencias.append({"tipo": tipo, "serie": serie, "detalle": detalle, "origen": origen})

    # ── Colaboradores ──
    def colaborador(self, usuario: str, ubicacion: str, operacion: str, puesto: str) -> str:
        generico = es_generico(usuario)
        nombre = limpio(usuario)
        if generico:
            # Ligado a la sucursal: «Servidor · Tersa Tecate» (D8).
            nombre = f"{nombre_propio(nombre)} · {ubicacion}" if ubicacion else nombre_propio(nombre)
        k = clave(nombre)
        c = self.colaboradores.get(k)
        if not c:
            c = self.colaboradores[k] = Colaborador(k, nombre_propio(nombre) if not generico else nombre, "generico" if generico else "persona")
        c.variantes.add(limpio(usuario))
        # El nombre con acentos gana a la versión sin ellos («MARTIN MUÑOZ» sobre «MARTIN MUNOZ»).
        if not generico and acentos(nombre) > acentos(c.nombre):
            c.nombre = nombre_propio(nombre)
        if puesto and not generico:
            c.puestos[puesto] += 1
        empresa = self.contratos.get(operacion, {}).get("empresa")
        if empresa:
            c.empresas[empresa] += 1
        if ubicacion:
            c.ubicaciones[ubicacion] += 1
        return k


def ubicacion_de(m: Migracion, mapa: dict, original: str, serie: str, origen: str) -> tuple[str, str]:
    k = clave(original)
    if k not in mapa:
        m.incidencia("Ubicación sin mapeo", serie, f"«{original}» no está en mapeos/ubicaciones.csv", origen)
        return "", ""
    u = mapa[k]
    if u["ubicacion"]:
        m.ubicaciones.setdefault(u["ubicacion"], {"tipo": u["tipo"] or "sucursal"})
    return u["ubicacion"], u["detalle"]


def fecha_contrato(valor) -> str:
    if isinstance(valor, (dt.datetime, dt.date)):
        return valor.strftime("%Y-%m-%d")
    texto = limpio(valor)
    for formato in ("%d/%b/%Y", "%d-%b-%Y", "%d/%m/%Y"):
        try:
            return dt.datetime.strptime(texto, formato).strftime("%Y-%m-%d")
        except ValueError:
            pass
    return ""


# ── Proceso principal ─────────────────────────────────────────────────────────────────────────────


def leer_original(m: Migracion, libro) -> tuple[dict, list[dict]]:
    for f in hoja_como_dicts(libro["CONTRATOS"]):
        op = clave(f.get("OPERACION"))
        if not op:
            continue
        estatus = clave(f.get("ESTATUS")).lower()
        m.contratos[op] = {
            "operacion": op,
            "empresa": clave(f.get("EMPRESA")),
            "numero": limpio(f.get("CONTRATO")),
            "descripcion": limpio(f.get("DESCRIPCION")),
            "vencimiento": fecha_contrato(f.get("FECHA VENCIMIENTO")),
            "estatus": estatus if estatus in {"vigente", "comprado", "pagado", "vencido"} else "",
        }
    # Puesto por serie (el consolidado lo mezcló con Comentarios).
    puestos = {}
    for hoja in ("TERSA", "RENAULT", "CONTROL"):
        for f in hoja_como_dicts(libro[hoja]):
            serie, puesto = clave(f.get("SERIE")), limpio(f.get("PUESTO"))
            if serie and puesto:
                puestos[serie] = puesto
    otros = next(ws for ws in libro.worksheets if clave(ws.title).startswith("OTROS EQUIPOS"))
    return puestos, hoja_como_dicts(otros)


def procesar(m: Migracion, consolidado: list[dict], puestos: dict, otros: list[dict]):
    modelos = {clave(r["descripcion"]): r for r in leer_csv("modelos.csv")}
    ubic = {clave(r["original"]): r for r in leer_csv("ubicaciones.csv")}
    estados = {clave(r["estatus"]): r for r in leer_csv("estados.csv")}
    vistas = set()

    for f in consolidado:
        origen = f"Consolidado fila {f['_fila']}"
        serie = clave(f.get("SERIE")).replace(" ", "")
        if serie in vistas:
            m.incidencia("Serie repetida", serie, "Aparece más de una vez en el consolidado; se omite la repetida", origen)
            continue
        vistas.add(serie)
        tipo = clave(f.get("TIPO")).lower()
        e = Equipo(serie=serie, origen=origen, categoria={"laptop": "laptop", "desktop": "desktop", "monitor": "monitor"}.get(tipo, "otro"))
        if e.categoria == "otro":
            e.subcategoria = "iPad/Tablet"
        if serie.startswith("ICR"):
            m.incidencia("Serie dudosa", serie, "Empieza con ICR; ¿es 1CR (monitores HP)? Se carga tal cual", origen)

        descripcion = limpio(f.get("DESCRIPCION"))
        e.descripcion = descripcion
        mod = modelos.get(clave(descripcion))
        if mod:
            e.marca, e.modelo, e.numero_producto = mod["marca"], mod["modelo"], mod["numero_producto"]
            if mod["modelo"] == "Por identificar":
                m.incidencia("Modelo por identificar", serie, f"La descripción «{descripcion}» es un número de parte", origen)
        else:
            m.incidencia("Descripción sin mapeo", serie, f"«{descripcion}» no está en mapeos/modelos.csv", origen)
            e.marca, e.modelo = "HP", "Por identificar"

        e.operacion = clave(f.get("OPERACION"))
        if e.operacion and e.operacion not in m.contratos:
            m.incidencia("Operación sin contrato", serie, f"{e.operacion} no está en la hoja CONTRATOS", origen)
            e.operacion = ""

        ubic_original = limpio(f.get("UBICACION"))
        e.ubicacion, e.ubicacion_detalle = ubicacion_de(m, ubic, ubic_original, serie, origen)

        estatus = limpio(f.get("ESTATUS"))
        usuario = limpio(f.get("USUARIO"))
        comentario = limpio(f.get("COMENTARIOS"))
        folio = clave(f.get("C. RESPONSIVA")).replace(" ", "")
        ciudad = limpio(f.get("CIUDAD"))
        coincidencia = limpio(f.get("COINCIDENCIA TERSA"))
        texto_todo = clave(" ".join([estatus, usuario, ubic_original, comentario]))

        # Estado (docs/03 §3).
        regla = estados.get(clave(estatus))
        if not regla:
            m.incidencia("Estatus sin mapeo", serie, f"«{estatus}» no está en mapeos/estados.csv", origen)
            regla = {"estado": "pendiente", "motivo": ""}
        e.estado = regla["estado"]
        persona = usuario and not no_es_colaborador(usuario)
        if e.estado == "asignado" and not persona:
            e.estado = "pendiente"
            m.incidencia("Asignada sin usuario", serie, f"Estatus «{estatus}» sin usuario; se carga como Pendiente", origen)
        elif e.estado == "desactivado":
            e.motivo_desactivacion = regla["motivo"] or estatus.capitalize()
            if clave(estatus) == "VENDIDA" and comentario:
                e.motivo_desactivacion = f"Vendida · {comentario}"
        elif e.estado == "apartado":
            e.apartado_para = usuario or comentario or "Sin especificar"
            if not (usuario or comentario):
                m.incidencia("Apartado sin etiqueta", serie, "No dice para quién está apartado", origen)
        elif not estatus:
            donativo = re.search(r"DONATIVO[ \d-]*", texto_todo)
            if donativo:
                e.estado, e.motivo_desactivacion = "desactivado", donativo.group(0).strip().capitalize()
            else:
                m.incidencia("Estatus vacío", serie, "Sin estatus ni pista; se carga como Pendiente", origen)
        if e.estado == "no_localizado" and "DONATIVO" in texto_todo:
            m.incidencia("No localizado con donativo", serie, "Dice NO LOCALIZADO pero menciona un DONATIVO", origen)
        if coincidencia and clave(coincidencia) != "COINCIDENCIA UNICA":
            m.incidencia("Coincidencia no única", serie, f"Coincidencia Tersa: «{coincidencia}»", origen)

        # Colaborador: asignación activa (asignado) o histórica cerrada (con folio SIS).
        puesto = puestos.get(serie, "")
        if not puesto and persona and parece_puesto(comentario):
            puesto = comentario
        if persona and (e.estado == "asignado" or folio):
            e.colaborador = m.colaborador(usuario, e.ubicacion, e.operacion, puesto)
            e.folio = folio
        elif usuario and e.estado != "apartado":
            e.notas.append(f"Último usuario registrado en el Excel: {usuario}.")

        # Comentario: estado físico, puesto o nota (docs/03 §2).
        cond = condicion_de(comentario)
        if cond:
            e.condicion, e.observaciones_estado = cond, comentario
        elif comentario and not (puesto and clave(comentario) == clave(puesto)) and not (e.colaborador and parece_puesto(comentario)) \
                and comentario not in (e.apartado_para, e.motivo_desactivacion) and not e.motivo_desactivacion.endswith(comentario):
            e.notas.append(comentario)

        partes = [f"estatus «{estatus or '—'}»", f"usuario «{usuario or '—'}»", f"ubicación «{ubic_original or '—'}»"]
        if ciudad:
            partes.append(f"ciudad «{ciudad}»")
        if folio:
            partes.append(f"carta «{folio}»")
        if comentario:
            partes.append(f"comentario «{comentario}»")
        if coincidencia:
            partes.append(f"coincidencia «{coincidencia}»")
        e.nota_importacion = "Importado del Excel (" + origen.lower() + "): " + " · ".join(partes) + "."
        m.equipos.append(e)

    # ── Equipos fuera de contrato (docs/03 §6) ──
    por_serie = {e.serie: e for e in m.equipos}
    for f in otros:
        origen = f"Otros equipos fila {f['_fila']}"
        serie = clave(f.get("SERIE")).replace(" ", "")
        comentario = limpio(f.get("COMENTARIOS"))
        if serie in por_serie:
            if comentario and comentario not in por_serie[serie].notas:
                por_serie[serie].notas.append(comentario)
            continue
        if serie in ("N/A", "NA", ""):
            serie = ""
            m.incidencia("Sin serie", "", f"«{limpio(f.get('DESCRIPCION'))}» no tiene serie; la BD le asigna SINSERIE-NNNN", origen)
        elif len(serie) == 9 and serie.startswith("CN322142"):
            m.incidencia("Serie dudosa", serie, "Tiene 9 caracteres; las demás del lote son CNC322142x", origen)
        descripcion = limpio(f.get("DESCRIPCION"))
        e = Equipo(serie=serie, origen=origen, categoria="monitor", descripcion=descripcion,
                   numero_producto=limpio(f.get("PROD.")))
        mod = modelos.get(clave(descripcion))
        if mod:
            e.marca, e.modelo = mod["marca"], mod["modelo"]
        else:
            m.incidencia("Descripción sin mapeo", serie, f"«{descripcion}» no está en mapeos/modelos.csv", origen)
            e.marca, e.modelo = "Por identificar", "Por identificar"
        ubic_original = limpio(f.get("UBICACION"))
        e.ubicacion, e.ubicacion_detalle = ubicacion_de(m, ubic, ubic_original, serie, origen)
        usuario = limpio(f.get("USUARIO"))
        if usuario and not no_es_colaborador(usuario):
            e.estado = "asignado"
            e.colaborador = m.colaborador(usuario, e.ubicacion, "", limpio(f.get("PUESTO")))
        elif e.ubicacion.startswith("Almacén"):
            e.estado = "stock"
        else:
            e.estado = "pendiente"
            m.incidencia("Fuera de contrato sin ubicación", serie, "Se carga como Pendiente", origen)
        if comentario:
            e.notas.append(comentario)
        e.notas.append("Equipo fuera de contrato (sin empresa asignada).")
        e.nota_importacion = f"Importado del Excel (hoja de equipos fuera de contrato, fila {f['_fila']}): ubicación «{ubic_original or '—'}» · usuario «{usuario or '—'}»."
        m.equipos.append(e)
        if serie:
            por_serie[serie] = e

    # Homónimos posibles (docs/03 §8). No se fusionan solos: se reportan para decidir a mano.
    personas = sorted((c for c in m.colaboradores.values() if c.tipo == "persona"), key=lambda c: c.clave)
    for c in personas:
        if len(c.nombre.split()) < 2:
            m.incidencia("Colaborador con nombre incompleto", "", f"«{c.nombre}»: revisar si es una persona", "")
        if len({v.upper() for v in c.variantes}) > 1:
            m.incidencia("Colaborador unificado", "", f"Se unificaron variantes de escritura: {' / '.join(sorted(c.variantes))}", "")
    for i, a in enumerate(personas):
        pa = set(a.clave.split())
        for b in personas[i + 1:]:
            pb = set(b.clave.split())
            contenido = len(pa) >= 2 and len(pb) >= 2 and (pa < pb or pb < pa)
            parecido = len(pa) == len(pb) and difflib.SequenceMatcher(None, a.clave, b.clave).ratio() >= 0.9
            if contenido or parecido:
                m.incidencia("Posible mismo colaborador", "", f"«{a.nombre}» y «{b.nombre}»: ¿son la misma persona?", "")


def asignaciones_de(m: Migracion) -> list[dict]:
    """Agrupa por carta (SIS…) o, sin carta, por colaborador (HIST-0001…). docs/03 §5."""
    grupos: dict[str, dict] = {}
    hist = 0
    for e in m.equipos:
        if not e.colaborador:
            continue
        activa = e.estado == "asignado"
        if e.folio:
            g = grupos.get(e.folio)
            if g and g["colaborador"] != e.colaborador:
                m.incidencia("Carta con dos colaboradores", e.serie, f"La carta {e.folio} ya es de otro colaborador; este equipo va en una HIST", e.origen)
                g = None
                folio = None
            else:
                folio = e.folio
        else:
            folio = None
            g = None
        if folio is None:
            # Sin carta: una asignación activa por colaborador; las cerradas sin carta no se crean.
            if not activa:
                e.notas.append(f"Último usuario registrado en el Excel: {m.colaboradores[e.colaborador].nombre}.")
                continue
            folio = next((k for k, v in grupos.items() if k.startswith("HIST-") and v["colaborador"] == e.colaborador), None)
            if not folio:
                hist += 1
                folio = f"HIST-{hist:04d}"
        g = grupos.setdefault(folio, {"folio": folio, "colaborador": e.colaborador, "equipos": []})
        g["equipos"].append(e)
    return list(grupos.values())


# ── SQL de carga ──────────────────────────────────────────────────────────────────────────────────


def sql(valor) -> str:
    if valor is None or valor == "":
        return "null"
    if isinstance(valor, bool):
        return "true" if valor else "false"
    return "'" + str(valor).replace("'", "''") + "'"


def valores(filas: list[list]) -> str:
    return ",\n  ".join("(" + ", ".join(sql(v) for v in f) + ")" for f in filas)


DESTINO = {"stock": "stock", "mantenimiento": "mantenimiento", "no_localizado": "no_localizado", "desactivado": "desactivado"}


def generar_sql(m: Migracion, asignaciones: list[dict], conteos: dict) -> str:
    empresas = sorted({c["empresa"] for c in m.contratos.values() if c["empresa"]})
    usadas = {e.operacion for e in m.equipos if e.operacion}
    contratos = [m.contratos[o] for o in sorted(usadas)]
    colaboradores = sorted(m.colaboradores.values(), key=lambda c: c.clave)
    partes = [
        "-- Generado por scripts/migracion/extraer.py el " + dt.datetime.now().isoformat(timespec="seconds"),
        "-- Carga del inventario desde el Excel (docs/03). Una sola transacción: si algo falla, no se guarda nada.",
        "begin;",
        "select set_config('app.contexto', 'importacion', true);",
        "do $$ begin\n  if exists (select 1 from public.equipos) then\n"
        "    raise exception 'La base ya tiene equipos: la importación solo corre sobre un inventario vacío (ver reiniciar.sql).';\n"
        "  end if;\nend $$;",
        "\n-- Empresas (razón social provisional = clave, D3).",
        "insert into public.empresas (clave, razon_social) values\n  "
        + valores([[e, e] for e in empresas]) + "\non conflict (clave) do nothing;",
        "\n-- Contratos usados por algún equipo.",
        "insert into public.contratos (operacion, numero_contrato, empresa_id, descripcion, fecha_vencimiento, estatus)\n"
        "select v.operacion, v.numero, em.id, v.descripcion, v.vencimiento::date, v.estatus\nfrom (values\n  "
        + valores([[c["operacion"], c["numero"], c["empresa"], c["descripcion"], c["vencimiento"], c["estatus"]] for c in contratos])
        + "\n) v(operacion, numero, empresa, descripcion, vencimiento, estatus)\n"
        "join public.empresas em on em.clave = v.empresa\non conflict (operacion) do nothing;",
        "\n-- Ubicaciones normalizadas (docs/03 §4).",
        "insert into public.ubicaciones (nombre, tipo)\nselect v.nombre, v.tipo from (values\n  "
        + valores([[n, u["tipo"]] for n, u in sorted(m.ubicaciones.items())])
        + "\n) v(nombre, tipo)\nwhere not exists (select 1 from public.ubicaciones u\n"
        "  where public.normalizar_texto(u.nombre) = public.normalizar_texto(v.nombre));",
        "\ninsert into public.subcategorias (nombre) select 'iPad/Tablet'\n"
        "where not exists (select 1 from public.subcategorias where public.normalizar_texto(nombre) = 'ipad/tablet');",
        "\n-- Colaboradores (personas y genéricos ligados a su sucursal, D8).",
        "create temp table imp_colaboradores (id uuid default gen_random_uuid(), clave text primary key,\n"
        "  nombre text, puesto text, tipo text, empresa text, ubicacion text) on commit drop;",
        "insert into imp_colaboradores (clave, nombre, puesto, tipo, empresa, ubicacion) values\n  "
        + valores([[c.clave, c.nombre, (c.puestos.most_common(1)[0][0] if c.puestos else ""), c.tipo,
                    (c.empresas.most_common(1)[0][0] if c.empresas else ""),
                    (c.ubicaciones.most_common(1)[0][0] if c.ubicaciones else "")] for c in colaboradores]) + ";",
        "insert into public.colaboradores (id, nombre_completo, puesto, tipo, empresa_id, ubicacion_id)\n"
        "select i.id, i.nombre, i.puesto, i.tipo, em.id, ub.id from imp_colaboradores i\n"
        "left join public.empresas em on em.clave = i.empresa\n"
        "left join public.ubicaciones ub on public.normalizar_texto(ub.nombre) = public.normalizar_texto(i.ubicacion);",
        "\n-- Equipos. La serie vacía la completa la BD con SINSERIE-NNNN; la empresa se toma del contrato.",
        "create temp table imp_equipos (id uuid default gen_random_uuid(), n int primary key, serie text, categoria text,\n"
        "  subcategoria text, marca text, modelo text, numero_producto text, descripcion text, operacion text,\n"
        "  ubicacion text, ubicacion_detalle text, estado text, apartado_para text, motivo text, condicion text,\n"
        "  observaciones text, notas text, nota_importacion text) on commit drop;",
        "insert into imp_equipos (n, serie, categoria, subcategoria, marca, modelo, numero_producto, descripcion, operacion,\n"
        "  ubicacion, ubicacion_detalle, estado, apartado_para, motivo, condicion, observaciones, notas, nota_importacion) values\n  "
        + valores([[n, e.serie, e.categoria, e.subcategoria, e.marca, e.modelo, e.numero_producto, e.descripcion, e.operacion,
                    e.ubicacion, e.ubicacion_detalle, e.estado, e.apartado_para, e.motivo_desactivacion, e.condicion,
                    e.observaciones_estado, "\n".join(e.notas), e.nota_importacion] for n, e in enumerate(m.equipos, 1)]) + ";",
        "insert into public.equipos (id, serie, categoria, subcategoria_id, marca, modelo, numero_producto, descripcion,\n"
        "  contrato_id, ubicacion_id, ubicacion_detalle, estado, apartado_para, motivo_desactivacion, condicion,\n"
        "  observaciones_estado, notas)\n"
        "select i.id, coalesce(i.serie, ''), i.categoria::public.categoria_equipo, sc.id, i.marca, i.modelo, i.numero_producto,\n"
        "  i.descripcion, ct.id, ub.id, i.ubicacion_detalle, i.estado::public.estado_equipo, i.apartado_para, i.motivo,\n"
        "  i.condicion::public.condicion_equipo, i.observaciones, i.notas\n"
        "from imp_equipos i\n"
        "left join public.subcategorias sc on public.normalizar_texto(sc.nombre) = public.normalizar_texto(i.subcategoria)\n"
        "left join public.contratos ct on ct.operacion = i.operacion\n"
        "left join public.ubicaciones ub on public.normalizar_texto(ub.nombre) = public.normalizar_texto(i.ubicacion)\n"
        "order by i.n;",
        "-- Los datos originales sin columna propia quedan en la nota del movimiento de importación.",
        "update public.movimientos m set nota = i.nota_importacion\n"
        "from imp_equipos i where m.equipo_id = i.id and m.tipo = 'importacion';",
    ]

    filas_asig, filas_renglon = [], []
    for a in asignaciones:
        c = m.colaboradores[a["colaborador"]]
        activa = any(e.estado == "asignado" for e in a["equipos"])
        ubicacion = next((e.ubicacion for e in a["equipos"] if e.ubicacion), "")
        datos = {"nombre": c.nombre, "puesto": c.puestos.most_common(1)[0][0] if c.puestos else None,
                 "unidad_negocio": None, "ubicacion": ubicacion or None}
        filas_asig.append([a["folio"], a["colaborador"], json.dumps(datos, ensure_ascii=False), not activa])
        for e in a["equipos"]:
            destino = "" if e.estado == "asignado" else DESTINO.get(e.estado, "stock")
            filas_renglon.append([a["folio"], m.equipos.index(e) + 1, destino])

    if filas_asig:
        partes += [
            "\n-- Asignaciones históricas (docs/03 §5): fecha real desconocida, sin datos de firma.",
            "create temp table imp_asignaciones (id uuid default gen_random_uuid(), folio text primary key,\n"
            "  colaborador text, datos jsonb, cerrada boolean) on commit drop;",
            "insert into imp_asignaciones (folio, colaborador, datos, cerrada) values\n  " + valores(filas_asig) + ";",
            "insert into public.asignaciones (id, folio, colaborador_id, fecha_entrega, datos_colaborador, observaciones,\n"
            "  es_historica, cerrada_en)\n"
            f"select a.id, a.folio, c.id, {sql(HOY)}::date, a.datos,\n"
            "  'Asignación importada del Excel; la fecha real de entrega se desconoce.', true,\n"
            "  case when a.cerrada then now() end\n"
            "from imp_asignaciones a join imp_colaboradores c on c.clave = a.colaborador;",
            "create temp table imp_renglones (folio text, n int, destino text) on commit drop;",
            "insert into imp_renglones (folio, n, destino) values\n  " + valores(filas_renglon) + ";",
            "-- Equipos ya devueltos de cartas históricas: una devolución histórica por carta.",
            "insert into public.devoluciones (folio, asignacion_id, fecha, observaciones, es_cierre_incidencia)\n"
            f"select 'DEV-' || a.folio, a.id, {sql(HOY)}::date,\n"
            "  'Devolución histórica importada del Excel; la fecha real se desconoce.',\n"
            "  bool_and(r.destino in ('no_localizado', 'desactivado'))\n"
            "from imp_asignaciones a join imp_renglones r on r.folio = a.folio\n"
            "where r.destino is not null group by a.folio, a.id;",
            "insert into public.asignacion_equipos (asignacion_id, equipo_id, devolucion_id, destino_devolucion)\n"
            "select a.id, e.id, d.id, r.destino::public.destino_devolucion\n"
            "from imp_renglones r\n"
            "join imp_asignaciones a on a.folio = r.folio\n"
            "join imp_equipos e on e.n = r.n\n"
            "left join public.devoluciones d on d.asignacion_id = a.id and r.destino is not null;",
        ]

    esperado = "\n".join(
        f"  if (select count(*) from public.{t}) <> {n} then raise exception 'Conciliación: {t} = %, se esperaban {n}', (select count(*) from public.{t}); end if;"
        for t, n in conteos.items()
    )
    partes += [
        "\n-- Conciliación (docs/03 §7): si un conteo no cuadra, se deshace todo.",
        "do $$ begin\n" + esperado + "\nend $$;",
        "commit;",
    ]
    return "\n".join(partes) + "\n"


# ── Mapeos iniciales ──────────────────────────────────────────────────────────────────────────────


def generar_mapeos(consolidado: list[dict], otros: list[dict]):
    """Escribe con las reglas iniciales los mapeos/*.csv que falten. Los existentes ya se revisaron a mano
    y no se tocan: para regenerar uno, bórralo primero."""
    MAPEOS.mkdir(exist_ok=True)
    descripciones = collections.Counter(limpio(f.get("DESCRIPCION")) for f in consolidado + otros)
    lugares = collections.Counter(limpio(f.get("UBICACION")) for f in consolidado + otros)
    if not (MAPEOS / "modelos.csv").exists():
        escribir_csv(
            MAPEOS / "modelos.csv",
            [{"descripcion": d, "equipos": n, **sugerir_modelo(d)} for d, n in sorted(descripciones.items())],
            ["descripcion", "equipos", "marca", "modelo", "numero_producto"],
        )
    if not (MAPEOS / "ubicaciones.csv").exists():
        escribir_csv(
            MAPEOS / "ubicaciones.csv",
            [{"original": u, "equipos": n, **sugerir_ubicacion(u)} for u, n in sorted(lugares.items())],
            ["original", "equipos", "ubicacion", "tipo", "detalle"],
        )
    print("Mapeos escritos en", MAPEOS)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--consolidado", type=Path, default=CONSOLIDADO)
    p.add_argument("--original", type=Path, default=ORIGINAL)
    p.add_argument("--generar-mapeos", action="store_true", help="reescribe mapeos/modelos.csv y ubicaciones.csv con las reglas")
    args = p.parse_args()

    consolidado = hoja_como_dicts(openpyxl.load_workbook(args.consolidado, read_only=True, data_only=True)["Consolidado"])
    consolidado = [f for f in consolidado if clave(f.get("SERIE"))]
    m = Migracion()
    puestos, otros = leer_original(m, openpyxl.load_workbook(args.original, read_only=True, data_only=True))
    otros = [f for f in otros if clave(f.get("SERIE")) or clave(f.get("DESCRIPCION"))]

    if args.generar_mapeos:
        generar_mapeos(consolidado, otros)
        return

    procesar(m, consolidado, puestos, otros)
    asignaciones = asignaciones_de(m)
    activas = [a for a in asignaciones if any(e.estado == "asignado" for e in a["equipos"])]

    conteos = {
        "equipos": len(m.equipos),
        "colaboradores": len(m.colaboradores),
        "asignaciones": len(asignaciones),
        "asignacion_equipos": sum(len(a["equipos"]) for a in asignaciones),
    }
    SALIDA.mkdir(exist_ok=True)
    (SALIDA / "carga.sql").write_text(generar_sql(m, asignaciones, conteos), encoding="utf-8")

    escribir_csv(
        SALIDA / "equipos.csv",
        [{**e.__dict__, "notas": " | ".join(e.notas), "colaborador": m.colaboradores[e.colaborador].nombre if e.colaborador else ""} for e in m.equipos],
        ["serie", "origen", "categoria", "subcategoria", "marca", "modelo", "numero_producto", "descripcion", "operacion",
         "ubicacion", "ubicacion_detalle", "estado", "apartado_para", "motivo_desactivacion", "condicion",
         "observaciones_estado", "colaborador", "folio", "notas"],
    )
    escribir_csv(
        SALIDA / "colaboradores.csv",
        [{"nombre": c.nombre, "tipo": c.tipo, "puesto": c.puestos.most_common(1)[0][0] if c.puestos else "",
          "empresa": c.empresas.most_common(1)[0][0] if c.empresas else "",
          "ubicacion": c.ubicaciones.most_common(1)[0][0] if c.ubicaciones else "",
          "variantes": " / ".join(sorted(c.variantes))} for c in sorted(m.colaboradores.values(), key=lambda c: c.clave)],
        ["nombre", "tipo", "puesto", "empresa", "ubicacion", "variantes"],
    )
    escribir_csv(
        SALIDA / "asignaciones.csv",
        [{"folio": a["folio"], "colaborador": m.colaboradores[a["colaborador"]].nombre,
          "estado": "activa" if a in activas else "cerrada", "equipos": len(a["equipos"]),
          "series": " ".join(e.serie or "(sin serie)" for e in a["equipos"])} for a in asignaciones],
        ["folio", "colaborador", "estado", "equipos", "series"],
    )
    escribir_csv(SALIDA / "incidencias.csv", m.incidencias, ["tipo", "serie", "detalle", "origen"])

    def tabla(titulo, contador):
        filas = "\n".join(f"| {k or '(vacío)'} | {v:,} |" for k, v in sorted(contador.items(), key=lambda x: -x[1]))
        return f"### {titulo}\n\n| Valor | Equipos |\n|---|---|\n{filas}\n"

    empresa_de = lambda e: m.contratos.get(e.operacion, {}).get("empresa", "") or "Sin empresa"
    resumen = [
        f"# Resumen de la migración\n\nGenerado el {dt.datetime.now():%Y-%m-%d %H:%M}.\n",
        f"- Equipos: **{len(m.equipos):,}** (consolidado {sum(e.origen.startswith('Consolidado') for e in m.equipos):,} · fuera de contrato {sum(e.origen.startswith('Otros') for e in m.equipos):,})",
        f"- Colaboradores: **{len(m.colaboradores):,}** ({sum(c.tipo == 'persona' for c in m.colaboradores.values()):,} personas · {sum(c.tipo == 'generico' for c in m.colaboradores.values()):,} genéricos)",
        f"- Asignaciones históricas: **{len(asignaciones):,}** ({len(activas):,} activas · {len(asignaciones) - len(activas):,} cerradas)",
        f"- Ubicaciones: **{len(m.ubicaciones):,}** · Contratos usados: **{len({e.operacion for e in m.equipos if e.operacion}):,}**",
        f"- Incidencias: **{len(m.incidencias):,}** (ver incidencias.csv)\n",
        tabla("Por estado", collections.Counter(e.estado for e in m.equipos)),
        tabla("Por categoría", collections.Counter(e.categoria for e in m.equipos)),
        tabla("Por empresa", collections.Counter(empresa_de(e) for e in m.equipos)),
        tabla("Por condición", collections.Counter(e.condicion or "sin revisar" for e in m.equipos)),
        tabla("Incidencias por tipo", collections.Counter(i["tipo"] for i in m.incidencias)),
    ]
    (SALIDA / "resumen.md").write_text("\n".join(resumen), encoding="utf-8")
    print("\n".join(resumen[:6]))
    print("Salida en", SALIDA)


if __name__ == "__main__":
    sys.exit(main())
