// --- 1. IMPORTACIONES Y CONFIGURACIÓN INICIAL ---
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

// --- 2. INICIALIZACIÓN DE LA APP Y LA BASE DE DATOS ---
const app = express();
const PORT = process.env.PORT || 5001;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Configuración SSL para producción (ej. en Heroku, AWS RDS)
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// --- 3. MIDDLEWARE ---
app.use(cors()); // Permite peticiones de otros orígenes (tu frontend)
app.use(express.json()); // Parsea bodies de peticiones como JSON

// Middleware para verificar el Token JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"

    if (token == null) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido o expirado' });
        }
        req.user = user; // Añade la info del usuario (ej. id) al objeto request
        next();
    });
};

// --- 4. RUTAS DE LA API ---

// A. RUTAS DE AUTENTICACIÓN
// Registrar un nuevo usuario
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    try {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        const newUser = await pool.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
            [email, password_hash]
        );
        res.status(201).json(newUser.rows[0]);
    } catch (error) {
        console.error('Error en registro:', error.message);
        res.status(500).json({ error: 'El email ya podría estar en uso.' });
    }
});

// Iniciar sesión
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }
        const user = userResult.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }
        // Crear y firmar el JWT
        const accessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ accessToken });
    } catch (error) {
        console.error('Error en login:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// B. RUTAS DE LEADS (PROTEGIDAS)
// Obtener todos los leads del usuario logueado
app.get('/api/leads', authenticateToken, async (req, res) => {
    try {
        const allLeads = await pool.query('SELECT * FROM leads WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(allLeads.rows);
    } catch (error) {
        console.error('Error obteniendo leads:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Crear un nuevo lead
app.post('/api/leads', authenticateToken, async (req, res) => {
    const { name, email, phone, notes, stage } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'El nombre es requerido' });
    }
    try {
        const newLead = await pool.query(
            'INSERT INTO leads (user_id, name, email, phone, notes, stage) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [req.user.id, name, email, phone, notes, stage || 'Nuevos Leads']
        );
        res.status(201).json(newLead.rows[0]);
    } catch (error) {
        console.error('Error creando lead:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar un lead
app.put('/api/leads/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, notes, stage } = req.body;
    try {
        const updatedLead = await pool.query(
            'UPDATE leads SET name = $1, email = $2, phone = $3, notes = $4, stage = $5 WHERE id = $6 AND user_id = $7 RETURNING *',
            [name, email, phone, notes, stage, id, req.user.id]
        );
        if (updatedLead.rows.length === 0) {
            return res.status(404).json({ error: 'Lead no encontrado o no tienes permiso' });
        }
        res.json(updatedLead.rows[0]);
    } catch (error) {
        console.error('Error actualizando lead:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Eliminar un lead
app.delete('/api/leads/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const deleteOp = await pool.query(
            'DELETE FROM leads WHERE id = $1 AND user_id = $2 RETURNING id',
             [id, req.user.id]
        );
        if (deleteOp.rowCount === 0) {
             return res.status(404).json({ error: 'Lead no encontrado o no tienes permiso' });
        }
        res.json({ message: 'Lead eliminado exitosamente' });
    } catch (error) {
        console.error('Error eliminando lead:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// --- 5. INICIO DEL SERVIDOR ---
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});