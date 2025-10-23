const express = require('express');

const authenticateToken = require('../middleware/authenticateToken');
const { pool } = require('../config/database');
const { ensureContactOwnership } = require('../utils/ownership');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT l.id,
                    l.name,
                    l.notes,
                    l.stage,
                    l.value,
                    l.contact_id,
                    l.created_at,
                    COALESCE(c.first_name || ' ' || COALESCE(c.last_name, ''), '') AS contact_name
             FROM leads l
             LEFT JOIN contacts c ON c.id = l.contact_id
             WHERE l.user_id = $1
             ORDER BY l.created_at DESC`,
            [req.user.id]
        );
        res.json(rows.map((row) => ({ ...row, value: Number(row.value) || 0 })));
    } catch (error) {
        console.error('Error obteniendo leads:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    const { name, notes, stage, value, contactId } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'El nombre del trato es requerido' });
    }
    if (!contactId) {
        return res.status(400).json({ error: 'El cliente es requerido' });
    }
    try {
        if (!(await ensureContactOwnership(pool, contactId, req.user.id))) {
            return res.status(400).json({ error: 'El contacto asociado no existe' });
        }
        const numericValue = Number(value) || 0;
        const { rows } = await pool.query(
            `INSERT INTO leads (user_id, name, notes, stage, value, contact_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, name, notes, stage, value, contact_id, created_at`,
            [req.user.id, name, notes || null, stage || 'Prospecto', numericValue, contactId]
        );
        const lead = rows[0];
        res.status(201).json({ ...lead, value: Number(lead.value) || 0 });
    } catch (error) {
        console.error('Error creando lead:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, notes, stage, value, contactId } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'El nombre del trato es requerido' });
    }
    if (!contactId) {
        return res.status(400).json({ error: 'El cliente es requerido' });
    }
    try {
        if (!(await ensureContactOwnership(pool, contactId, req.user.id))) {
            return res.status(400).json({ error: 'El contacto asociado no existe' });
        }
        const numericValue = Number(value) || 0;
        const { rows } = await pool.query(
            `UPDATE leads
             SET name = $1,
                 notes = $2,
                 stage = $3,
                 value = $4,
                 contact_id = $5
             WHERE id = $6 AND user_id = $7
             RETURNING id, name, notes, stage, value, contact_id, created_at`,
            [name, notes || null, stage || 'Prospecto', numericValue, contactId, id, req.user.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Lead no encontrado o no tienes permiso' });
        }
        const lead = rows[0];
        res.json({ ...lead, value: Number(lead.value) || 0 });
    } catch (error) {
        console.error('Error actualizando lead:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM leads WHERE id = $1 AND user_id = $2 RETURNING id', [
            id,
            req.user.id,
        ]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Lead no encontrado o no tienes permiso' });
        }
        res.json({ message: 'Lead eliminado exitosamente' });
    } catch (error) {
        console.error('Error eliminando lead:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
