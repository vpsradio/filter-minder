#!/bin/bash
# Asigna la password a todos los roles internos de Supabase usando POSTGRES_PASSWORD
# Se ejecuta antes de 01-init.sql gracias al orden alfabético
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  DO \$\$
  BEGIN
    -- Crea los roles si no existen (con LOGIN) para poder asignarles password
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
      CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD '${POSTGRES_PASSWORD}';
    ELSE
      ALTER ROLE authenticator WITH LOGIN PASSWORD '${POSTGRES_PASSWORD}';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
      CREATE ROLE supabase_auth_admin NOINHERIT LOGIN CREATEROLE PASSWORD '${POSTGRES_PASSWORD}';
    ELSE
      ALTER ROLE supabase_auth_admin WITH LOGIN CREATEROLE PASSWORD '${POSTGRES_PASSWORD}';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_admin') THEN
      CREATE ROLE supabase_admin NOINHERIT LOGIN CREATEROLE CREATEDB SUPERUSER REPLICATION BYPASSRLS PASSWORD '${POSTGRES_PASSWORD}';
    ELSE
      ALTER ROLE supabase_admin WITH LOGIN SUPERUSER PASSWORD '${POSTGRES_PASSWORD}';
    END IF;
  END
  \$\$;
EOSQL
