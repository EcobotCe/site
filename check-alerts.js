require('dotenv').config();
const axios = require('axios');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');

// ─── Banco de Dados ───────────────────────────────────────────────────────────
const DB_URL = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || null;

if (!DB_URL) {
  console.error('❌ DATABASE_URL não configurada. Encerrando.');
  process.exit(1);
}

const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

// ─── E-mail ───────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// ─── Limites de Alerta ────────────────────────────────────────────────────────
const LIMITES = {
  temp: { min: 10, max: 35, critico: 40 },
  umid: { min: 30, max: 70, critico_max: 85, critico_min: 20 },
  gas:  { max: 10, critico: 20 }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const normalizeMensagens = (msgs) =>
  Array.isArray(msgs) ? msgs.map(m => String(m).trim()) : [];

const isSameAlert = (lastMsgs, currentMsgs) => {
  const last    = normalizeMensagens(lastMsgs);
  const current = normalizeMensagens(currentMsgs);
  if (last.length !== current.length) return false;
  return last.every((msg, i) => msg === current[i]);
};

// Verifica se este alerta já foi enviado (mesmo nível + mesma mensagem)
const shouldSendAlert = async (client, baseNome, nivel, mensagens) => {
  const { rows } = await client.query(
    'SELECT mensagens FROM alerts WHERE base = $1 AND nivel = $2 ORDER BY timestamp DESC LIMIT 1',
    [baseNome, nivel]
  );
  if (rows.length === 0) return true;
  return !isSameAlert(rows[0].mensagens, mensagens);
};

const getLastState = async (client, baseNome) => {
  const { rows } = await client.query(
    'SELECT last_nivel, last_mensagens FROM base_states WHERE base = $1',
    [baseNome]
  );
  return rows.length ? rows[0] : null;
};

const setState = async (client, baseNome, nivel, mensagens) => {
  await client.query(
    `INSERT INTO base_states(base, last_nivel, last_mensagens, updated_at)
     VALUES($1, $2, $3, NOW())
     ON CONFLICT (base) DO UPDATE
       SET last_nivel    = EXCLUDED.last_nivel,
           last_mensagens = EXCLUDED.last_mensagens,
           updated_at    = EXCLUDED.updated_at`,
    [baseNome, nivel, mensagens]
  );
};

// ─── Envio de E-mail ──────────────────────────────────────────────────────────
const sendAlertEmail = async (listaEmails, subject, html) => {
  if (listaEmails.length === 0) return;

  await transporter.sendMail({
    from: `"Ecobot Alertas" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,   // remetente aparece no "Para"
    bcc: listaEmails.join(', '),  // inscritos em BCC (privacidade)
    subject,
    html
  });

  console.log(`📧 E-mail "${subject}" enviado para ${listaEmails.length} inscrito(s).`);
};

// ─── Lógica de Alerta ─────────────────────────────────────────────────────────
const handleAlert = async (client, baseNome, nivel, mensagens) => {
  // Checa deduplicação
  if (!await shouldSendAlert(client, baseNome, nivel, mensagens)) {
    console.log(`ℹ️  Alerta [${nivel}] para "${baseNome}" já enviado com a mesma mensagem. Pulando.`);
    return;
  }

  // Grava no histórico
  await client.query(
    'INSERT INTO alerts(nivel, base, mensagens, timestamp) VALUES($1, $2, $3, NOW())',
    [nivel, baseNome, mensagens]
  );

  // Atualiza estado da base
  await setState(client, baseNome, nivel, mensagens);

  // Busca inscritos
  const { rows } = await client.query('SELECT email FROM subscribers');
  const listaEmails = rows.map(r => r.email);

  if (listaEmails.length === 0) {
    console.log(`⚠️  Alerta [${nivel}] registrado para "${baseNome}", mas não há inscritos para notificar.`);
    return;
  }

  // Monta e-mail
  const icone = nivel === 'critico' ? '🚨 ALERTA CRÍTICO'
              : nivel === 'aviso'   ? '⚠️ Aviso de Condições'
              : nivel === 'recuperacao' ? '✅ Recuperação'
              : '⚠️ Estação Offline';

  const html = `
    <h2>${icone} — Base ${baseNome}</h2>
    <ul>${mensagens.map(m => `<li>${m}</li>`).join('')}</ul>
    <p>Verifique a condição da base <strong>${baseNome}</strong>.</p>
    <hr/>
    <small>Ecobot Alertas Ambientais</small>
  `;

  const subject = nivel === 'critico'     ? `🚨 ALERTA CRÍTICO na base ${baseNome}`
                : nivel === 'aviso'       ? `⚠️ Aviso de Condições na base ${baseNome}`
                : nivel === 'recuperacao' ? `✅ Base ${baseNome} voltou ao normal`
                : `⚠️ Estação Offline na base ${baseNome}`;

  await sendAlertEmail(listaEmails, subject, html);
};

// ─── Loop Principal ───────────────────────────────────────────────────────────
const checkAlerts = async () => {
  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    console.error('❌ Não foi possível conectar ao banco:', err.message);
    return;
  }

  try {
    console.log('🔍 Iniciando verificação de alertas...');

    // Busca APENAS as bases cadastradas no banco — sem fallback de env vars
    const { rows: bases } = await client.query(
      'SELECT id, nome, token, lat, lon FROM bases ORDER BY id'
    );

    if (!bases || bases.length === 0) {
      console.log('ℹ️  Nenhuma base cadastrada no banco. Nada a verificar.');
      return;
    }

    console.log(`📋 ${bases.length} base(s) encontrada(s): ${bases.map(b => b.nome).join(', ')}`);

    for (const base of bases) {
      if (!base.token) {
        console.warn(`⚠️  Base "${base.nome}" sem token. Pulando.`);
        continue;
      }

      try {
        console.log(`\n→ Verificando base "${base.nome}"...`);

        // Busca dados do Tago.io
        const response = await axios.get('https://api.tago.io/data?qty=1', {
          headers: { 'Device-Token': base.token },
          timeout: 10000
        });
        const dados = Array.isArray(response.data?.result) ? response.data.result : [];

        if (dados.length === 0) {
          console.log(`  ⚠️  Sem dados — registrando alerta de offline.`);
          await handleAlert(client, base.nome, 'offline', [`Base ${base.nome} está sem dados ou offline.`]);
          continue;
        }

        // Extrai valores dos sensores
        const getVal = (pref) => {
          const item = dados.find(d => d.variable && d.variable.toLowerCase().includes(pref));
          return item ? parseFloat(String(item.value).replace(',', '.')) : null;
        };

        const temp = getVal('temp');
        const umid = getVal('umid');
        const gas  = getVal('co2') ?? getVal('gas');

        console.log(`  📊 temp=${temp ?? 'N/A'}°C  umid=${umid ?? 'N/A'}%  gas=${gas ?? 'N/A'}%`);

        const alertasCriticos = [];
        const alertasAviso    = [];

        if (temp !== null) {
          if (temp > LIMITES.temp.critico)                              alertasCriticos.push(`Temperatura CRÍTICA: ${temp}°C.`);
          else if (temp > LIMITES.temp.max || temp < LIMITES.temp.min) alertasAviso.push(`Temperatura fora do ideal: ${temp}°C.`);
        }

        if (umid !== null) {
          if (umid > LIMITES.umid.critico_max || umid < LIMITES.umid.critico_min) alertasCriticos.push(`Umidade CRÍTICA: ${umid}%.`);
          else if (umid > LIMITES.umid.max || umid < LIMITES.umid.min)            alertasAviso.push(`Umidade fora do ideal: ${umid}%.`);
        }

        if (gas !== null) {
          if (gas > LIMITES.gas.critico)    alertasCriticos.push(`Nível de gás CRÍTICO: ${gas}%.`);
          else if (gas > LIMITES.gas.max)   alertasAviso.push(`Nível de gás elevado: ${gas}%.`);
        }

        const lastState = await getLastState(client, base.nome);

        if (alertasCriticos.length === 0 && alertasAviso.length === 0) {
          // Tudo normal — verifica se estava em problema antes para enviar recuperação
          const wasProblem = lastState?.last_nivel &&
                             lastState.last_nivel !== 'ok' &&
                             lastState.last_nivel !== 'recuperacao';

          if (wasProblem) {
            console.log(`  ✅ Base voltou ao normal. Enviando e-mail de recuperação.`);
            await handleAlert(client, base.nome, 'recuperacao', [`Base ${base.nome} voltou ao normal.`]);
          }
          // Sempre garante estado ok
          await setState(client, base.nome, 'ok', []);
          console.log(`  ✅ Tudo normal.`);
        } else {
          const nivel     = alertasCriticos.length > 0 ? 'critico' : 'aviso';
          const mensagens = [...alertasCriticos, ...alertasAviso];
          console.log(`  🔔 Alertas: ${mensagens.join(' | ')}`);
          await handleAlert(client, base.nome, nivel, mensagens);
        }

      } catch (err) {
        console.error(`  ❌ Erro ao processar base "${base.nome}":`, err.message);
      }
    }

    console.log('\n✅ Verificação de alertas concluída.');

  } catch (err) {
    console.error('❌ Erro fatal em checkAlerts:', err.message);
  } finally {
    client.release();
  }
};

// ─── Execução ─────────────────────────────────────────────────────────────────
checkAlerts().finally(() => {
  pool.end().catch(err => console.error('Erro ao encerrar pool:', err.message));
});
