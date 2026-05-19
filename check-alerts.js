const nodemailer = require('nodemailer');
const axios = require('axios');
require('dotenv').config();

// Configurações de limite
const LIMIARES = {
  temp_critica: 35, temp_aviso: 30,
  umi_critica: 30,  umi_aviso: 40,
  co2_critica: 10,  co2_aviso: 5,
};

const BASES = [
  { id: 1, nome: 'EEEPDJWM', token: process.env.TAGO_TOKEN_1 },
  { id: 2, nome: 'EEEPDJWM 2.0', token: process.env.TAGO_TOKEN_2 }
];

let EMAILS_DESTINO = (process.env.ALERT_EMAILS || '')
  .split(',')
  .map(e => e.trim())
  .filter(e => e);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

async function buscarAssinantesDinamicos() {
  try {
    const res = await axios.get('https://api.tago.io/data?variable=email_assinante&qty=100', {
      headers: { 'Device-Token': process.env.TAGO_TOKEN_1 },
      timeout: 15000
    });
    return res.data.result.map(item => item.value);
  } catch (e) {
    if (e.code === 'ECONNABORTED') {
      console.log("   ⚠️ Timeout ao buscar novos assinantes no TagoIO.");
    } else {
      console.log("   ⚠️ Não foi possível buscar novos assinantes no TagoIO.");
    }
    return [];
  }
}

async function enviarEmail(baseNome, subject, body) {
  if (EMAILS_DESTINO.length === 0) {
    console.log(`   ❕ Nenhum e-mail de destino configurado. Poupando envio de "${subject}".`);
    return;
  }
  await transporter.sendMail({
    from: `"Ecobot Alertas" <${process.env.EMAIL_USER}>`,
    to: EMAILS_DESTINO.join(', '),
    subject: `${subject} - ${baseNome}`,
    html: `<h2>${subject} na base ${baseNome}:</h2><ul>${body}</ul>`
  });
  console.log(`   📧 E-mails de "${subject}" enviados!`);
}

async function verificarBase(base) {
  try {
    console.log(`
📍 Verificando: ${base.nome}...`);

    if (!base.token) {
      console.warn(`   ⚠️ Token da base ${base.nome} não configurado. Ignorando.`);
      return;
    }

    const response = await axios.get('https://api.tago.io/data?qty=20', {
      headers: { 'Device-Token': base.token },
      timeout: 15000
    });

    const dados = Array.isArray(response.data?.result) ? response.data.result : [];
    if (!dados.length) {
      console.warn(`   ⚠️ Nenhum dado retornado para ${base.nome}. O dispositivo pode estar offline.`);
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

    let alertasCriticos = [];
    let alertasAviso = [];

    // Lógica para separar alertas críticos e avisos
    if (t !== null) {
      if (t > LIMIARES.temp_critica) {
        alertasCriticos.push(`🔥 Temperatura Crítica: ${t}°C (Limite: ${LIMIARES.temp_critica}°C)`);
      } else if (t > LIMIARES.temp_aviso) {
        alertasAviso.push(`🌡️ Temperatura em Aviso: ${t}°C (Limite: ${LIMIARES.temp_aviso}°C)`);
      }
    }

    if (u !== null) {
      if (u < LIMIARES.umi_critica) {
        alertasCriticos.push(`🌵 Umidade Crítica: ${u}% (Limite: ${LIMIARES.umi_critica}%)`);
      } else if (u < LIMIARES.umi_aviso) {
        alertasAviso.push(`💧 Umidade em Aviso: ${u}% (Limite: ${LIMIARES.umi_aviso}%)`);
      }
    }

    if (c !== null) {
      if (c > LIMIARES.co2_critica) {
        alertasCriticos.push(`💨 CO2 Crítico: ${c}ppm (Limite: ${LIMIARES.co2_critica}ppm)`);
      } else if (c > LIMIARES.co2_aviso) {
        alertasAviso.push(`💭 CO2 em Aviso: ${c}ppm (Limite: ${LIMIARES.co2_aviso}ppm)`);
      }
    }
    
    // Envia o e-mail apropriado
    if (alertasCriticos.length > 0) {
      const body = alertasCriticos.map(a => `<li>${a}</li>`).join('');
      await enviarEmail(base.nome, '🚨 ALERTA AMBIENTAL CRÍTICO', body);
    } else if (alertasAviso.length > 0) {
      const body = alertasAviso.map(a => `<li>${a}</li>`).join('');
      await enviarEmail(base.nome, '⚠️ AVISO AMBIENTAL', body);
    } else {
      console.log('   ✅ Condições normais. Nenhum alerta a ser enviado.');
    }

  } catch (erro) {
    if (erro.code === 'ECONNABORTED') {
      console.error(`   ❌ Timeout de 15s excedido para a base ${base.nome}.`);
    } else {
      console.error(`   ❌ Erro ao verificar a base ${base.nome}:`, erro.message);
    }
  }
}

async function iniciar() {
  console.log('🚀 Iniciando Ecobot Check...');
  
  const extras = await buscarAssinantesDinamicos();
  if (extras.length > 0) {
      EMAILS_DESTINO = [...new Set([...EMAILS_DESTINO, ...extras])];
  }
  
  if(EMAILS_DESTINO.length > 0) {
    console.log(`   💌 Lista de e-mails para alerta: ${EMAILS_DESTINO.join(', ')}`);
  } else {
    console.log('   ❕ Nenhum e-mail de destino para os alertas.');
  }

  for (const base of BASES) {
    await verificarBase(base);
  }
  console.log('
✅ Verificação finalizada.');
}

iniciar();
