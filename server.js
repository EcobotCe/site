require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { exec } = require('child_process');
const nodemailer = require('nodemailer');
const axios = require('axios'); // Adicionado para a API

const app = express();
const port = process.env.PORT || 3001;
const emailsFile = path.join(__dirname, 'emails.json');
const alertsLogFile = path.join(__dirname, 'alerts-log.json'); // Caminho para o log

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/subscribe', async (req, res) => {
  const { email } = req.body;
  if (!email) { return res.status(400).send('O e-mail é obrigatório.'); }
  try {
    let emails = [];
    if (fs.existsSync(emailsFile)) {
      const data = fs.readFileSync(emailsFile, 'utf8');
      if (data) { emails = JSON.parse(data); }
    }
    if (emails.includes(email)) { return res.status(409).send('Este e-mail já está inscrito.'); }
    emails.push(email);
    fs.writeFileSync(emailsFile, JSON.stringify(emails, null, 2));
    await transporter.sendMail({
        from: `"Ecobot Alertas" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '✅ Inscrição Confirmada no Ecobot Alertas',
        html: `<h2>Olá!</h2><p>Obrigado por se inscrever no sistema de alertas ambientais do Ecobot.</p><p>Você agora receberá e-mails de aviso e de alerta crítico baseados nos dados de nossos sensores.</p><p>Atenciosamente,<br>Equipe Ecobot</p>`
    });
    console.log(`E-mail de boas-vindas enviado para ${email}`);
    res.status(200).send('Inscrito com sucesso! E-mail de confirmação enviado.');
  } catch (error) {
    console.error('Erro ao inscrever e-mail ou enviar confirmação:', error);
    res.status(500).send('Ocorreu um erro no servidor ao processar sua inscrição.');
  }
});

app.get('/unsubscribe', (req, res) => {
  const { email } = req.query;
  if (!email) { return res.status(400).send('O e-mail é obrigatório na consulta.'); }
  try {
    if (fs.existsSync(emailsFile)) {
      let emails = JSON.parse(fs.readFileSync(emailsFile, 'utf8') || '[]');
      const emailIndex = emails.indexOf(email);
      if (emailIndex > -1) {
        emails.splice(emailIndex, 1);
        fs.writeFileSync(emailsFile, JSON.stringify(emails, null, 2));
        console.log(`E-mail ${email} removido da lista.`);
        return res.status(200).send(`<h1>Inscrição Cancelada</h1><p>O e-mail ${email} foi removido da nossa lista de alertas.</p>`);
      } else {
        return res.status(404).send(`<h1>E-mail Não Encontrado</h1><p>O e-mail ${email} não foi encontrado na nossa lista de inscritos.</p>`);
      }
    } else {
        return res.status(404).send('<h1>Lista de Inscrição Vazia</h1><p>Nenhum e-mail encontrado.</p>');
    }
  } catch (error) {
    console.error('Erro ao cancelar inscrição:', error);
    res.status(500).send('<h1>Erro no Servidor</h1><p>Não foi possível processar seu pedido de cancelamento de inscrição.</p>');
  }
});

// --- NOVO: Endpoint para o histórico de alertas ---
app.get('/api/alerts', (req, res) => {
  if (fs.existsSync(alertsLogFile)) {
    const data = fs.readFileSync(alertsLogFile, 'utf8');
    res.status(200).json(JSON.parse(data || '[]'));
  } else {
    res.status(200).json([]);
  }
});

// --- NOVO: Endpoint para os dados recentes das bases ---
app.get('/api/dados-recentes', async (req, res) => {
  const BASES = [
    { id: 1, nome: 'EEEPDJWM', token: process.env.TAGO_TOKEN_1 },
    { id: 2, nome: 'EEEPDJWM 2.0', token: process.env.TAGO_TOKEN_2 }
  ];
  const resultados = [];
  for (const base of BASES) {
    if (!base.token) continue;
    try {
      const response = await axios.get('https://api.tago.io/data?qty=5', {
        headers: { 'Device-Token': base.token },
        timeout: 10000
      });
      const dados = Array.isArray(response.data?.result) ? response.data.result : [];
      const getVal = (pref) => {
          const item = dados.find(d => d.variable && d.variable.toLowerCase().includes(pref));
          return item ? parseFloat(String(item.value).replace(',', '.')) : null;
      };
      resultados.push({
        nome: base.nome,
        temp: getVal('temp'),
        umid: getVal('umid'),
        co2: getVal('co2') ?? getVal('gas'),
        timestamp: dados.length > 0 ? dados[0].time : null
      });
    } catch (error) {
      console.error(`Erro ao buscar dados para a base ${base.nome} no endpoint /api/dados-recentes:`, error.message);
      resultados.push({ nome: base.nome, error: 'Não foi possível carregar os dados.' });
    }
  }
  res.json(resultados);
});

cron.schedule('*/5 * * * *', () => {
  console.log('Executando a verificação de alertas...');
  exec('node check-alerts.js', (err, stdout, stderr) => {
    if (err) { console.error(err); return; }
    console.log(stdout);
    console.error(stderr);
  });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
