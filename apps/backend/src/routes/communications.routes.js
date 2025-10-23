const express = require('express');

const authenticateToken = require('../middleware/authenticateToken');
const { pool } = require('../config/database');
const { ensureContactOwnership } = require('../utils/ownership');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT cm.id,
                    cm.channel,
                    cm.subject,
                    cm.summary,
                    cm.communication_date,
                    cm.contact_id,
                    COALESCE(ct.first_name || ' ' || COALESCE(ct.last_name, ''), '') AS contact_name
             FROM communications cm
             LEFT JOIN contacts ct ON ct.id = cm.contact_id
             WHERE cm.user_id = $1
             ORDER BY cm.communication_date DESC`,
            [req.user.id]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error obteniendo comunicaciones:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    const { channel, subject, summary, communicationDate, contactId } = req.body;
    try {
        if (contactId && !(await ensureContactOwnership(pool, contactId, req.user.id))) {
            return res.status(400).json({ error: 'El contacto asociado no existe' });
        }
        const { rows } = await pool.query(
            `INSERT INTO communications (user_id, channel, subject, summary, communication_date, contact_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, channel, subject, summary, communication_date, contact_id`,
            [
                req.user.id,
                channel || 'email',
                subject || null,
                summary || null,
                communicationDate || new Date(),
                contactId || null,
            ]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error creando comunicación:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { channel, subject, summary, communicationDate, contactId } = req.body;
    try {
        if (contactId && !(await ensureContactOwnership(pool, contactId, req.user.id))) {
            return res.status(400).json({ error: 'El contacto asociado no existe' });
        }
        const { rows } = await pool.query(
            `UPDATE communications
             SET channel = $1,
                 subject = $2,
                 summary = $3,
                 communication_date = $4,
                 contact_id = $5
             WHERE id = $6 AND user_id = $7
             RETURNING id, channel, subject, summary, communication_date, contact_id`,
            [
                channel || 'email',
                subject || null,
                summary || null,
                communicationDate || new Date(),
                contactId || null,
                id,
                req.user.id,
            ]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Comunicación no encontrada' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error actualizando comunicación:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM communications WHERE id = $1 AND user_id = $2 RETURNING id', [
            id,
            req.user.id,
        ]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Comunicación no encontrada' });
        }
        res.json({ message: 'Comunicación eliminada' });
    } catch (error) {
        console.error('Error eliminando comunicación:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
