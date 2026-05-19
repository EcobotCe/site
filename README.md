# 🌱 **ECOBOT** - Sistema de Monitoramento Ambiental

[![Node.js](https://img.shields.io/badge/Node.js-v24.15.0-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v4.18.2-blue)](https://expressjs.com/)
[![Railway](https://img.shields.io/badge/Deployment-Railway-0B0D0E)](https://railway.app/)
[![Status](https://img.shields.io/badge/Status-Active-success)](https://web-production-7eff7up.railway.app)

Sistema inteligente de monitoramento ambiental que coleta dados de sensores IoT e oferece alertas em tempo real através de um dashboard interativo.

---

## 🎯 **Funcionalidades**

✅ **Monitoramento em Tempo Real**
- Coleta dados de temperatura, umidade e CO₂
- Integração com TagoIO para múltiplas bases
- Dashboard moderno e responsivo
- Atualização automática a cada 30 segundos

✅ **Sistema de Alertas Inteligente**
- Detecção automática de limites críticos
- Classificação por severidade (CRÍTICO, AVISO, INFO)
- Notificações via Email (opcional - EmailJS)
- Semáforo visual climático em tempo real

✅ **Gerenciamento de Bases**
- Adicionar/editar múltiplas bases de monitoramento
- Suporte para coordenadas GPS
- Persistência local via localStorage
- Seleção de base ativa

✅ **API REST Completa**
- Health check do servidor
- Testes de conectividade TagoIO
- Endpoints de status e logs

---

## 🚀 **Quick Start**

### **1. Clonar Repositório**
```bash
git clone https://github.com/seu-usuario/ecobot.git
cd ecobot
