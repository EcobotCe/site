require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const nodemailer = require('nodemailer');

const DATA_DIR = path.join(__dirname, 'data');
const BASES_FILE = path.join(DATA_DIR, 'bases.json');
const SUBSCRIBERS_FILE = path.join(DATA_DIR, 'subscribers.json');
const ALERTS_FILE = path.join(DATA_DIR, 'alerts.json');
const BASE_STATES_FILE = path.join(DATA_DIR, 'base_states.json');
const PREFERENCES_FILE = path.join(DATA_DIR, 'subscriber_preferences.json');

const LIMITES = {
  temp: { min: 10, max: 35, critico: 40 },
  umid: { min: 30, max: 70, critico_max: 85, critico_min: 20 },
  gas: { max: 10, critico: 20 }
};

const SENSOR_PREF = {
  temp: 'alertar_temp',
  umid: 'alertar_umid',
  gas: 'alertar_gas'
};

const OFFLINE_TIMEOUT_MS = 15 * 60 * 1000;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

const ensureDataFile = async (filePath, defaultValue) => {
  try {
    await fs.access(filePath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
    } else {
      throw err;
    }
  }
};

const ensureDataStore = async () => {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await ensureDataFile(BASES_FILE, []);
  await ensureDataFile(SUBSCRIBERS_FILE, []);
  await ensureDataFile(ALERTS_FILE, []);
  await ensureDataFile(BASE_STATES_FILE, []);
  await ensureDataFile(PREFERENCES_FILE, []);
};

const readJsonFile = async (filePath, defaultValue = []) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content || JSON.stringify(defaultValue));
  } catch (err) {
    if (err.code === 'ENOENT') return defaultValue;
    console.error(`Erro ao ler ${filePath}:`, err.message);
    return defaultValue;
  }
};

const writeJsonFile = async (filePath, data) => {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
};

const getBases = async () => {
  const bases = await readJsonFile(BASES_FILE, []);
  return bases.filter(base => !base.deleted_at);
};

const getSubscribers = async () => readJsonFile(SUBSCRIBERS_FILE, []);
const saveSubscribers = async (subscribers) => writeJsonFile(SUBSCRIBERS_FILE, subscribers);
const getPreferences = async () => readJsonFile(PREFERENCES_FILE, []);
const savePreferences = async (preferences) => writeJsonFile(PREFERENCES_FILE, preferences);
const getAlerts = async () => readJsonFile(ALERTS_FILE, []);
const saveAlerts = async (alerts) => writeJsonFile(ALERTS_FILE, alerts);
const getBaseStates = async () => readJsonFile(BASE_STATES_FILE, []);
const saveBaseStates = async (states) => writeJsonFile(BASE_STATES_FILE, states);

const normalizeBoolean = (value, defaultValue = true) => {
  if (value === undefined || value === null) return defaultValue;
  return value === true || value === 'true' || value === '1' || value === 1;
};

const getPreferenceForEmail = async (email) => {
  const preferences = await getPreferences();
  return preferences.find(pref => pref.email === email) || null;
};

const getDefaultPreferences = () => ({
  alertar_temp: true,
  alertar_umid: true,
  alertar_gas: true,
  alertar_offline: true,
  alertar_recuperacao: true
});

const getInscritosParaTipo = async (tipo) => {
  const subscribers = await getSubscribers();
  const preferences = await getPreferences();
  const preferencesByEmail = new Map(preferences.map(pref => [pref.email, pref]));

  return subscribers
    .map(sub => sub.email)
    .filter(email => {
      if (!tipo) return true;
      const pref = preferencesByEmail.get(email);
      return pref ? normalizeBoolean(pref[tipo], true) : true;
    });
};

const appendAlert = async (nivel, base, mensagens) => {
  const alerts = await getAlerts();
  alerts.push({ nivel, base, mensagens, timestamp: new Date().toISOString() });
  await saveAlerts(alerts);
};

const getLastState = async (baseNome) => {
  const states = await getBaseStates();
  const state = states.find(item => item.base === baseNome);
  if (!state) return { last_nivel: {}, last_mensagens: [], updated_at: null };
  return state;
};

const setState = async (baseNome, nivelObj, mensagens) => {
  const states = await getBaseStates();
  const index = states.findIndex(item => item.base === baseNome);
  const record = {
    base: baseNome,
    last_nivel: nivelObj,
    last_mensagens: mensagens || [],
    updated_at: new Date().toISOString()
  };

  if (index >= 0) {
    states[index] = record;
  } else {
    states.push(record);
  }

  await saveBaseStates(states);
};

