# docker-compose-productos-api

[![CI](https://github.com/Whiteherobot/docker-compose-productos-api/actions/workflows/ci.yml/badge.svg)](https://github.com/Whiteherobot/docker-compose-productos-api/actions/workflows/ci.yml)

Microservicio de productos en Node.js (Express) con PostgreSQL, levantado con
Docker Compose. Práctica de Sistemas Distribuidos (noviembre de 2025).

## Levantar

```bash
docker compose up --build
```

La base arranca con tres productos (`db-init.sql`) y la API espera a que
Postgres acepte conexiones antes de iniciar. Queda en `http://localhost:3000`.
Si los puertos 3000 o 5432 están ocupados:

```bash
API_PORT=3310 DB_PORT=55432 docker compose up --build
```

Para detener: `docker compose down` (con `-v` se borra también la base).

## Endpoints

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/health` | Estado del servicio y de la base (503 si la base no responde). |
| GET | `/products` | Todos los productos. |
| GET | `/products/{id}` | Un producto, o 404. |
| POST | `/products` | Crea; responde 201 con `Location`. |
| PUT | `/products/{id}` | Reemplaza nombre y precio. |
| DELETE | `/products/{id}` | Borra (204). |

```bash
curl -X POST http://localhost:3000/products \
  -H 'Content-Type: application/json' \
  -d '{"name": "Webcam HD", "price": 45.9}'
```

El nombre va de 2 a 100 caracteres y el precio es un número mayor que 0 con
hasta dos decimales. Los errores salen en JSON: `400 {"errors": {"price": "..."}}`,
`404 {"error": "No existe el producto 9."}`.

Para ver la base desde la terminal:

```bash
docker compose exec products-db psql -U postgres -d products_db -c 'SELECT * FROM products;'
```

## Pruebas

```bash
npm install
npm test                 # la API con un repositorio en memoria
scripts/probar.sh        # prueba de humo contra los contenedores levantados
```

La CI corre las dos: las pruebas unitarias y, después, `docker compose up --wait`
seguido de la prueba de humo.

## Estructura

```
src/
  servidor.js         arranque, conexión a Postgres y cierre con SIGTERM
  app.js              rutas de Express (recibe el repositorio)
  repositorio-pg.js   consultas a PostgreSQL
  productos.js        validación
db-init.sql           tabla y datos iniciales
Dockerfile            imagen de la API (npm ci, usuario node, healthcheck)
docker-compose.yml    API + PostgreSQL 16 con healthcheck
```

## De dónde sale

La práctica levantaba la API y la base con Compose y solo tenía
`GET /products`. En 2026 se completó el CRUD con validación, se corrigió que la
API arrancara antes de que Postgres aceptara conexiones y que el precio saliera
como texto, la imagen pasó a instalar con `npm ci` y a correr sin privilegios, y
se agregaron pruebas y CI. El repo se llamaba `PracticaDockerComposeMicroserv`.

Licencia MIT.
