const { Pool } = require("pg");
const { desdeFila } = require("./productos");

/** Repositorio de productos sobre PostgreSQL. */
function crearRepositorioPg(config) {
  const pool = new Pool(config);
  const uno = (resultado) => (resultado.rows[0] ? desdeFila(resultado.rows[0]) : null);

  return {
    async listar() {
      const r = await pool.query("SELECT id, name, price FROM products ORDER BY id");
      return r.rows.map(desdeFila);
    },
    async buscar(id) {
      return uno(await pool.query("SELECT id, name, price FROM products WHERE id = $1", [id]));
    },
    async crear({ name, price }) {
      return uno(await pool.query("INSERT INTO products (name, price) VALUES ($1, $2) RETURNING id, name, price", [name, price]));
    },
    async actualizar(id, { name, price }) {
      return uno(
        await pool.query("UPDATE products SET name = $2, price = $3 WHERE id = $1 RETURNING id, name, price", [id, name, price]),
      );
    },
    async eliminar(id) {
      const r = await pool.query("DELETE FROM products WHERE id = $1", [id]);
      return r.rowCount > 0;
    },
    async disponible() {
      await pool.query("SELECT 1");
    },
    cerrar: () => pool.end(),
  };
}

module.exports = { crearRepositorioPg };
