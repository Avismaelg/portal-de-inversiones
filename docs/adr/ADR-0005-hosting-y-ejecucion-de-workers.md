# ADR-0005 — Hosting del web y ejecución de workers (ABIERTO)

| Campo | Valor |
|---|---|
| Estado | **ABIERTO — requiere decisión del usuario.** No hay recomendación firme: faltan datos |
| Fecha | 2026-11-15 |
| Autor | Ventana A |
| Reversibilidad | **Moderada**: depende de cuánto se use de funciones propias de la plataforma |
| Requisitos | PM §7: GitHub, GitHub Actions, "Cloudflare, cuando resulte adecuado", servicios administrados |

## Por qué importa

Condiciona: rate limiting (en serverless el contador en memoria no sirve), gestión de secretos, límites de tiempo/memoria para el bulk de DGCP, egreso de red restringido (anti-SSRF), costos y la ejecución de workers Python (ADR-0002). **Nada de esto se ha verificado contra la documentación de ningún proveedor**; la tabla compara capacidades a comprobar, no hechos.

## Opciones

| Opción | Web | Workers | A comprobar |
|---|---|---|---|
| 1. Plataforma serverless para el web + GitHub Actions programado para workers | Plataforma administrada | Jobs de CI con límite de tiempo | Límite de duración del job; secretos; memoria para el bulk; si el cron mínimo cubre la frescura exigida (RNF-15) |
| 2. Web en plataforma + contenedor de larga duración (VPS o servicio de contenedores) para workers | Administrada | Proceso propio con *polling* de la cola | Costo fijo; operación y parches; Docker no está en la máquina local (B-006) |
| 3. Todo en una VM/contenedores propios | Propio | Propio | Mayor trabajo operativo |
| 4. Cloudflare Pages/Workers para el web + workers fuera | Borde | Fuera | Compatibilidad de Next 16 con el runtime elegido `[VERIFICAR]` |

## Criterios de decisión sugeridos

1. ¿Soporta procesar un archivo de ≥ 500 MB en streaming sin exceder límites? (T-ING-03)
2. ¿Permite controlar el egreso de red y mantener secretos por componente?
3. ¿Presupuesto mensual? `[PENDIENTE]`
4. ¿Quién opera la infraestructura?

## Recomendación provisional

Sin datos, la opción 2 es la más probable para workers de larga duración, pero **no la recomiendo todavía**: hace falta medir primero el bulk real y confirmar el presupuesto. Decidir antes de T-INF-08 (entornos).
