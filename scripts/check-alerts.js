// ================================================
// 🚨 VERIFICADOR AUTOMÁTICO DE ALERTAS
// ================================================

const nodemailer = require('nodemailer');
const axios = require('axios');
require('dotenv').config();

// ================================================
// ⚙️ CONFIGURAÇÕES
// ================================================

const LIMIARES = {
  temp_critica: 35,
  temp_aviso: 30,
  umi_critica: 30,
  umi_aviso: 40,
  co2_critica: 10,
  co2_aviso: 5,
  queimada_temp: 32,
  queimada_umi: 40
};

const BASES = [
  { 
    id: 1, 
    nome: 'EEEPDJWM', 
    token: process.env.TAGO_TOKEN_1 
  },
  { 
    id: 2, 
    nome: 'EEEPDJWM 2.0', 
    token: process.env.TAGO_TOKEN_2 
  }
];

const EMAILS_DESTINO = (process.env.ALERT_EMAILS || '')
  .split(',')
  .map(e => e.trim())
  .filter(e => e);

// ================================================
// 📧 CONFIGURAR EMAIL
// ================================================

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ================================================
// 🔍 VERIFICAR BASE
// ================================================

async function verificarBase(base) {
  try {
    console.log(`\n📍 Verificando base: ${base.nome}...`);

    const response = await axios.get('https://api.tago.io/data?qty=60', {
      headers: {
        'Device-Token': base.token,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    const dados = response.data.result || [];

    const normalize = (value) => value ? value.toString().toLowerCase().trim() : '';
    
    const temp = dados
      .filter(d => /temp|temperatura/.test(normalize(d.variable)))
      .reverse()[0];
    
    const umi = dados
      .filter(d => /umid|humidity/.test(normalize(d.variable)))
      .reverse()[0];
    
    const co2 = dados
      .filter(d => /gas|mq|co2/.test(normalize(d.variable)))
      .reverse()[0];

    const safeParse = (val) => {
      if (!val) return null;
      const num = parseFloat(String(val).replace(',', '.').trim());
      return isNaN(num) ? null : num;
    };

    const tempVal = safeParse(temp?.value);
    const umiVal = safeParse(umi?.value);
    const co2Val = safeParse(co2?.value);

    console.log(`   Temperatura: ${tempVal}°C | Umidade: ${umiVal}% | CO2: ${co2Val} ppm`);

    const alertas = [];

    // 🌡️ TEMPERATURA
    if (tempVal !== null) {
      if (tempVal > LIMIARES.temp_critica) {
        alertas.push({
          tipo: 'TEMPERATURA CRÍTICA',
          nivel: 'critica',
          emoji: '🚨',
          mensagem: `Temperatura ${tempVal}°C (limite: ${LIMIARES.temp_critica}°C)`
        });
      } else if (tempVal > LIMIARES.temp_aviso) {
        alertas.push({
          tipo: 'TEMPERATURA AVISO',
          nivel: 'aviso',
          emoji: '⚠️',
          mensagem: `Temperatura ${tempVal}°C (limite: ${LIMIARES.temp_aviso}°C)`
        });
      }
    }

    // 💧 UMIDADE
    if (umiVal !== null) {
      if (umiVal < LIMIARES.umi_critica) {
        alertas.push({
          tipo: 'UMIDADE CRÍTICA',
          nivel: 'critica',
          emoji: '🚨',
          mensagem: `Umidade ${umiVal}% (limite: ${LIMIARES.umi_critica}%)`
        });
      } else if (umiVal < LIMIARES.umi_aviso) {
        alertas.push({
          tipo: 'UMIDADE BAIXA',
          nivel: 'aviso',
          emoji: '⚠️',
          mensagem: `Umidade ${umiVal}% (limite: ${LIMIARES.umi_aviso}%)`
        });
      }
    }

    // 💨 CO2
    if (co2Val !== null) {
      if (co2Val > LIMIARES.co2_critica) {
        alertas.push({
          tipo: 'CO₂ CRÍTICO',
          nivel: 'critica',
          emoji: '🚨',
          mensagem: `CO₂ ${co2Val} ppm (limite: ${LIMIARES.co2_critica} ppm)`
        });
      } else if (co2Val > LIMIARES.co2_aviso) {
        alertas.push({
          tipo: 'CO₂ ELEVADO',
          nivel: 'aviso',
          emoji: '⚠️',
          mensagem: `CO₂ ${co2Val} ppm (limite: ${LIMIARES.co2_aviso} ppm)`
        });
      }
    }

    // 🔥 RISCO DE QUEIMADA
    if (tempVal !== null && umiVal !== null) {
      if (tempVal >= LIMIARES.queimada_temp && umiVal <= LIMIARES.queimada_umi) {
        alertas.push({
          tipo: 'RISCO DE QUEIMADA',
          nivel: 'critica',
          emoji: '🔥',
          mensagem: `Temperatura ${tempVal}°C + Umidade ${umiVal}% = RISCO ALTO`
        });
      }
    }

    if (alertas.length > 0) {
      console.log(`   ⚠️ ${alertas.length} alerta(s) detectado(s)`);
      
      for (const alerta of alertas) {
        await enviarEmail(base, alerta, {
          temp: tempVal,
          umi: umiVal,
          co2: co2Val
        });
      }
    } else {
      console.log(`   ✅ Nenhum alerta detectado`);
    }

    return alertas;

  } catch (erro) {
    console.error(`   ❌ Erro ao verificar ${base.nome}:`, erro.message);
    return [];
  }
}

// ================================================
// 📧 ENVIAR EMAIL
// ================================================

async function enviarEmail(base, alerta, dados) {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
          .header { 
            background: ${alerta.nivel === 'critica' ? 'linear-gradient(135deg, #dc3545, #c82333)' : 'linear-gradient(135deg, #f59e0b, #d97706)'};
            color: white; 
            padding: 30px; 
            text-align: center; 
          }
          .content { padding: 30px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .info-item { background: #f8f9fa; padding: 15px; border-radius: 8px; }
          .info-label { font-size: 12px; color: #6c757d; text-transform: uppercase; font-weight: bold; }
          .info-value { font-size: 18px; font-weight: bold; color: #14b8a6; margin-top: 5px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${alerta.emoji} ${alerta.tipo}</h1>
            <p>Sistema de Monitoramento Ecobot</p>
          </div>
          
          <div class="content">
            <h2>Alerta na Base: <strong>${base.nome}</strong></h2>
            <p style="font-size: 16px; color: #666;">${alerta.mensagem}</p>
            
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Temperatura</div>
                <div class="info-value">${dados.temp !== null ? dados.temp + '°C' : 'N/D'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Umidade</div>
                <div class="info-value">${dados.umi !== null ? dados.umi + '%' : 'N/D'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">CO₂</div>
                <div class="info-value">${dados.co2 !== null ? dados.co2 + ' ppm' : 'N/D'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Data/Hora</div>
                <div class="info-value">${new Date().toLocaleString('pt-BR')}</div>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>© 2026 Projeto Ecobot</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Ecobot Alertas" <${process.env.EMAIL_USER}>`,
      to: EMAILS_DESTINO.join(', '),
      subject: `${alerta.emoji} ${alerta.tipo} - ${base.nome}`,
      html: htmlContent,
      headers: {
        'X-Priority': alerta.nivel === 'critica' ? '1' : '3',
        'Importance': alerta.nivel === 'critica' ? 'high' : 'normal'
      }
    };

    await transporter.sendMail(mailOptions);
    console.log(`   📧 Email enviado: ${alerta.tipo}`);

  } catch (erro) {
    console.error(`   ❌ Erro ao enviar email:`, erro.message);
  }
}

// Buscar e-mails de utilizadores guardados no TagoIO
async function buscarEmailsAssinantes() {
  try {
    // Vamos usar o token da base 1 para consultar os e-mails
    const token = process.env.TAGO_TOKEN_1; 
    const resposta = await axios.get('https://api.tago.io/data?variable=email_assinante&qty=100', {
      headers: { 'Device-Token': token }
    });
    
    // Extrai apenas os e-mails da resposta
    const lista = resposta.data.result.map(item => item.value);
    return lista;
  } catch (e) {
    console.log("⚠️ Nenhum assinante extra encontrado no TagoIO.");
    return [];
  }
}
// ================================================
// 🚀 EXECUTAR
// ================================================

async function executar() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🚨 VERIFICAÇÃO DE ALERTAS AUTOMÁTICOS');
  console.log(`⏰ ${new Date().toLocaleString('pt-BR')}`);
  console.log('═══════════════════════════════════════════════════');

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ Email não configurado!');
    process.exit(1);
  }

  if (EMAILS_DESTINO.length === 0) {
    console.error('❌ Nenhum email de destino!');
    process.exit(1);
  }

  if (BASES.some(b => !b.token)) {
    console.error('❌ Tokens Tago.io não configurados!');
    process.exit(1);
  }

  console.log(`\n📧 Enviando alertas para: ${EMAILS_DESTINO.join(', ')}`);
  console.log(`🔍 Verificando ${BASES.length} base(s)...\n`);

  let totalAlertas = 0;
  for (const base of BASES) {
    const alertas = await verificarBase(base);
    totalAlertas += alertas.length;
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`✅ Verificação concluída: ${totalAlertas} alerta(s)`);
  console.log('═══════════════════════════════════════════════════\n');

  process.exit(0);
}

executar().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});   
