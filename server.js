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

// Variável para monitorar erros
let mailErrors = [];

// ================================================
// 🔒 CONFIGURAÇÃO CORS (Controle de Origem)
// ================================================

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      'https://web-production-7eff7.up.railway.app',
      'file://'
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
app.use(express.json({ limit: '10kb' })); // Limitar tamanho de payload por segurança
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ================================================
// 🛡️ FUNÇÕES DE VALIDAÇÃO E SEGURANÇA
// ================================================

// Validar email
const validarEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email) && email.length <= 255;
};

// Sanitizar string (remover caracteres perigosos)
const sanitizar = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, 1000); // Limitar a 1000 caracteres
};

// Logger estruturado
const logger = {
  info: (msg) => console.log(`✅ [${new Date().toISOString()}] ${msg}`),
  warn: (msg) => console.warn(`⚠️ [${new Date().toISOString()}] ${msg}`),
  error: (msg, err) => console.error(`❌ [${new Date().toISOString()}] ${msg}`, err?.message || ''),
  debug: (msg) => process.env.DEBUG === 'true' && console.log(`🐛 [${new Date().toISOString()}] ${msg}`)
};

// ================================================
// 📧 CONFIGURAÇÃO NODEMAILER (Gmail)
// ================================================

// Criar "transportador" - é como um carteiro que entrega seus emails
const transporter = nodemailer.createTransport({
  service: 'gmail',                    // Usar serviço Gmail
  auth: {
    user: process.env.EMAIL_USER,      // Seu email (do arquivo .env)
    pass: process.env.EMAIL_PASS       // Sua senha de app (do arquivo .env)
  },
  pool: true,                          // Usar conexão reutilizável
  maxConnections: 1,                   // Máximo 1 conexão simultânea
  maxMessages: 5,                      // Máximo 5 mensagens por conexão
  rateDelta: 20000,                    // Intervalo entre mensagens
  rateLimit: 5                         // Limite de taxa
});

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  logger.warn('EMAIL_USER ou EMAIL_PASS não estão configurados');
}

transporter.verify((error, success) => {
  if (error) {
    logger.error('Erro ao verificar transportador de email', error);
  } else {
    logger.info('Nodemailer pronto para enviar emails');
  }
});

// ================================================
// � ROTA 1B: ENVIAR ALERTA PARA MÚLTIPLOS EMAILS (NÃO ESSENCIAL)
// ================================================

app.post('/api/send-alert-batch', async (req, res) => {
  try {
    const { destinatarios, assunto, corpo, baseNome, valor, tipo } = req.body;

    // Validar input
    if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Envie uma array com pelo menos 1 email' 
      });
    }

    // Validar todos os emails
    const emailsValidos = destinatarios.filter(email => validarEmail(email));
    if (emailsValidos.length === 0) {
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Nenhum email válido na lista' 
      });
    }

    // Enviar para cada email (sequencialmente para não sobrecarregar)
    const resultados = [];
    for (const email of emailsValidos) {
      try {
        // Reutilizar a lógica do send-alert
        const response = await axios.post('http://localhost:' + PORT + '/api/send-alert', {
          destinatario: email,
          assunto,
          corpo,
          baseNome,
          valor,
          tipo
        }, { timeout: 10000 });
        resultados.push({ email, sucesso: response.data.sucesso });
      } catch (err) {
        resultados.push({ email, sucesso: false, erro: err.message });
      }
    }

    const sucessos = resultados.filter(r => r.sucesso).length;
    logger.info(`Enviados ${sucessos}/${resultados.length} emails`);

    res.status(200).json({
      sucesso: sucessos > 0,
      mensagem: `${sucessos} de ${resultados.length} emails enviados`,
      resultados
    });

  } catch (erro) {
    logger.error('Erro ao enviar emails em batch', erro);
    res.status(500).json({ 
      sucesso: false, 
      erro: 'Erro ao enviar emails'
    });
  }
});

// ================================================
// �📝 ROTA 1: ENVIAR ALERTA POR EMAIL
// ================================================

