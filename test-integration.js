#!/usr/bin/env node

// ================================================
// 🧪 TESTE DE INTEGRAÇÃO - ECOBOT
// ================================================
// Script para testar todos os endpoints da API
// Gera dados realistas e valida respostas

const http = require('http');

// ================================================
// ⚙️ CONFIGURAÇÃO
// ================================================

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const TIMEOUT = 30000; // 30 segundos (para dar tempo ao email fazer retry)

// Cores para terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  purple: '\x1b[35m',
};

// ================================================
// 🎲 GERADORES DE DADOS DE TESTE
// ================================================

function gerarEmail() {
  const emails = [
    'pjt.ecobot@gmail.com',
    'admin@ecobot.com',
    'teste@example.com',
    'alertas@company.com'
  ];
  return emails[Math.floor(Math.random() * emails.length)];
}

function gerarTemperatura() {
  // Simula temperatura entre 18°C e 28°C
  return (18 + Math.random() * 10).toFixed(1);
}

function gerarUmidade() {
  // Simula umidade entre 40% e 80%
  return Math.floor(40 + Math.random() * 40);
}

function gerarCO2() {
  // Simula CO2 entre 400 e 1500 ppm (crítico acima de 1000)
  return Math.floor(400 + Math.random() * 1100);
}

function gerarDado(tipo) {
  switch (tipo) {
    case 'temperatura':
      return { tipo: 'temperatura', valor: gerarTemperatura(), unidade: '°C' };
    case 'umidade':
      return { tipo: 'umidade', valor: gerarUmidade(), unidade: '%' };
    case 'co2':
      return { tipo: 'co2', valor: gerarCO2(), unidade: 'ppm' };
    default:
      return gerarDado(['temperatura', 'umidade', 'co2'][Math.floor(Math.random() * 3)]);
  }
}

function gerarAlerta(tipo = 'ALEATÓRIO') {
  const dados = gerarDado();
  const tiposAlerta = ['CRÍTICO', 'AVISO', 'INFO'];
  const tipoSelecionado = tipo === 'ALEATÓRIO' ? tiposAlerta[Math.floor(Math.random() * 3)] : tipo;

  let assunto, corpo;

  if (dados.tipo === 'temperatura') {
    assunto = `🌡️ Alerta de Temperatura: ${dados.valor}${dados.unidade}`;
    corpo = `Temperatura anormal detectada!\n\nValor atual: ${dados.valor}${dados.unidade}\nLimite recomendado: 20-26°C`;
  } else if (dados.tipo === 'umidade') {
    assunto = `💧 Alerta de Umidade: ${dados.valor}${dados.unidade}`;
    corpo = `Umidade fora do padrão!\n\nValor atual: ${dados.valor}${dados.unidade}\nLimite recomendado: 45-65%`;
  } else {
    assunto = `⚠️ Alerta de CO2: ${dados.valor}${dados.unidade}`;
    corpo = `Nível de CO2 crítico!\n\nValor atual: ${dados.valor}${dados.unidade}\nLimite máximo: 1000 ppm`;
  }

  return {
    destinatario: gerarEmail(),
    assunto: assunto,
    corpo: corpo,
    baseNome: `Base Monitoramento ${Math.floor(Math.random() * 5) + 1}`,
    valor: `${dados.valor}${dados.unidade}`,
    tipo: tipoSelecionado
  };
}

// ================================================
// 🌐 FUNÇÕES DE REQUISIÇÃO HTTP
// ================================================

function fazerRequisicao(metodo, caminho, dados = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(SERVER_URL);
    const opcoes = {
      hostname: url.hostname,
      port: url.port,
      path: caminho,
      method: metodo,
      timeout: TIMEOUT,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(opcoes, (res) => {
      let resposta = '';

      res.on('data', (chunk) => {
        resposta += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(resposta);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            dados: json
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            dados: resposta
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('TIMEOUT - Servidor não respondeu em 10 segundos'));
    });

    if (dados) {
      req.write(JSON.stringify(dados));
    }

    req.end();
  });
}

// ================================================
// 🧪 TESTES
// ================================================

async function testarHealth() {
  console.log(`\n${colors.blue}🏥 Teste 1: Health Check${colors.reset}`);
  console.log('─'.repeat(60));

  try {
    const resultado = await fazerRequisicao('GET', '/api/health');
    
    if (resultado.status === 200 && resultado.dados.status === 'OK') {
      console.log(`${colors.green}✅ PASS${colors.reset} - Servidor respondeu com status OK`);
      console.log(`   Timestamp: ${resultado.dados.timestamp}`);
      return true;
    } else {
      console.log(`${colors.red}❌ FAIL${colors.reset} - Resposta inesperada`);
      console.log(`   Status: ${resultado.status}`);
      console.log(`   Dados:`, resultado.dados);
      return false;
    }
  } catch (erro) {
    console.log(`${colors.red}❌ FAIL${colors.reset} - ${erro.message}`);
    return false;
  }
}

