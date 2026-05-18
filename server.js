// ================================================
// ⚙️ CONFIGURAÇÕES INICIAIS
// ================================================

// Importar bibliotecas
const express = require('express');           // Framework web
const nodemailer = require('nodemailer');     // Enviar emails
const cors = require('cors');                 // Permitir requisições de outros sites
const dotenv = require('dotenv');             // Ler arquivo .env
const axios = require('axios');               // Fazer requisições HTTP

// Carregar variáveis do arquivo .env
dotenv.config();

// Criar aplicação Express
const app = express();
const PORT = process.env.PORT || 3001;        // Porta padrão 3001

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
// 📁 SERVIR ARQUIVOS ESTÁTICOS (HTML, CSS, JS, etc)
// ================================================
app.use(express.static(__dirname));  // Servir arquivos do diretório raiz

// ================================================
// 📧 CONFIGURAÇÃO NODEMAILER (Gmail)
// ================================================

// Criar "transportador" - é como um carteiro que entrega seus emails
// CORREÇÃO: Usar porta 587 com TLS (melhor que 465 com SSL para Gmail)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',              // Servidor do Gmail
  port: 587,                           // CORRIGIDO: Porta TLS (não 465)
  secure: false,                       // CORRIGIDO: false para usar TLS
  requireTLS: true,                    // NOVO: Força uso de TLS
  auth: {
    user: process.env.EMAIL_USER,      // Seu email (do arquivo .env)
    pass: process.env.EMAIL_PASS       // Sua senha de app (do arquivo .env)
  },
  tls: {
    rejectUnauthorized: false          // Evita bloqueios de certificado na nuvem
  },
  connectionTimeout: 10000,            // Timeout de conexão: 10s
  socketTimeout: 10000,                // Timeout de socket: 10s
  pool: true,
  maxConnections: 2,
  maxMessages: 10,
  logger: false,                       // Desabilitar logs do nodemailer (muito verbose)
  debug: false                         // Debug desabilitado
});

// Mostrar status da configuração
console.log('\n🔧 CONFIGURAÇÃO DE EMAIL:');
console.log('   EMAIL_USER:', process.env.EMAIL_USER ? '✅ ' + process.env.EMAIL_USER : '❌ NÃO CONFIGURADO');
console.log('   EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Configurado (***' + process.env.EMAIL_PASS.slice(-4) + ')' : '❌ NÃO CONFIGURADO');

// Verificar conexão com Gmail (com timeout melhorado)
const verifyEmailWithTimeout = () => {
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      console.warn('\n⏱️  TIMEOUT: Verificação de email demorou mais de 15 segundos');
      console.warn('   ⚠️  Em Railway/servidor remoto, isso é NORMAL!');
      console.warn('   ✅ O sistema continuará funcionando mesmo com timeout.\n');
      resolve('timeout');
    }, 15000);
  });

  const verifyPromise = new Promise((resolve) => {
    transporter.verify((error, success) => {
      if (error) {
        console.error('\n❌ ERRO NA CONEXÃO COM EMAIL:');
        console.error('   Tipo:', error.code || 'Desconhecido');
        console.error('   Mensagem:', error.message);
        if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
          console.error('   Status: CONNECTION TIMEOUT');
        }
        console.error('\n📌 POSSÍVEIS SOLUÇÕES:');
        console.error('   1. EMAIL_USER: Verifique se é um email Gmail válido');
        console.error('   2. EMAIL_PASS: Use SENHA DE APP (não a senha da conta)');
        console.error('   3. Gere em: https://myaccount.google.com/apppasswords');
        console.error('   4. Em Railway: Erro de conexão é esperado, verifique Logs\n');
        resolve('error');
      } else {
        console.log('\n✅ EMAIL CONECTADO COM SUCESSO!');
        console.log('   Pronto para enviar alertas.\n');
        resolve('success');
      }
    });
  });

  return Promise.race([verifyPromise, timeoutPromise]);
};

// Executar verificação de email ao iniciar
verifyEmailWithTimeout();

// ================================================
// 📝 ROTA 1: ENVIAR ALERTA POR EMAIL
// ================================================

