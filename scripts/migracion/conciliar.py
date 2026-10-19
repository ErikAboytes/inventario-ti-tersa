"""Etapa 4 · Conciliación de la carga (docs/03 §7, paso 4).

Compara la BD enlazada (`supabase db query --linked`) contra lo que generó extraer.py:

1. conteos por estado, categoría y empresa;
2. reglas de integridad: cada equipo «asignado» tiene exactamente una asignación activa y viceversa;
3. muestreo de 20 series al azar contra el Excel (estado, ubicación, colaborador);
4. ningún valor de la columna LogMeIn aparece en la carga (se leen solo para compararlos; no se imprimen).

Uso:
    python scripts/migracion/conciliar.py [--muestra 20] [--semilla N]
"""

from __future__ import annotations

import argparse
import collections
import csv
import json
import random
import shutil
import subprocess
import sys

import openpyxl

from extraer import CONSOLIDADO, ORIGINAL, SALIDA, clave, hoja_como_dicts, limpio


def consulta(sql: str) -> list[dict]:
    # shutil.which: en Windows el CLI puede ser supabase.exe o supabase.cmd.
    supabase = shutil.which("supabase") or sys.exit("No se encontró el CLI de Supabase en el PATH.")
    salida = subprocess.run(
        [supabase, "db", "query", "--linked", sql],
        capture_output=True, text=True, encoding="utf-8", check=True,
    ).stdout
    return json.loads(salida[salida.index("{"):])["rows"]


