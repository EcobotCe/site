
console.log('Valor de process.env.PORT:', process.env.PORT);

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

  fs.readFile(emailsFile, (err, data) => {
    if (err) {
      fs.writeFile(emailsFile, JSON.stringify([email]), (err) => {
        if (err) throw err;
        res.status(200).send('Inscrito com sucesso!');
      });
    } else {
      const emails = JSON.parse(data);
      emails.push(email);
      fs.writeFile(emailsFile, JSON.stringify(emails), (err) => {
        if (err) throw err;
        res.status(200).send('Inscrito com sucesso!');
      });
    }
  });
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
