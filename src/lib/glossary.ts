/**
 * Explicaciones educativas para inversores principiantes: qué mide un indicador y por qué importa.
 * Son definiciones económicas generales, no recomendaciones. Cualquier cifra concreta cita su fuente.
 */

export interface Explanation {
  title: string;
  what: string;
  why: string;
  /** Cómo leer un cambio (sube/baja), sin predecir. */
  read?: string;
  source?: string;
}

const E: Record<string, Explanation> = {
  inflacion: {
    title: "Inflación",
    what: "Cuánto subieron los precios de la canasta del índice de precios al consumidor (IPC). «Interanual» compara con el mismo mes del año anterior; «acumulada», desde diciembre del año pasado; «mensual», con el mes anterior.",
    why: "La inflación reduce el poder de compra del dinero. Si un instrumento rinde menos que la inflación, su rendimiento real es negativo: al final compras menos con lo que recibes.",
    read: "Compárala con la meta del BCRD. Por encima de la meta suele aumentar la presión para que el Banco Central endurezca su política; por debajo, lo contrario.",
    source: "Meta de inflación del BCRD: 4,0 % ± 1,0 % (bancentral.gov.do, consultado el 18-nov-2026).",
  },
  subyacente: {
    title: "Inflación subyacente",
    what: "Inflación que excluye los componentes de precios más volátiles, para ver la tendencia de fondo.",
    why: "Ayuda a distinguir un salto pasajero (por ejemplo, de combustibles o alimentos) de una subida de precios más persistente.",
    read: "Si la general sube pero la subyacente no, el aumento puede deberse a factores temporales.",
  },
  interbancaria: {
    title: "Tasa interbancaria",
    what: "Tasa a la que los bancos se prestan dinero entre ellos a plazos muy cortos.",
    why: "Refleja cuánta liquidez hay en el sistema. Suele moverse antes que las tasas que ven los clientes.",
  },
  activa: {
    title: "Tasa activa",
    what: "Tasa promedio que cobran los bancos múltiples por sus préstamos (promedio ponderado).",
    why: "Es el costo del crédito para empresas y personas. Afecta la inversión, la construcción y el consumo financiado.",
  },
  pasiva: {
    title: "Tasa pasiva",
    what: "Tasa promedio que pagan los bancos múltiples por los depósitos (promedio ponderado).",
    why: "Es una referencia de lo que rinde el ahorro bancario. Compárala con la inflación para saber si el ahorro gana o pierde poder de compra.",
    read: "La diferencia entre la tasa activa y la pasiva es el margen de intermediación de la banca.",
  },
  prestamos: {
    title: "Préstamos al sector privado",
    what: "Cuánto creció el crédito bancario a empresas y hogares frente al mismo mes del año anterior.",
    why: "Más crédito suele acompañar más actividad (consumo, vivienda, inversión); un crédito que se frena puede anticipar menos dinamismo.",
  },
  imae: {
    title: "IMAE",
    what: "Indicador Mensual de Actividad Económica: una medición mensual de cómo crece la economía, antes de que salga el PIB.",
    why: "Es la señal más temprana del ritmo de la economía; los resultados trimestrales y anuales del PIB llegan después.",
  },
  pib: {
    title: "Producto interno bruto (PIB)",
    what: "Crecimiento del valor de todo lo que produce la economía en el periodo indicado.",
    why: "Da el contexto general: en una economía que crece hay, en promedio, más demanda para empresas y proyectos.",
  },
  reservas: {
    title: "Reservas internacionales",
    what: "Activos en moneda extranjera del Banco Central. Las brutas son el total; las netas descuentan ciertas obligaciones.",
    why: "Respaldan la estabilidad de la tasa de cambio y la capacidad del país de cumplir pagos en el exterior.",
  },
  cuenta: {
    title: "Cuenta corriente",
    what: "Saldo de lo que el país vende y compra al exterior en bienes y servicios, más rentas y remesas, como porcentaje del PIB.",
    why: "Un déficit (número negativo) significa que el país necesita financiamiento o inversión del exterior para cubrir la diferencia.",
  },
  cambio: {
    title: "Tasa de cambio de referencia",
    what: "Cuántos pesos dominicanos cuesta un dólar estadounidense según la tasa de referencia del BCRD («compra» y «venta»).",
    why: "Afecta a importadores, exportadores, turismo, deudas en dólares y a cualquier inversión que compare pesos con dólares.",
    read: "Si sube, el peso se deprecia (hacen falta más pesos por dólar); si baja, el peso se aprecia.",
  },
  ipc: {
    title: "Índice de precios al consumidor (IPC)",
    what: "Índice del nivel de precios de una canasta de bienes y servicios. La inflación se calcula comparando este índice en dos fechas.",
    why: "Permite ver la trayectoria de los precios mes a mes.",
  },
};

/** Explicación para una serie macro guardada (clave «Grupo › … › Indicador»). */
export function explainSeries(seriesKey: string): Explanation | null {
  const k = seriesKey.toLowerCase();
  if (k.startsWith("ipc ›")) return E.ipc;
  if (k.includes("subyacente")) return E.subyacente;
  if (k.startsWith("inflación ›")) return E.inflacion;
  if (k.includes("interb")) return E.interbancaria;
  if (k.includes("tasas de interés › activa")) return E.activa;
  if (k.includes("tasas de interés › pasiva")) return E.pasiva;
  if (k.includes("prestamos privados")) return E.prestamos;
  if (k.includes("imaes")) return E.imae;
  if (k.includes("pib")) return E.pib;
  if (k.includes("reservas")) return E.reservas;
  if (k.includes("cuentas corrientes")) return E.cuenta;
  if (k.includes("tasas de cambio")) return E.cambio;
  return null;
}

export const FX_EXPLANATION = E.cambio;

/** Capas de confianza que se ven en todo el portal. */
export const TRUST_EXPLANATION: Record<string, string> = {
  confirmed: "Dato tal como lo publica la fuente oficial (y, si aplica, revisado por una persona). No incluye interpretación.",
  ai_analysis: "Interpretación generada por IA a partir de datos o textos de la fuente. Útil para orientarse; no es un hecho verificado.",
  inference: "Hipótesis o registro aún sin verificar por completo (por ejemplo, un borrador). Trátalo como pista a investigar.",
};