def comparar(titulo: str, esperado: collections.Counter, real: dict) -> bool:
    ok = True
    print(f"\n{titulo}")
    for k in sorted(set(esperado) | set(real)):
        e, r = esperado.get(k, 0), real.get(k, 0)
        marca = "✓" if e == r else "✗"
        ok &= e == r
        print(f"  {marca} {k or '(vacío)':<16} Excel {e:>5} · BD {r:>5}")
    return ok


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--muestra", type=int, default=20)
    p.add_argument("--semilla", type=int, default=None)
    args = p.parse_args()

    with (SALIDA / "equipos.csv").open(encoding="utf-8-sig") as f:
        esperados = list(csv.DictReader(f))
    ok = True

    # 1. Conteos.
    filas = consulta(
        "select coalesce(e.estado::text,'') estado, e.categoria::text categoria, coalesce(em.clave,'Sin empresa') empresa, "
        "count(*)::int n from equipos e left join empresas em on em.id = e.empresa_id group by 1,2,3"
    )
    for campo in ("estado", "categoria"):
        real = collections.Counter()
        for f in filas:
            real[f[campo]] += f["n"]
        ok &= comparar(f"Por {campo}", collections.Counter(e[campo] for e in esperados), real)
    real = collections.Counter()
    for f in filas:
        real[f["empresa"]] += f["n"]
    contratos = {}
    for f in hoja_como_dicts(openpyxl.load_workbook(ORIGINAL, read_only=True, data_only=True)["CONTRATOS"]):
        contratos[clave(f.get("OPERACION"))] = clave(f.get("EMPRESA"))
    ok &= comparar("Por empresa", collections.Counter(contratos.get(e["operacion"], "Sin empresa") or "Sin empresa" for e in esperados), real)

    # 2. Integridad de asignaciones.
    reglas = consulta(
        "select "
        "(select count(*) from equipos e where e.estado = 'asignado' and not exists "
        "  (select 1 from asignacion_equipos ae where ae.equipo_id = e.id and ae.devolucion_id is null))::int asignados_sin_asignacion, "
        "(select count(*) from asignacion_equipos ae join equipos e on e.id = ae.equipo_id "
        "  where ae.devolucion_id is null and e.estado <> 'asignado')::int asignaciones_de_no_asignados, "
        "(select count(*) from asignaciones a where a.cerrada_en is null and not exists "
        "  (select 1 from asignacion_equipos ae where ae.asignacion_id = a.id and ae.devolucion_id is null))::int abiertas_sin_equipos, "
        "(select count(*) from equipos where estado = 'apartado' and nullif(btrim(apartado_para), '') is null)::int apartados_sin_etiqueta"
    )[0]
    print("\nIntegridad")
    for k, v in reglas.items():
        print(f"  {'✓' if v == 0 else '✗'} {k}: {v}")
        ok &= v == 0

    # 3. Muestreo contra el Excel.
    consolidado = {
        clave(f.get("SERIE")).replace(" ", ""): f
        for f in hoja_como_dicts(openpyxl.load_workbook(CONSOLIDADO, read_only=True, data_only=True)["Consolidado"])
        if clave(f.get("SERIE"))
    }
    azar = random.Random(args.semilla)
    series = azar.sample(sorted(consolidado), args.muestra)
    lista = ",".join("'" + s.replace("'", "''") + "'" for s in series)
    bd = {f["serie"]: f for f in consulta(
        "select v.serie, v.estado::text estado, coalesce(v.ubicacion,'') ubicacion, coalesce(v.colaborador_nombre,'') colaborador, "
        f"coalesce(v.contrato_operacion,'') operacion from v_equipos v where v.serie in ({lista})"
    )}
    por_serie = {e["serie"]: e for e in esperados}
    print(f"\nMuestreo de {len(series)} series (Excel → BD)")
    for s in series:
        x, b, esp = consolidado[s], bd.get(s), por_serie[s]
        if not b:
            print(f"  ✗ {s}: no está en la BD")
            ok = False
            continue
        coincide = (
            b["estado"] == esp["estado"]
            and b["ubicacion"] == esp["ubicacion"]
            and b["operacion"] == clave(x.get("OPERACION"))
            and (esp["estado"] != "asignado" or clave(b["colaborador"]).startswith(clave(esp["colaborador"]).split(" · ")[0]))
        )
        ok &= coincide
        print(
            f"  {'✓' if coincide else '✗'} {s:<12} {limpio(x.get('ESTATUS')) or '(vacío)':<14} → {b['estado']:<13} "
            f"{limpio(x.get('UBICACION'))[:24]:<24} → {b['ubicacion'][:26]}"
        )

    # 4. LogMeIn: se leen solo aquí para verificar que no se filtró ninguno a la carga.
    ws = openpyxl.load_workbook(CONSOLIDADO, read_only=True, data_only=True)["Consolidado"]
    filas = ws.iter_rows(values_only=True)
    i = [clave(c) for c in next(filas)].index("LOGMEIN")
    secretos = {limpio(f[i]) for f in filas if limpio(f[i]) and len(limpio(f[i])) >= 4}
    # Algunas celdas de LogMeIn traen por error un comentario o el puesto, que sí se cargan desde sus propias
    # columnas (consolidado y PUESTO del original). Solo es fuga lo que no venga de esas columnas.
    legitimos = set()
    for d in hoja_como_dicts(openpyxl.load_workbook(CONSOLIDADO, read_only=True, data_only=True)["Consolidado"]):
        legitimos.update(limpio(v) for k, v in d.items() if k != "_fila")
    original = openpyxl.load_workbook(ORIGINAL, read_only=True, data_only=True)
    for hoja in ("TERSA", "RENAULT", "CONTROL"):
        legitimos.update(limpio(d.get("PUESTO")) for d in hoja_como_dicts(original[hoja]))
    carga = (SALIDA / "carga.sql").read_text(encoding="utf-8")
    en_carga = {s for s in secretos if s in carga}
    fugas = len(en_carga - legitimos)
    print(
        f"\nLogMeIn\n  {'✓' if fugas == 0 else '✗'} {len(secretos)} valores revisados: {len(en_carga)} aparecen en "
        f"carga.sql porque también están en Comentarios o Puesto; {fugas} fugas"
    )
    ok &= fugas == 0

    print("\nResultado:", "CONCILIADO" if ok else "CON DIFERENCIAS")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
