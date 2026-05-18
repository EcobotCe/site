# 🔍 ANÁLISE DETALHADA - ECOBOT

## 🔴 PROBLEMAS CRÍTICOS ENCONTRADOS

### 1️⃣ EMAIL SENDO ENVIADO MÚLTIPLAS VEZES

**Problema:**
- Função `sincronizarTago()` chama `enviarAlerta()` a cada sincronização
- A função `deveEnviarAlerta()` tem um sistema de anti-duplicação, MAS com falha de race condition
- Se a sincronização acontece muito rapidamente, múltiplos emails são enfileirados antes do localStorage ser atualizado

**Causa Raiz:**
```javascript
// PROBLEMA: Sem lock/mutex
if (!deveEnviarAlerta(tipo, baseNome, valor, true)) {
    return; // Pode não retornar se múltiplas chamadas simultâneas
}
```

**Solução:**
- Adicionar variável `window.alertaEmAndamento` para criar um "lock"
- Ou usar `Map` com timestamps mais precisos
- Adicionar delay mínimo de 60 segundos entre alertas do MESMO tipo e MESMA base

---

### 2️⃣ ÚLTIMOS DADOS NÃO APARECEM NO GRÁFICO

**Problema:**
- Dados históricos não são carregados corretamente
- Usuário vê "--" em alguns sensores ou dados desatualizados
- Gráfico mostra dados parciais ou vazios

**Causa Raiz:**
```javascript
// PROBLEMA 1: Se os dados chegam desordenados
const t = sortByTime(data.filter(...)); // Sorts OK
const valT = t.length > 0 ? safeParse(t[t.length - 1].value) : null; // Pega o último

// PROBLEMA 2: Se quantidade de dados é insuficiente
const TAGO_FETCH_QTY = 60; // Apenas 60 registros
// Se sincronizar a cada 5 minutos = apenas 5 horas de histórico
```

**Solução:**
- Aumentar `TAGO_FETCH_QTY` para 200-300 para ter histórico completo
- Adicionar validação de dados duplicados
- Filtrar dados corruptados/inválidos
- Adicionar `console.log()` para debugar se dados chegam

---

### 3️⃣ MARCAÇÃO REDUNDANTE NA PARTE DE ALERTAS

**Problema:**
- Para cada alerta (Temperatura, CO2, Umidade, Queimada), existem **2 checkboxes**:
  - ✓ Checkbox 1: "Ativar Temperatura Crítica"
  - ✓ Checkbox 2 (oculto até marcado): "Email"
- Isso é redundante e confuso já que **só há um canal (email)**

**UI Atual:**
```html
<input type="checkbox" id="ativar-temp"> Temperatura Crítica
  └─ Se marcado, aparece:
      └─ <input type="checkbox"> Email
```

**Solução:**
- Remover checkbox de canal (email)
- Manter apenas um checkbox por alerta
- Simplificar a interface

---

### 4️⃣ BASE OFFLINE NÃO É DETECTADA CLARAMENTE

**Problema:**
- Se a base está offline, o usuário não recebe feedback claro
- Erro genérico sem indicação de que a base está desconectada
- Não há indicador visual (ex: ponto verde/vermelho) para status da base

**Solução:**
- Adicionar indicador de status (🟢 Online / 🔴 Offline)
- Verificar se último dado recebido tem timestamp recente
- Timeout de 5-10 minutos: se não receber dados = Offline
- Mostrar mensagem clara quando base está offline

---

## ✅ MELHORIAS A FAZER

| Problema | Prioridade | Status |
|----------|-----------|--------|
| Email duplicado | 🔴 CRÍTICA | ⏳ Pendente |
| Últimos dados não aparecem | 🔴 CRÍTICA | ⏳ Pendente |
| Checkboxes redundantes | 🟡 MÉDIA | ⏳ Pendente |
| Detecção de offline | 🟡 MÉDIA | ⏳ Pendente |
| Validação de dados | 🟡 MÉDIA | ⏳ Pendente |

---

## 📋 CHECKLIST DE CORREÇÕES

### Backend (server.js)
- [ ] Adicionar rate limiting por email
- [ ] Validar duplicação no nível do servidor
- [ ] Adicionar timeout em requisições Tago

### Frontend (index.html)
- [ ] Remover checkbox redundante de canais de email
- [ ] Adicionar lock/mutex em alertas
- [ ] Implementar detecção de base offline
- [ ] Aumentar TAGO_FETCH_QTY para 300
- [ ] Adicionar filtro de dados duplicados
- [ ] Melhorar UI do status da base

---

**Data:** 17 de Maio de 2026
**Versão:** 1.0 - Análise Inicial
