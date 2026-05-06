#!/usr/bin/env bash
# ============================================================
# FilterControl - Instalador rápido desde Proxmox
# Crea un LXC Ubuntu 22.04 + Docker + despliega la app
#
# USO (en el host Proxmox como root):
#   bash proxmox-install.sh
# ============================================================
set -euo pipefail

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'
ok()  { echo -e "${G}[✓]${N} $1"; }
err() { echo -e "${R}[✗]${N} $1"; exit 1; }

echo "🚀 FilterControl - Instalador Proxmox"
echo ""

# --- Verificaciones ---
[ "$(id -u)" -eq 0 ] || err "Ejecuta como root"
command -v pct >/dev/null || err "Esto debe correr en el host Proxmox"

# --- Parámetros (con defaults sensatos) ---
read -rp "ID del contenedor [200]: " CTID;       CTID=${CTID:-200}
pct status "$CTID" >/dev/null 2>&1 && err "El CT $CTID ya existe"

read -rp "Password root del contenedor: " -s PASS; echo
[ -z "$PASS" ] && err "Password obligatorio"

read -rp "Repo Git de la app: " REPO
[ -z "$REPO" ] && err "Repo obligatorio"

STORAGE="disco2pool-vmdata"
BRIDGE="vmbr1"
TEMPLATE="ubuntu-22.04-standard_22.04-1_amd64.tar.zst"

# --- Template ---
if ! pveam list local | grep -q "$TEMPLATE"; then
  ok "Descargando template Ubuntu 22.04..."
  pveam update && pveam download local "$TEMPLATE"
fi

# --- Crear LXC ---
ok "Creando contenedor $CTID..."
pct create "$CTID" "local:vztmpl/${TEMPLATE}" \
  --hostname filtercontrol \
  --password "$PASS" \
  --storage "$STORAGE" --rootfs "${STORAGE}:20" \
  --memory 4096 --cores 2 \
  --net0 "name=eth0,bridge=${BRIDGE},ip=dhcp,ip6=dhcp" \
  --features nesting=1,keyctl=1 \
  --unprivileged 1 --onboot 1 --start 0

# Habilitar Docker en LXC
cat >> "/etc/pve/lxc/${CTID}.conf" <<EOF
lxc.apparmor.profile: unconfined
lxc.cgroup2.devices.allow: a
lxc.cap.drop:
EOF

ok "Arrancando contenedor..."
pct start "$CTID"

# Esperar red
for i in $(seq 1 30); do
  pct exec "$CTID" -- ping -c1 -W2 8.8.8.8 >/dev/null 2>&1 && break
  sleep 2
done

IP=$(pct exec "$CTID" -- hostname -I | awk '{print $1}')
ok "IP del contenedor: $IP"

# --- Instalar y desplegar dentro del LXC ---
ok "Instalando Docker + Node y desplegando (5-8 min)..."
pct exec "$CTID" -- bash -c "
set -e
export DEBIAN_FRONTEND=noninteractive
apt update -qq && apt install -y -qq curl git openssl ca-certificates
curl -fsSL https://get.docker.com | sh >/dev/null
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null
apt install -y -qq nodejs
git clone '$REPO' /opt/filtercontrol
cd /opt/filtercontrol
echo '$IP' | bash deploy.sh
"

# --- Resumen ---
echo ""
echo "════════════════════════════════════════════"
echo -e "${G}  ✅ Instalación completada${N}"
echo "════════════════════════════════════════════"
echo "🌐 App:     http://${IP}:45394"
echo "🛠️  Studio:  http://${IP}:45395"
echo "🔌 API:     http://${IP}:45393"
echo ""
echo "📄 Credenciales:"
echo "   pct exec $CTID -- cat /opt/filtercontrol/CREDENTIALS.txt"
echo ""
echo "🛠️  Entrar al CT:  pct enter $CTID"
echo ""
