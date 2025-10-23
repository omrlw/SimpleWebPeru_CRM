const authRoutes = require('./auth.routes');
const contactsRoutes = require('./contacts.routes');
const summaryRoutes = require('./summary.routes');
const leadsRoutes = require('./leads.routes');
const tasksRoutes = require('./tasks.routes');
const communicationsRoutes = require('./communications.routes');

const registerRoutes = (app) => {
    app.use('/api/auth', authRoutes);
    app.use('/api/contacts', contactsRoutes);
    app.use('/api/summary', summaryRoutes);
    app.use('/api/leads', leadsRoutes);
    app.use('/api/tasks', tasksRoutes);
    app.use('/api/communications', communicationsRoutes);
};

module.exports = registerRoutes;
