require('dotenv').config();
const axios = require('axios');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');

// --- Diagnóstico de Conexão (não-fatal) ---
const DB_URL = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || null;
if (!DB_URL) {
  console.warn('⚠️ Aviso (check-alerts.js): DATABASE_URL não configurada — usando fallback de ambiente/arquivo.');
}

// Configuração do Banco de Dados (pode ser nulo)
let pool = null;
if (DB_URL) {
  pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
}

// Configuração do Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// Busca as bases configuradas no banco de dados
const fs = require('fs').promises;
const BASES_FILE = require('path').join(__dirname, 'data', 'bases.json');
const SUBSCRIBERS_FILE = require('path').join(__dirname, 'data', 'subscribers.json');
const ALERTS_FILE = require('path').join(__dirname, 'data', 'alerts.json');
const BASE_STATES_FILE = require('path').join(__dirname, 'data', 'base_states.json');

const SIMULATE = String(process.env.SIMULATE_EMAILS || '').toLowerCase() === 'true';

const getBasesFromDb = async (client) => {
  if (client) {
    const { rows } = await client.query('SELECT id, nome, token, lat, lon FROM bases ORDER BY id');
    return rows;
  }
  // fallback arquivo
  try {
    const txt = await fs.readFile(BASES_FILE, 'utf8');
    return JSON.parse(txt || '[]');
  } catch (err) {
    return getDefaultEnvBases();
  }
};

const getDefaultEnvBases = () => {
  const bases = [];
  if (process.env.TAGO_TOKEN_1) {
    bases.push({ id: 1, nome: 'EEEPDJWM', token: process.env.TAGO_TOKEN_1 });
  }
  if (process.env.TAGO_TOKEN_2) {
    bases.push({ id: 2, nome: 'EEEPDJWM 2.0', token: process.env.TAGO_TOKEN_2 });
  }
  return bases;
};

