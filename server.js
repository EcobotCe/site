require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const nodemailer = require('nodemailer');
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const { checkAlerts } = require('./check-alerts');

const app = express();
const port = process.env.PORT || 8080;
const DATA_DIR = path.join(__dirname, 'data');
const BASES_FILE = path.join(DATA_DIR, 'bases.json');
const SUBSCRIBERS_FILE = path.join(DATA_DIR, 'subscribers.json');
const ALERTS_FILE = path.join(DATA_DIR, 'alerts.json');
const BASE_STATES_FILE = path.join(DATA_DIR, 'base_states.json');
const PREFERENCES_FILE = path.join(DATA_DIR, 'subscriber_preferences.json');

console.log(`✨ Porta final para listen: ${port}`);

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

const scheduleAlertsCron = () => {
    cron.schedule('*/5 * * * *', async () => {
        console.log('Executando a verificação de alertas via cron...');
        try {
            await checkAlerts();
        } catch (err) {
            console.error('Erro ao executar verificação de alertas:', err);
        }
    });
};

// ── Cache simples de 60s para /api/dados-recentes ─────────────────────────────
const _cache = {};
const CACHE_TTL = 60 * 1000; // 60 segundos
function cacheGet(key) {
    const entry = _cache[key];
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) { delete _cache[key]; return null; }
    return entry.data;
}

function cacheSet(key, data) { _cache[key] = { ts: Date.now(), data }; }

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// ── CORS e segurança ──────────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGINS ?
    process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean) :
    null;

app.use(helmet());

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisições. Aguarde um minuto antes de tentar novamente.' }
});

app.use('/subscribe', apiLimiter);
app.use('/api/', apiLimiter);

app.use((req, res, next) => {
    const deniedPaths = ['/data', '/package.json', '/package-lock.json', '/server.js'];
    if (deniedPaths.some(blocked => req.path.startsWith(blocked))) {
        return res.status(404).send('Not found');
    }
    if (req.path.startsWith('/.')) {
        return res.status(404).send('Not found');
    }
    next();
});

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins && allowedOrigins.length > 0) {
            if (allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
        }
        return callback(null, true);
    }
}));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── Middleware de Manutenção ────────────────────────────────────────────────
// Verifica se o site está em manutenção (variável de ambiente SITE_MAINTENANCE)
app.use((req, res, next) => {
    const isMaintenance = process.env.SITE_MAINTENANCE === 'true';
    if (isMaintenance && req.path === '/') {
        return res.sendFile(path.join(__dirname, 'maintenance.html'));
    }
    next();
});

// ── Helpers ────────────────────────────────────────────────────────────────────
const getNextId = (items) => {
    const ids = items
        .map(item => Number(item.id))
        .filter(id => !Number.isNaN(id));
    return ids.length > 0 ? Math.max(...ids) + 1 : 1;
};

