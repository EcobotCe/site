require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const fs = require('fs').promises;
const nodemailer = require('nodemailer');
const axios = require('axios');
const { exec } = require('child_process');
const cron = require('node-cron');

const app = express();
const port = process.env.PORT || 8080; // Padrão para Railway é 8080

console.log(`✨ Porta final para listen: ${port}`);

// Configuração do Pool de Conexões (permitir ser undefined inicialmente)
let pool = null;
const DB_URL = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

const scheduleAlertsCron = () => {
  if (!pool) {
    console.warn('⚠️ Cron de alertas não será agendado porque o banco de dados não está acessível.');
    return;
  }
  cron.schedule('*/5 * * * *', () => {
    console.log('Executando a verificação de alertas via cron...');
    exec('node check-alerts.js', (err, stdout, stderr) => {
      if (err) { console.error('Erro ao executar check-alerts.js:', err); return; }
      if (stdout) { console.log('Saída de check-alerts.js:', stdout); }
      if (stderr) { console.error('Erros de check-alerts.js:', stderr); }
    });
  });
};

if (DB_URL) {
  const candidatePool = new Pool({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  candidatePool.connect()
    .then(client => {
      client.release();
      pool = candidatePool;
      console.log(`✅ Pool de conexão com banco de dados configurado (${process.env.DATABASE_URL ? 'DATABASE_URL' : 'DATABASE_PUBLIC_URL'})`);
      scheduleAlertsCron();
    })
    .catch(err => {
      console.warn('⚠️ Falha ao conectar ao banco de dados no startup:', err.message);
      candidatePool.end().catch(() => {});
      console.warn('⚠️ Recursos de banco de dados estarão indisponíveis. Usando fallback de arquivo/env.');
    });
} else {
  console.warn('⚠️ DATABASE_URL e DATABASE_PUBLIC_URL não configuradas. Recursos de banco de dados estarão indisponíveis.');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem origin (ex: curl, Postman, server-side)
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
  }
}));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Middleware para verificar disponibilidade do banco de dados
const requireDatabase = (req, res, next) => {
  if (!pool) {
    return res.status(503).json({ 
      error: 'Serviço de banco de dados indisponível',
      message: 'DATABASE_URL não foi configurada ou o banco está offline'
    });
  }
  next();
};

const getEnvBaseDefaults = () => {
  const bases = [];
  if (process.env.TAGO_TOKEN_1) {
    bases.push({ id: 1, nome: 'EEEPDJWM', token: process.env.TAGO_TOKEN_1 });
  }
  if (process.env.TAGO_TOKEN_2) {
    bases.push({ id: 2, nome: 'EEEPDJWM 2.0', token: process.env.TAGO_TOKEN_2 });
  }
  return bases;
};

const BASES_FILE = path.join(__dirname, 'data', 'bases.json');

const getBasesFromDb = async () => {
  if (pool) {
    try {
      const client = await pool.connect();
      try {
        const { rows } = await client.query('SELECT id, nome, token, lat, lon FROM bases ORDER BY id');
        return rows;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('Erro ao acessar o banco para listar bases:', err.message);
      // continuar para fallback de arquivo
    }
  }

  // Fallback para arquivo local quando não há banco
  try {
    const text = await fs.readFile(BASES_FILE, 'utf8');
    const parsed = JSON.parse(text || '[]');
    return parsed;
  } catch (err) {
    return getEnvBaseDefaults();
  }
};

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/test-json', (req, res) => {
  res.json({
    test: 'Express is running!',
    time: new Date().toISOString(),
    port: port,
    node_env: process.env.NODE_ENV
  });
});

app.get('/health', (req, res) => {
  console.log('🚀 HEALTH ENDPOINT CHAMADO');
  const response = { 
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: pool ? 'connected' : 'disconnected',
    server: 'Express.js 4.18.2 - NOVO',
    ambiente: process.env.NODE_ENV || 'production',
    cors_env: process.env.CORS_ORIGINS || 'NOT SET',
    cors_parsed: allowedOrigins
  };
  console.log('Enviando JSON:', response);
  res.status(200).json(response);
});

