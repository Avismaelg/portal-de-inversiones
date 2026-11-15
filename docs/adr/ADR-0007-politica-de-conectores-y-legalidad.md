# ADR-0007 — Política de conectores: ninguna fuente se automatiza sin verificación legal y técnica previa

| Campo | Valor |
|---|---|
| Estado | **PROPUESTO** |
| Fecha | 2026-11-15 |
| Autor | Ventana A |
| Reversibilidad | **Reversible** técnicamente (se desactiva la fuente); **irreversible en lo reputacional/legal** si se accede indebidamente |
| Requisitos | PM §6 ("No evadir autenticación, CAPTCHAs, controles de acceso ni restricciones de licencia"; "si una fuente no permite extracción automatizada, buscar alternativas legales o establecer un procedimiento manual"); T-21 de SEGURIDAD |
| Documentos | `docs/fuentes/FUENTES-RD.md`, `docs/seguridad/SEGURIDAD-Y-CUMPLIMIENTO.md` §5 y §7 |

## Contexto

Verificación del 2026-11-15: de 9 fuentes consultadas, solo DGCP (vía registro OCP, ODbL) y Crédito Público tienen evidencia suficiente; SIMV, BVRD, CNE, Hacienda y `datos.gob.do` respondieron 403/473 al lector; BVRD publica `ai-train=no` y bloquea crawlers de IA en su `robots.txt`; ninguna fuente leída declara una licencia de reutilización explícita salvo DGCP/ODbL.

## Decisión

1. **Estado legal en base de datos:** `sources.legal_status` (`pending_review` por defecto) y `automation_allowed` (falso por defecto). Un `CHECK` impide `is_active = true` en una fuente automática sin `automation_allowed` y `legal_status = 'verified_ok'`.
2. **Orden obligatorio** antes de activar un conector: (a) leer documentación y términos; (b) leer `robots.txt`; (c) decidir vía (API/bulk/RSS/HTML/manual); (d) opinión legal si hay duda (`REQUIERE ABOGADO`); (e) activar con límites de tasa; (f) monitorear.
3. **Nunca** evadir captcha, autenticación, WAF, límites de tasa ni restricciones de licencia. Un 403/473 se registra como hallazgo y se escala, no se "arregla" cambiando de identidad.
4. **Procedimiento manual de primera clase:** carga manual de documentos con actor, hash y evidencia (mismo pipeline).
5. **Cliente HTTP honesto y seguro:** `User-Agent` identificable, lista cerrada de hosts, DNS validado, sin seguir redirecciones a hosts no listados (ver SEGURIDAD §5).
6. **Datos con restricción explícita de IA** (p. ej. BVRD) no se envían a un LLM ni se usan en evaluaciones hasta aclarar la licencia.

## Alternativas

| Alternativa | Motivo |
|---|---|
| Scraping amplio "hasta que algo funcione" | Riesgo legal y de bloqueo; contradice el PM |
| Comprar datos a un agregador | Costos y dependencia; podría evaluarse después `[PENDIENTE]` |
| Solo fuentes con API | Dejaría sin cobertura los módulos B/E; se pierde valor del producto |

## Consecuencias

Menor cobertura automática inicial y más trabajo manual; a cambio, riesgo legal controlado y datos con procedencia defendible. El backlog refleja esto (T-SRC-*, T-ING-06).

## Condiciones de revisión

Tras la opinión del abogado (T-PRE-05) o si una institución ofrece acceso formal (API o acuerdo).
