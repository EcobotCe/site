require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const setupDatabase = async () => {
  const client = await pool.connect();
  try {
    console.log('Conectado ao banco de dados! Criando tabelas...');

    // Tabela para os inscritos (emails)
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Tabela "subscribers" criada ou já existente.');

    // Tabela para os logs de alertas
    await client.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        nivel VARCHAR(50) NOT NULL, -- 'critico' ou 'aviso'
        base VARCHAR(100) NOT NULL,
        mensagens TEXT[] NOT NULL, -- Array de strings
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);
    console.log('Tabela "alerts" criada ou já existente.');

    console.log('\nSetup do banco de dados concluído com sucesso!');

  } catch (err) {
    console.error('\nErro durante o setup do banco de dados:', err);
  } finally {
    await client.release();
    await pool.end();
  }
};

setupDatabase();
