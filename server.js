const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { exec } = require('child_process');

const app = express();
const port = process.env.PORT || 3001;

const emailsFile = path.join(__dirname, 'emails.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/subscribe', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send('O e-mail é obrigatório.');
  }

  try {
    let emails = [];
    // Verifica se o arquivo existe e não está vazio
    if (fs.existsSync(emailsFile)) {
      const data = fs.readFileSync(emailsFile, 'utf8');
      if (data) {
        emails = JSON.parse(data);
      }
    }

    // Verifica se há duplicatas
    if (emails.includes(email)) {
      return res.status(409).send('Este e-mail já está inscrito.');
    }

    emails.push(email);
    fs.writeFileSync(emailsFile, JSON.stringify(emails, null, 2));

    res.status(200).send('Inscrito com sucesso!');

  } catch (error) {
    console.error('Erro ao inscrever e-mail:', error);
    res.status(500).send('Ocorreu um erro no servidor ao processar sua inscrição.');
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
    if (err) {
      console.error(err);
      return;
    }
    console.log(stdout);
    console.error(stderr);
  });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
