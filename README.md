# Gestoría Administrativa Rafaela Jiménez Molina — PWA inicial

Primera base de trabajo inspirada en la arquitectura sencilla de AMURA:
HTML + CSS + JavaScript, Supabase (Auth, PostgreSQL, Storage y RLS) y PWA instalable.

## Qué incluye esta primera prueba

- Pantalla de acceso y registro de clientes.
- Portal privado con resumen y listado de expedientes.
- Alta de solicitudes por categoría.
- Adjuntar PDF, JPG, JPEG y PNG (máximo 10 MB por archivo).
- Panel de gestión para el rol `gestora`.
- La gestora puede consultar todos los expedientes y cambiar su estado.
- Base SQL con perfiles, expedientes, documentos, mensajes, políticas RLS y bucket privado.
- Manifest y service worker básicos.

## 1. Crear el proyecto Supabase

1. Crea un proyecto nuevo en Supabase, independiente de AMURA.
2. Abre **SQL Editor**.
3. Copia y ejecuta el contenido de `supabase/schema.sql`.
4. En **Project Settings → API**, copia Project URL y la clave pública `anon` (publishable/anon key).
5. Abre `app.js` y sustituye:
   - `PEGA_AQUI_TU_PROJECT_URL`
   - `PEGA_AQUI_TU_ANON_PUBLIC_KEY`

Nunca pongas una `service_role` o secret key en `app.js`, GitHub ni en el navegador.

## 2. Crear el usuario de Rafaela

1. Registra una cuenta desde la aplicación con el correo de la gestoría.
2. Confirma el correo si Supabase lo solicita.
3. En Supabase → SQL Editor ejecuta esta consulta sustituyendo el correo:

```sql
update public.profiles p
set role='gestora'
from auth.users u
where p.id=u.id and u.email='CORREO_DE_RAFAELA';
```

El registro público siempre crea usuarios con rol `cliente`. No existe un selector para que alguien se convierta en gestora.

## 3. Probar en local

No abras `index.html` directamente con doble clic. Usa un servidor local, por ejemplo VS Code Live Server, o desde la carpeta del proyecto:

```bash
python -m http.server 8080
```

Después abre `http://localhost:8080`.

## 4. Subir a GitHub y desplegar

- Sube el contenido de esta carpeta a un repositorio nuevo.
- En Vercel importa el repositorio.
- Framework preset: **Other**.
- Build command: vacío.
- Output directory: `.`.
- Root directory: `./`.

También puede publicarse como sitio estático en Cloudflare Pages con build command vacío y output directory `.`.

## 5. Seguridad y alcance de esta versión

La base SQL aplica separación por usuario en Supabase. El cliente solo puede consultar expedientes cuyo `client_id` sea su propio ID. La gestora accede a todos mediante `role='gestora'`.

El bucket de documentos es privado. No se deben generar enlaces públicos para documentos sensibles.

**Esta es una primera prueba funcional, no una versión lista para producción.** Antes de utilizar datos reales hay que completar y probar: descarga segura de documentos, conversación/mensajes en interfaz, edición de perfil, recuperación de contraseña, avisos por correo, auditoría, validaciones adicionales y revisión profesional de seguridad y protección de datos.

## Estructura

```text
gestoria-rafaela-pwa/
├── index.html
├── styles.css
├── app.js
├── manifest.json
├── sw.js
├── README.md
├── assets/
│   └── icon.svg
└── supabase/
    └── schema.sql
```
