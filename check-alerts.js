// FIX: arquivo tinha "18.17.0" colado no início da primeira linha (versão do Node
// concatenada acidentalmente), causando SyntaxError ao rodar.
require('dotenv').config();
const axios = require('axios');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');

// ─── Banco de Dados ───────────────────────────────────────────────────────────
const DB_URL = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || null;
if (!DB_URL) { console.error('❌ DATABASE_URL não configurada. Encerrando.'); process.exit(1); }

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

// Mapa de tipos de alerta para a coluna de preferência
const NIVEL_PARA_TIPO = {
  critico:     null,       // crítico sempre envia (inclui todas as categorias)
  aviso:       null,       // aviso sempre envia
  offline:     'alertar_offline',
  recuperacao: 'alertar_recuperacao',
};

// Tipo por categoria de sensor → coluna de preferência
const SENSOR_PREF = {
  temp: 'alertar_temp',
  umid: 'alertar_umid',
  gas:  'alertar_gas',
};

// ─── FIX: Timeout aumentado de 7 → 15 minutos ────────────────────────────────
// Com 7 minutos qualquer atraso de rede ou envio do sensor causava "offline"
// e pulava toda a avaliação de temp/umid/gas — nunca gerando alertas reais.
// 15 minutos é mais tolerante sem perder a detecção de falha real.
const OFFLINE_TIMEOUT_MS = 15 * 60 * 1000;

// ─── Estado da Base ───────────────────────────────────────────────────────────
const getLastState = async (client, baseNome) => {
  const { rows } = await client.query(
    'SELECT last_nivel, last_mensagens FROM base_states WHERE base = $1',
    [baseNome]
  );
  if (!rows.length) return { niveis: {}, last_nivel: null };
  let niveis = {};
  try { niveis = JSON.parse(rows[0].last_nivel || '{}'); } catch { niveis = {}; }
  return { niveis, last_nivel: rows[0].last_nivel };
};

const setState = async (client, baseNome, nivelObj, mensagens) => {
  const nivelJson = JSON.stringify(nivelObj);
  await client.query(
    `INSERT INTO base_states(base, last_nivel, last_mensagens, updated_at)
     VALUES($1, $2, $3, NOW())
     ON CONFLICT (base) DO UPDATE
       SET last_nivel     = EXCLUDED.last_nivel,
           last_mensagens = EXCLUDED.last_mensagens,
           updated_at     = EXCLUDED.updated_at`,
    [baseNome, nivelJson, mensagens]
  );
};

// ─── FIX: Limpa estado travado em "critico/aviso" sem dados recentes ──────────
// Se a base ficou muito tempo sem dados, o estado pode ficar travado em "critico"
// e nunca gerar novos alertas (pois o código só alerta quando há mudança de estado).
// Esta função reseta o estado para "ok" em todos os sensores sem enviar e-mail,
// permitindo que o próximo dado real acione os alertas corretamente.
const resetarEstadoSeNecessario = async (client, baseNome, lastNiveis, ultimaAtualizacaoEstado) => {
  if (!ultimaAtualizacaoEstado) return lastNiveis;
  const idadeEstadoMs = Date.now() - new Date(ultimaAtualizacaoEstado).getTime();
  const ESTADO_EXPIRA_MS = 60 * 60 * 1000; // 1 hora sem dados = reseta estado

  if (idadeEstadoMs > ESTADO_EXPIRA_MS) {
    console.log(`  🔄 Estado expirado (${Math.round(idadeEstadoMs / 60000)} min). Resetando para reavaliação limpa.`);
    const nivelReset = { temp: undefined, umid: undefined, gas: undefined, offline: false };
    await setState(client, baseNome, nivelReset, []);
    return nivelReset;
  }
  return lastNiveis;
};

// ─── Busca inscritos com filtro por preferência ────────────────────────────
const getInscritosParaTipo = async (client, tipo) => {
  let query, params;
  if (!tipo) {
    query = 'SELECT email FROM subscribers';
    params = [];
  } else {
    query = `SELECT s.email FROM subscribers s
             LEFT JOIN subscriber_preferences p ON p.email = s.email
             WHERE COALESCE(p.${tipo}, true) = true`;
    params = [];
  }
  const { rows } = await client.query(query, params);
  return rows.map(r => r.email);
};

