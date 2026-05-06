#!/bin/bash
# ============================================================
# FilterControl - Despliegue rápido todo-en-uno
# Uso: bash deploy.sh
# ============================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo ""
echo "============================================"
echo "  🚀 FilterControl - Despliegue automático"
echo "============================================"
echo ""

# --- 1. Verificar Docker ---
command -v docker >/dev/null 2>&1 || err "Docker no está instalado. Instálalo desde https://docs.docker.com/get-docker/"
docker compose version >/dev/null 2>&1 || err "Docker Compose v2 no está disponible."
log "Docker detectado: $(docker --version)"

# --- 2. Verificar Node (para generar claves) ---
command -v node >/dev/null 2>&1 || err "Node.js no está instalado. Instálalo desde https://nodejs.org/"
log "Node detectado: $(node -v)"

# --- 3. Pedir dominio o IP ---
DEFAULT_DOMAIN=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
read -rp "👉 Dominio o IP del servidor [${DEFAULT_DOMAIN}]: " DOMAIN
DOMAIN=${DOMAIN:-$DEFAULT_DOMAIN}

# --- 4. Generar secretos ---
log "Generando claves seguras..."
POSTGRES_PASSWORD=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)

KEYS=$(JWT_SECRET=$JWT_SECRET node scripts/generate-keys.cjs)
ANON_KEY=$(echo "$KEYS" | grep ANON_KEY | cut -d= -f2)
SERVICE_ROLE_KEY=$(echo "$KEYS" | grep SERVICE_ROLE_KEY | cut -d= -f2)

# --- 5. Crear .env ---
log "Creando docker/.env..."
mkdir -p docker
cat > docker/.env <<EOF
DOMAIN=${DOMAIN}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_SECRET=${JWT_SECRET}
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_ADMIN_EMAIL=admin@${DOMAIN}
EOF
chmod 600 docker/.env

# --- 6. Levantar el stack ---
log "Construyendo y levantando contenedores (puede tardar 3-5 min la primera vez)..."
docker compose --env-file docker/.env up -d --build

# --- 7. Esperar a que la DB esté lista ---
echo -n "Esperando a Postgres"
for i in $(seq 1 30); do
  if docker compose exec -T db pg_isready -U postgres >/dev/null 2>&1; then
    echo ""; log "Postgres listo"; break
  fi
  echo -n "."; sleep 2
done

# --- 8. Aplicar migraciones ---
if [ -d "supabase/migrations" ] && [ "$(ls -A supabase/migrations/*.sql 2>/dev/null)" ]; then
  log "Aplicando migraciones de la base de datos..."
  for f in supabase/migrations/*.sql; do
    log "  → $(basename "$f")"
    docker compose exec -T db psql -U postgres -d postgres < "$f" >/dev/null 2>&1 || warn "Error en $(basename "$f") (puede ser normal si ya está aplicada)"
  done
else
  warn "No se encontraron migraciones en supabase/migrations/"
fi

# --- 9. Guardar credenciales ---
CREDS_FILE="./CREDENTIALS.txt"
cat > "$CREDS_FILE" <<EOF
# FilterControl - Credenciales generadas $(date)
# ⚠️  GUARDA ESTE ARCHIVO EN LUGAR SEGURO Y BÓRRALO DEL SERVIDOR

App URL:            http://${DOMAIN}:45394
Supabase Studio:    http://${DOMAIN}:45395
Supabase API:       http://${DOMAIN}:45393

ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
JWT_SECRET=${JWT_SECRET}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
EOF
chmod 600 "$CREDS_FILE"

# --- 10. Resumen final ---
echo ""
echo "============================================"
echo -e "${GREEN}  ✅ Despliegue completado${NC}"
echo "============================================"
echo ""
echo "🌐 App:              http://${DOMAIN}:45394"
echo "🛠️  Supabase Studio:  http://${DOMAIN}:45395"
echo "🔌 Supabase API:     http://${DOMAIN}:45393"
echo ""
echo "📄 Credenciales guardadas en: ${CREDS_FILE}"
echo ""
echo "📋 Comandos útiles:"
echo "   Ver logs:        docker compose logs -f"
echo "   Parar:           docker compose --env-file docker/.env down"
echo "   Reiniciar:       docker compose --env-file docker/.env restart"
echo "   Estado:          docker compose ps"
echo ""
