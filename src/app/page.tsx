import { redirect } from "next/navigation";
import { connection } from "next/server";

/** Redirige en tiempo de petición: así el prerender no intenta validar una página que solo redirige. */
export default async function Home() {
  await connection();
  redirect("/dashboard");
}
