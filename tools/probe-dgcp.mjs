// Llamada única de prueba a la API de DGCP (T-SRC-01). Solo lectura, 1 solicitud.
// Uso: node --env-file=.env.local tools/probe-dgcp.mjs
// Requiere INGEST_CONTACT en .env.local (contacto institucional para el User-Agent).
const contact = process.env.INGEST_CONTACT?.trim();
if (!contact) {
  console.error("Falta INGEST_CONTACT en .env.local");
  process.exit(1);
}

const url = "https://datosabiertos.dgcp.gob.do/api-dgcp/v1/procesos?limit=5";
const res = await fetch(url, {
  headers: { "User-Agent": `AviTech-Ingest/0.1 (+${contact})`, Accept: "application/json" },
  redirect: "manual",
});

console.log("HTTP", res.status, res.headers.get("content-type"));
for (const h of ["x-ratelimit-limit", "x-ratelimit-remaining", "retry-after", "etag", "last-modified"]) {
  if (res.headers.get(h)) console.log(h + ":", res.headers.get(h));
}
const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  console.log("Cuerpo no JSON:", text.slice(0, 300));
  process.exit(0);
}
const shape = (v, depth = 0) =>
  Array.isArray(v)
    ? `array(${v.length})` + (v.length && depth < 2 ? " de " + shape(v[0], depth + 1) : "")
    : v && typeof v === "object"
      ? "{" + Object.entries(v).map(([k, x]) => `${k}: ${depth < 2 ? shape(x, depth + 1) : typeof x}`).join(", ") + "}"
      : typeof v;
console.log("Forma:", shape(body).slice(0, 2500));
