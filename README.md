# 🌱 **ECOBOT** - Sistema de Monitoramento Ambiental

[![Node.js](https://img.shields.io/badge/Node.js-v24.15.0-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v4.18.2-blue)](https://expressjs.com/)
[![Railway](https://img.shields.io/badge/Deployment-Railway-0B0D0E)](https://railway.app/)
[![Status](https://img.shields.io/badge/Status-Active-success)](https://web-production-7eff7.up.railway.app)

Sistema inteligente de monitoramento ambiental que coleta dados de sensores IoT, detecta alertas críticos e envia notificações por email automaticamente.

---

## 🎯 **Funcionalidades**

✅ **Monitoramento em Tempo Real**
- Coleta dados de temperatura, umidade e CO₂
- Integração com TagoIO para múltiplas bases
- Dashboard moderno e responsivo

✅ **Sistema de Alertas Inteligente**
- Detecção automática de limites críticos
- Classificação por severidade (CRÍTICO, AVISO, INFO)
- Histórico completo de alertas

✅ **Notificações por Email**
- Envio automático de alertas por Gmail
- Sistema de retry com backoff exponencial
- Formatação HTML profissional

✅ **Automação com GitHub Actions**
- Verificação diária de alertas
- Disparo automático de emails
- Logs detalhados de execução

✅ **API REST Completa**
- Endpoints para envio manual de emails
- Health check do servidor
- Testes de conectividade

---

## 🚀 **Quick Start**

### **1. Clonar Repositório**
```bash
git clone https://github.com/seu-usuario/ecobot.git
cd ecobot
```

### **2. Instalar Dependências**
```bash
npm install
```

### **3. Configurar Credenciais**

Copiar template:
```bash
cp .env.example .env
```

Editar `.env` com suas credenciais:
```env
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-app-password-16-caracteres
TAGO_TOKEN_1=seu-token-tago
TAGO_TOKEN_2=seu-token-tago-2
```

**⚠️ Importante:** Usar **App Password** do Gmail, não a senha comum!

### **4. Iniciar Servidor**
```bash
npm start
```

Servidor rodando em: `http://localhost:3001`

---

## 🔐 **Configuração Gmail (App Password)**

### **Passo 1:** Habilitar Verificação em 2 Etapas
1. Acesse: https://myaccount.google.com/security
2. Ative "Verificação em 2 Etapas"
3. Confirme com seu telefone

### **Passo 2:** Gerar App Password
1. Volte para Segurança
2. Clique em "Senhas de app"
3. Selecione: App = "Email", Dispositivo = "Windows"
4. Clique "GERAR"
5. Copie a senha de 16 caracteres (com espaços!)

### **Passo 3:** Atualizar .env
```env
EMAIL_PASS=xxxx xxxx xxxx xxxx
```

---

## 📊 **Endpoints da API**

### **Health Check**
```bash
GET /api/health
```
Response:
```json
{
  "status": "OK",
  "timestamp": "2026-05-18T19:11:59.946Z"
}
```

### **Enviar Email Manual**
```bash
POST /api/send-alert
Content-Type: application/json

{
  "email": "destinatario@gmail.com",
  "assunto": "Alerta de Temperatura",
  "mensagem": "Temperatura acima do limite",
  "tipo": "CRÍTICO"
}
```

### **Testar Conexão TagoIO**
```bash
GET /api/test-tago
```

---

## 🧪 **Testes**

### **Teste Completo de Integração**
```bash
node test-integration.js
```

Valida:
- ✅ Health check
- ✅ Envio de emails
- ✅ Conexão TagoIO
- ✅ Validações de entrada

**Resultado esperado:** 5/5 PASS

---

## 📈 **Dashboards**

### **Dashboard Moderno (v2)**
```
http://localhost:3001/dashboard-v2.html
```
- 🎨 Design moderno com tema escuro
- 📊 4 cards resumidos
- 📑 3 abas: Alertas, Emails, Sensores
- 🔄 Atualização automática (10s)
- 📨 Modal para envio manual de email

### **Dashboard Original**
```
http://localhost:3001/index.html
```
- 📈 Gráficos em tempo real
- 📊 Histórico de dados
- 🔔 Notificações

---

## 🤖 **Automação - GitHub Actions**

Verifica alertas **diariamente às 08:00 (UTC)**

Arquivo: `.github/workflows/check-alerts.yml`

### **O que faz:**
1. ✅ Conecta em TagoIO
2. ✅ Verifica ambas as bases
3. ✅ Detecta alertas críticos
4. ✅ Envia emails para destinatários
5. ✅ Log de execução

### **Variáveis Necessárias:**
Adicione como Secrets no GitHub:
```
EMAIL_USER
EMAIL_PASS
TAGO_TOKEN_1
TAGO_TOKEN_2
ALERT_EMAILS
```

---

## 📦 **Deploy - Railway**

### **1. Conectar Repositório**
1. Acesse: https://railway.app
2. Clique "New Project"
3. Selecione "Deploy from GitHub"
4. Autorize e escolha o repositório

### **2. Configurar Variáveis de Ambiente**
No Railway, adicione em "Variables":
```
PORT=8080
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-app-password
TAGO_TOKEN_1=seu-token
TAGO_TOKEN_2=seu-token-2
NODE_ENV=production
```

### **3. Deploy Automático**
Cada push para `main` faz deploy automático

### **URL de Produção:**
```
https://seu-projeto.up.railway.app
```

---

## 🛠️ **Arquitetura**

```
┌─────────────────────────────────────┐
│     TagoIO Sensor Bases             │
│  (Temperature, Humidity, CO₂)        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│     server.js (Express API)         │
│  • Data Collection                  │
│  • Alert Detection                  │
│  • Email Sending                    │
└──────────────┬──────────────────────┘
               │
      ┌────────┴────────┐
      ▼                 ▼
  📧 Gmail SMTP    📊 Dashboards
  (Notifications)  (Web Interface)
```

---

## 📋 **Estrutura de Arquivos**

```
ecobot/
├── server.js                    # Servidor Express principal
├── check-alerts.js              # Script de verificação de alertas
├── test-integration.js          # Suite de testes
├── index.html                   # Dashboard v1
├── dashboard-v2.html            # Dashboard v2 (moderno)
├── package.json                 # Dependências Node.js
├── .env.example                 # Template de configuração
├── Procfile                     # Configuração Railway
├── .gitignore                   # Arquivos ignorados
└── .github/
    └── workflows/
        └── check-alerts.yml     # GitHub Actions
```

---

## 🔌 **Dependências**

- **express** (4.18.2) - Framework web
- **nodemailer** (6.9.7) - Envio de emails
- **cors** - Cross-Origin Resource Sharing
- **axios** - Cliente HTTP
- **dotenv** - Gerenciamento de variáveis de ambiente

Install:
```bash
npm install
```

---

## 🚨 **Resolução de Problemas**

### **Erro: 530-5.7.0 Authentication Required**
❌ **Problema:** Senha do Gmail inválida

✅ **Solução:**
1. Gere nova App Password em https://myaccount.google.com/security
2. Atualize `.env` com EMAIL_PASS correto
3. Reinicie o servidor

### **Erro: Connection Timeout**
❌ **Problema:** Servidor não responde

✅ **Solução:**
1. Verifique se servidor está rodando: `npm start`
2. Verifique porta 3001 não está em uso
3. Verifique conexão de internet

### **TagoIO 400 Error**
❌ **Problema:** Tokens inválidos ou expirados

✅ **Solução:**
1. Verifique tokens em `.env`
2. Regenere tokens em https://tago.io
3. Teste com: `node test-integration.js`

---

## 📞 **Suporte**

- 🐛 **Issues:** GitHub Issues
- 💬 **Discussões:** GitHub Discussions
- 📧 **Email:** pjt.ecobot@gmail.com

---

## 📄 **Licença**

MIT License - veja LICENSE para detalhes

---

## 🙏 **Créditos**

Desenvolvido com ❤️ para monitoramento ambiental sustentável

**Versão:** 1.0.0  
**Última Atualização:** 18 de maio de 2026

---

## 🔗 **Links Úteis**

- 🌐 [Site ao Vivo](https://web-production-7eff7.up.railway.app)
- 📚 [Documentação TagoIO](https://help.tago.io/)
- 🚂 [Dashboard Railway](https://railway.app/)
- 📧 [Gmail App Passwords](https://myaccount.google.com/apppasswords)

---

**Made with 🌍 for a better planet**
