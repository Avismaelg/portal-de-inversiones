import { redirect } from "next/navigation";

/**
 * Respaldo: la redirección de `/` a `/dashboard` la hace `next.config.ts` (`redirects`) antes de renderizar,
 * así el prerender no valida una página que solo redirige.
 */
export default function Home() {
  redirect("/dashboard");
}
