// ================================================
// ⚙️ CONFIGURAÇÕES INICIAIS
// ================================================

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ================================================
// 🔒 CONFIGURAÇÃO CORS
// ================================================

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      'https://web-production-7eff7up.railway.app'
    ];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('CORS não permitido'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================================================
// 📧 CONFIGURAÇÃO NODEMAILER - CORRIGIDA
// ================================================

// ✅ VALIDAR CREDENCIAIS
const emailUser = (process.env.EMAIL_USER || '').trim();
const emailPass = (process.env.EMAIL_PASS || '').trim();

if (!emailUser || !emailPass) {
  console.error('\n❌ ERRO CRÍTICO:');
  console.error('   EMAIL_USER ou EMAIL_PASS não estão configurados no .env');
  console.error('   Verifique se o arquivo .env existe e contém as credenciais\n');
  process.exit(1);
}

console.log('\n✅ Credenciais carregadas com sucesso:');
console.log(`   Email: ${emailUser}`);
console.log(`   Senha: ${emailPass.substring(0, 4)}${'*'.repeat(emailPass.length - 4)}\n`);

// ✅ CRIAR TRANSPORTER COM CONFIGURAÇÃO CORRETA (PORTA 587)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,                    // ✅ USAR 587, NÃO 465
  secure: false,                // ✅ false PARA 587
  requireTLS: true,             // ✅ FORÇAR TLS EXPLICITAMENTE
  auth: {
    user: emailUser,
    pass: emailPass               // ✅ APP PASSWORD SEM ESPAÇOS
  },
  logger: true,                 // ✅ LOGS PARA DEBUG
  debug: true,
  connectionUrl: 'smtp://smtp.gmail.com:587'
});

// ✅ VERIFICAR CONEXÃO
transporter.verify((error, success) => {
  if (error) {
    console.error('\n❌ ERRO ao conectar com Gmail:');
    console.error(`   ${error.message}\n`);
    
    if (error.message.includes('Invalid login')) {
      console.error('   💡 Solução: A senha está incorreta ou contém espaços');
      console.error('   Verifique se está usando a App Password (não a senha normal)\n');
    }
    if (error.message.includes('535')) {
      console.error('   💡 Solução: Email/Senha inválidos');
      console.error('   Gere uma nova App Password em: https://myaccount.google.com/apppasswords\n');
    }
  } else {
    console.log('✅ Conexão com Gmail ATIVA e PRONTA para enviar emails!\n');
  }
});

// ================================================
// 📧 ROTA: ENVIAR ALERTA POR EMAIL
// ================================================

