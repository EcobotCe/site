// ================================================
// ⚙️ CONFIGURAÇÕES INICIAIS
// ================================================

// Importar bibliotecas
const express = require('express');           
const cors = require('cors');                 
const dotenv = require('dotenv');             
const axios = require('axios');               

// Carregar variáveis do arquivo .env
dotenv.config();

// Criar aplicação Express
const app = express();
const PORT = process.env.PORT || 3001;        

// ================================================
// 🔒 CONFIGURAÇÃO CORS (Controle de Origem)
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

// Middleware para ler JSON
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
// Permite testar conexão com Tago.io sem CORS
app.get('/api/test-tago', async (req, res) => {
  try {
    const token = req.query.token;
    const qty = req.query.qty || 1; // Permite puxar múltiplos dados para o gráfico
    
    if (!token) {
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Token não fornecido' 
      });
    }

    // Fazer requisição para Tago.io
    const response = await axios.get(`https://api.tago.io/data?qty=${qty}`, {
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
// 🚀 INICIAR SERVIDOR
// ================================================

app.listen(PORT, () => {
  console.log(`\n✅ Servidor Ecobot rodando na porta ${PORT}`);
  console.log(`☁️  Sistema de Emails movido para o GitHub Actions (Sem erros de Timeout)`);
  console.log(`\n🔗 Rotas ativas:`);
  console.log(`   GET  /api/health     - Verificar saúde do servidor`);
  console.log(`   GET  /api/test-tago  - Fornecer dados ao Gráfico\n`);
});

// ================================================
// ⚠️ TRATAMENTO DE ERROS NÃO CAPTURADOS
// ================================================

process.on('unhandledRejection', (err) => {
  console.error('❌ Erro não tratado:', err);
});
