# Despliegue de EmpleoUni

Plataforma de microservicios (Node/Express + Python/FastAPI) con frontend Next.js,
orquestada con Docker Compose.

## 1. Requisitos
- Docker + Docker Compose v2
- Un clon del repositorio **fuera de OneDrive/Dropbox** (la sincronización
  convierte archivos en *placeholders* y rompe el build de Docker).

## 2. Configuración
```bash
cp .env.example .env
# edita .env con tus valores de producción
```

Variables imprescindibles para producción (ver `.env.example`):

| Variable | Para qué |
|---|---|
| `JWT_SECRET` | Firma de tokens. **El mismo en todos los servicios**. Genera con `openssl rand -hex 32`. |
| `DB_PASSWORD` | Contraseña de PostgreSQL. |
| `FRONTEND_URL` | URL pública del frontend (enlaces de los correos). |
| `NEXT_PUBLIC_*_URL` | URLs públicas de cada microservicio (se **incrustan en el build** del frontend). |
| `GOOGLE_CLIENT_ID` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Inicio de sesión con Google (mismo valor en ambas). |
| `SMTP_*`, `MAIL_FROM` | Correo real (restablecer contraseña + notificaciones). |

> ⚠️ Las variables `NEXT_PUBLIC_*` se congelan en el **momento del build** del
> frontend. Si cambias una, hay que **reconstruir** el contenedor `frontend`.

## 3. Inicio de sesión con Google (opcional)
1. En [Google Cloud Console → Credenciales](https://console.cloud.google.com/apis/credentials)
   crea un **OAuth 2.0 Client ID** de tipo *Web application*.
2. En **Authorized JavaScript origins** agrega tu `FRONTEND_URL`
   (p. ej. `http://localhost:3000` y tu dominio de producción).
3. Copia el *Client ID* en `.env` → `GOOGLE_CLIENT_ID` y `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
4. Reconstruye: `docker compose up -d --build frontend ms-auth`.

Si no lo configuras, el botón de Google simplemente **no aparece**; el resto de la app funciona igual.

## 4. Correo (restablecer contraseña)
- **Desarrollo**: sin configurar nada, los correos se capturan en **Mailpit** → http://localhost:8025.
- **Producción**: define `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`
  con tu proveedor (SendGrid, Mailgun, SES, Gmail…).

## 5. Levantar todo
```bash
docker compose up -d --build
```
Servicios: frontend `:3000`, ms-auth `:3001`, perfiles `:3002`, vacantes `:3003`,
matching `:3004`, prácticas `:3005`, analytics `:3006`, audit `:3007`,
notifications `:3008`, files `:3009`. Infra: Postgres, Mongo, Elasticsearch, MinIO, Mailpit.

## 6. Base de datos
La primera vez, `init-db.sql` crea esquemas, tablas y el usuario admin
(`admin@empleouni.co` / `admin12345`).

Si **ya** tienes un volumen de datos de una versión anterior, aplica las migraciones:
```bash
docker exec -i empleouni_postgres psql -U postgres < migration_auth_reset_google.sql
docker exec -i empleouni_postgres psql -U postgres < migration_cortes.sql
docker exec -i empleouni_postgres psql -U postgres < migration_linkedin_cv.sql
```

## 7. Verificación rápida
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/      # 200
curl -s http://localhost:3001/auth/forgot-password -X POST \
     -H "Content-Type: application/json" -d '{"email":"test@x.com"}'  # 200 genérico
```

## 8. Notas de producción
- Cambia `JWT_SECRET`, `DB_PASSWORD` y las credenciales por defecto (admin, MinIO, pgAdmin).
- Sirve detrás de HTTPS (Google Identity exige orígenes seguros salvo `localhost`).
- Pon los `NEXT_PUBLIC_*_URL` apuntando a los dominios públicos reales antes de construir el frontend.
- `pgadmin` está bajo el perfil `tools` (no arranca por defecto): `docker compose --profile tools up -d`.
