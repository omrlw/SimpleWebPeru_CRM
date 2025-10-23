const express = require('express');

const authenticateToken = require('../middleware/authenticateToken');
const { pool } = require('../config/database');
const { computeDateRange } = require('../utils/date');

const router = express.Router();

const STAGE_ORDER = ['Entrante', 'Contactado', 'Negociación', 'Trato Ganado', 'Trato Perdido'];

router.get('/', authenticateToken, async (req, res) => {
    const { period = 'today', startDate, endDate } = req.query;
    let range = null;
    try {
        range = computeDateRange(period, startDate, endDate);
    } catch (error) {
        console.error('Error generando rango:', error.message);
        return res.status(400).json({ error: error.message });
    }

    const rangeStartISO = range ? range.start.toISOString() : null;
    const rangeEndISO = range ? range.end.toISOString() : null;
    const filterInfo = range
        ? {
              period,
              start: rangeStartISO,
              end: new Date(range.end.getTime() - 1).toISOString(),
          }
        : { period, start: null, end: null };

    try {
        const rangeDuration = range ? range.end.getTime() - range.start.getTime() : null;
        const previousRange = rangeDuration
            ? {
                  start: new Date(range.start.getTime() - rangeDuration),
                  end: new Date(range.start.getTime()),
              }
            : null;
        const previousStartISO = previousRange ? previousRange.start.toISOString() : null;
        const previousEndISO = previousRange ? previousRange.end.toISOString() : null;

        const revenueBaseQuery = `
            SELECT COALESCE(SUM(value), 0)::FLOAT AS projected_revenue
            FROM leads
            WHERE user_id = $1
              AND COALESCE(stage, '') NOT IN ('Trato Perdido', 'Cerrado Perdido')
        `;
        const revenueCondition = range ? ' AND created_at >= $2 AND created_at < $3' : '';
        const revenueQuery = `${revenueBaseQuery}${revenueCondition}`;
        const revenueParams = range ? [req.user.id, rangeStartISO, rangeEndISO] : [req.user.id];
        const { rows: revenueRows } = await pool.query(revenueQuery, revenueParams);

        let previousMetrics = null;
        if (previousRange) {
            const previousRevenueParams = [req.user.id, previousStartISO, previousEndISO];
            const { rows: previousRevenueRows } = await pool.query(revenueQuery, previousRevenueParams);
            previousMetrics = {
                projectedRevenue: previousRevenueRows[0]?.projected_revenue || 0,
            };
        }

        const pendingTasksQuery = `
            SELECT COUNT(*)::INT AS total
            FROM tasks
            WHERE user_id = $1
              AND COALESCE(status, 'pendiente') NOT IN ('completada', 'cerrada')
            ${
                range
                    ? ' AND ((due_date IS NOT NULL AND due_date >= $2 AND due_date < $3) OR (due_date IS NULL AND created_at >= $2 AND created_at < $3))'
                    : ''
            }
        `;
        const pendingTasksParams = range ? [req.user.id, rangeStartISO, rangeEndISO] : [req.user.id];
        const { rows: pendingTasksRows } = await pool.query(pendingTasksQuery, pendingTasksParams);

        const activeClientsQuery = `
            SELECT COUNT(DISTINCT contact_id)::INT AS total
            FROM leads
            WHERE user_id = $1
              AND contact_id IS NOT NULL
              AND COALESCE(stage, '') NOT IN ('Trato Perdido', 'Cerrado Perdido')
            ${range ? ' AND created_at >= $2 AND created_at < $3' : ''}
        `;
        const activeClientsParams = range ? [req.user.id, rangeStartISO, rangeEndISO] : [req.user.id];
        const { rows: activeClientsRows } = await pool.query(activeClientsQuery, activeClientsParams);

        const newClientsQuery = `
            SELECT COUNT(*)::INT AS total
            FROM contacts
            WHERE user_id = $1
            ${range ? ' AND created_at >= $2 AND created_at < $3' : ''}
        `;
        const newClientsParams = range ? [req.user.id, rangeStartISO, rangeEndISO] : [req.user.id];
        const { rows: newClientsRows } = await pool.query(newClientsQuery, newClientsParams);

        const tasksQuery = `
            SELECT t.id,
                   t.title,
                   t.status,
                   t.due_date,
                   t.created_at,
                   COALESCE(c.first_name || ' ' || COALESCE(c.last_name, ''), '') AS contact_name
            FROM tasks t
            LEFT JOIN contacts c ON c.id = t.contact_id
            WHERE t.user_id = $1
              AND COALESCE(t.status, 'pendiente') NOT IN ('completada', 'cerrada')
            ${
                range
                    ? ' AND ((t.due_date IS NOT NULL AND t.due_date >= $2 AND t.due_date < $3) OR (t.due_date IS NULL AND t.created_at >= $2 AND t.created_at < $3))'
                    : ''
            }
            ORDER BY COALESCE(t.due_date, t.created_at) ASC
            LIMIT 20
        `;
        const tasksParams = range ? [req.user.id, rangeStartISO, rangeEndISO] : [req.user.id];
        const { rows: tasksRows } = await pool.query(tasksQuery, tasksParams);

        const communicationsQuery = `
            SELECT cm.id,
                   cm.channel,
                   cm.subject,
                   cm.summary,
                   cm.communication_date,
                   cm.contact_id,
                   COALESCE(ct.first_name || ' ' || COALESCE(ct.last_name, ''), '') AS contact_name
            FROM communications cm
            LEFT JOIN contacts ct ON ct.id = cm.contact_id
            WHERE cm.user_id = $1
            ${range ? ' AND cm.communication_date >= $2 AND cm.communication_date < $3' : ''}
            ORDER BY cm.communication_date DESC
            LIMIT 10
        `;
        const communicationsParams = range ? [req.user.id, rangeStartISO, rangeEndISO] : [req.user.id];
        const { rows: communicationsRows } = await pool.query(communicationsQuery, communicationsParams);

        const funnelQuery = `
            SELECT
                CASE
                    WHEN COALESCE(stage, '') = '' THEN 'Entrante'
                    WHEN stage = 'Conversación' THEN 'Contactado'
                    ELSE stage
                END AS stage,
                COUNT(*)::INT AS total
            FROM leads
            WHERE user_id = $1
        `;
        const funnelCondition = range ? ' AND created_at >= $2 AND created_at < $3' : '';
        const funnelFinalQuery = `${funnelQuery}${funnelCondition} GROUP BY stage`;
        const funnelParams = range ? [req.user.id, rangeStartISO, rangeEndISO] : [req.user.id];
        const { rows: funnelRows } = await pool.query(funnelFinalQuery, funnelParams);
        const funnel = STAGE_ORDER.map((stage) => ({
            stage,
            value: funnelRows.find((row) => row.stage === stage)?.total || 0,
        }));

        res.json({
            metrics: {
                projectedRevenue: revenueRows[0]?.projected_revenue || 0,
                pendingTasks: pendingTasksRows[0]?.total || 0,
                activeClients: activeClientsRows[0]?.total || 0,
                newClients: newClientsRows[0]?.total || 0,
            },
            tasks: tasksRows,
            communications: communicationsRows,
            previousMetrics,
            funnel,
            filter: filterInfo,
        });
    } catch (error) {
        console.error('Error obteniendo summary:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
