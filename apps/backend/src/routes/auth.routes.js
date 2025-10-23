const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { pool } = require('../config/database');

const router = express.Router();
const SALT_ROUNDS = 10;

router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    try {
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        const passwordHash = await bcrypt.hash(password, salt);
        const newUser = await pool.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
            [email.toLowerCase(), passwordHash]
        );
        res.status(201).json(newUser.rows[0]);
    } catch (error) {
        console.error('Error en registro:', error.message);
        res.status(500).json({ error: 'El email ya podría estar en uso.' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
        if (result.rowCount === 0) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }
        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }
        const accessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ accessToken });
    } catch (error) {
        console.error('Error en login:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
