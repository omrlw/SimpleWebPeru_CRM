# CRM SWP Monorepo

Una estructura organizada para trabajar de forma limpia con el backend en Express y el frontend en Vite/React.

## 📁 Estructura principal

```
apps/
  backend/
    src/
      app.js            # Configura Express y registra rutas
      server.js         # Punto de entrada; levanta el servidor
      config/           # Configuración (base de datos, etc.)
      middleware/       # Middlewares reutilizables
      routes/           # Rutas agrupadas por dominio
      utils/            # Utilidades compartidas
    package.json
  frontend/
    src/
      app/              # Vistas y lógica principal de la app
      styles/           # Estilos globales
      assets/           # Recursos estáticos
      main.jsx          # Punto de arranque de React
    package.json
docs/                   # Espacio para documentación adicional
```

## 🚀 Cómo levantar los servicios

```bash
# Backend
cd apps/backend
npm install
npm run dev

# Frontend
cd apps/frontend
npm install
npm run dev
```

> Ajusta las variables de entorno en `apps/backend` (por ejemplo, `DATABASE_URL` y `JWT_SECRET`) antes de iniciar el servidor.

## 🧭 Buenas prácticas sugeridas

- Mantén cada dominio (auth, contacts, leads, etc.) dentro de su propio archivo de rutas y, si crece, separa controladores/servicios.
- Coloca utilidades compartidas en `src/utils` y evita duplicar lógica entre rutas.
- En el frontend, crea subcarpetas dentro de `src/app` (`components`, `hooks`, `pages`) a medida que escale el proyecto.
- Cualquier documento adicional (diagramas, checklists) puede vivir en `docs/`.
