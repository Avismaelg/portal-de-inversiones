// Hook mínimo para ejecutar con Node (strip-types) módulos TS del proyecto que importan sin extensión.
// Uso: node --import ./tools/ts-resolve.mjs tools/<script>.ts
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (err) {
      if (err?.code !== "ERR_MODULE_NOT_FOUND" || !/^\.{1,2}\//.test(specifier)) throw err;
      return next(`${specifier}.ts`, context);
    }
  },
});