// Quando o frontend faz: POST /api/send-alert
app.post('/api/send-alert', async (req, res) => {
  try {
    // Pegar e sanitizar dados que o frontend enviou
    let { destinatario, assunto, corpo, baseNome, valor, tipo } = req.body;
    
    destinatario = sanitizar(destinatario);
    assunto = sanitizar(assunto);
    corpo = sanitizar(corpo);
    baseNome = sanitizar(baseNome) || 'Ecobot';
    tipo = sanitizar(tipo) || 'GERAL';

    // ✅ VALIDAÇÃO 1: Verificar se campos obrigatórios existem
    if (!destinatario || !assunto || !corpo) {
      logger.warn(`Validação falhou: campos obrigatórios faltando`);
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Email, assunto e corpo são obrigatórios' 
      });
    }

    // ✅ VALIDAÇÃO 2: Verificar se email é válido
    if (!validarEmail(destinatario)) {
      logger.warn(`Email inválido: ${destinatario}`);
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
      from: `"Ecobot Alertas" <${process.env.EMAIL_USER}>`,  // Quem envia
      to: destinatario,                                        // Para quem envia
      subject: assunto,                                        // Assunto do email
      html: htmlContent,                                       // Corpo em HTML
      text: corpo,                                             // Versão em texto simples
      headers: {
        'X-Priority': '1',                                     // Email de alta prioridade
        'Importance': 'high'
      }
    };

    // 📤 ENVIAR EMAIL
    logger.debug(`Enviando email para: ${destinatario}`);
    const info = await transporter.sendMail(mailOptions);

    // ✅ Responder ao frontend que funcionou
    logger.info(`Email enviado com sucesso para: ${destinatario}`);
    res.status(200).json({ 
      sucesso: true, 
      mensagem: 'Email enviado com sucesso',
      messageId: info.messageId
    });

  } catch (erro) {
    logger.error('Erro ao enviar email', erro);
    
    // ❌ Responder ao frontend que deu erro
    res.status(500).json({ 
      sucesso: false, 
      erro: process.env.DEBUG === 'true' ? erro.message : 'Erro ao enviar email'
    });
  }
});

// ================================================
// 🏥 ROTA 2: VERIFICAR SAÚDE DO SERVIDOR
// ================================================

// Quando o frontend faz: GET /api/health
app.get('/api/health', (req, res) => {
  const status = {
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
    serverPort: PORT
  };
  logger.debug('Health check solicitado');
  res.status(200).json(status);
});

// ================================================
// 🧪 ROTA 3: TESTAR TAGO (PROXY)
// ================================================

// Permite testar conexão com Tago.io sem CORS
app.get('/api/test-tago', async (req, res) => {
  try {
    const token = sanitizar(req.query.token);
    
    if (!token || token.length < 10) {
      logger.warn('Teste Tago sem token válido');
      return res.status(400).json({ 
        sucesso: false, 
        erro: 'Token não fornecido ou inválido' 
      });
    }

    // Fazer requisição para Tago.io com timeout
    const axiosConfig = {
      headers: { 
        'Device-Token': token, 
        'Content-Type': 'application/json' 
      },
      timeout: parseInt(process.env.AXIOS_TIMEOUT) || 10000
    };

    const response = await axios.get('https://api.tago.io/data?qty=1', axiosConfig);

    logger.info('Teste Tago bem-sucedido');
    res.status(200).json({ 
      sucesso: true, 
      dados: response.data 
    });
    
  } catch (erro) {
    logger.error('Erro ao testar Tago', erro);
    res.status(500).json({ 
      sucesso: false, 
      erro: erro.code === 'ECONNABORTED' ? 'Timeout na conexão' : erro.message 
    });
  }
});

// ================================================
// 🚀 INICIAR SERVIDOR
// ================================================

const server = app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     ✅ SERVIDOR ECOBOT ATIVO          ║');
  console.log('╚════════════════════════════════════════╝\n');
  logger.info(`Servidor rodando em http://localhost:${PORT}`);
  logger.info(`Email: ${process.env.EMAIL_USER}`);
  logger.info(`Ambiente: ${process.env.NODE_ENV || 'desenvolvimento'}`);
  console.log('\n📍 ROTAS DISPONÍVEIS:');
  console.log('   POST /api/send-alert       - Enviar alerta por email');
  console.log('   POST /api/send-alert-batch - Enviar para múltiplos emails (NÃO ESSENCIAL)');
  console.log('   GET  /api/health           - Verificar saúde do servidor');
  console.log('   GET  /api/test-tago        - Testar conexão TagoIO\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.warn('SIGTERM recebido. Encerrando servidor...');
  server.close(() => {
    logger.info('Servidor encerrado');
    process.exit(0);
  });
});

// ================================================
// ⚠️ TRATAMENTO DE ERROS NÃO CAPTURADOS
// ================================================

process.on('unhandledRejection', (err) => {
  console.error('❌ Erro não tratado:', err);
});
