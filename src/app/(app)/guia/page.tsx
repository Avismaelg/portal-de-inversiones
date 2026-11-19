import type { Metadata } from "next";
import Link from "next/link";
import { TrustBadge } from "@/components/trust-badge";
import { TRUST_EXPLANATION } from "@/lib/glossary";

export const metadata: Metadata = { title: "Guía de uso" };

const STEPS: { href: string; title: string; text: string }[] = [
  {
    href: "/dashboard",
    title: "1. Empieza por el Dashboard",
    text: "Reúne lo más importante de la semana: noticias de fuentes primarias ordenadas por prioridad, el pulso macro del Banco Central y las licitaciones que cierran pronto.",
  },
  {
    href: "/macro",
    title: "2. Entiende el contexto con Macro BCRD",
    text: "Inflación, tasas de interés, actividad económica, reservas y tasa de cambio, tal como los publica el Banco Central. Pulsa «¿Qué significa?» junto a cada bloque para ver qué mide y por qué importa.",
  },
  {
    href: "/noticias",
    title: "3. Lee las señales en Noticias",
    text: "Comunicados de instituciones (Indotel, Hacienda, Congreso…) que a menudo llegan antes que la prensa. La etiqueta «Aún sin cobertura de prensa localizada» indica que el tema todavía no aparece en los medios de referencia.",
  },
  {
    href: "/licitaciones",
    title: "4. Busca oportunidades concretas en Licitaciones",
    text: "Compras públicas de la DGCP con monto, modalidad y fecha de cierre. Filtra por modalidad o estado y sigue las que te interesen.",
  },
  {
    href: "/alertas",
    title: "5. Deja que el portal vigile por ti",
    text: "Crea alertas por palabras clave (noticias y licitaciones) o por datos del Banco Central: un valor nuevo, un cambio de dirección o un movimiento del dólar mayor que el umbral que tú elijas.",
  },
];

const PRO: string[] = [
  "Descarga en CSV los indicadores del BCRD y la tasa de cambio guardados (botones en Macro BCRD), con la fecha del dato y la hora en que AviTech lo detectó.",
  "Usa la columna «Detectado por AviTech» y la comparación con la prensa para medir cuánta ventaja de tiempo te da cada fuente.",
  "Combina alertas: por ejemplo, palabras clave de un sector más un umbral del dólar, y revisa la bandeja de Alertas.",
  "En Proyectos, la línea de tiempo muestra cada cambio de estado con el documento oficial que lo respalda; «permiso solicitado» nunca se confunde con «aprobado».",
  "El análisis de impacto con IA (noticias y Macro BCRD) propone sectores, escenarios y cadena de valor. Úsalo como hipótesis a verificar, no como conclusión.",
];

export default function GuiaPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="eyebrow">Guía de uso</p>
        <h1 className="page-title">Cómo sacar ventaja de AviTech</h1>
        <p className="page-lead">
          AviTech reúne información pública que casi nadie sigue —fuentes primarias del Estado dominicano— para que la veas
          antes de que se vuelva popular, con su impacto y su trazabilidad. No usa información privilegiada y no es asesoría de
          inversión: te da datos y contexto para que tomes tus propias decisiones.
        </p>
      </div>

      <section aria-labelledby="ruta" className="card space-y-3">
        <h2 id="ruta" className="text-lg font-semibold">Si estás empezando: la ruta en cinco pasos</h2>
        <ol className="space-y-3">
          {STEPS.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="font-semibold text-primary hover:underline">{s.title}</Link>
              <p className="text-sm">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="etiquetas" className="card space-y-3">
        <h2 id="etiquetas" className="text-lg font-semibold">Cómo leer las etiquetas de confianza</h2>
        <p className="text-sm">Cada dato dice de dónde viene. Antes de actuar, fíjate en la etiqueta:</p>
        <dl className="space-y-3">
          {(["confirmed", "ai_analysis", "inference"] as const).map((k) => (
            <div key={k}>
              <dt><TrustBadge layer={k} /></dt>
              <dd className="mt-1 text-sm">{TRUST_EXPLANATION[k]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="pro" className="card space-y-3">
        <h2 id="pro" className="text-lg font-semibold">Si ya tienes experiencia</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          {PRO.map((p) => <li key={p}>{p}</li>)}
        </ul>
      </section>

      <section aria-labelledby="limites" className="card space-y-2">
        <h2 id="limites" className="text-lg font-semibold">Lo que AviTech no hace</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>No recomienda comprar ni vender ningún valor, ni garantiza rendimientos.</li>
          <li>No inventa datos: si algo no está en la fuente, aparece como «No disponible» o «pendiente».</li>
          <li>Las fuentes se cargan de forma manual asistida mientras se revisan sus términos de uso; la cobertura no es completa.</li>
          <li>Un análisis de IA puede equivocarse: verifica siempre en el documento original (enlace «Ver en la fuente»).</li>
        </ul>
      </section>
    </div>
  );
}
