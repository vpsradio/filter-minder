# 📋 Stack de Portainer - Copiar y pegar

Este archivo contiene un `docker-compose.yml` **autocontenido** listo para pegar directamente en Portainer sin necesidad de archivos externos (kong.yml, init.sql, etc. se generan en tiempo de arranque).

---

## 🔑 Paso 1 — Generar las claves

Ejecuta en cualquier máquina con Node.js (o usa https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys):

```bash
# Generar JWT_SECRET y POSTGRES_PASSWORD
echo "POSTGRES_PASSWORD=$(openssl rand -hex 32)"
echo "JWT_SECRET=$(openssl rand -hex 32)"
```

Luego usa ese `JWT_SECRET` para generar las claves (pega esto en la terminal sustituyendo `TU_JWT_SECRET`):

```bash
JWT_SECRET="TU_JWT_SECRET" node -e "
const c=require('crypto'); const s=process.env.JWT_SECRET;
const mk=r=>{const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const p=Buffer.from(JSON.stringify({iss:'supabase',ref:'local',role:r,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+315360000})).toString('base64url');
return h+'.'+p+'.'+c.createHmac('sha256',s).update(h+'.'+p).digest('base64url')};
console.log('ANON_KEY='+mk('anon'));
console.log('SERVICE_ROLE_KEY='+mk('service_role'));
"
```

Guarda los **4 valores**: `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`.

---

## 🐳 Paso 2 — Crear el Stack en Portainer

1. Portainer → **Stacks → Add stack**
2. **Name**: `filtercontrol`
3. **Build method**: **Web editor**
4. Pega el contenido de `portainer-stack.yml` (siguiente sección).
5. En **Environment variables**, añade:

| Variable | Valor |
|---|---|
| `DOMAIN` | IP o dominio del servidor (ej. `192.168.1.50`) |
| `POSTGRES_PASSWORD` | (paso 1) |
| `JWT_SECRET` | (paso 1) |
| `ANON_KEY` | (paso 1) |
| `SERVICE_ROLE_KEY` | (paso 1) |
| `APP_IMAGE` | `nginx:alpine` *(temporal — ver paso 4)* |

6. Pulsa **Deploy the stack**.

---

## 🖼️ Paso 3 — Construir y publicar la imagen del frontend

Portainer no compila código fuente desde un Web editor, así que necesitas **construir la imagen** del frontend en otra máquina y subirla a un registry (Docker Hub, GHCR, registry privado…).

En tu máquina local, dentro del repo:

```bash
# Construye la imagen pasando la URL pública de Supabase
docker build \
  --build-arg VITE_SUPABASE_URL=http://TU_IP:45393 \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=TU_ANON_KEY \
  -t TU_USUARIO/filtercontrol:latest .

# Súbela a Docker Hub (o el registry que uses)
docker push TU_USUARIO/filtercontrol:latest
```

Luego edita el Stack en Portainer y cambia `APP_IMAGE` por `TU_USUARIO/filtercontrol:latest` y pulsa **Update the stack**.

> 💡 Si no quieres usar registry, salta este stack y usa el método **Repository** (Stacks → Add stack → Repository) apuntando al repo Git — Portainer construirá la imagen automáticamente.

---

## 🗄️ Paso 4 — Aplicar migraciones

Una vez el Stack esté arriba:

**Portainer → Containers → `filtercontrol_db_1` → Console → Connect** (`/bin/bash`), y ejecuta:

```bash
psql -U postgres -d postgres
```

Pega el contenido de cada archivo de `supabase/migrations/*.sql` en orden cronológico.

---

## ✅ Paso 5 — Acceder

- **App**: `http://TU_IP:45394`
- **Supabase Studio**: `http://TU_IP:3001`
- **Supabase API**: `http://TU_IP:45393`