// ─── Envio de E-mail ──────────────────────────────────────────────────────────
const sendAlertEmail = async (listaEmails, subject, html) => {
  if (listaEmails.length === 0) return false;
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

// ─── Monta e envia e-mail de alerta ───────────────────────────────────────────
const enviarEmailAlerta = async (client, baseNome, nivel, mensagens, tipo) => {
  const listaEmails = await getInscritosParaTipo(client, tipo);
  if (listaEmails.length === 0) {
    console.log(`  ⚠️  Nenhum inscrito para receber alerta [${nivel}].`);
    return;
  }

  const icone   = nivel === 'critico'     ? '🚨 ALERTA CRÍTICO'
                : nivel === 'aviso'       ? '⚠️ Aviso de Condições'
                : nivel === 'recuperacao' ? '✅ Recuperação'
                : '📡 Estação Offline';

  const subject = nivel === 'critico'     ? `🚨 ALERTA CRÍTICO na base ${baseNome}`
                : nivel === 'aviso'       ? `⚠️ Aviso de Condições — ${baseNome}`
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

  // Grava no histórico
  await client.query(
    'INSERT INTO alerts(nivel, base, mensagens, timestamp) VALUES($1, $2, $3, NOW())',
    [nivel, baseNome, mensagens]
  );
};

// ─── Loop Principal ───────────────────────────────────────────────────────────
const checkAlerts = async () => {
  let client;
  try { client = await pool.connect(); }
  catch (err) { console.error('❌ Não foi possível conectar ao banco:', err.message); return; }

  try {
    console.log('🔍 Iniciando verificação de alertas...');

    const { rows: bases } = await client.query('SELECT id, nome, token FROM bases ORDER BY id');
    if (!bases || bases.length === 0) {
      console.log('ℹ️  Nenhuma base cadastrada. Nada a verificar.');
      return;
    }
    console.log(`📋 ${bases.length} base(s): ${bases.map(b => b.nome).join(', ')}`);

    for (const base of bases) {
      if (!base.token) { console.warn(`⚠️  "${base.nome}" sem token. Pulando.`); continue; }

      try {
        console.log(`\n→ Verificando "${base.nome}"...`);

        // FIX: qty=5 em vez de qty=1 — pega as últimas 5 leituras para ter redundância.
        // Com qty=1, se aquela única leitura for antiga, a base vai para "offline"
        // e toda a avaliação de sensores é pulada com `continue`.
        // Com qty=5, usamos o dado mais recente mas temos contexto extra para debug.
        const response = await axios.get('https://api.tago.io/data?qty=5', {
          headers: { 'Device-Token': base.token },
          timeout: 10000
        });
        const dados = Array.isArray(response.data?.result) ? response.data.result : [];

        // Busca o estado anterior + timestamp da última atualização do estado
        const { rows: stateRows } = await client.query(
          'SELECT last_nivel, last_mensagens, updated_at FROM base_states WHERE base = $1',
          [base.nome]
        );
        let niveis = {};
        let ultimaAtualizacaoEstado = null;
        if (stateRows.length) {
          try { niveis = JSON.parse(stateRows[0].last_nivel || '{}'); } catch { niveis = {}; }
          ultimaAtualizacaoEstado = stateRows[0].updated_at;
        }

        // FIX: verifica se o estado está travado há muito tempo e reseta se necessário
        niveis = await resetarEstadoSeNecessario(client, base.nome, niveis, ultimaAtualizacaoEstado);
        const lastNiveis = niveis;

        // Verifica se o dado mais recente é antigo demais (> 15 min = offline)
        // FIX: ordena por time para garantir que dados[0] é realmente o mais recente
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
            await enviarEmailAlerta(client, base.nome, 'offline',
              [`Base ${base.nome} está offline. ${motivo}.`], 'alertar_offline');
            await setState(client, base.nome, { ...lastNiveis, offline: true }, []);
          } else {
            console.log(`  📡 Offline (já notificado).`);
          }
          continue;
        }

        // Online — extrai sensores do dado mais recente
        // FIX: usa dadosOrdenados para garantir que pega a leitura mais atual de cada variável
        const getVal = (pref) => {
          const item = dadosOrdenados.find(d => d.variable?.toLowerCase().includes(pref));
          return item ? parseFloat(String(item.value).replace(',', '.')) : null;
        };
        const temp = getVal('temp');
        const umid = getVal('umid');
        const gas  = getVal('co2') ?? getVal('gas');
        console.log(`  📊 temp=${temp ?? 'N/A'}°C  umid=${umid ?? 'N/A'}%  gas=${gas ?? 'N/A'}%`);

        // Se voltou do offline, notifica recuperação
        if (lastNiveis.offline) {
          await enviarEmailAlerta(client, base.nome, 'recuperacao',
            [`Base ${base.nome} voltou a enviar dados.`], 'alertar_recuperacao');
        }

        // Avalia cada sensor individualmente
        const novosNiveis = { ...lastNiveis, offline: false };
        const alertasCriticos = [];
        const alertasAviso    = [];

        const avaliar = (sensor, valor, nivelAtual) => {
          if (valor === null) return;
          let novoNivel;
          if (sensor === 'temp') {
            if (valor > LIMITES.temp.critico)                               novoNivel = 'critico';
            else if (valor > LIMITES.temp.max || valor < LIMITES.temp.min)  novoNivel = 'aviso';
            else                                                             novoNivel = 'ok';
          } else if (sensor === 'umid') {
            if (valor > LIMITES.umid.critico_max || valor < LIMITES.umid.critico_min) novoNivel = 'critico';
            else if (valor > LIMITES.umid.max || valor < LIMITES.umid.min)            novoNivel = 'aviso';
            else                                                                       novoNivel = 'ok';
          } else if (sensor === 'gas') {
            if (valor > LIMITES.gas.critico)   novoNivel = 'critico';
            else if (valor > LIMITES.gas.max)  novoNivel = 'aviso';
            else                               novoNivel = 'ok';
          }

          novosNiveis[sensor] = novoNivel;
          const anterior = nivelAtual || 'ok';

          if (novoNivel !== anterior) {
            if (novoNivel === 'critico') alertasCriticos.push({ sensor, novoNivel, valor });
            else if (novoNivel === 'aviso') alertasAviso.push({ sensor, novoNivel, valor });
          }
        };

        avaliar('temp', temp, lastNiveis.temp);
        avaliar('umid', umid, lastNiveis.umid);
        avaliar('gas',  gas,  lastNiveis.gas);

        const nomeSensor = { temp: 'Temperatura', umid: 'Umidade', gas: 'Gás' };
        const unidade    = { temp: '°C', umid: '%', gas: '%' };

        for (const { sensor, novoNivel, valor } of alertasCriticos) {
          const msg = `${nomeSensor[sensor]} CRÍTICA: ${valor}${unidade[sensor]}`;
          await enviarEmailAlerta(client, base.nome, 'critico', [msg], null);
        }
        for (const { sensor, novoNivel, valor } of alertasAviso) {
          const msg = `${nomeSensor[sensor]} fora do ideal: ${valor}${unidade[sensor]}`;
          await enviarEmailAlerta(client, base.nome, 'aviso', [msg], SENSOR_PREF[sensor]);
        }

        // Recuperações parciais
        for (const sensor of ['temp', 'umid', 'gas']) {
          const anterior = lastNiveis[sensor] || 'ok';
          const novo = novosNiveis[sensor];
          if (anterior !== 'ok' && anterior !== undefined && novo === 'ok') {
            const msg = `${nomeSensor[sensor]} voltou ao normal.`;
            await enviarEmailAlerta(client, base.nome, 'recuperacao', [msg], 'alertar_recuperacao');
          }
        }

        await setState(client, base.nome, novosNiveis, []);
        console.log(`  💾 Estado salvo: ${JSON.stringify(novosNiveis)}`);

      } catch (err) {
        console.error(`  ❌ Erro em "${base.nome}":`, err.message);
      }
    }

    console.log('\n✅ Verificação concluída.');

  } catch (err) {
    console.error('❌ Erro fatal:', err.message);
  } finally {
    client.release();
  }
};

checkAlerts().finally(() => {
  pool.end().catch(err => console.error('Erro ao encerrar pool:', err.message));
});