const readJsonFile = async (filePath, defaultValue = []) => {
    try {
        const file = await fs.readFile(filePath, 'utf8');
        return JSON.parse(file || JSON.stringify(defaultValue));
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

const getAllBases = async () => readJsonFile(BASES_FILE, []);
const saveBases = async (bases) => writeJsonFile(BASES_FILE, bases);
const getSubscribers = async () => readJsonFile(SUBSCRIBERS_FILE, []);
const saveSubscribers = async (subscribers) => writeJsonFile(SUBSCRIBERS_FILE, subscribers);
const getPreferences = async () => readJsonFile(PREFERENCES_FILE, []);
const savePreferences = async (preferences) => writeJsonFile(PREFERENCES_FILE, preferences);
const getAlerts = async () => readJsonFile(ALERTS_FILE, []);
const saveAlerts = async (alerts) => writeJsonFile(ALERTS_FILE, alerts);
const getBaseStates = async () => readJsonFile(BASE_STATES_FILE, []);
const saveBaseStates = async (states) => writeJsonFile(BASE_STATES_FILE, states);

const getDefaultPreferences = () => ({
    alertar_temp: true,
    alertar_umid: true,
    alertar_gas: true,
    alertar_offline: true,
    alertar_recuperacao: true
});

const normalizeBoolean = (value, defaultValue = true) => {
    if (value === undefined || value === null) return defaultValue;
    return value === true || value === 'true' || value === '1' || value === 1;
};

const getPreferenceForEmail = async (email) => {
    const preferences = await getPreferences();
    return preferences.find(pref => pref.email === email) || null;
};

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

const getSortedAlerts = async () => {
    const alerts = await getAlerts();
    return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const getLastState = async (baseNome) => {
    const states = await getBaseStates();
    const state = states.find(item => item.base === baseNome);
    if (!state) return { last_nivel: {}, last_mensagens: [], updated_at: null };
    return state;
};

const setState = async (baseNome, nivelObj, mensagens) => {
    const states = await getBaseStates();
    const existingIndex = states.findIndex(item => item.base === baseNome);
    const record = {
        base: baseNome,
        last_nivel: nivelObj,
        last_mensagens: mensagens || [],
        updated_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
        states[existingIndex] = record;
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

const findSubscriberByEmail = async (email) => {
    const subscribers = await getSubscribers();
    return subscribers.find(subscriber => subscriber.email === email);
};

// ── Rotas ──────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/test-json', (req, res) => {
    res.json({
        test: 'Express is running!',
        time: new Date().toISOString(),
        port: port,
        node_env: process.env.NODE_ENV
    });
});

app.get('/health', (req, res) => {
    const response = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        storage: 'json',
        server: 'Express.js',
        ambiente: process.env.NODE_ENV || 'production',
        cors_env: process.env.CORS_ORIGINS || 'aberto (todos permitidos)',
        cors_parsed: allowedOrigins || ['*']
    };
    res.status(200).json(response);
});

app.post('/subscribe', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).send('O e-mail é obrigatório.');

    try {
        const subscribers = await getSubscribers();
        if (subscribers.some(sub => sub.email === email)) {
            return res.status(409).send('Este e-mail já está inscrito.');
        }

        subscribers.push({ email });
        await saveSubscribers(subscribers);

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            transporter.sendMail({
                from: `"Ecobot Alertas" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: '✅ Inscrição Confirmada no Ecobot Alertas',
                html: `<h2>Olá!</h2><p>Obrigado por se inscrever no sistema de alertas ambientais do Ecobot.</p><p>Você agora receberá e-mails de aviso e de alerta crítico baseados nos dados de nossos sensores.</p><p>Atenciosamente,<br>Equipe Ecobot</p>`
            }).catch(err => console.error(`❌ Erro ao enviar email: ${err.message}`));
        }

        res.status(200).send('Inscrito com sucesso! E-mail de confirmação será enviado em breve.');
    } catch (error) {
        console.error('❌ Erro ao inscrever e-mail:', error.message);
        res.status(500).send(`Erro: ${error.message}`);
    }
});

app.get('/unsubscribe', async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).send('O e-mail é obrigatório.');

    try {
        const subscribers = await getSubscribers();
        const remaining = subscribers.filter(sub => sub.email !== email);
        if (remaining.length === subscribers.length) {
            return res.status(404).send(`<h1>E-mail Não Encontrado</h1><p>O e-mail ${email} não foi encontrado na nossa lista de inscritos.</p>`);
        }

        await saveSubscribers(remaining);
        const preferences = await getPreferences();
        await savePreferences(preferences.filter(pref => pref.email !== email));

        res.status(200).send(`<h1>Inscrição Cancelada</h1><p>O e-mail ${email} foi removido da nossa lista de alertas.</p>`);
    } catch (error) {
        console.error('Erro ao cancelar inscrição:', error);
        res.status(500).send('<h1>Erro no Servidor</h1><p>Não foi possível processar seu pedido.</p>');
    }
});

app.get('/api/preferences', async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'E-mail obrigatório.' });

    const pref = await getPreferenceForEmail(email);
    return res.json(pref ? pref : getDefaultPreferences());
});

app.post('/api/preferences', async (req, res) => {
    const { email, alertar_temp, alertar_umid, alertar_gas, alertar_offline, alertar_recuperacao } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mail obrigatório.' });

    const subscriber = await findSubscriberByEmail(email);
    if (!subscriber) return res.status(404).json({ error: 'E-mail não encontrado na lista de inscritos.' });

    const preferences = await getPreferences();
    const existingIndex = preferences.findIndex(pref => pref.email === email);
    const updatedPref = {
        email,
        alertar_temp: normalizeBoolean(alertar_temp, true),
        alertar_umid: normalizeBoolean(alertar_umid, true),
        alertar_gas: normalizeBoolean(alertar_gas, true),
        alertar_offline: normalizeBoolean(alertar_offline, true),
        alertar_recuperacao: normalizeBoolean(alertar_recuperacao, true),
        updated_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
        preferences[existingIndex] = updatedPref;
    } else {
        preferences.push(updatedPref);
    }
    await savePreferences(preferences);
    res.json({ ok: true });
});

app.get('/api/alerts', async (req, res) => {
    try {
        const alerts = await getSortedAlerts();
        res.status(200).json(alerts);
    } catch (error) {
        console.error('Erro ao buscar histórico de alertas:', error);
        res.status(500).json({ error: 'Falha ao buscar alertas' });
    }
});

app.get('/api/bases', async (req, res) => {
    try {
        const bases = await getBases();
        const safeBases = bases.map(base => ({
            id: base.id,
            nome: base.nome,
            lat: base.lat !== undefined ? base.lat : null,
            lon: base.lon !== undefined ? base.lon : null
        }));
        res.status(200).json(safeBases);
    } catch (error) {
        console.error('Erro ao listar bases:', error.message);
        res.status(500).json({ error: 'Falha ao carregar bases' });
    }
});

app.post('/api/bases', async (req, res) => {
    const { id, nome, token, lat, lon } = req.body;
    if (!nome) {
        return res.status(400).json({ error: 'O nome é obrigatório.' });
    }

    const latValue = lat !== undefined && lat !== null && lat !== '' ? parseFloat(lat) : null;
    const lonValue = lon !== undefined && lon !== null && lon !== '' ? parseFloat(lon) : null;

    try {
        const bases = await getAllBases();
        if (id) {
            const baseIndex = bases.findIndex(b => Number(b.id) === Number(id));
            if (baseIndex === -1) {
                return res.status(404).json({ error: 'Base não encontrada.' });
            }
            bases[baseIndex] = {
                ...bases[baseIndex],
                nome,
                token: token || bases[baseIndex].token,
                lat: latValue,
                lon: lonValue,
                deleted_at: bases[baseIndex].deleted_at || null
            };
            await saveBases(bases);
            return res.status(200).json({ id: bases[baseIndex].id, nome, lat: latValue, lon: lonValue });
        }

        if (!token) {
            return res.status(400).json({ error: 'O token é obrigatório para criação de uma nova base.' });
        }

        if (bases.some(base => base.nome === nome && !base.deleted_at)) {
            return res.status(409).json({ error: 'Já existe uma base com esse nome.' });
        }

        const newBase = {
            id: getNextId(bases),
            nome,
            token,
            lat: latValue,
            lon: lonValue,
            deleted_at: null
        };
        bases.push(newBase);
        await saveBases(bases);
        return res.status(201).json({ id: newBase.id, nome: newBase.nome, lat: newBase.lat, lon: newBase.lon });
    } catch (error) {
        console.error('Erro ao salvar base:', error.message);
        res.status(500).json({ error: 'Falha ao salvar a base' });
    }
});

app.delete('/api/bases/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'ID inválido.' });
    }

    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    if (!ADMIN_PASSWORD) {
        return res.status(500).json({ error: 'Senha de administrador não configurada no servidor.' });
    }
    const { adminPassword } = req.body;
    if (!adminPassword || adminPassword !== ADMIN_PASSWORD) {
        return res.status(403).json({ error: 'Senha de administrador incorreta.' });
    }

    try {
        const bases = await getAllBases();
        const baseIndex = bases.findIndex(base => Number(base.id) === id && !base.deleted_at);
        if (baseIndex === -1) {
            return res.status(404).json({ error: 'Base não encontrada.' });
        }

        bases[baseIndex].deleted_at = new Date().toISOString();
        await saveBases(bases);
        return res.status(200).json({ message: 'Base removida com sucesso.' });
    } catch (error) {
        console.error('Erro ao remover base:', error.message);
        res.status(500).json({ error: 'Falha ao remover a base' });
    }
});

app.get('/api/bases/lixeira', async (req, res) => {
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    const { adminPassword } = req.query;
    if (!ADMIN_PASSWORD || adminPassword !== ADMIN_PASSWORD) {
        return res.status(403).json({ error: 'Acesso negado.' });
    }

    try {
        const bases = await getAllBases();
        const deletedBases = bases
            .filter(base => base.deleted_at)
            .map(base => ({ id: base.id, nome: base.nome, lat: base.lat, lon: base.lon, deleted_at: base.deleted_at }))
            .sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());
        res.json(deletedBases);
    } catch (error) {
        console.error('Erro ao carregar lixeira:', error.message);
        res.status(500).json({ error: 'Falha ao carregar lixeira.' });
    }
});

app.get('/api/dados-recentes', async (req, res) => {
    const cacheKey = 'dados-recentes';
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const BASES = await getBases();
    if (!BASES || BASES.length === 0) {
        return res.status(200).json([]);
    }

    const resultados = [];
    for (const base of BASES) {
        if (!base.token) continue;
        try {
            const response = await axios.get('https://api.tago.io/data?qty=60', {
                headers: { 'Device-Token': base.token },
                timeout: 10000
            });
            const dados = Array.isArray(response.data?.result) ? response.data.result : [];
            const getVal = (pref) => {
                const item = dados.find(d => d.variable && d.variable.toLowerCase().includes(pref));
                return item ? parseFloat(String(item.value).replace(',', '.')) : null;
            };
            const timestampMaisRecente = dados.length > 0 ? dados[0].time : null;
            resultados.push({
                nome: base.nome,
                temp: getVal('temp'),
                umid: getVal('umid'),
                gas: getVal('co2') ?? getVal('gas'),
                timestamp: timestampMaisRecente,
                dados: dados.slice(0, 5)
            });
        } catch (error) {
            console.error(`Erro ao buscar dados para a base ${base.nome}:`, error.message);
            resultados.push({ nome: base.nome, temp: null, umid: null, gas: null, timestamp: null, dados: [] });
        }
    }

    cacheSet(cacheKey, resultados);
    res.json(resultados);
});

app.get('/api/test-tago', async (req, res) => {
    const { baseId, qty = 60, start_date, end_date } = req.query;
    if (!baseId) return res.status(400).json({ error: 'baseId é obrigatório.' });

    try {
        const bases = await getBases();
        const base = bases.find(b => Number(b.id) === Number(baseId));
        if (!base || !base.token) {
            return res.status(404).json({ error: 'Base não encontrada.' });
        }

        const params = new URLSearchParams();
        params.set('qty', qty);
        if (start_date) params.set('start_date', start_date);
        if (end_date) params.set('end_date', end_date);

        const response = await axios.get(`https://api.tago.io/data?${params.toString()}`, {
            headers: { 'Device-Token': base.token },
            timeout: 10000
        });
        res.status(200).json(response.data);
    } catch (error) {
        const status = error.response?.status || 502;
        const detail = error.response?.data || error.message;
        console.error('Erro no proxy TagO:', detail);
        res.status(status).json({ error: 'Falha ao contactar a API do TagO.io.', detalhe: detail });
    }
});

// ── Start ──────────────────────────────────────────────────────────────────────
let server;

const startServer = async () => {
    try {
        await ensureDataStore();
        scheduleAlertsCron();
        server = app.listen(port, () => {
            console.log(`🚀 Servidor iniciado com sucesso na porta ${port}`);
            console.log(`📊 Health check disponível em http://localhost:${port}/health`);
            console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (err) {
        console.error('❌ Falha ao iniciar o servidor:', err);
        process.exit(1);
    }
};

startServer();

process.on('uncaughtException', (err) => {
    console.error('❌ Erro não capturado:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promessa rejeitada não tratada:', reason);
    process.exit(1);
});

process.on('SIGTERM', () => {
    console.log('⚠️ SIGTERM recebido. Encerrando gracefully...');
    server.close(() => {
        console.log('✅ Servidor encerrado');
        process.exit(0);
    });
});