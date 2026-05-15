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

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
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
    const response = await axios.get('https://api.tago.io/data?qty=20', {
      headers: { 'Device-Token': base.token }
    });

    const dados = response.data.result || [];
    const getVal = (pref) => {
      const item = dados.find(d => d.variable.toLowerCase().includes(pref));
      return item ? parseFloat(String(item.value).replace(',', '.')) : null;
    };

    const t = getVal('temp'), u = getVal('umid'), c = getVal('co2') || getVal('gas');
    console.log(`   Dados atuais -> Temp: ${t}°C, Umi: ${u}%, CO2: ${c}ppm`);

    let alertas = [];
    if (t > LIMIARES.temp_critica) alertas.push(`🔥 Temperatura Crítica: ${t}°C`);
    if (u < LIMIARES.umi_critica) alertas.push(`🌵 Umidade Crítica: ${u}%`);
    if (c > LIMIARES.co2_critica) alertas.push(`💨 CO2 Crítico: ${c}ppm`);

    if (alertas.length > 0) {
      await transporter.sendMail({
        from: `"Ecobot Alertas" <${process.env.EMAIL_USER}>`,
        to: EMAILS_DESTINO.join(', '),
        subject: `🚨 ALERTA AMBIENTAL - ${base.nome}`,
        html: `<h2>Atenção! Alertas detectados na base ${base.nome}:</h2><ul>${alertas.map(a => `<li>${a}</li>`).join('')}</ul>`
      });
      console.log(`   📧 Emails de alerta enviados!`);
    }
  } catch (erro) { console.error(`   ❌ Erro na base ${base.nome}:`, erro.message); }
}

async function iniciar() {
  console.log('🚀 Iniciando Ecobot Check...');
  
  // Atualiza lista de emails com os novos assinantes do site
  const extras = await buscarAssinantesDinamicos();
  EMAILS_DESTINO = [...new Set([...EMAILS_DESTINO, ...extras])];
  
  for (const base of BASES) {
    if (base.token) await verificarBase(base);
  }
  console.log('\n✅ Verificação finalizada.');
}

iniciar();