async function testarEnvioEmail() {
  console.log(`\n${colors.blue}📧 Teste 2: Envio de Email${colors.reset}`);
  console.log('─'.repeat(60));

  try {
    const alerta = gerarAlerta('CRÍTICO');
    console.log(`📨 Enviando alerta de teste...`);
    console.log(`   Destinatário: ${alerta.destinatario}`);
    console.log(`   Assunto: ${alerta.assunto}`);
    console.log(`   Tipo: ${alerta.tipo}`);

    const resultado = await fazerRequisicao('POST', '/api/send-alert', alerta);
    
    if (resultado.status === 200 && resultado.dados.sucesso) {
      console.log(`${colors.green}✅ PASS${colors.reset} - Email enviado com sucesso`);
      console.log(`   Message ID: ${resultado.dados.messageId}`);
      console.log(`   Tentativas: ${resultado.dados.tentativas || 1}`);
      return true;
    } else {
      console.log(`${colors.red}❌ FAIL${colors.reset} - Falha ao enviar email`);
      console.log(`   Status: ${resultado.status}`);
      console.log(`   Erro: ${resultado.dados.erro}`);
      return false;
    }
  } catch (erro) {
    console.log(`${colors.red}❌ FAIL${colors.reset} - ${erro.message}`);
    return false;
  }
}

