#!/usr/bin/env bash
# ============================================================
# FilterControl - Instalador todo-en-uno desde Proxmox
# ------------------------------------------------------------
# Crea un contenedor LXC Ubuntu 22.04, instala Docker,
# clona el repo y despliega el stack completo (App + Supabase).
#
# USO (ejecutar en el HOST de Proxmox como root):
#   bash <(curl -fsSL https://raw.githubusercontent.com/<TU_USER>/<TU_REPO>/main/scripts/proxmox-install.sh)
#
# o copiando el archivo:
#   scp scripts/proxmox-install.sh root@proxmox:/root/
#   ssh root@proxmox "bash /root/proxmox-install.sh"
# ============================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
info() { echo -e "${BLUE}[i]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

clear
cat <<'BANNER'
╔══════════════════════════════════════════════════════════╗
║   🚀 FilterControl - Instalador Proxmox (LXC + Docker)  ║
╚══════════════════════════════════════════════════════════╝
BANNER
echo ""

# --- 0. Verificar que estamos en Proxmox ---
command -v pct >/dev/null 2>&1 || err "Este script debe ejecutarse en el HOST de Proxmox (no encuentra el comando 'pct')."
[ "$(id -u)" -eq 0 ] || err "Ejecuta como root."

# --- 1. Pedir parámetros ---
read -rp "👉 ID del contenedor LXC [200]: " CTID
CTID=${CTID:-200}
pct status "$CTID" >/dev/null 2>&1 && err "El contenedor $CTID ya existe. Usa otro ID o bórralo: pct destroy $CTID"

read -rp "👉 Hostname del contenedor [filtercontrol]: " HOSTNAME
HOSTNAME=${HOSTNAME:-filtercontrol}

read -rp "👉 Password root del contenedor: " -s ROOT_PASS
echo ""
[ -z "$ROOT_PASS" ] && err "Password no puede estar vacío."

read -rp "👉 Storage para el contenedor [local-lvm]: " STORAGE
STORAGE=${STORAGE:-local-lvm}

read -rp "👉 Tamaño disco GB [20]: " DISK
DISK=${DISK:-20}

read -rp "👉 Memoria RAM MB [4096]: " RAM
RAM=${RAM:-4096}

read -rp "👉 Núcleos CPU [2]: " CORES
CORES=${CORES:-2}

read -rp "👉 Bridge de red [vmbr0]: " BRIDGE
BRIDGE=${BRIDGE:-vmbr0}

read -rp "👉 IP estática (CIDR) o 'dhcp' [dhcp]: " IPCONF
IPCONF=${IPCONF:-dhcp}

read -rp "👉 URL del repositorio Git de la app: " REPO_URL
[ -z "$REPO_URL" ] && err "Necesitas indicar el repo Git de la app."

read -rp "👉 Dominio o IP pública para acceder [auto]: " DOMAIN_INPUT

# --- 2. Descargar template Ubuntu 22.04 si no existe ---
TEMPLATE="ubuntu-22.04-standard_22.04-1_amd64.tar.zst"
if ! pveam list local | grep -q "$TEMPLATE"; then
  log "Descargando template Ubuntu 22.04..."
  pveam update
  pveam download local "$TEMPLATE"
else
  log "Template Ubuntu ya disponible"
fi

# --- 3. Crear contenedor LXC ---
log "Creando contenedor LXC $CTID..."
NET_OPT="name=eth0,bridge=${BRIDGE}"
if [ "$IPCONF" = "dhcp" ]; then
  NET_OPT="${NET_OPT},ip=dhcp"
else
  NET_OPT="${NET_OPT},ip=${IPCONF}"
  read -rp "👉 Gateway: " GATEWAY
  NET_OPT="${NET_OPT},gw=${GATEWAY}"
fi

pct create "$CTID" "local:vztmpl/${TEMPLATE}" \
  --hostname "$HOSTNAME" \
  --password "$ROOT_PASS" \
  --storage "$STORAGE" \
  --rootfs "${STORAGE}:${DISK}" \
  --memory "$RAM" \
  --cores "$CORES" \
  --net0 "$NET_OPT" \
  --features nesting=1,keyctl=1 \
  --unprivileged 1 \
  --onboot 1 \
  --start 0

# Habilitar Docker en LXC unprivileged
log "Configurando contenedor para Docker..."
cat >> "/etc/pve/lxc/${CTID}.conf" <<EOF
lxc.apparmor.profile: unconfined
lxc.cgroup2.devices.allow: a
lxc.cap.drop:
lxc.mount.auto: "proc:rw sys:rw"
EOF

log "Arrancando contenedor..."
pct start "$CTID"
sleep 5

# Esperar red
echo -n "Esperando red"
for i in $(seq 1 30); do
  if pct exec "$CTID" -- ping -c1 -W2 8.8.8.8 >/dev/null 2>&1; then
    echo ""; log "Red lista"; break
  fi
  echo -n "."; sleep 2
done

# Detectar IP si no se dio dominio
if [ -z "$DOMAIN_INPUT" ]; then
  DOMAIN_INPUT=$(pct exec "$CTID" -- hostname -I | awk '{print $1}')
  info "IP detectada: $DOMAIN_INPUT"
fi

# --- 4. Instalar dependencias dentro del LXC ---
log "Instalando dependencias en el contenedor (3-5 min)..."
pct exec "$CTID" -- bash -c "
set -e
export DEBIAN_FRONTEND=noninteractive
apt update -y
apt upgrade -y
apt install -y curl git ca-certificates gnupg openssl
# Docker
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
"
log "Docker + Node.js instalados"

# --- 5. Clonar repo y desplegar ---
log "Clonando repositorio..."
pct exec "$CTID" -- bash -c "
set -e
mkdir -p /opt
cd /opt
[ -d filtercontrol ] && rm -rf filtercontrol
git clone '$REPO_URL' filtercontrol
cd filtercontrol
chmod +x deploy.sh 2>/dev/null || true
"

log "Ejecutando despliegue dentro del contenedor..."
pct exec "$CTID" -- bash -c "
cd /opt/filtercontrol
echo '$DOMAIN_INPUT' | bash deploy.sh
"

# --- 6. Resumen ---
echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}  ✅ Instalación completada${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📦 Contenedor LXC:   $CTID ($HOSTNAME)"
echo "🌐 IP / Dominio:     $DOMAIN_INPUT"
echo ""
echo "🔗 Accesos:"
echo "   App:              http://${DOMAIN_INPUT}:3000"
echo "   Supabase Studio:  http://${DOMAIN_INPUT}:3001"
echo "   Supabase API:     http://${DOMAIN_INPUT}:8000"
echo ""
echo "📄 Credenciales generadas dentro del contenedor:"
echo "   pct exec $CTID -- cat /opt/filtercontrol/CREDENTIALS.txt"
echo ""
echo "🛠️  Comandos útiles:"
echo "   Entrar al contenedor:   pct enter $CTID"
echo "   Ver logs Docker:        pct exec $CTID -- docker compose -f /opt/filtercontrol/docker-compose.yml logs -f"
echo "   Reiniciar contenedor:   pct reboot $CTID"
echo "   Parar contenedor:       pct stop $CTID"
echo ""
