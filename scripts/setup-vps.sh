#!/bin/bash
set -euo pipefail

# ============================================================
# FilterControl - Script de instalación automática en VPS
# Self-hosted Supabase + Nginx + SSL + App React
# ============================================================

echo "🚀 FilterControl - Instalación automática"
echo "==========================================="

# --- Variables (editar antes de ejecutar) ---
DOMAIN="${DOMAIN:-filtercontrol.tudominio.com}"
EMAIL="${CERT_EMAIL:-admin@tudominio.com}"
APP_DIR="/opt/filtercontrol"
SUPABASE_DIR="/opt/supabase"

# --- Colores ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# --- 1. Actualizar sistema ---
log "Actualizando sistema..."
apt update -y && apt upgrade -y

# --- 2. Instalar dependencias ---
log "Instalando dependencias..."
apt install -y curl git nginx certbot python3-certbot-nginx ufw jq openssl

# --- 3. Instalar Docker ---
if ! command -v docker &> /dev/null; then
  log "Instalando Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  log "Docker ya instalado"
fi

if ! docker compose version &> /dev/null; then
  log "Instalando Docker Compose plugin..."
  apt install -y docker-compose-plugin
fi

# --- 4. Instalar Node.js 20 ---
if ! command -v node &> /dev/null; then
  log "Instalando Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
else
  log "Node.js ya instalado: $(node -v)"
fi

