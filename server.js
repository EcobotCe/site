require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { exec } = require('child_process');
const nodemailer = require('nodemailer');

const app = express();
const port = process.env.PORT || 3001;
const emailsFile = path.join(__dirname, 'emails.json');

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

  if (!email) {
    return res.status(400).send('O e-mail é obrigatório.');
  }

  try {
    let emails = [];
    if (fs.existsSync(emailsFile)) {
      const data = fs.readFileSync(emailsFile, 'utf8');
      if (data) {
        emails = JSON.parse(data);
      }
    }

    if (emails.includes(email)) {
      return res.status(409).send('Este e-mail já está inscrito.');
    }

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

// --- NOVO: Endpoint para cancelar inscrição ---
app.get('/unsubscribe', (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).send('O e-mail é obrigatório na consulta.');
  }

  try {
    if (fs.existsSync(emailsFile)) {
      const data = fs.readFileSync(emailsFile, 'utf8');
      let emails = data ? JSON.parse(data) : [];
      
      const emailIndex = emails.indexOf(email);
      if (emailIndex > -1) {
        emails.splice(emailIndex, 1); // Remove o e-mail
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

app.get('/emails', (req, res) => {
  fs.readFile(emailsFile, (err, data) => {
    if (err) {
      res.status(200).send([]);
    } else {
      res.status(200).send(JSON.parse(data));
    }
  });
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
