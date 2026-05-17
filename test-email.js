require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('\n🧪 INICIANDO TESTE DE EMAIL\n');

const emailUser = (process.env.EMAIL_USER || '').trim();
const emailPass = (process.env.EMAIL_PASS || '').trim();

if (!emailUser || !emailPass) {
  console.error('❌ ERRO: EMAIL_USER ou EMAIL_PASS não configurados\n');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: emailUser,
    pass: emailPass
  },
  logger: true,
  debug: true
});

console.log(`📧 Email: ${emailUser}`);
console.log(`🔐 Senha: ${emailPass.substring(0, 4)}${'*'.repeat(emailPass.length - 4)}\n`);

console.log('🔄 Testando conexão...\n');

transporter.sendMail({
  from: emailUser,
  to: emailUser,
  subject: '✅ Teste Ecobot - Email Funcionando!',
  html: `
    <h2>✅ Email de Teste do Ecobot</h2>
    <p>Se você recebeu este email, a configuração está CORRETA!</p>
    <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
    <hr>
    <p>Seu sistema de alertas Ecobot está pronto para enviar notificações.</p>
  `,
  text: 'Email de teste do Ecobot'
}, (err, info) => {
  if (err) {
    console.error('❌ ERRO AO ENVIAR EMAIL:');
    console.error(`   ${err.message}\n`);
    
    if (err.message.includes('Invalid login')) {
      console.error('   💡 Solução: Verifique se EMAIL_PASS é uma App Password\n');
    }
  } else {
    console.log('✅ EMAIL ENVIADO COM SUCESSO!\n');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}\n`);
  }
  process.exit(err ? 1 : 0);
});