# --- 5. Generar secretos ---
log "Generando secretos..."
POSTGRES_PASSWORD=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
ANON_KEY=$(node -e "
const crypto = require('crypto');
const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const payload = Buffer.from(JSON.stringify({
  iss:'supabase',
  ref:'local',
  role:'anon',
  iat:Math.floor(Date.now()/1000),
  exp:Math.floor(Date.now()/1000)+315360000
})).toString('base64url');
const sig = crypto.createHmac('sha256','${JWT_SECRET}').update(header+'.'+payload).digest('base64url');
console.log(header+'.'+payload+'.'+sig);
")
SERVICE_ROLE_KEY=$(node -e "
const crypto = require('crypto');
const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const payload = Buffer.from(JSON.stringify({
  iss:'supabase',
  ref:'local',
  role:'service_role',
  iat:Math.floor(Date.now()/1000),
  exp:Math.floor(Date.now()/1000)+315360000
})).toString('base64url');
const sig = crypto.createHmac('sha256','${JWT_SECRET}').update(header+'.'+payload).digest('base64url');
console.log(header+'.'+payload+'.'+sig);
")
DASHBOARD_PASSWORD=$(openssl rand -hex 16)

# --- 6. Clonar e instalar Supabase ---
log "Instalando Supabase self-hosted..."
mkdir -p "$SUPABASE_DIR"
cd "$SUPABASE_DIR"

if [ ! -d ".git" ]; then
  git clone --depth 1 https://github.com/supabase/supabase .
fi

cd docker

# Configurar .env
cp .env.example .env

sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${POSTGRES_PASSWORD}|" .env
sed -i "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" .env
sed -i "s|ANON_KEY=.*|ANON_KEY=${ANON_KEY}|" .env
sed -i "s|SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}|" .env
sed -i "s|SITE_URL=.*|SITE_URL=https://${DOMAIN}|" .env
sed -i "s|API_EXTERNAL_URL=.*|API_EXTERNAL_URL=https://${DOMAIN}/supabase|" .env
sed -i "s|DASHBOARD_PASSWORD=.*|DASHBOARD_PASSWORD=${DASHBOARD_PASSWORD}|" .env

log "Levantando Supabase con Docker..."
docker compose up -d

# Esperar a que esté listo
echo -n "Esperando a que Supabase arranque"
for i in $(seq 1 30); do
  if curl -s http://localhost:45393/rest/v1/ -H "apikey: ${ANON_KEY}" > /dev/null 2>&1; then
    echo ""
    log "Supabase está listo"
    break
  fi
  echo -n "."
  sleep 5
done

# --- 7. Aplicar migraciones ---
log "Aplicando migraciones de base de datos..."
MIGRATIONS_DIR="${APP_DIR}/repo/supabase/migrations"
if [ -d "$MIGRATIONS_DIR" ]; then
  for f in "$MIGRATIONS_DIR"/*.sql; do
    if [ -f "$f" ]; then
      log "Ejecutando migración: $(basename $f)"
      docker exec -i supabase-db psql -U postgres -d postgres < "$f" || warn "Error en migración $(basename $f)"
    fi
  done
else
  warn "No se encontraron migraciones en $MIGRATIONS_DIR. Clona tu repo primero."
fi

# --- 8. Clonar y construir la app ---
log "Preparando la aplicación React..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"

if [ ! -d "repo" ]; then
  warn "Clona tu repositorio manualmente:"
  warn "  git clone <TU_REPO_URL> ${APP_DIR}/repo"
  warn "  Luego vuelve a ejecutar este script"
  mkdir -p repo
fi

if [ -f "repo/package.json" ]; then
  cd repo
  
  # Crear .env para el build
  cat > .env <<EOF
VITE_SUPABASE_URL=https://${DOMAIN}/supabase
VITE_SUPABASE_PUBLISHABLE_KEY=${ANON_KEY}
EOF

  log "Instalando dependencias..."
  npm install

  log "Construyendo la app..."
  npm run build

  # Copiar build
  rm -rf /var/www/filtercontrol
  cp -r dist /var/www/filtercontrol
  log "App construida y desplegada en /var/www/filtercontrol"
else
  warn "No se encontró package.json. Clona tu repo primero."
  mkdir -p /var/www/filtercontrol
  echo "<h1>FilterControl - Pendiente de deploy</h1>" > /var/www/filtercontrol/index.html
fi

# --- 9. Configurar Nginx ---
log "Configurando Nginx..."
cat > /etc/nginx/sites-available/filtercontrol <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    # App React
    location / {
        root /var/www/filtercontrol;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy a Supabase API
    location /supabase/ {
        proxy_pass http://localhost:45393/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Supabase Studio (dashboard)
    location /studio/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/filtercontrol /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# --- 10. SSL con Certbot ---
log "Configurando SSL..."
certbot --nginx -d "$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive || warn "SSL falló. Verifica que el DNS apunte a este servidor."

# --- 11. Firewall ---
log "Configurando firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# --- 12. Resumen ---
echo ""
echo "==========================================="
echo -e "${GREEN}✅ Instalación completada${NC}"
echo "==========================================="
echo ""
echo "📋 CREDENCIALES (guárdalas en lugar seguro):"
echo "-------------------------------------------"
echo "Dominio:            https://${DOMAIN}"
echo "Supabase Dashboard: https://${DOMAIN}/studio/"
echo "Dashboard Password: ${DASHBOARD_PASSWORD}"
echo ""
echo "Supabase URL:       https://${DOMAIN}/supabase"
echo "Anon Key:           ${ANON_KEY}"
echo "Service Role Key:   ${SERVICE_ROLE_KEY}"
echo "JWT Secret:         ${JWT_SECRET}"
echo "Postgres Password:  ${POSTGRES_PASSWORD}"
echo ""
echo "📁 Rutas:"
echo "  App:       /var/www/filtercontrol"
echo "  Supabase:  ${SUPABASE_DIR}/docker"
echo "  Repo:      ${APP_DIR}/repo"
echo ""
echo "🔧 Próximos pasos:"
echo "  1. Si no clonaste tu repo, hazlo ahora:"
echo "     git clone <TU_REPO> ${APP_DIR}/repo"
echo "     cd ${APP_DIR}/repo && npm install && npm run build"
echo "     cp -r dist/* /var/www/filtercontrol/"
echo ""
echo "  2. Ejecuta las migraciones si no se aplicaron:"
echo "     docker exec -i supabase-db psql -U postgres -d postgres < migration.sql"
echo ""

# Guardar credenciales
CREDS_FILE="/root/.filtercontrol-credentials"
cat > "$CREDS_FILE" <<EOF
# FilterControl - Credenciales generadas $(date)
DOMAIN=${DOMAIN}
SUPABASE_URL=https://${DOMAIN}/supabase
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
JWT_SECRET=${JWT_SECRET}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DASHBOARD_PASSWORD=${DASHBOARD_PASSWORD}
EOF
chmod 600 "$CREDS_FILE"
log "Credenciales guardadas en ${CREDS_FILE}"