const resetarEstadoSeNecessario = async (baseNome, lastNiveis, ultimaAtualizacaoEstado) => {
  if (!ultimaAtualizacaoEstado) return lastNiveis;
  const idadeEstadoMs = Date.now() - new Date(ultimaAtualizacaoEstado).getTime();
  const ESTADO_EXPIRA_MS = 60 * 60 * 1000;

  if (idadeEstadoMs > ESTADO_EXPIRA_MS) {
    console.log(`  🔄 Estado expirado (${Math.round(idadeEstadoMs / 60000)} min). Resetando para reavaliação limpa.`);
    const nivelReset = { temp: undefined, umid: undefined, gas: undefined, offline: false };
    await setState(baseNome, nivelReset, []);
    return nivelReset;
  }
  return lastNiveis;
};

const sendAlertEmail = async (listaEmails, subject, html) => {
  if (listaEmails.length === 0) return false;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ EMAIL_USER ou EMAIL_PASS não configurados. E-mail não será enviado.');
    return false;
  }

  await transporter.sendMail({
    from: `"Ecobot Alertas" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    bcc: listaEmails.join(', '),
    subject,
    html
  });
  console.log(`📧 "${subject}" → ${listaEmails.length} inscrito(s).`);
  return true;
};

const enviarEmailAlerta = async (baseNome, nivel, mensagens, tipo) => {
  const listaEmails = await getInscritosParaTipo(tipo);
  if (listaEmails.length === 0) {
    console.log(`  ⚠️  Nenhum inscrito para receber alerta [${nivel}].`);
    return;
  }

  const icone = nivel === 'critico' ? '🚨 ALERTA CRÍTICO'
    : nivel === 'aviso' ? '⚠️ Aviso de Condições'
    : nivel === 'recuperacao' ? '✅ Recuperação'
    : '📡 Estação Offline';

  const subject = nivel === 'critico' ? `🚨 ALERTA CRÍTICO na base ${baseNome}`
    : nivel === 'aviso' ? `⚠️ Aviso de Condições — ${baseNome}`
    : nivel === 'recuperacao' ? `✅ Base ${baseNome} voltou ao normal`
    : `📡 Estação ${baseNome} está Offline`;

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#14b8a6">${icone} — ${baseNome}</h2>
      <ul>${mensagens.map(m => `<li>${m}</li>`).join('')}</ul>
      <p>Verifique a condição da base <strong>${baseNome}</strong>.</p>
      <hr/><small style="color:#888">Ecobot Alertas Ambientais</small>
    </div>`;

  await sendAlertEmail(listaEmails, subject, html);
  await appendAlert(nivel, baseNome, mensagens);
};

const checkAlerts = async () => {
  await ensureDataStore();

  const bases = await getBases();
  if (!bases || bases.length === 0) {
    console.log('ℹ️  Nenhuma base cadastrada. Nada a verificar.');
    return;
  }

  console.log(`🔍 Iniciando verificação de alertas para ${bases.length} base(s)...`);

  for (const base of bases) {
    if (!base.token) {
      console.warn(`⚠️  "${base.nome}" sem token. Pulando.`);
      continue;
    }

    try {
      console.log(`\n→ Verificando "${base.nome}"...`);
      const response = await axios.get('https://api.tago.io/data?qty=5', {
        headers: { 'Device-Token': base.token },
        timeout: 10000
      });
      const dados = Array.isArray(response.data?.result) ? response.data.result : [];

      const state = await getLastState(base.nome);
      let lastNiveis = state.last_nivel || {};
      const ultimaAtualizacaoEstado = state.updated_at;
      lastNiveis = await resetarEstadoSeNecessario(base.nome, lastNiveis, ultimaAtualizacaoEstado);

      const dadosOrdenados = dados
        .filter(d => d.time)
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      const ultimoDado = dadosOrdenados[0];
      const ultimaLeitura = ultimoDado?.time ? new Date(ultimoDado.time).getTime() : null;
      const idadeMs = ultimaLeitura ? Date.now() - ultimaLeitura : Infinity;
      const estaOffline = dados.length === 0 || idadeMs > OFFLINE_TIMEOUT_MS;

      if (ultimaLeitura) {
        const idadeMin = Math.round(idadeMs / 60000);
        console.log(`  🕐 Último dado: ${idadeMin} min atrás (${new Date(ultimaLeitura).toISOString()})`);
      }

      if (estaOffline) {
        const motivo = dados.length === 0
          ? 'sem dados no Tago'
          : `último dado há ${Math.round(idadeMs / 60000)} min (limite: ${OFFLINE_TIMEOUT_MS / 60000} min)`;
        if (!lastNiveis.offline) {
          console.log(`  📡 Offline detectado (${motivo}). Enviando alerta.`);
          await enviarEmailAlerta(base.nome, 'offline', [`Base ${base.nome} está offline. ${motivo}.`], 'alertar_offline');
          await setState(base.nome, { ...lastNiveis, offline: true }, []);
        } else {
          console.log('  📡 Offline (já notificado).');
        }
        continue;
      }

      const getVal = (pref) => {
        const item = dadosOrdenados.find(d => d.variable?.toLowerCase().includes(pref));
        return item ? parseFloat(String(item.value).replace(',', '.')) : null;
      };

      const temp = getVal('temp');
      const umid = getVal('umid');
      const gas = getVal('co2') ?? getVal('gas');
      console.log(`  📊 temp=${temp ?? 'N/A'}°C  umid=${umid ?? 'N/A'}%  gas=${gas ?? 'N/A'}%`);

      if (lastNiveis.offline) {
        await enviarEmailAlerta(base.nome, 'recuperacao', [`Base ${base.nome} voltou a enviar dados.`], 'alertar_recuperacao');
      }

      const novosNiveis = { ...lastNiveis, offline: false };
      const alertasCriticos = [];
      const alertasAviso = [];

      const avaliar = (sensor, valor, nivelAtual) => {
        if (valor === null) return;
        let novoNivel;
        if (sensor === 'temp') {
          if (valor > LIMITES.temp.critico) novoNivel = 'critico';
          else if (valor > LIMITES.temp.max || valor < LIMITES.temp.min) novoNivel = 'aviso';
          else novoNivel = 'ok';
        } else if (sensor === 'umid') {
          if (valor > LIMITES.umid.critico_max || valor < LIMITES.umid.critico_min) novoNivel = 'critico';
          else if (valor > LIMITES.umid.max || valor < LIMITES.umid.min) novoNivel = 'aviso';
          else novoNivel = 'ok';
        } else if (sensor === 'gas') {
          if (valor > LIMITES.gas.critico) novoNivel = 'critico';
          else if (valor > LIMITES.gas.max) novoNivel = 'aviso';
          else novoNivel = 'ok';
        }

        const anterior = nivelAtual || 'ok';
        novosNiveis[sensor] = novoNivel;
        if (novoNivel !== anterior) {
          if (novoNivel === 'critico') alertasCriticos.push({ sensor, valor });
          else if (novoNivel === 'aviso') alertasAviso.push({ sensor, valor });
        }
      };

      avaliar('temp', temp, lastNiveis.temp);
      avaliar('umid', umid, lastNiveis.umid);
      avaliar('gas', gas, lastNiveis.gas);

      const nomeSensor = { temp: 'Temperatura', umid: 'Umidade', gas: 'Gás' };
      const unidade = { temp: '°C', umid: '%', gas: '%' };

      for (const { sensor, valor } of alertasCriticos) {
        const msg = `${nomeSensor[sensor]} CRÍTICA: ${valor}${unidade[sensor]}`;
        await enviarEmailAlerta(base.nome, 'critico', [msg], null);
      }
      for (const { sensor, valor } of alertasAviso) {
        const msg = `${nomeSensor[sensor]} fora do ideal: ${valor}${unidade[sensor]}`;
        await enviarEmailAlerta(base.nome, 'aviso', [msg], SENSOR_PREF[sensor]);
      }

      for (const sensor of ['temp', 'umid', 'gas']) {
        const anterior = lastNiveis[sensor] || 'ok';
        const novo = novosNiveis[sensor];
        if (anterior !== 'ok' && anterior !== undefined && novo === 'ok') {
          const msg = `${nomeSensor[sensor]} voltou ao normal.`;
          await enviarEmailAlerta(base.nome, 'recuperacao', [msg], 'alertar_recuperacao');
        }
      }

      await setState(base.nome, novosNiveis, []);
      console.log(`  💾 Estado salvo: ${JSON.stringify(novosNiveis)}`);
    } catch (err) {
      console.error(`  ❌ Erro em "${base.nome}":`, err.message);
    }
  }

  console.log('\n✅ Verificação concluída.');
};

if (require.main === module) {
  checkAlerts().catch(err => console.error('Erro ao executar checkAlerts:', err));
}

module.exports = { checkAlerts };
