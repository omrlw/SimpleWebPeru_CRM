const express = require('express');

const authenticateToken = require('../middleware/authenticateToken');
const { pool } = require('../config/database');
const { normalizeTags } = require('../utils/tags');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
    const { search } = req.query;
    const params = [req.user.id];
    let query = `
        SELECT id, first_name, last_name, company, ruc, email, phone, tags, created_at
        FROM contacts
        WHERE user_id = $1
    `;

    if (search) {
        params.push(`%${search}%`);
        query += `
            AND (
                first_name ILIKE $2 OR
                last_name ILIKE $2 OR
                company ILIKE $2 OR
                ruc ILIKE $2 OR
                email ILIKE $2
            )
        `;
    }

    query += ' ORDER BY created_at DESC';

    try {
        const { rows } = await pool.query(query, params);
        res.json(rows.map((row) => ({ ...row, tags: row.tags || [] })));
    } catch (error) {
        console.error('Error listando contactos:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    const { firstName, lastName, company, ruc, email, phone, tags } = req.body;
    if (!firstName) {
        return res.status(400).json({ error: 'El nombre es requerido' });
    }
    try {
        const normalizedTags = normalizeTags(tags);
        const { rows } = await pool.query(
            `INSERT INTO contacts (user_id, first_name, last_name, company, ruc, email, phone, tags)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, first_name, last_name, company, ruc, email, phone, tags, created_at`,
            [req.user.id, firstName, lastName || null, company || null, ruc || null, email || null, phone || null, normalizedTags]
        );
        const contact = rows[0];
        res.status(201).json({ ...contact, tags: contact.tags || [] });
    } catch (error) {
        console.error('Error creando contacto:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, company, ruc, email, phone, tags } = req.body;
    if (!firstName) {
        return res.status(400).json({ error: 'El nombre es requerido' });
    }
    try {
        const normalizedTags = normalizeTags(tags);
        const { rows } = await pool.query(
            `UPDATE contacts
             SET first_name = $1,
                 last_name = $2,
                 company = $3,
                 ruc = $4,
                 email = $5,
                 phone = $6,
                 tags = $7
             WHERE id = $8 AND user_id = $9
             RETURNING id, first_name, last_name, company, ruc, email, phone, tags, created_at`,
            [firstName, lastName || null, company || null, ruc || null, email || null, phone || null, normalizedTags, id, req.user.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Contacto no encontrado' });
        }
        const contact = rows[0];
        res.json({ ...contact, tags: contact.tags || [] });
    } catch (error) {
        console.error('Error actualizando contacto:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM contacts WHERE id = $1 AND user_id = $2 RETURNING id', [
            id,
            req.user.id,
        ]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Contacto no encontrado' });
        }
        res.json({ message: 'Contacto eliminado' });
    } catch (error) {
        console.error('Error eliminando contacto:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
