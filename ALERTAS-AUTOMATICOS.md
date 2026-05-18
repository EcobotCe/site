# 🚨 Alertas Automáticos - Ecobot

## O que faz?

- ✅ Verifica suas bases Tago.io **a cada 5 minutos**
- ✅ Detecta condições críticas automaticamente
- ✅ Envia emails quando há alerta
- ✅ **Funciona 24/7 no GitHub (grátis!)**

## Limiares de Alerta

| Sensor | Crítico | Aviso |
|--------|---------|-------|
| 🌡️ Temperatura | > 35°C | > 30°C |
| 💧 Umidade | < 30% | < 40% |
| 💨 CO₂ | > 10 ppm | > 5 ppm |
| 🔥 Queimada | Temp ≥ 32°C + Umi ≤ 40% | - |

## Como testar?

1. **GitHub → Actions**
2. **"🚨 Verificar Alertas Automáticos"**
3. **"Run workflow"**
4. Aguarde 30 segundos

Você receberá um email!

## Como alterar limiares?

Edite `scripts/check-alerts.js`:

```javascript
const LIMIARES = {
  temp_critica: 35,      // Mude aqui
  umi_critica: 30,       // Mude aqui
  co2_critica: 10,       // Mude aqui
};
