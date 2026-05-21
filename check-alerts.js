require('dotenv').config();
const axios = require('axios');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');

// --- Diagnóstico de Conexão ---
if (!process.env.DATABASE_URL) {
  console.error('ERRO FATAL (check-alerts.js): A variável de ambiente DATABASE_URL não foi encontrada!');
  process.exit(1); 
}
// --- Fim do Diagnóstico ---

// Configuração do Banco de Dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Configuração do Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// Bases para monitorar
const BASES = [
    { id: 1, nome: 'EEEPDJWM', token: process.env.TAGO_TOKEN_1 },
    { id: 2, nome: 'EEEPDJWM 2.0', token: process.env.TAGO_TOKEN_2 }
];

// Limites de alerta
const LIMITES = {
  temp: { min: 10, max: 35, critico: 40 },
  umid: { min: 30, max: 70, critico_max: 85, critico_min: 20 },
  co2: { max: 1000, critico: 1500 }
};

const normalizeMensagens = (mensagens) => {
  return Array.isArray(mensagens) ? mensagens.map(m => String(m).trim()) : [];
};

const isSameAlert = (lastMensagens, currentMensagens) => {
  const last = normalizeMensagens(lastMensagens);
  const current = normalizeMensagens(currentMensagens);
  if (last.length !== current.length) return false;
  return last.every((msg, index) => msg === current[index]);
};

const shouldSendAlert = async (client, baseNome, nivel, mensagens) => {
  const { rows } = await client.query(
    'SELECT mensagens FROM alerts WHERE base = $1 AND nivel = $2 ORDER BY timestamp DESC LIMIT 1',
    [baseNome, nivel]
  );
  if (rows.length === 0) return true;
  return !isSameAlert(rows[0].mensagens, mensagens);
};

const sendAlertEmail = async (listaEmails, subject, html) => {
  if (listaEmails.length === 0) return;
  await transporter.sendMail({
    from: `"Ecobot Alertas" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    bcc: listaEmails.join(', '),
    subject,
    html
  });
};

const handleAlert = async (client, baseNome, nivel, mensagens) => {
  if (!await shouldSendAlert(client, baseNome, nivel, mensagens)) {
    console.log(`Alerta ${nivel} para ${baseNome} já enviado anteriormente com a mesma mensagem. Pulando envio.`);
    return;
  }

  await client.query(
    'INSERT INTO alerts(nivel, base, mensagens, timestamp) VALUES($1, $2, $3, NOW())',
    [nivel, baseNome, mensagens]
  );

  const { rows } = await client.query('SELECT email FROM subscribers');
  const listaEmails = rows.map(r => r.email);
  if (listaEmails.length === 0) {
    console.log('Nenhum inscrito encontrado para envio de alertas. Alerta registrado apenas no banco.');
    return;
  }

  const html = `<h2>${nivel === 'critico' ? '🚨 ALERTA CRÍTICO' : nivel === 'aviso' ? '⚠️ Aviso de Condições' : '⚠️ Estação Offline'}</h2><ul>${mensagens.map(m => `<li>${m}</li>`).join('')}</ul><p>Verifique a condição da base ${baseNome}.</p>`;
  const subject = nivel === 'critico'
    ? `🚨 ALERTA CRÍTICO na base ${baseNome}`
    : nivel === 'aviso'
      ? `⚠️ Aviso de Condições na base ${baseNome}`
      : `⚠️ Estação Offline na base ${baseNome}`;

  await sendAlertEmail(listaEmails, subject, html);
  console.log(`E-mails de alerta (${nivel}) enviados para ${listaEmails.length} inscritos.`);
};

const checkAlerts = async () => {
  const client = await pool.connect();
  try {
    console.log('Iniciando verificação de alertas...');

    for (const base of BASES) {
      if (!base.token) continue;

      try {
        const response = await axios.get('https://api.tago.io/data?qty=1', {
          headers: { 'Device-Token': base.token },
          timeout: 10000
        });

        const dados = Array.isArray(response.data?.result) ? response.data.result : [];
        if (dados.length === 0) {
          console.log(`⚠️ Base ${base.nome} sem dados ou offline. Registrando alerta de offline.`);
          await handleAlert(client, base.nome, 'offline', [`Base ${base.nome} está sem dados ou offline.`]);
          continue;
        }

        const getVal = (pref) => {
            const item = dados.find(d => d.variable && d.variable.toLowerCase().includes(pref));
            return item ? parseFloat(String(item.value).replace(',', '.')) : null;
        };

        const temp = getVal('temp');
        const umid = getVal('umid');
        const co2 = getVal('co2') ?? getVal('gas');

        const alertasCriticos = [];
        const alertasAviso = [];

        // Lógica de verificação de limites (ignora sensores offline)
        if (temp !== null) {
          if (temp > LIMITES.temp.critico) alertasCriticos.push(`Temperatura CRÍTICA: ${temp}°C.`);
          else if (temp > LIMITES.temp.max || temp < LIMITES.temp.min) alertasAviso.push(`Temperatura fora do ideal: ${temp}°C.`);
        }

        if (umid !== null) {
          if (umid > LIMITES.umid.critico_max || umid < LIMITES.umid.critico_min) alertasCriticos.push(`Umidade CRÍTICA: ${umid}%.`);
          else if (umid > LIMITES.umid.max || umid < LIMITES.umid.min) alertasAviso.push(`Umidade fora do ideal: ${umid}%.`);
        }

        if (co2 !== null) {
          if (co2 > LIMITES.co2.critico) alertasCriticos.push(`Nível de CO2 CRÍTICO: ${co2} ppm.`);
          else if (co2 > LIMITES.co2.max) alertasAviso.push(`Nível de CO2 elevado: ${co2} ppm.`);
        }

        // Se houver alertas, processar e enviar e-mails
        if (alertasCriticos.length > 0 || alertasAviso.length > 0) {
          const nivel = alertasCriticos.length > 0 ? 'critico' : 'aviso';
          const mensagens = [...alertasCriticos, ...alertasAviso];
          await handleAlert(client, base.nome, nivel, mensagens);
        }
      } catch (err) {
        console.error(`Erro ao processar a base ${base.nome}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Erro fatal na execução de checkAlerts:', err);
  } finally {
    await client.release();
  }
};

checkAlerts().finally(() => pool.end());
