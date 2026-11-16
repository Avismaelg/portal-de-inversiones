/** Solo rutas internas: evita redirecciones abiertas. */
export function safeNext(value: string | null): string {
  return value && /^\/[a-z0-9/_-]*$/i.test(value) && !value.startsWith("//") ? value : "/dashboard";
}