// Quando o frontend faz: POST /api/send-alert
app.post('/api/send-alert', async (req, res) => {
  try {
    // Pegar dados que o frontend enviou
    const { destinatario, assunto, corpo, baseNome, valor, tipo } = req.body;

    console.log('\n📨 REQUISIÇÃO DE EMAIL RECEBIDA');
    console.log('   De:', process.env.EMAIL_USER);
    console.log('   Para:', destinatario);
    console.log('   Tipo:', tipo || 'GERAL');

    // ✅ VALIDAÇÃO 1: Verificar se campos obrigatórios existem
    if (!destinatario || !assunto || !corpo) {
      console.warn('⚠️ ERRO: Campos obrigatórios faltando');
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Email, assunto e corpo são obrigatórios' 
      });
    }

    // ✅ VALIDAÇÃO 2: Verificar se email é válido
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(destinatario)) {
      console.warn('⚠️ ERRO: Email inválido:', destinatario);
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Email inválido' 
      });
    }

    // 🎨 CRIAR EMAIL COM DESIGN BONITO (HTML)
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: 'Poppins', Arial, sans-serif; 
            background: #f5f5f5; 
            margin: 0; 
            padding: 20px; 
          }
          
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 12px; 
            overflow: hidden; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.1); 
          }
          
          .header { 
            background: linear-gradient(135deg, #14b8a6, #0f766e); 
            color: white; 
            padding: 30px; 
            text-align: center; 
          }
          
          .header h1 { 
            margin: 0; 
            font-size: 24px; 
          }
          
          .content { 
            padding: 30px; 
          }
          
          .alert-box { 
            background: #f8d7da; 
            border-left: 4px solid #dc3545; 
            padding: 15px; 
            border-radius: 4px; 
            margin: 15px 0; 
          }
          
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
            margin: 20px 0; 
          }
          
          .info-item { 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 8px; 
          }
          
          .info-label { 
            font-size: 12px; 
            color: #6c757d; 
            text-transform: uppercase; 
            font-weight: bold; 
          }
          
          .info-value { 
            font-size: 18px; 
            font-weight: bold; 
            color: #14b8a6; 
            margin-top: 5px; 
          }
          
          .footer { 
            background: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            font-size: 12px; 
            color: #6c757d; 
            border-top: 1px solid #e9ecef; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- CABEÇALHO DO EMAIL -->
          <div class="header">
            <h1>🚨 ALERTA ECOBOT</h1>
            <p style="margin: 10px 0 0 0;">Sistema de Monitoramento Ambiental</p>
          </div>
          
          <!-- CORPO DO EMAIL -->
          <div class="content">
            <h2>${assunto}</h2>
            
            <!-- Caixa do Alerta -->
            <div class="alert-box">
              ${corpo.replace(/\n/g, '<br>')}
            </div>
            
            <!-- Informações em Grid -->
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Base Monitorada</div>
                <div class="info-value">${baseNome || 'Ecobot'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Tipo de Alerta</div>
                <div class="info-value">${tipo ? tipo.toUpperCase() : 'GERAL'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Valor Registrado</div>
                <div class="info-value">${valor || 'N/D'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Data/Hora</div>
                <div class="info-value">${new Date().toLocaleString('pt-BR')}</div>
              </div>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              <strong>⚠️ Ação Recomendada:</strong><br>
              Acesse o painel de controle Ecobot imediatamente para verificar os detalhes completos.
            </p>
          </div>
          
          <!-- RODAPÉ -->
          <div class="footer">
            <p>© 2026 Projeto Ecobot - Sistema de Monitoramento Ambiental</p>
            <p>Este é um email automático. Não responda diretamente.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Configurar opções do email
    const mailOptions = {
      from: `"Ecobot Alertas" <${process.env.EMAIL_USER}>`,
      to: destinatario,
      subject: assunto,
      html: htmlContent,
      text: corpo,
      headers: {
        'X-Priority': '1',
        'Importance': 'high'
      }
    };

    // 📤 ENVIAR EMAIL
    console.log('📬 Enviando email para Nodemailer...');
    const info = await transporter.sendMail(mailOptions);

    console.log('✅ EMAIL ENVIADO COM SUCESSO!');
    console.log('   Message ID:', info.messageId);
    console.log('   Resposta do servidor:', info.response);

    // ✅ Responder ao frontend que funcionou
    res.status(200).json({ 
      sucesso: true, 
      mensagem: 'Email enviado com sucesso!',
      messageId: info.messageId
    });

  } catch (erro) {
    console.error('\n❌ ERRO AO ENVIAR EMAIL:');
    console.error('   Código de erro:', erro.code);
    console.error('   Mensagem:', erro.message);
    console.error('   Stack completo:', erro.stack);
    
    // ❌ Responder ao frontend que deu erro
    res.status(500).json({ 
      sucesso: false, 
      erro: erro.message,
      dica: 'Verifique EMAIL_USER, EMAIL_PASS e configurações de segurança do Gmail'
    });
  }
});

// ================================================
// 🏥 ROTA 2: VERIFICAR SAÚDE DO SERVIDOR
// ================================================

// Quando o frontend faz: GET /api/health
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString() 
  });
});

// ================================================
// 🧪 ROTA 3: TESTAR TAGO (PROXY)
// ================================================

// Permite testar conexão com Tago.io sem CORS
app.get('/api/test-tago', async (req, res) => {
  try {
    const token = req.query.token;
    
    if (!token) {
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Token não fornecido' 
      });
    }

    // Fazer requisição para Tago.io
    const response = await axios.get('https://api.tago.io/data?qty=1', {
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
  console.log(`\n✅ Servidor Ecobot rodando em http://localhost:${PORT}`);
  console.log(`📧 Email configurado: ${process.env.EMAIL_USER}`);
  console.log(`\n🔗 Rotas disponíveis:`);
  console.log(`   POST /api/send-alert - Enviar alerta por email`);
  console.log(`   GET  /api/test-tago  - Testar conexão TagO`);
  console.log(`   GET  /api/health     - Verificar saúde do servidor\n`);
});

// ================================================
// ⚠️ TRATAMENTO DE ERROS NÃO CAPTURADOS
// ================================================

process.on('unhandledRejection', (err) => {
  console.error('❌ Erro não tratado:', err);
});
