// ================================================
// ⚙️ SERVIDOR EXPRESS - ECOBOT
// ================================================

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ================================================
// 📊 LOGGING
// ================================================

const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);

function writeLog(level, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
}

// ================================================
// 🔒 CORS
// ================================================

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : [
      'http://localhost:3000',
      'http://localhost:8080'
    ];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('CORS não permitido pela política de segurança.'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================================================
// 📁 SERVIR ARQUIVOS ESTÁTICOS
// ================================================

app.use(express.static(__dirname));

// ================================================
// 🏥 HEALTH CHECK
// ================================================

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString() 
  });
});

// ================================================
// 🧪 PROXY TAGO.IO
// ================================================

app.get('/api/test-tago', async (req, res) => {
  try {
    const token = req.query.token;
    
    if (!token) {
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Token não fornecido' 
      });
    }

    const response = await axios.get('https://api.tago.io/data?qty=60', {
      headers: { 
        'Device-Token': token, 
        'Content-Type': 'application/json' 
      }
    });

    res.status(200).json({ 
      sucesso: true, 
      dados: response.data 
    });
    
  } catch (erro) {
    res.status(500).json({ 
      sucesso: false, 
      erro: erro.message 
    });
  }
});

// ================================================
// 📊 STATUS DO SERVIDOR
// ================================================

app.get('/api/status', (req, res) => {
  res.status(200).json({
    status: 'OK',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ================================================
// 📝 LOGS
// ================================================

app.get('/api/logs', (req, res) => {
  try {
    const lines = req.query.lines ? parseInt(req.query.lines) : 50;
    
    if (!fs.existsSync(logFile)) {
      return res.status(200).json({ logs: [], message: 'Nenhum log encontrado' });
    }

    const content = fs.readFileSync(logFile, 'utf-8');
    const logLines = content.split('\n').filter(l => l.trim());
    const recentLogs = logLines.slice(-lines);

    res.status(200).json({
      total: logLines.length,
      showing: recentLogs.length,
      logs: recentLogs
    });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// ================================================
// 🚀 INICIAR SERVIDOR
// ================================================

app.listen(PORT, () => {
  console.log(`\n✅ Servidor Ecobot rodando em http://localhost:${PORT}`);
  console.log(`🔗 Rotas disponíveis:`);
  console.log(`   GET  /api/health      - Verificar saúde do servidor`);
  console.log(`   GET  /api/status      - Status e configuração`);
  console.log(`   GET  /api/logs        - Logs recentes`);
  console.log(`   GET  /api/test-tago   - Testar conexão TagoIO\n`);
  writeLog('INFO', `Servidor iniciado na porta ${PORT}`);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Erro não tratado:', err);
  writeLog('ERROR', `Erro não tratado: ${err}`);
});
