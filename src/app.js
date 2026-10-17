const express = require("express");
const { validarProducto } = require("./productos");

/** Crea la app de Express sobre un repositorio (Postgres en producción, memoria en las pruebas). */
function crearApp(repo) {
  const app = express();
  app.use(express.json());

  // Los errores de las rutas async llegan al manejador del final.
  const ruta = (fn) => (req, res, next) => fn(req, res).catch(next);

  const leerId = (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ error: "El id debe ser un entero positivo." });
      return null;
    }
    return id;
  };

  app.get(
    "/health",
    ruta(async (req, res) => {
      try {
        await repo.disponible();
        res.json({ status: "ok", service: "products-microservice", database: "ok" });
      } catch {
        res.status(503).json({ status: "degraded", service: "products-microservice", database: "unavailable" });
      }
    }),
  );

  app.get("/products", ruta(async (req, res) => res.json(await repo.listar())));

  app.get(
    "/products/:id",
    ruta(async (req, res) => {
      const id = leerId(req, res);
      if (id === null) return;
      const producto = await repo.buscar(id);
      if (!producto) return res.status(404).json({ error: `No existe el producto ${id}.` });
      res.json(producto);
    }),
  );

  app.post(
    "/products",
    ruta(async (req, res) => {
      const { producto, errores } = validarProducto(req.body);
      if (Object.keys(errores).length) return res.status(400).json({ errors: errores });
      const creado = await repo.crear(producto);
      res.status(201).location(`/products/${creado.id}`).json(creado);
    }),
  );

  app.put(
    "/products/:id",
    ruta(async (req, res) => {
      const id = leerId(req, res);
      if (id === null) return;
      const { producto, errores } = validarProducto(req.body);
      if (Object.keys(errores).length) return res.status(400).json({ errors: errores });
      const actualizado = await repo.actualizar(id, producto);
      if (!actualizado) return res.status(404).json({ error: `No existe el producto ${id}.` });
      res.json(actualizado);
    }),
  );

  app.delete(
    "/products/:id",
    ruta(async (req, res) => {
      const id = leerId(req, res);
      if (id === null) return;
      if (!(await repo.eliminar(id))) return res.status(404).json({ error: `No existe el producto ${id}.` });
      res.status(204).end();
    }),
  );

  app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada." }));

  // JSON mal formado y errores inesperados (por ejemplo, la base caída).
  app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: "El cuerpo no es un JSON válido." });
    console.error("Error en", req.method, req.path, err);
    res.status(500).json({ error: "Error interno del servidor." });
  });

  return app;
}

module.exports = { crearApp };