// --- Endpoint de Inscrição (Refatorado para DB) ---
app.post('/subscribe', requireDatabase, async (req, res) => {
  console.log(`📨 [DEBUG] Body recebido:`, JSON.stringify(req.body));
  console.log(`📨 [DEBUG] Type de req.body:`, typeof req.body);
  console.log(`📨 [DEBUG] Content-Type header:`, req.headers['content-type']);
  
  const { email } = req.body;
  console.log(`📨 [DEBUG] Email extraído: ${email}`);
  
  if (!email) { return res.status(400).send('O e-mail é obrigatório.'); }
  
  try {
    console.log(`📧 Tentando inscrever: ${email}`);
    const client = await pool.connect();
    console.log(`✅ Conexão obtida do pool`);
    
    try {
      // Verifica se o e-mail já existe
      console.log(`🔍 Verificando se email existe...`);
      const existing = await client.query('SELECT * FROM subscribers WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        console.log(`⚠️ Email já existe: ${email}`);
        return res.status(409).send('Este e-mail já está inscrito.');
      }
      
      // Insere o novo e-mail
      console.log(`➕ Inserindo novo email...`);
      await client.query('INSERT INTO subscribers(email) VALUES($1)', [email]);
      console.log(`✅ Email inserido no banco`);
      
      // Envia e-mail de boas-vindas em background (não aguarda)
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        console.log(`📤 Iniciando envio de email em background...`);
        transporter.sendMail({
            from: `"Ecobot Alertas" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '✅ Inscrição Confirmada no Ecobot Alertas',
            html: `<h2>Olá!</h2><p>Obrigado por se inscrever no sistema de alertas ambientais do Ecobot.</p><p>Você agora receberá e-mails de aviso e de alerta crítico baseados nos dados de nossos sensores.</p><p>Atenciosamente,<br>Equipe Ecobot</p>`
        }).catch(err => console.error(`❌ Erro ao enviar email: ${err.message}`));
      }
      
      res.status(200).send('Inscrito com sucesso! E-mail de confirmação será enviado em breve.');

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Erro ao inscrever e-mail:');
    console.error('Tipo:', error.constructor.name);
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    if (error.code) console.error('Código:', error.code);
    res.status(500).send(`Erro: ${error.message}`);
  }
});

// --- Endpoint de Cancelamento (Refatorado para DB) ---
app.get('/unsubscribe', requireDatabase, async (req, res) => {
  const { email } = req.query;
  if (!email) { return res.status(400).send('O e-mail é obrigatório.'); }
  
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('DELETE FROM subscribers WHERE email = $1', [email]);
      if (result.rowCount > 0) {
        console.log(`E-mail ${email} removido do banco de dados.`);
        return res.status(200).send(`<h1>Inscrição Cancelada</h1><p>O e-mail ${email} foi removido da nossa lista de alertas.</p>`);
      } else {
        return res.status(404).send(`<h1>E-mail Não Encontrado</h1><p>O e-mail ${email} não foi encontrado na nossa lista de inscritos.</p>`);
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao cancelar inscrição:', error);
    res.status(500).send('<h1>Erro no Servidor</h1><p>Não foi possível processar seu pedido.</p>');
  }
});

// --- Endpoint de Histórico de Alertas (Refatorado para DB) ---
app.get('/api/alerts', requireDatabase, async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT nivel, base, mensagens, timestamp FROM alerts ORDER BY timestamp DESC');
      res.status(200).json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao buscar histórico de alertas:', error);
    res.status(500).json({ error: 'Falha ao buscar alertas' });
  }
});

app.get('/api/bases', async (req, res) => {
  try {
    const bases = await getBasesFromDb();
    res.status(200).json(bases);
  } catch (error) {
    console.error('Erro ao listar bases:', error.message);
    res.status(500).json({ error: 'Falha ao carregar bases' });
  }
});

app.post('/api/bases', async (req, res) => {
  const { id, nome, token, lat, lon } = req.body;
  if (!nome || !token) {
    return res.status(400).json({ error: 'O nome e o token são obrigatórios.' });
  }
  const latValue = lat !== undefined && lat !== null && lat !== '' ? parseFloat(lat) : null;
  const lonValue = lon !== undefined && lon !== null && lon !== '' ? parseFloat(lon) : null;

  try {
    if (pool) {
      const client = await pool.connect();
      try {
        if (id) {
          const result = await client.query(
            'UPDATE bases SET nome = $1, token = $2, lat = $3, lon = $4 WHERE id = $5 RETURNING id, nome, token, lat, lon',
            [nome, token, latValue, lonValue, id]
          );
          if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Base não encontrada.' });
          }
          return res.status(200).json(result.rows[0]);
        }
        const result = await client.query(
          'INSERT INTO bases(nome, token, lat, lon) VALUES($1, $2, $3, $4) RETURNING id, nome, token, lat, lon',
          [nome, token, latValue, lonValue]
        );
        return res.status(201).json(result.rows[0]);
      } finally {
        client.release();
      }
    }

    // Fallback para arquivo
    await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
    let bases = [];
    try { bases = JSON.parse(await fs.readFile(BASES_FILE, 'utf8') || '[]'); } catch (e) { bases = []; }
    if (id) {
      const idx = bases.findIndex(b => b.id == id);
      if (idx === -1) return res.status(404).json({ error: 'Base não encontrada.' });
      bases[idx] = { ...bases[idx], nome, token, lat: latValue, lon: lonValue };
      await fs.writeFile(BASES_FILE, JSON.stringify(bases, null, 2));
      return res.status(200).json(bases[idx]);
    }
    const newId = bases.length ? Math.max(...bases.map(b => b.id || 0)) + 1 : 1;
    const newBase = { id: newId, nome, token, lat: latValue, lon: lonValue };
    bases.push(newBase);
    await fs.writeFile(BASES_FILE, JSON.stringify(bases, null, 2));
    return res.status(201).json(newBase);
  } catch (error) {
    console.error('Erro ao salvar base:', error.message);
    res.status(500).json({ error: 'Falha ao salvar a base' });
  }
});

app.delete('/api/bases/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido.' });
  }
  try {
    if (pool) {
      const client = await pool.connect();
      try {
        const result = await client.query('DELETE FROM bases WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Base não encontrada.' });
        return res.status(200).json({ message: 'Base removida com sucesso.' });
      } finally {
        client.release();
      }
    }

    // Fallback arquivo
    await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
    let bases = [];
    try { bases = JSON.parse(await fs.readFile(BASES_FILE, 'utf8') || '[]'); } catch (e) { bases = []; }
    const idx = bases.findIndex(b => b.id == id);
    if (idx === -1) return res.status(404).json({ error: 'Base não encontrada.' });
    bases.splice(idx, 1);
    await fs.writeFile(BASES_FILE, JSON.stringify(bases, null, 2));
    return res.status(200).json({ message: 'Base removida com sucesso.' });
  } catch (error) {
    console.error('Erro ao remover base:', error.message);
    res.status(500).json({ error: 'Falha ao remover a base' });
  }
});

// --- Endpoint de Dados Recentes (sem alteração, pois não usa persistência) ---
app.get('/api/dados-recentes', async (req, res) => {
  let BASES = [];
  if (pool) {
    try {
      BASES = await getBasesFromDb();
    } catch (err) {
      console.error('Erro ao carregar bases do banco de dados:', err.message);
    }
  }
  if (!BASES || BASES.length === 0) {
    BASES = getEnvBaseDefaults();
  }
  const resultados = [];
  for (const base of BASES) {
    if (!base.token) continue;
    try {
      const response = await axios.get('https://api.tago.io/data?qty=5', {
        headers: { 'Device-Token': base.token },
        timeout: 10000
      });
      const dados = Array.isArray(response.data?.result) ? response.data.result : [];
      const getVal = (pref) => {
          const item = dados.find(d => d.variable && d.variable.toLowerCase().includes(pref));
          return item ? parseFloat(String(item.value).replace(',', '.')) : null;
      };
      resultados.push({
        nome: base.nome,
        temp: getVal('temp'),
        umid: getVal('umid'),
        gas: getVal('co2') ?? getVal('gas'),
        timestamp: dados.length > 0 ? dados[0].time : null
      });
    } catch (error) {
      console.error(`Erro ao buscar dados para a base ${base.nome} no endpoint /api/dados-recentes:`, error.message);
      resultados.push({ nome: base.nome, error: 'Não foi possível carregar os dados.' });
    }
  }
  res.json(resultados);
});

// --- Endpoint Proxy para TagO.io (evita CORS no browser) ---
app.get('/api/test-tago', async (req, res) => {
  const { token, qty = 60 } = req.query;
  if (!token) return res.status(400).json({ error: 'Token é obrigatório.' });

  try {
    const response = await axios.get(`https://api.tago.io/data?qty=${qty}`, {
      headers: { 'Device-Token': token },
      timeout: 10000
    });
    res.status(200).json(response.data);
  } catch (error) {
    const status = error.response?.status || 502;
    const msg = error.response?.data || error.message;
    console.error(`Erro no proxy TagO (token: ...${token.slice(-6)}):`, msg);
    res.status(status).json({ error: 'Falha ao contactar a API do TagO.io.', detalhe: msg });
  }
});

// --- Tarefa Agendada ---
scheduleAlertsCron();

const server = app.listen(port, () => {
  console.log(`🚀 Servidor iniciado com sucesso na porta ${port}`);
  console.log(`📊 Health check disponível em http://localhost:${port}/health`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
  console.error('❌ Erro não capturado:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promessa rejeitada não tratada:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM recebido. Encerrando gracefully...');
  server.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
});
