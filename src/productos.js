// Validación de los productos que llegan por la API.

const MAXIMO = 99999999.99; // NUMERIC(10,2)

/** Devuelve { producto, errores }; errores es {} si los datos son válidos. */
function validarProducto(datos) {
  const errores = {};
  const name = typeof datos?.name === "string" ? datos.name.trim().replace(/\s+/g, " ") : "";
  const price = datos?.price;

  if (name.length < 2 || name.length > 100) {
    errores.name = "El nombre debe tener entre 2 y 100 caracteres.";
  }
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0 || price > MAXIMO) {
    errores.price = "El precio debe ser un número mayor que 0.";
  } else if (Math.abs(price * 100 - Math.round(price * 100)) > 1e-6) {
    errores.price = "El precio admite hasta dos decimales.";
  }
  return { producto: { name, price }, errores };
}

/** Postgres devuelve NUMERIC como texto para no perder precisión; la API lo entrega como número. */
function desdeFila(fila) {
  return { id: fila.id, name: fila.name, price: Number(fila.price) };
}

module.exports = { validarProducto, desdeFila };
