require('dotenv').config();

// Ensure Node.js runtime uses the Peru time zone by default
process.env.TZ = process.env.TZ || 'America/Lima';

const createApp = require('./app');
const { initializeDatabase } = require('./config/database');

const PORT = process.env.PORT || 5001;

const bootstrap = async () => {
    try {
        await initializeDatabase();
        const app = createApp();
        app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
        });
    } catch (error) {
        console.error('No se pudo inicializar la base de datos:', error.message);
        process.exit(1);
    }
};

bootstrap();
