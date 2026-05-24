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
const port = process.env.PORT || 8080;

console.log(`✨ Porta final para listen: ${port}`);

// ── Pool de conexão ────────────────────────────────────────────────────────────
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
      console.log(`✅ Pool de conexão com banco de dados configurado`);
      scheduleAlertsCron();
    })
    .catch(err => {
      console.warn('⚠️ Falha ao conectar ao banco de dados no startup:', err.message);
      candidatePool.end().catch(() => {});
      console.warn('⚠️ Recursos de banco de dados estarão indisponíveis.');
    });
} else {
  console.warn('⚠️ DATABASE_URL e DATABASE_PUBLIC_URL não configuradas.');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// ── CORS ───────────────────────────────────────────────────────────────────────
// FIX: CORS agora permite qualquer origem quando CORS_ORIGINS não está definido,
// em vez de bloquear tudo. Isso resolve o problema do app e do site não
// conseguirem se comunicar com o backend.
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : null; // null = permitir todos

app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem origin (curl, Postman, server-side, app móvel)
    if (!origin) return callback(null, true);
    // Se CORS_ORIGINS não configurado, permite tudo (modo aberto)
    if (!allowedOrigins) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
  }
}));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── Middleware de banco ────────────────────────────────────────────────────────
const requireDatabase = (req, res, next) => {
  if (!pool) {
    return res.status(503).json({
      error: 'Serviço de banco de dados indisponível',
      message: 'DATABASE_URL não foi configurada ou o banco está offline'
    });
  }
  next();
};

// ── Helpers ────────────────────────────────────────────────────────────────────
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
      console.warn('⚠️ Erro ao ler bases do DB, usando fallback de arquivo:', err.message);
    }
  }
  // Fallback: lê do arquivo
  try {
    const txt = await fs.readFile(BASES_FILE, 'utf8');
    return JSON.parse(txt || '[]');
  } catch (err) {
    console.warn('⚠️ Erro ao ler bases.json:', err.message);
    return [];
  }
};

// ── Rotas ──────────────────────────────────────────────────────────────────────
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
  const response = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: pool ? 'connected' : 'disconnected',
    server: 'Express.js',
    ambiente: process.env.NODE_ENV || 'production',
    cors_env: process.env.CORS_ORIGINS || 'aberto (todos permitidos)',
    cors_parsed: allowedOrigins || ['*']
  };
  res.status(200).json(response);
});

// ── Inscrição ──────────────────────────────────────────────────────────────────
app.post('/subscribe', requireDatabase, async (req, res) => {
  const { email } = req.body;
  if (!email) { return res.status(400).send('O e-mail é obrigatório.'); }

  try {
    const client = await pool.connect();
    try {
      const existing = await client.query('SELECT * FROM subscribers WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).send('Este e-mail já está inscrito.');
      }
      await client.query('INSERT INTO subscribers(email) VALUES($1)', [email]);

      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
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
    console.error('❌ Erro ao inscrever e-mail:', error.message);
    res.status(500).send(`Erro: ${error.message}`);
  }
});

// ── Cancelamento ───────────────────────────────────────────────────────────────
app.get('/unsubscribe', requireDatabase, async (req, res) => {
  const { email } = req.query;
  if (!email) { return res.status(400).send('O e-mail é obrigatório.'); }

  try {
    const client = await pool.connect();
    try {
      const result = await client.query('DELETE FROM subscribers WHERE email = $1', [email]);
      if (result.rowCount > 0) {
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

// ── Preferências ───────────────────────────────────────────────────────────────
app.get('/api/preferences', requireDatabase, async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'E-mail obrigatório.' });
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT alertar_temp, alertar_umid, alertar_gas, alertar_offline, alertar_recuperacao
       FROM subscriber_preferences WHERE email = $1`,
      [email]
    );
    if (rows.length === 0) {
      return res.json({ alertar_temp: true, alertar_umid: true, alertar_gas: true, alertar_offline: true, alertar_recuperacao: true });
    }
    res.json(rows[0]);
  } finally { client.release(); }
});

app.post('/api/preferences', requireDatabase, async (req, res) => {
  const { email, alertar_temp, alertar_umid, alertar_gas, alertar_offline, alertar_recuperacao } = req.body;
  if (!email) return res.status(400).json({ error: 'E-mail obrigatório.' });
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT email FROM subscribers WHERE email = $1', [email]);
    if (rows.length === 0) return res.status(404).json({ error: 'E-mail não encontrado na lista de inscritos.' });

    await client.query(
      `INSERT INTO subscriber_preferences(email, alertar_temp, alertar_umid, alertar_gas, alertar_offline, alertar_recuperacao, updated_at)
       VALUES($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT(email) DO UPDATE SET
         alertar_temp        = EXCLUDED.alertar_temp,
         alertar_umid        = EXCLUDED.alertar_umid,
         alertar_gas         = EXCLUDED.alertar_gas,
         alertar_offline     = EXCLUDED.alertar_offline,
         alertar_recuperacao = EXCLUDED.alertar_recuperacao,
         updated_at          = NOW()`,
      [email,
       alertar_temp        ?? true,
       alertar_umid        ?? true,
       alertar_gas         ?? true,
       alertar_offline     ?? true,
       alertar_recuperacao ?? true]
    );
    res.json({ ok: true });
  } finally { client.release(); }
});

// ── Alertas ────────────────────────────────────────────────────────────────────
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

// ── Bases ──────────────────────────────────────────────────────────────────────
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
    return res.status(503).json({ error: 'Banco de dados indisponível.' });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Já existe uma base com esse nome.' });
    }
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
    return res.status(503).json({ error: 'Banco de dados indisponível.' });
  } catch (error) {
    console.error('Erro ao remover base:', error.message);
    res.status(500).json({ error: 'Falha ao remover a base' });
  }
});

// ── Dados Recentes ─────────────────────────────────────────────────────────────
app.get('/api/dados-recentes', async (req, res) => {
  let BASES = [];
  try {
    BASES = await getBasesFromDb();
  } catch (err) {
    console.error('Erro ao carregar bases do banco de dados:', err.message);
    return res.status(503).json({ error: 'Banco de dados indisponível.' });
  }
  if (!BASES || BASES.length === 0) {
    return res.status(200).json([]);
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

      // usa o timestamp real do dado mais recente do TagO
      const timestampMaisRecente = dados.length > 0 ? dados[0].time : null;

      // retorna sempre os dados disponíveis (últimos 5 valores)
      resultados.push({
        nome:      base.nome,
        temp:      getVal('temp'),
        umid:      getVal('umid'),
        gas:       getVal('co2') ?? getVal('gas'),
        timestamp: timestampMaisRecente,
        dados:     dados.slice(0, 5) // últimos 5 valores
      });
    } catch (error) {
      console.error(`Erro ao buscar dados para a base ${base.nome}:`, error.message);
      resultados.push({ nome: base.nome, temp: null, umid: null, gas: null, timestamp: null, dados: [] });
    }
  }
  res.json(resultados);
});

// ── Proxy TagO.io ──────────────────────────────────────────────────────────────
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

// ── Start ──────────────────────────────────────────────────────────────────────
const server = app.listen(port, () => {
  console.log(`🚀 Servidor iniciado com sucesso na porta ${port}`);
  console.log(`📊 Health check disponível em http://localhost:${port}/health`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Erro não capturado:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promessa rejeitada não tratada:', reason);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM recebido. Encerrando gracefully...');
  server.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
});