// Limites de alerta
const LIMITES = {
  temp: { min: 10, max: 35, critico: 40 },
  umid: { min: 30, max: 70, critico_max: 85, critico_min: 20 },
  gas: { max: 10, critico: 20 }
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
  if (SIMULATE) {
    console.log(`[SIMULAÇÃO] Enviando e-mail para ${listaEmails.length} inscritos:`, { subject, html });
    return;
  }

  await transporter.sendMail({
    from: `"Ecobot Alertas" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    bcc: listaEmails.join(', '),
    subject,
    html
  });
};

// Helpers para modo simulado (arquivos JSON)
const ensureJsonFile = async (path, def) => {
  try {
    await fs.access(path);
  } catch (e) {
    await fs.writeFile(path, JSON.stringify(def, null, 2), 'utf8');
  }
};

const readJson = async (path, def) => {
  try {
    const txt = await fs.readFile(path, 'utf8');
    return JSON.parse(txt || '[]');
  } catch (e) {
    return def;
  }
};

const writeJson = async (path, data) => {
  await fs.writeFile(path, JSON.stringify(data, null, 2), 'utf8');
};

const getLastState = async (client, baseNome) => {
  const { rows } = await client.query('SELECT last_nivel, last_mensagens FROM base_states WHERE base = $1', [baseNome]);
  return rows.length ? rows[0] : null;
};

const setState = async (client, baseNome, nivel, mensagens) => {
  await client.query(
    `INSERT INTO base_states(base, last_nivel, last_mensagens, updated_at) VALUES($1, $2, $3, NOW())
     ON CONFLICT (base) DO UPDATE SET last_nivel = EXCLUDED.last_nivel, last_mensagens = EXCLUDED.last_mensagens, updated_at = EXCLUDED.updated_at`,
    [baseNome, nivel, mensagens]
  );
};

const ensureTables = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS subscribers (
      email TEXT PRIMARY KEY,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS alerts (
      id SERIAL PRIMARY KEY,
      nivel TEXT NOT NULL,
      base TEXT NOT NULL,
      mensagens TEXT[] NOT NULL,
      timestamp TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS bases (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(255) UNIQUE NOT NULL,
      token TEXT NOT NULL,
      lat NUMERIC NULL,
      lon NUMERIC NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS base_states (
      base TEXT PRIMARY KEY,
      last_nivel TEXT,
      last_mensagens TEXT[],
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
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
  // Atualiza estado da base
  await setState(client, baseNome, nivel, mensagens);
};

const checkAlerts = async () => {
  // Se não houver pool, mas estivermos em modo SIMULATE, criamos um client simulado
  if (!pool && !SIMULATE) {
    console.warn('⚠️ Banco de dados indisponível. Verificação de alertas será ignorada.');
    return;
  }

  let client;
  if (SIMULATE) {
    // garante arquivos
    await ensureJsonFile(BASES_FILE, []);
    await ensureJsonFile(SUBSCRIBERS_FILE, []);
    await ensureJsonFile(ALERTS_FILE, []);
    await ensureJsonFile(BASE_STATES_FILE, []);

    client = {
      query: async (sql, params) => {
        const q = sql.trim().toLowerCase();
        // SELECT bases
        if (q.startsWith('select id, nome, token') || q.includes('from bases order by')) {
          const bases = await readJson(BASES_FILE, []);
          return { rows: bases };
        }

        // SELECT mensagens FROM alerts WHERE base = $1 AND nivel = $2 ORDER BY timestamp DESC LIMIT 1
        if (q.startsWith('select mensagens from alerts')) {
          const [base, nivel] = params;
          const alerts = await readJson(ALERTS_FILE, []);
          const found = alerts.filter(a => a.base === base && a.nivel === nivel).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          return { rows: found.length ? [{ mensagens: found[0].mensagens }] : [] };
        }

        // INSERT INTO alerts(...)
        if (q.startsWith('insert into alerts')) {
          const [nivel, base, mensagens] = params;
          const alerts = await readJson(ALERTS_FILE, []);
          const newA = { id: (alerts.length ? alerts[alerts.length-1].id + 1 : 1), nivel, base, mensagens, timestamp: new Date().toISOString() };
          alerts.push(newA);
          await writeJson(ALERTS_FILE, alerts);
          return { rows: [] };
        }

        // SELECT email FROM subscribers
        if (q.startsWith('select email from subscribers')) {
          const subs = await readJson(SUBSCRIBERS_FILE, []);
          return { rows: subs.map(s => ({ email: s.email })) };
        }

        // SELECT last_nivel, last_mensagens FROM base_states WHERE base = $1
        if (q.startsWith('select last_nivel, last_mensagens from base_states')) {
          const [base] = params;
          const states = await readJson(BASE_STATES_FILE, []);
          const found = states.find(s => s.base === base);
          return { rows: found ? [{ last_nivel: found.last_nivel, last_mensagens: found.last_mensagens }] : [] };
        }

        // INSERT INTO base_states ... ON CONFLICT DO UPDATE
        if (q.startsWith('insert into base_states')) {
          const [base, nivel, mensagens] = params;
          const states = await readJson(BASE_STATES_FILE, []);
          const idx = states.findIndex(s => s.base === base);
          const now = new Date().toISOString();
          if (idx === -1) {
            states.push({ base, last_nivel: nivel, last_mensagens: mensagens, updated_at: now });
          } else {
            states[idx] = { base, last_nivel: nivel, last_mensagens: mensagens, updated_at: now };
          }
          await writeJson(BASE_STATES_FILE, states);
          return { rows: [] };
        }

        // Fallback vazio
        return { rows: [] };
      },
      release: async () => { /* noop */ }
    };
  }

  if (!client && pool) {
    try {
      client = await pool.connect();
    } catch (err) {
      console.error('❌ Não foi possível conectar ao banco para verificação de alertas:', err.message);
      return;
    }
  }

  try {
    console.log('Iniciando verificação de alertas...');
    await ensureTables(client);
    let bases = await getBasesFromDb(client);
    if (!bases || bases.length === 0) {
      bases = getDefaultEnvBases();
    }
    for (const base of bases) {
      if (!base.token) continue;

      try {
        let dados = [];
        if (SIMULATE) {
          // gera dados simulados para teste
          if (String(base.token || '').toLowerCase().includes('teste') || String(base.nome || '').toLowerCase().includes('teste')) {
            dados = [ { variable: 'temp', value: 45 }, { variable: 'umid', value: 10 }, { variable: 'gas', value: 30 } ];
          } else {
            dados = [ { variable: 'temp', value: 24.5 }, { variable: 'umid', value: 55 }, { variable: 'gas', value: 3 } ];
          }
        } else {
          const response = await axios.get('https://api.tago.io/data?qty=1', {
            headers: { 'Device-Token': base.token },
            timeout: 10000
          });
          dados = Array.isArray(response.data?.result) ? response.data.result : [];
        }
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
        const gas = getVal('co2') ?? getVal('gas');

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

        if (gas !== null) {
          if (gas > LIMITES.gas.critico) alertasCriticos.push(`Nível de gás CRÍTICO: ${gas}%.`);
          else if (gas > LIMITES.gas.max) alertasAviso.push(`Nível de gás elevado: ${gas}%.`);
        }

        // Verifica estado anterior para enviar recuperação se necessário
        const lastState = await getLastState(client, base.nome);

        if (alertasCriticos.length === 0 && alertasAviso.length === 0) {
          // Nenhum alerta atual -> se anteriormente havia alerta (ou offline), enviar recuperação
          const wasProblem = lastState && lastState.last_nivel && lastState.last_nivel !== 'ok' && lastState.last_nivel !== 'recuperacao';
          if (wasProblem) {
            const recMsg = [`Base ${base.nome} voltou ao normal.`];
            await handleAlert(client, base.nome, 'recuperacao', recMsg);
            // Marca como ok
            await setState(client, base.nome, 'ok', []);
          } else {
            // Garante que estado esteja marcado como ok
            await setState(client, base.nome, 'ok', []);
          }
        } else {
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
    if (client) {
      await client.release();
    }
  }
};

checkAlerts().finally(() => {
  if (pool) {
    pool.end().catch(err => console.error('Erro ao encerrar pool de banco:', err.message));
  }
});
