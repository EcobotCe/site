require('dotenv').config();
const { Pool } = require('pg');

const DB_URL = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
if (!DB_URL) { console.error('❌ DATABASE_URL não configurada.'); process.exit(1); }

const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

const migrate = async () => {
  const client = await pool.connect();
  try {
    console.log('🔧 Criando tabela subscriber_preferences...');

    // Tabela de preferências — relacionada a subscribers por email
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriber_preferences (
        email          TEXT PRIMARY KEY REFERENCES subscribers(email) ON DELETE CASCADE,
        alertar_temp   BOOLEAN NOT NULL DEFAULT true,
        alertar_umid   BOOLEAN NOT NULL DEFAULT true,
        alertar_gas    BOOLEAN NOT NULL DEFAULT true,
        alertar_offline    BOOLEAN NOT NULL DEFAULT true,
        alertar_recuperacao BOOLEAN NOT NULL DEFAULT true,
        updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Tabela subscriber_preferences criada (ou já existia).');

    // Migra base_states: last_nivel era string simples, agora é JSON
    // Converte valores antigos: 'critico'/'aviso'/'ok' → JSON vazio {}
    // (estado por sensor recomeça do zero — sem perda funcional)
    await client.query(`
      UPDATE base_states
      SET last_nivel = '{}'
      WHERE last_nivel IS NOT NULL
        AND last_nivel NOT LIKE '{%';
    `);
    console.log('✅ base_states migrado para formato JSON por sensor.');

    console.log('\n✅ Migração concluída!');
  } finally {
    client.release();
    await pool.end();
  }
};

migrate().catch(err => {
  console.error('❌ Erro na migração:', err.message);
  process.exit(1);
});
