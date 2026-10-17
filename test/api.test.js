const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { crearApp } = require("../src/app");
const { validarProducto, desdeFila } = require("../src/productos");

/** Repositorio en memoria con la misma interfaz que el de Postgres. */
function repoEnMemoria() {
  let filas = [
    { id: 1, name: "Mouse gamer", price: 25.5 },
    { id: 2, name: "Teclado mecánico", price: 60 },
  ];
  let siguiente = 3;
  return {
    caida: false,
    async listar() { return filas; },
    async buscar(id) { return filas.find((p) => p.id === id) ?? null; },
    async crear(p) { const nuevo = { id: siguiente++, ...p }; filas.push(nuevo); return nuevo; },
    async actualizar(id, p) {
      const i = filas.findIndex((x) => x.id === id);
      if (i < 0) return null;
      return (filas[i] = { id, ...p });
    },
    async eliminar(id) { const antes = filas.length; filas = filas.filter((p) => p.id !== id); return filas.length < antes; },
    async disponible() { if (this.caida) throw new Error("sin conexión"); },
  };
}

let servidor, base, repo;

beforeEach(async () => {
  repo = repoEnMemoria();
  servidor = crearApp(repo).listen(0);
  await new Promise((r) => servidor.once("listening", r));
  base = `http://127.0.0.1:${servidor.address().port}`;
});
afterEach(() => new Promise((r) => servidor.close(r)));

const pedir = async (metodo, ruta, cuerpo) => {
  const res = await fetch(base + ruta, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: typeof cuerpo === "string" ? cuerpo : cuerpo && JSON.stringify(cuerpo),
  });
  const texto = await res.text();
  return { status: res.status, headers: res.headers, body: texto ? JSON.parse(texto) : null };
};

test("health informa el estado de la base", async () => {
  assert.equal((await pedir("GET", "/health")).body.database, "ok");
  repo.caida = true;
  const r = await pedir("GET", "/health");
  assert.equal(r.status, 503);
  assert.equal(r.body.database, "unavailable");
});

test("lista y busca por id", async () => {
  assert.equal((await pedir("GET", "/products")).body.length, 2);
  assert.deepEqual((await pedir("GET", "/products/2")).body, { id: 2, name: "Teclado mecánico", price: 60 });
  assert.equal((await pedir("GET", "/products/9")).status, 404);
  assert.equal((await pedir("GET", "/products/abc")).status, 400);
});

test("crea con 201, Location y el nombre limpio", async () => {
  const r = await pedir("POST", "/products", { name: "  Monitor   24 pulgadas ", price: 150 });
  assert.equal(r.status, 201);
  assert.equal(r.headers.get("location"), "/products/3");
  assert.deepEqual(r.body, { id: 3, name: "Monitor 24 pulgadas", price: 150 });
});

test("valida nombre y precio", async () => {
  const r = await pedir("POST", "/products", { name: "x", price: "10" });
  assert.equal(r.status, 400);
  assert.deepEqual(Object.keys(r.body.errors).sort(), ["name", "price"]);
  assert.match((await pedir("POST", "/products", { name: "Cable", price: 1.999 })).body.errors.price, /dos decimales/);
  assert.equal((await pedir("POST", "/products", "{malo")).status, 400);
});

test("actualiza y elimina, con 404 si no existe", async () => {
  assert.equal((await pedir("PUT", "/products/1", { name: "Mouse inalámbrico", price: 29.9 })).body.price, 29.9);
  assert.equal((await pedir("PUT", "/products/9", { name: "Nada", price: 1 })).status, 404);
  assert.equal((await pedir("DELETE", "/products/1")).status, 204);
  assert.equal((await pedir("DELETE", "/products/1")).status, 404);
});

test("rutas desconocidas y errores internos responden JSON", async () => {
  assert.equal((await pedir("GET", "/nada")).status, 404);
  repo.listar = async () => { throw new Error("se cayó la base"); };
  const original = console.error;
  console.error = () => {};
  const r = await pedir("GET", "/products");
  console.error = original;
  assert.equal(r.status, 500);
  assert.equal(r.body.error, "Error interno del servidor.");
});

test("validarProducto y desdeFila", () => {
  assert.deepEqual(validarProducto({ name: "Mouse", price: 0.1 + 0.2 }).errores, {});
  assert.ok(validarProducto({ name: "Mouse", price: 0 }).errores.price);
  assert.ok(validarProducto(null).errores.name);
  assert.deepEqual(desdeFila({ id: 1, name: "a", price: "25.50" }), { id: 1, name: "a", price: 25.5 });
});
