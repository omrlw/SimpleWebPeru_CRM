const { Pool } = require('pg');

const createPool = () =>
    new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

const pool = createPool();

pool.on('connect', (client) => {
    client.query("SET TIME ZONE 'America/Lima'").catch((error) => {
        console.error('No se pudo establecer la zona horaria de la base de datos:', error.message);
    });
});

const initializeDatabase = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS contacts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            first_name TEXT NOT NULL,
            last_name TEXT,
            company TEXT,
            ruc TEXT,
            email TEXT,
            phone TEXT,
            tags TEXT[] DEFAULT '{}'::TEXT[],
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS leads (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            company TEXT,
            email TEXT,
            phone TEXT,
            notes TEXT,
            stage TEXT DEFAULT 'Entrante',
            value NUMERIC(12,2) DEFAULT 0,
            contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'pendiente',
            due_date TIMESTAMP,
            contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
            lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            completed_at TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS communications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
            channel TEXT DEFAULT 'email',
            subject TEXT,
            summary TEXT,
            communication_date TIMESTAMP DEFAULT NOW(),
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);

    await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS value NUMERIC(12,2) DEFAULT 0`);
    await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS company TEXT`);
    await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL`);
    await pool.query(`ALTER TABLE leads ALTER COLUMN stage SET DEFAULT 'Entrante'`);
};

module.exports = {
    pool,
    initializeDatabase,
};
