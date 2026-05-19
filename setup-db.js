require('dotenv').config();
const { Pool } = require('pg');

console.log('Iniciando script de setup do banco de dados...');
console.log(`Variável DATABASE_URL existe: ${!!process.env.DATABASE_URL}`);

if (!process.env.DATABASE_URL) {
  console.warn('⚠️ AVISO: DATABASE_URL não configurada. Pulando setup do banco de dados.');
  console.warn('A aplicação iniciará sem as tabelas. Configure DATABASE_URL para uso completo.');
  process.exit(0); // Sai gracefully, permite que o servidor inicie mesmo assim
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const setupDatabase = async (retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Tentativa ${attempt}/${retries}] Conectando ao banco de dados...`);
      const client = await pool.connect();
      
      try {
        console.log('✅ Conectado ao banco de dados! Criando tabelas...');

        // Tabela para os inscritos (emails)
        await client.query(`
          CREATE TABLE IF NOT EXISTS subscribers (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
        console.log('✅ Tabela "subscribers" criada ou já existente.');

        // Tabela para os logs de alertas
        await client.query(`
          CREATE TABLE IF NOT EXISTS alerts (
            id SERIAL PRIMARY KEY,
            nivel VARCHAR(50) NOT NULL,
            base VARCHAR(100) NOT NULL,
            mensagens TEXT[] NOT NULL,
            timestamp TIMESTAMP WITH TIME ZONE NOT NULL
          );
        `);
        console.log('✅ Tabela "alerts" criada ou já existente.');
        console.log('\n✅ Setup do banco de dados concluído com sucesso!\n');
        return true;

      } finally {
        client.release();
      }
    } catch (err) {
      console.error(`❌ Erro na tentativa ${attempt}:`, err.message);
      
      if (attempt === retries) {
        console.error('\n⚠️ Falha ao conectar ao banco de dados após', retries, 'tentativas.');
        console.error('A aplicação iniciará sem funcionalidades de banco de dados.');
        return false;
      }
      
      // Aguarda antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
};

setupDatabase().finally(() => {
  pool.end();
  process.exit(0); // Sempre sai com sucesso para permitir que o servidor inicie
});
