// ================================================
// ⚙️ CONFIGURAÇÕES INICIAIS
// ================================================
const express = require('express');           
const cors = require('cors');                 
const dotenv = require('dotenv');             
const axios = require('axios');               

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;        

// ================================================
// 🔒 CONFIGURAÇÃO CORS (Segurança do Site)
// ================================================
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:8080',
      'http://127.0.0.1:8080'
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
// 🚀 ROTAS (Sem Nodemailer, Sem bloqueios!)
// ================================================

// 🏥 ROTA 1: VERIFICAR SAÚDE DO SERVIDOR
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    sistema_alertas: 'Delegado para GitHub Actions',
    timestamp: new Date().toISOString() 
  });
});

// 🧪 ROTA 2: TESTAR TAGO (PROXY)
app.get('/api/test-tago', async (req, res) => {
  try {
    const token = req.query.token;
    const qty = req.query.qty || 1; 
    
    if (!token) {
      return res.status(400).json({ sucesso: false, erro: 'Token não fornecido' });
    }

    const response = await axios.get(`https://api.tago.io/data?qty=${qty}`, {
      headers: { 'Device-Token': token, 'Content-Type': 'application/json' }
    });

    res.status(200).json({ sucesso: true, dados: response.data });
    
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
});

// ================================================
// 🚀 INICIAR SERVIDOR
// ================================================
app.listen(PORT, () => {
  console.log(`\n✅ Servidor Ecobot rodando na porta ${PORT}`);
  console.log(`☁️  Sistema de Emails movido para o GitHub Actions`);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Erro não tratado:', err);
});
