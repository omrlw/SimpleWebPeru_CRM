# Frontend (Vite + React)

Interfaz principal del CRM, construida con React y Vite.

## Estructura

- `src/app/`: contiene la aplicación y, a futuro, subcarpetas para páginas, componentes y hooks.
- `src/styles/`: estilos globales (`global.css`) y cualquier hoja adicional.
- `src/assets/`: íconos e imágenes estáticas.
- `src/main.jsx`: punto de entrada que hidrata la aplicación en el DOM.

## Scripts

```bash
npm install      # instala dependencias
npm run dev      # arranca Vite en modo desarrollo
npm run build    # genera la versión de producción
npm run preview  # sirve el build generado
```

## Variables de entorno útiles

- `VITE_API_URL`: URL base para el backend. Si no se define, se usa `http://localhost:5001/api`.

> Crea un archivo `.env.local` en esta carpeta para tus variables locales.
