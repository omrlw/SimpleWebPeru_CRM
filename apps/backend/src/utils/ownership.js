const ensureContactOwnership = async (pool, contactId, userId) => {
    if (!contactId) return true;
    const check = await pool.query('SELECT 1 FROM contacts WHERE id = $1 AND user_id = $2', [contactId, userId]);
    return check.rowCount > 0;
};

const ensureLeadOwnership = async (pool, leadId, userId) => {
    if (!leadId) return true;
    const check = await pool.query('SELECT 1 FROM leads WHERE id = $1 AND user_id = $2', [leadId, userId]);
    return check.rowCount > 0;
};

module.exports = {
    ensureContactOwnership,
    ensureLeadOwnership,
};
