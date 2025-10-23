# Backend (Express + PostgreSQL)

API REST del CRM, construida con Express y PostgreSQL.

## Estructura

- `src/server.js`: bootstrap que inicializa base de datos y arranca el servidor.
- `src/app.js`: instancia de Express, middlewares y registro de rutas.
- `src/config/`: configuración compartida (pool de PostgreSQL, migraciones básicas).
- `src/middleware/`: middlewares como `authenticateToken`.
- `src/routes/`: rutas agrupadas por dominio (`auth`, `contacts`, `leads`, etc.).
- `src/utils/`: funciones de apoyo (fechas, validaciones, normalización de datos).

## Scripts

```bash
npm install   # instala dependencias
npm run dev   # ejecuta el servidor (node src/server.js)
npm run start # idéntico a dev, útil para producción simple
```

## Variables de entorno

Copia `.env.example` a `.env` y ajusta valores:

- `PORT`: puerto para el servidor HTTP.
- `DATABASE_URL`: cadena de conexión de PostgreSQL.
- `JWT_SECRET`: clave para firmar los tokens.

> La inicialización crea automáticamente las tablas si no existen.
