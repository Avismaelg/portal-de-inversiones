import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // `/` solo redirige: se resuelve antes de renderizar (el proxy de sesión se aplica luego a /dashboard).
  async redirects() {
    return [{ source: "/", destination: "/dashboard", permanent: false }];
  },
  turbopack: {
    // node_modules vive fuera del proyecto (junction a C:\Users\User\.portal-deps
    // para no sincronizar 400 MB en OneDrive). Turbopack necesita un root que
    // contenga tanto el proyecto como ese directorio.
    // Solo en la máquina Windows del propietario (junction fuera de OneDrive). En CI (Linux) no se fija.
    ...(process.platform === "win32" ? { root: "C:/Users/User" } : {}),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
