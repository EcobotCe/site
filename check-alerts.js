const nodemailer = require('nodemailer');
const axios = require('axios');
require('dotenv').config();

// Configurações de limite
const LIMIARES = {
  temp_critica: 35, temp_aviso: 30,
  umi_critica: 30,  umi_aviso: 40,
  co2_critica: 10,  co2_aviso: 5,
  queimada_temp: 32, queimada_umi: 40
};

const BASES = [
  { id: 1, nome: 'EEEPDJWM', token: process.env.TAGO_TOKEN_1 },
  { id: 2, nome: 'EEEPDJWM 2.0', token: process.env.TAGO_TOKEN_2 }
];

// Lista de emails inicial (do GitHub Secrets)
let EMAILS_DESTINO = (process.env.ALERT_EMAILS || '')
  .split(',')
  .map(e => e.trim())
  .filter(e => e);

// Configuração de email - MESMA QUE EM server.js
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,                 // TLS port (não 465)
  secure: false,             // false para usar TLS
  requireTLS: true,          // Força TLS
  auth: { 
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS 
  },
  tls: {
    rejectUnauthorized: false
  },
  logger: true,
  debug: true
});

// Verificar configuração
console.log('\n🔧 CONFIGURAÇÃO DO CHECK-ALERTS:');
console.log('   EMAIL_USER:', process.env.EMAIL_USER ? '✅ Configurado' : '❌ NÃO CONFIGURADO');
console.log('   EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Configurado' : '❌ NÃO CONFIGURADO');
console.log('   TAGO_TOKEN_1:', process.env.TAGO_TOKEN_1 ? '✅ Configurado' : '❌ NÃO CONFIGURADO');
console.log('   TAGO_TOKEN_2:', process.env.TAGO_TOKEN_2 ? '✅ Configurado' : '❌ NÃO CONFIGURADO');
console.log('   ALERT_EMAILS (padrão):', EMAILS_DESTINO.length > 0 ? `✅ ${EMAILS_DESTINO.length} emails` : '⚠️ NENHUM EMAIL PADRÃO');
console.log('   📧 Procurando emails adicionais no TagoIO...');

transporter.verify((error, success) => {
  if (error) {
    console.error('\n❌ ERRO NA CONEXÃO:');
    console.error('   ', error.message);
  } else {
    console.log('\n✅ Nodemailer pronto para enviar alertas!\n');
  }
});

// Busca emails de quem se cadastrou no site via TagoIO
async function buscarAssinantesDinamicos() {
  try {
    const res = await axios.get('https://api.tago.io/data?variable=email_assinante&qty=100', {
      headers: { 'Device-Token': process.env.TAGO_TOKEN_1 }
    });
    return res.data.result.map(item => item.value);
  } catch (e) {
    console.log("   ⚠️ Sem novos assinantes no TagoIO.");
    return [];
  }
}

async function verificarBase(base) {
  try {
    console.log(`\n📍 Verificando: ${base.nome}...`);

    if (!base.token) {
      console.warn(`   ⚠️ Token da base ${base.nome} não configurado. Ignorando.`);
      return;
    }

    const response = await axios.get('https://api.tago.io/data?qty=20', {
      headers: { 'Device-Token': base.token }
    });

    const dados = Array.isArray(response.data?.result) ? response.data.result : [];
    if (!dados.length) {
      console.warn(`   ⚠️ Nenhum dado retornado para ${base.nome}. Verifique se o dispositivo está enviando dados.`);
      return;
    }

    const getVal = (pref) => {
      const item = dados.find(d => d.variable && d.variable.toLowerCase().includes(pref));
      return item ? parseFloat(String(item.value).replace(',', '.')) : null;
    };

    const t = getVal('temp');
    const u = getVal('umid');
    const c = getVal('co2') ?? getVal('gas');
    console.log(`   Dados atuais -> Temp: ${t}°C, Umi: ${u}%, CO2: ${c}ppm`);

    if (!dados.length) {
      console.log(`   ⚠️ Sem dados retornados para ${base.nome}. Verifique token e dispositivo.`);
    }

    let alertas = [];
    if (t > LIMIARES.temp_critica) alertas.push(`🔥 Temperatura Crítica: ${t}°C`);
    if (u < LIMIARES.umi_critica) alertas.push(`🌵 Umidade Crítica: ${u}%`);
    if (c > LIMIARES.co2_critica) alertas.push(`💨 CO2 Crítico: ${c}ppm`);

    if (alertas.length > 0) {
      try {
        console.log(`   📬 Enviando alertas para ${EMAILS_DESTINO.length} destinatário(s)...`);
        
        const info = await transporter.sendMail({
          from: `"Ecobot Alertas" <${process.env.EMAIL_USER}>`,
          to: EMAILS_DESTINO.join(', '),
          subject: `🚨 ALERTA AMBIENTAL - ${base.nome}`,
          html: `
            <h2>Atenção! Alertas detectados na base ${base.nome}:</h2>
            <ul>${alertas.map(a => `<li><strong>${a}</strong></li>`).join('')}</ul>
            <p style="color: #999; font-size: 12px;">Timestamp: ${new Date().toLocaleString('pt-BR')}</p>
          `
        });
        
        console.log(`   ✅ Emails enviados com sucesso! ID: ${info.messageId}`);
      } catch (emailError) {
        console.error(`   ❌ ERRO ao enviar email:`, emailError.message);
      }
    } else {
      console.log(`   ✅ Sem alertas nesta verificação.`);
    }
  } catch (erro) { console.error(`   ❌ Erro na base ${base.nome}:`, erro.message); }
}

async function iniciar() {
  console.log('🚀 Iniciando Ecobot Check...');
  console.log(`   📧 Emails padrão: ${EMAILS_DESTINO.length} configurado(s)`);
  
  // Atualiza lista de emails com os novos assinantes do site
  const extras = await buscarAssinantesDinamicos();
  const emailsAntes = EMAILS_DESTINO.length;
  EMAILS_DESTINO = [...new Set([...EMAILS_DESTINO, ...extras])];
  const emailsDepois = EMAILS_DESTINO.length;
  
  if (extras.length > 0) {
    console.log(`   ✅ ${extras.length} email(s) adicionado(s) do TagoIO`);
  }
  console.log(`   📬 TOTAL de emails para alerta: ${emailsDepois}`);
  console.log(`   📋 Destinatários: ${EMAILS_DESTINO.join(', ')}\n`);
  
  console.log('🔍 Verificando todas as bases...');
  for (const base of BASES) {
    if (base.token) await verificarBase(base);
  }
  console.log('\n✅ Verificação finalizada.');
}

iniciar();
