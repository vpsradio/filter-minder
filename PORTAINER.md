# 🚀 Despliegue en Portainer

Guía para desplegar **FilterControl + Supabase self-hosted** como un Stack en Portainer.

---

## 📋 Requisitos previos

- Portainer CE/BE instalado y funcionando
- Docker Engine 20.10+ con Docker Compose v2
- Un dominio (opcional, puedes usar la IP del servidor)
- Puertos libres: `3000` (app), `8000` (Supabase API), `3001` (Studio), `5432` (Postgres)

---

## 🔑 Paso 1 — Generar las claves JWT

Antes de crear el Stack necesitas generar tres secretos. Ejecuta esto en **cualquier máquina con Node.js** (o en el propio servidor por SSH):

```bash
# 1. Genera el JWT_SECRET y la POSTGRES_PASSWORD
JWT_SECRET=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 32)

echo "JWT_SECRET=$JWT_SECRET"
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"

# 2. Genera ANON_KEY y SERVICE_ROLE_KEY a partir del JWT_SECRET
JWT_SECRET=$JWT_SECRET node scripts/generate-keys.js
```

Guarda los 4 valores: `JWT_SECRET`, `POSTGRES_PASSWORD`, `ANON_KEY`, `SERVICE_ROLE_KEY`.

> 💡 Si no tienes Node.js a mano, puedes generar las claves online en: https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys

---

## 📦 Paso 2 — Subir los archivos al servidor

Portainer necesita acceder a algunos archivos de configuración (`kong.yml`, init SQL, Dockerfile, etc.). Tienes **dos opciones**:

### Opción A — Repositorio Git (recomendado)

Portainer puede crear el Stack directamente desde un repo de Git. Ve al **Paso 3 → Método Git**.

### Opción B — Subir archivos manualmente

Por SSH al servidor:

```bash
mkdir -p /opt/filtercontrol
cd /opt/filtercontrol
git clone <TU_REPO_URL> .
```

---

## 🐳 Paso 3 — Crear el Stack en Portainer

### Método Git (más sencillo)

1. En Portainer, ve a **Stacks → Add stack**.
2. **Name**: `filtercontrol`
3. **Build method**: selecciona **Repository**.
4. Rellena:
   - **Repository URL**: la URL de tu repo
   - **Repository reference**: `refs/heads/main` (o tu rama)
   - **Compose path**: `docker-compose.yml`
5. En **Environment variables**, añade:

| Variable | Valor |
|---|---|
| `DOMAIN` | IP o dominio del servidor (ej: `192.168.1.100` o `filtros.midominio.com`) |
| `POSTGRES_PASSWORD` | El generado en el paso 1 |
| `JWT_SECRET` | El generado en el paso 1 |
| `ANON_KEY` | El generado en el paso 1 |
| `SERVICE_ROLE_KEY` | El generado en el paso 1 |
| `SMTP_HOST` | (opcional) servidor SMTP |
| `SMTP_PORT` | (opcional, por defecto `587`) |
| `SMTP_USER` | (opcional) |
| `SMTP_PASS` | (opcional) |
| `SMTP_ADMIN_EMAIL` | (opcional) email del admin |

6. Pulsa **Deploy the stack**.

### Método Web editor (sin Git)

1. Sube los archivos del repo al servidor (Opción B del paso 2).
2. En Portainer: **Stacks → Add stack → Web editor**.
3. Pega el contenido de `docker-compose.yml`.
4. ⚠️ Este método requiere que los archivos referenciados (`./docker/kong.yml`, `./docker/init/`, `./Dockerfile`, `./nginx.conf`) existan en el host. Por eso **es preferible el método Git**.

---

## ✅ Paso 4 — Verificar el despliegue

Una vez Portainer muestre todos los contenedores en verde:

| Servicio | URL | Notas |
|---|---|---|
| App React | `http://TU_IP:3000` | La aplicación FilterControl |
| Supabase Studio | `http://TU_IP:3001` | Dashboard de la DB |
| Supabase API | `http://TU_IP:8000` | Endpoint REST/Auth |

---

## 🗄️ Paso 5 — Aplicar las migraciones

La primera vez tienes que crear las tablas (`filters`, `profiles`, `user_roles`, etc).

Desde Portainer: **Containers → filtercontrol-db-1 → Console → Connect**, luego ejecuta:

```bash
psql -U postgres -d postgres
```

Y pega el contenido de cada archivo de `supabase/migrations/*.sql` en orden cronológico.

> 💡 Alternativa: copia los archivos al contenedor y ejecútalos:
> ```bash
> docker cp supabase/migrations/. filtercontrol-db-1:/tmp/migrations/
> docker exec -i filtercontrol-db-1 bash -c 'for f in /tmp/migrations/*.sql; do psql -U postgres -d postgres -f "$f"; done'
> ```

---

## 🔄 Actualizar el Stack

Cuando hagas cambios en el código:

1. Push al repo Git.
2. En Portainer: **Stacks → filtercontrol → Pull and redeploy**.
3. Marca **Re-pull image and redeploy** para que reconstruya la imagen del frontend.

---

## 🛡️ Recomendaciones de producción

- **Nginx Proxy Manager** (otro stack en Portainer) delante para SSL automático con Let's Encrypt.
- Cambia los puertos públicos (`3000`, `8000`, `3001`) a la red interna y expón solo Nginx.
- Activa backups automáticos del volumen `db-data`.
- No expongas el puerto `5432` de Postgres a internet.

---

## ❓ Troubleshooting

- **El frontend no conecta con Supabase**: verifica que `DOMAIN` coincida con la URL desde la que accedes al navegador. Si accedes por IP, `DOMAIN` debe ser esa misma IP.
- **`kong` no arranca**: revisa que `ANON_KEY` y `SERVICE_ROLE_KEY` estén bien generadas a partir del `JWT_SECRET`.
- **Error de permisos en `db`**: borra el volumen `db-data` y vuelve a desplegar (⚠️ borra todos los datos).
