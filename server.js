require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
const port = process.env.PORT || 8080; // Padrão para Railway é 8080

console.log(`✨ Porta final para listen: ${port}`);

// Configuração do Pool de Conexões (permitir ser undefined inicialmente)
let pool = null;

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    console.log('✅ Pool de conexão com banco de dados configurado');
  } catch (err) {
    console.warn('⚠️ Erro ao configurar pool de banco de dados:', err.message);
  }
} else {
  console.warn('⚠️ DATABASE_URL não configurada. Recursos de banco de dados estarão indisponíveis.');
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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: pool ? 'connected' : 'disconnected'
  });
});

// --- Endpoint de Inscrição (Refatorado para DB) ---
app.post('/subscribe', requireDatabase, async (req, res) => {
  const { email } = req.body;
  if (!email) { return res.status(400).send('O e-mail é obrigatório.'); }
  
  try {
    const client = await pool.connect();
    try {
      // Verifica se o e-mail já existe
      const existing = await client.query('SELECT * FROM subscribers WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).send('Este e-mail já está inscrito.');
      }
      
      // Insere o novo e-mail
      await client.query('INSERT INTO subscribers(email) VALUES($1)', [email]);
      
      // Envia e-mail de boas-vindas (apenas se EMAIL_USER estiver configurado)
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail({
            from: `"Ecobot Alertas" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '✅ Inscrição Confirmada no Ecobot Alertas',
            html: `<h2>Olá!</h2><p>Obrigado por se inscrever no sistema de alertas ambientais do Ecobot.</p><p>Você agora receberá e-mails de aviso e de alerta crítico baseados nos dados de nossos sensores.</p><p>Atenciosamente,<br>Equipe Ecobot</p>`
        });
        console.log(`E-mail de boas-vindas enviado para ${email}`);
      }
      
      res.status(200).send('Inscrito com sucesso! E-mail de confirmação enviado.');

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao inscrever e-mail:', error);
    res.status(500).send('Ocorreu um erro no servidor.');
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

// --- Endpoint de Dados Recentes (sem alteração, pois não usa persistência) ---
app.get('/api/dados-recentes', async (req, res) => {
  const BASES = [
    { id: 1, nome: 'EEEPDJWM', token: process.env.TAGO_TOKEN_1 },
    { id: 2, nome: 'EEEPDJWM 2.0', token: process.env.TAGO_TOKEN_2 }
  ];
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
        co2: getVal('co2') ?? getVal('gas'),
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

// --- Tarefa Agendada (sem alteração aqui) ---
cron.schedule('*/5 * * * *', () => {
  console.log('Executando a verificação de alertas via cron...');
  exec('node check-alerts.js', (err, stdout, stderr) => {
    if (err) { console.error('Erro ao executar check-alerts.js:', err); return; }
    if (stdout) { console.log('Saída de check-alerts.js:', stdout); }
    if (stderr) { console.error('Erros de check-alerts.js:', stderr); }
  });
});

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