app.post('/api/send-alert', async (req, res) => {
  try {
    console.log('\n📧 REQUISIÇÃO RECEBIDA - Processando alerta...');
    
    const { destinatario, assunto, corpo, baseNome, valor, tipo } = req.body;

    // ✅ VALIDAÇÕES
    if (!destinatario) {
      console.error('   ❌ Falta: destinatario');
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Email destinatário é obrigatório' 
      });
    }

    if (!assunto) {
      console.error('   ❌ Falta: assunto');
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Assunto é obrigatório' 
      });
    }

    if (!corpo) {
      console.error('   ❌ Falta: corpo');
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Corpo do email é obrigatório' 
      });
    }

    // ✅ VALIDAR EMAIL
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(destinatario)) {
      console.error(`   ❌ Email inválido: ${destinatario}`);
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Formato de email inválido' 
      });
    }

    console.log(`   ✅ Para: ${destinatario}`);
    console.log(`   ✅ Assunto: ${assunto}`);
    console.log(`   ✅ Tipo: ${tipo || 'geral'}`);

    // ✅ CRIAR HTML DO EMAIL
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          }
          .header {
            background: linear-gradient(135deg, #14b8a6 0%, #0f766e 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
          }
          .header h1 {
            font-size: 28px;
            margin-bottom: 8px;
            font-weight: 700;
          }
          .header p {
            font-size: 14px;
            opacity: 0.9;
          }
          .content {
            padding: 30px;
          }
          .alert-box {
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1));
            border-left: 5px solid #ef4444;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            line-height: 1.6;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 25px 0;
          }
          .info-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #14b8a6;
          }
          .info-label {
            font-size: 11px;
            color: #666;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.5px;
          }
          .info-value {
            font-size: 16px;
            font-weight: 600;
            color: #14b8a6;
            margin-top: 8px;
          }
          .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #eee;
          }
          .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, #14b8a6, transparent);
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 ALERTA ECOBOT</h1>
            <p>Sistema de Monitoramento Ambiental Inteligente</p>
          </div>
          
          <div class="content">
            <h2 style="color: #333; margin-bottom: 15px;">${assunto}</h2>
            <div class="divider"></div>
            
            <div class="alert-box">
              <strong style="color: #ef4444;">⚠️ ALERTA DETECTADO</strong>
              <p style="margin-top: 10px; white-space: pre-wrap;">${corpo.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
            </div>
            
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">📍 Base Monitorada</div>
                <div class="info-value">${baseNome || 'Ecobot'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">🚨 Tipo de Alerta</div>
                <div class="info-value">${tipo ? tipo.toUpperCase() : 'GERAL'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">📊 Valor Registrado</div>
                <div class="info-value">${valor || 'N/D'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">⏰ Data/Hora</div>
                <div class="info-value">${new Date().toLocaleString('pt-BR')}</div>
              </div>
            </div>
            
            <div class="divider"></div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px; line-height: 1.6;">
              <strong style="color: #14b8a6;">✅ Recomendação:</strong><br>
              Acesse o painel de controle Ecobot imediatamente para verificar os detalhes completos e tomar as ações necessárias.
            </p>
          </div>
          
          <div class="footer">
            <p><strong>Projeto Ecobot</strong> - Sistema de Monitoramento Ambiental</p>
            <p>© 2026 - Todos os direitos reservados</p>
            <p style="margin-top: 10px; font-size: 11px;">Este é um email automático. Não responda diretamente.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // ✅ CONFIGURAR EMAIL
    const mailOptions = {
      from: emailUser,                          // ✅ USAR DIRETO, SEM FORMATO "Nome <email>"
      to: destinatario,
      subject: assunto,
      html: htmlContent,
      text: corpo,
      replyTo: emailUser,
      headers: {
        'X-Priority': '1',
        'Importance': 'high',
        'X-MSMail-Priority': 'High'
      }
    };

    // 📤 ENVIAR EMAIL
    console.log('   🔄 Conectando ao Gmail...');
    const info = await transporter.sendMail(mailOptions);

    console.log(`   ✅ EMAIL ENVIADO COM SUCESSO!`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}\n`);

    res.status(200).json({ 
      sucesso: true, 
      mensagem: 'Email enviado com sucesso',
      messageId: info.messageId
    });

  } catch (erro) {
    console.error('\n❌ ERRO AO ENVIAR EMAIL:');
    console.error(`   Código: ${erro.code}`);
    console.error(`   Mensagem: ${erro.message}\n`);

    // ✅ DIAGNÓSTICO AUTOMÁTICO
    if (erro.message.includes('Invalid login') || erro.message.includes('535')) {
      console.error('   💡 DIAGNÓSTICO: Problema de autenticação');
      console.error('   → Verifique EMAIL_USER e EMAIL_PASS no arquivo .env');
      console.error('   → Certifique-se de que EMAIL_PASS é uma App Password');
      console.error('   → App Password deve ter 16 caracteres SEM ESPAÇOS\n');
    }

    if (erro.message.includes('connect ECONNREFUSED') || erro.message.includes('getaddrinfo')) {
      console.error('   💡 DIAGNÓSTICO: Problema de conexão de rede');
      console.error('   → Verifique sua conexão com a internet');
      console.error('   → Verifique se o firewall permite porta 587\n');
    }

    if (erro.message.includes('timeout')) {
      console.error('   💡 DIAGNÓSTICO: Tempo limite excedido');
      console.error('   → Gmail está demorando para responder');
      console.error('   → Tente novamente em alguns segundos\n');
    }

    res.status(500).json({ 
      sucesso: false, 
      erro: erro.message,
      dica: 'Verifique os logs do servidor para diagnóstico'
    });
  }
});

// ================================================
// 🏥 ROTA: HEALTH CHECK
// ================================================

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    servidor: 'Ecobot',
    email_configurado: !!emailUser,
    timestamp: new Date().toISOString()
  });
});

// ================================================
// 🧪 ROTA: TESTAR TAGO.IO
// ================================================

app.get('/api/test-tago', async (req, res) => {
  try {
    const token = req.query.token;
    const qty = req.query.qty || '1';
    
    if (!token) {
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Token Tago.io não fornecido' 
      });
    }

    const response = await axios.get(`https://api.tago.io/data?qty=${qty}`, {
      headers: { 
        'Device-Token': token,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    res.status(200).json({ 
      sucesso: true,
      result: response.data.result || response.data,
      dados: response.data
    });
    
  } catch (erro) {
    console.error('❌ Erro ao testar Tago:', erro.message);
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
  console.log('\n' + '='.repeat(60));
  console.log('🚀 SERVIDOR ECOBOT INICIADO COM SUCESSO');
  console.log('='.repeat(60));
  console.log(`\n📌 URL: http://localhost:${PORT}`);
  console.log(`\n🌐 ROTAS DISPONÍVEIS:`);
  console.log(`   POST /api/send-alert    → Enviar alerta por email`);
  console.log(`   GET  /api/test-tago     → Testar conexão Tago.io`);
  console.log(`   GET  /api/health        → Verificar saúde do servidor`);
  console.log(`\n📧 CONFIGURAÇÃO DE EMAIL:`);
  console.log(`   Host: smtp.gmail.com`);
  console.log(`   Porta: 587 (TLS)`);
  console.log(`   Email: ${emailUser}`);
  console.log('\n' + '='.repeat(60) + '\n');
});

// ================================================
// ⚠️ TRATAMENTO DE ERROS
// ================================================

process.on('unhandledRejection', (err) => {
  console.error('❌ Erro não tratado:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Exceção não capturada:', err);
  process.exit(1);
});