async function testarMultiplosEmails() {
  console.log(`\n${colors.blue}📬 Teste 3: Envio de Múltiplos Emails${colors.reset}`);
  console.log('─'.repeat(60));

  const tipos = ['CRÍTICO', 'AVISO', 'INFO'];
  let sucessos = 0;
  let falhas = 0;

  for (let i = 0; i < 3; i++) {
    try {
      const alerta = gerarAlerta(tipos[i]);
      console.log(`\n   Teste 3.${i + 1}: ${tipos[i]}`);
      console.log(`   Assunto: ${alerta.assunto.substring(0, 40)}...`);

      const resultado = await fazerRequisicao('POST', '/api/send-alert', alerta);
      
      if (resultado.status === 200 && resultado.dados.sucesso) {
        console.log(`   ${colors.green}✅ Enviado${colors.reset}`);
        sucessos++;
      } else {
        console.log(`   ${colors.red}❌ Falha${colors.reset} - ${resultado.dados.erro}`);
        falhas++;
      }
    } catch (erro) {
      console.log(`   ${colors.red}❌ Erro${colors.reset} - ${erro.message}`);
      falhas++;
    }

    // Delay entre requisições
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n   Resultado: ${sucessos} sucessos, ${falhas} falhas`);
  return falhas === 0;
}

async function testarTagoIO() {
  console.log(`\n${colors.blue}📡 Teste 4: Conexão TagoIO${colors.reset}`);
  console.log('─'.repeat(60));

  try {
    const resultado = await fazerRequisicao('GET', '/api/test-tago');
    
    if (resultado.status === 200) {
      console.log(`${colors.green}✅ PASS${colors.reset} - Conexão com TagoIO bem-sucedida`);
      
      if (resultado.dados.bases) {
        console.log(`   Bases conectadas: ${resultado.dados.bases.length || 'N/D'}`);
      }
      
      if (resultado.dados.dados) {
        console.log(`   Dados recebidos: ${Object.keys(resultado.dados.dados).length || 'N/D'} variáveis`);
      }
      
      console.log(`   Resposta completa:`, JSON.stringify(resultado.dados, null, 2));
      return true;
    } else {
      console.log(`${colors.red}❌ FAIL${colors.reset} - Erro na conexão`);
      console.log(`   Status: ${resultado.status}`);
      return false;
    }
  } catch (erro) {
    console.log(`${colors.red}❌ FAIL${colors.reset} - ${erro.message}`);
    return false;
  }
}

async function testarValidacoes() {
  console.log(`\n${colors.blue}✔️ Teste 5: Validações de Entrada${colors.reset}`);
  console.log('─'.repeat(60));

  let sucessos = 0;
  let falhas = 0;

  // Teste 5.1: Email inválido
  console.log(`\n   Teste 5.1: Email inválido`);
  try {
    const resultado = await fazerRequisicao('POST', '/api/send-alert', {
      destinatario: 'email-invalido',
      assunto: 'Teste',
      corpo: 'Teste'
    });

    if (resultado.status === 400) {
      console.log(`   ${colors.green}✅ Validação funcionou${colors.reset} - Rejeitou email inválido`);
      sucessos++;
    } else {
      console.log(`   ${colors.red}❌ Falha${colors.reset} - Deveria ter rejeitado`);
      falhas++;
    }
  } catch (erro) {
    console.log(`   ${colors.red}❌ Erro${colors.reset} - ${erro.message}`);
    falhas++;
  }

  // Teste 5.2: Campos faltando
  console.log(`\n   Teste 5.2: Campos obrigatórios faltando`);
  try {
    const resultado = await fazerRequisicao('POST', '/api/send-alert', {
      destinatario: 'teste@example.com'
      // faltam assunto e corpo
    });

    if (resultado.status === 400) {
      console.log(`   ${colors.green}✅ Validação funcionou${colors.reset} - Rejeitou campos faltando`);
      sucessos++;
    } else {
      console.log(`   ${colors.red}❌ Falha${colors.reset} - Deveria ter rejeitado`);
      falhas++;
    }
  } catch (erro) {
    console.log(`   ${colors.red}❌ Erro${colors.reset} - ${erro.message}`);
    falhas++;
  }

  console.log(`\n   Resultado: ${sucessos} validações OK, ${falhas} falhas`);
  return falhas === 0;
}

// ================================================
// 📊 RELATÓRIO FINAL
// ================================================

async function executarTodosTestes() {
  console.log(`\n${colors.bright}${colors.purple}`);
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🧪 TESTE DE INTEGRAÇÃO - ECOBOT                              ║');
  console.log('║  Gerando dados de teste e validando endpoints                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);

  console.log(`\n🌐 Servidor: ${SERVER_URL}`);
  console.log(`⏱️  Timeout: ${TIMEOUT}ms`);
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`);

  const resultados = {};

  // Executar todos os testes
  resultados['Health Check'] = await testarHealth();
  await esperar(1000);

  resultados['Envio de Email'] = await testarEnvioEmail();
  await esperar(1000);

  resultados['Múltiplos Emails'] = await testarMultiplosEmails();
  await esperar(1000);

  resultados['TagoIO'] = await testarTagoIO();
  await esperar(1000);

  resultados['Validações'] = await testarValidacoes();

  // Exibir relatório
  console.log(`\n${colors.bright}${colors.purple}`);
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  📊 RELATÓRIO FINAL                                            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);

  let totalPass = 0;
  let totalFail = 0;

  Object.entries(resultados).forEach(([teste, passou]) => {
    const status = passou ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`;
    console.log(`  ${status}  ${teste}`);
    passou ? totalPass++ : totalFail++;
  });

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`${colors.bright}Resultado Final: ${totalPass} PASS, ${totalFail} FAIL${colors.reset}`);

  if (totalFail === 0) {
    console.log(`\n${colors.green}${colors.bright}✅ TODOS OS TESTES PASSARAM!${colors.reset}`);
    console.log(`Sistema está ${colors.green}100% OPERACIONAL${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}${colors.bright}⚠️  Alguns testes falharam${colors.reset}`);
    console.log(`Verifique a configuração e tente novamente\n`);
    process.exit(1);
  }
}

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ================================================
// 🚀 EXECUTAR
// ================================================

// Argumentos da linha de comando
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Uso: node test-integration.js [opções]

Opções:
  --health             Testar apenas health check
  --email              Testar envio de email
  --multiplos           Testar múltiplos emails
  --tago               Testar conexão TagoIO
  --validar            Testar validações
  --all                Testar tudo (padrão)
  --server URL         URL do servidor (default: http://localhost:3001)
  --timeout MS         Timeout em millisegundos (default: 10000)
  --help               Mostrar esta mensagem
  -h                   Mostrar esta mensagem

Exemplos:
  node test-integration.js
  node test-integration.js --server http://localhost:8080
  node test-integration.js --email --timeout 5000
  `);
  process.exit(0);
}

// Processar argumentos
if (args.includes('--server')) {
  const idx = args.indexOf('--server');
  if (idx + 1 < args.length) {
    process.env.SERVER_URL = args[idx + 1];
  }
}

if (args.includes('--timeout')) {
  const idx = args.indexOf('--timeout');
  if (idx + 1 < args.length) {
    // Timeout processado no início do arquivo
  }
}

// Executar testes específicos ou todos
if (args.length === 0 || args.includes('--all')) {
  executarTodosTestes().catch(console.error);
} else {
  (async () => {
    if (args.includes('--health')) await testarHealth();
    if (args.includes('--email')) await testarEnvioEmail();
    if (args.includes('--multiplos')) await testarMultiplosEmails();
    if (args.includes('--tago')) await testarTagoIO();
    if (args.includes('--validar')) await testarValidacoes();
  })().catch(console.error);
}
