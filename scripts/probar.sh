#!/usr/bin/env bash
# Prueba de humo contra los contenedores levantados con docker compose.
#   scripts/probar.sh [http://localhost:3000]
set -uo pipefail
api="${1:-http://localhost:3000}"
fallas=0

revisar() { # descripción, código esperado, método, ruta, [cuerpo]
  local codigo
  codigo=$(curl -s -o /dev/null -w '%{http_code}' -X "$3" "$api$4" -H 'Content-Type: application/json' ${5:+-d "$5"})
  if [[ "$codigo" == "$2" ]]; then echo "ok     $1"; else echo "FALLA  $1 (respondió $codigo)"; fallas=$((fallas + 1)); fi
}

revisar "health con la base arriba" 200 GET /health
revisar "lista los productos iniciales" 200 GET /products
revisar "crea un producto" 201 POST /products '{"name":"Webcam HD","price":45.9}'
revisar "rechaza un precio inválido" 400 POST /products '{"name":"Webcam","price":-1}'
revisar "actualiza" 200 PUT /products/1 '{"name":"Mouse gamer","price":22}'
revisar "elimina" 204 DELETE /products/2
revisar "404 después de eliminar" 404 GET /products/2

echo "$fallas fallas"
exit $((fallas > 0))
