# 🌍 Ecobot - Sistema de Monitoramento Ambiental Inteligente

![Ecobot OS](https://i.ibb.co/27MMFFC0/logo.png)

## 📌 Sobre o Projeto

Ecobot é uma plataforma inteligente que conecta estações ambientais em tempo real, permitindo monitoramento de:

- 🌡️ **Temperatura** - Detecção de variações críticas
- 💧 **Umidade** - Monitoramento de níveis de secura
- 💨 **Nível de CO₂** - Qualidade do ar em tempo real
- 🚨 **Sistema de Alertas** - Notificações automáticas por email

## ✨ Funcionalidades Principais

### Frontend
- ✅ Dashboard em tempo real com gráficos interativos
- 📧 Sistema de alertas configuráveis
- 📱 Interface 100% responsiva (Mobile, Tablet, Desktop)
- 🌐 Suporte multilíngue (Português, Inglês, Espanhol)
- 🎨 Design moderno com Glassmorphism e TailwindCSS
- 🔐 Gerenciamento de múltiplas bases de monitoramento
- 📊 Histórico de dados sincronizados com Tago.io

### Backend
- 🚀 Server Node.js com Express
- 📧 Envio de alertas por email via Gmail (Nodemailer)
- 🔗 CORS habilitado para integração segura
- 🌐 API RESTful para envio de notificações
- ✅ Health check e verificação de conectividade

## 🎯 Alinhado com a ONU

O Ecobot responde diretamente aos **Objetivos de Desenvolvimento Sustentável (ODS)**:

- 🏭 **ODS 9**: Indústria, Inovação e Infraestrutura
- 🏙️ **ODS 11**: Cidades e Comunidades Sustentáveis  
- 🌱 **ODS 13**: Ação Contra a Mudança Global do Clima

## 🚀 Como Começar

### 📋 Requisitos

- Node.js v14+ 
- npm ou yarn
- Conta Gmail com App Password
- (Opcional) Conta Tago.io para sensores

### 🌐 Frontend

1. **Abra em um servidor local** (Live Server, VS Code extension):
```bash
# Ou use Python
python -m http.server 3000

# Ou Node.js (http-server)
npx http-server -p 3000