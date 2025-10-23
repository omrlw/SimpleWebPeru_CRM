const express = require('express');

const authenticateToken = require('../middleware/authenticateToken');
const { pool } = require('../config/database');
const { ensureContactOwnership, ensureLeadOwnership } = require('../utils/ownership');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
    const { status } = req.query;
    const params = [req.user.id];
    let query = `
        SELECT t.id,
               t.title,
               t.description,
               t.status,
               t.due_date,
               t.created_at,
               COALESCE(c.first_name || ' ' || COALESCE(c.last_name, ''), '') AS contact_name,
               t.contact_id,
               t.lead_id
        FROM tasks t
        LEFT JOIN contacts c ON c.id = t.contact_id
        WHERE t.user_id = $1
    `;
    if (status) {
        params.push(status);
        query += ' AND t.status = $2';
    }
    query += ' ORDER BY COALESCE(t.due_date, t.created_at) ASC';
    try {
        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error obteniendo tareas:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    const { title, description, dueDate, status, contactId, leadId } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'El título es requerido' });
    }
    try {
        if (contactId && !(await ensureContactOwnership(pool, contactId, req.user.id))) {
            return res.status(400).json({ error: 'El contacto asociado no existe' });
        }
        if (leadId && !(await ensureLeadOwnership(pool, leadId, req.user.id))) {
            return res.status(400).json({ error: 'El lead asociado no existe' });
        }
        const { rows } = await pool.query(
            `INSERT INTO tasks (user_id, title, description, status, due_date, contact_id, lead_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, title, description, status, due_date, created_at, contact_id, lead_id`,
            [
                req.user.id,
                title,
                description || null,
                status || 'pendiente',
                dueDate || null,
                contactId || null,
                leadId || null,
            ]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error creando tarea:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { title, description, dueDate, status, contactId, leadId } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'El título es requerido' });
    }
    try {
        if (contactId && !(await ensureContactOwnership(pool, contactId, req.user.id))) {
            return res.status(400).json({ error: 'El contacto asociado no existe' });
        }
        if (leadId && !(await ensureLeadOwnership(pool, leadId, req.user.id))) {
            return res.status(400).json({ error: 'El lead asociado no existe' });
        }
        const { rows } = await pool.query(
            `UPDATE tasks
             SET title = $1,
                 description = $2,
                 status = $3,
                 due_date = $4,
                 contact_id = $5,
                 lead_id = $6,
                 completed_at = CASE WHEN $3 IN ('completada', 'cerrada') THEN NOW() ELSE NULL END
             WHERE id = $7 AND user_id = $8
             RETURNING id, title, description, status, due_date, created_at, contact_id, lead_id`,
            [
                title,
                description || null,
                status || 'pendiente',
                dueDate || null,
                contactId || null,
                leadId || null,
                id,
                req.user.id,
            ]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error actualizando tarea:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id', [
            id,
            req.user.id,
        ]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        res.json({ message: 'Tarea eliminada' });
    } catch (error) {
        console.error('Error eliminando tarea:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
