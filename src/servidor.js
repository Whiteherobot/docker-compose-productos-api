const { crearApp } = require("./app");
const { crearRepositorioPg } = require("./repositorio-pg");

const repo = crearRepositorioPg({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "products_db",
});

const PORT = Number(process.env.PORT || 3000);
const servidor = crearApp(repo).listen(PORT, () => {
  console.log(`Products microservice running on port ${PORT}`);
});

// docker stop manda SIGTERM: se dejan de aceptar conexiones y se cierra el pool.
for (const senal of ["SIGTERM", "SIGINT"]) {
  process.on(senal, () => {
    console.log(`${senal} recibido, cerrando...`);
    servidor.close(() => repo.cerrar().finally(() => process.exit(0)));
  });
}
