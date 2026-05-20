# 🚨 INSTRUÇÕES URGENTES - DEPLOY MANUAL NO RAILWAY

## O que foi feito:
✅ Procfile corrigido: `web: node server.js`
✅ start.sh deletado
✅ 4 commits feitos e pushed para GitHub

## ❌ Problema:
Railway NÃO está redeploy automático, ou há erro no build

## ✅ Solução - Faça MANUALMENTE:

### Opção 1: Triggerar Redeploy via Painel (RECOMENDADO)
1. Acesse: https://railway.app/dashboard
2. Clique no seu projeto
3. Clique em **"Deployments"** (ou abra o serviço "web")
4. Clique em **"Redeploy"** ou **"Deploy Latest Commit"**
5. Aguarde 5-10 minutos

### Opção 2: Forçar Reset (Se falhar acima)
1. Delete a aplicação no Railway
2. Reconecte o GitHub
3. Railway automaticamente fará novo deploy

### Opção 3: Ver Logs de Erro
1. No painel Railway, abra o serviço "web"
2. Clique em **"Logs"** (abaixo)
3. Procure por erros ou falhas

## 📋 O que deve acontecer após deploy:

```
GET /health → 200 OK
{
  "status": "ok",
  "timestamp": "2026-05-20T...",
  "database": "disconnected"
}

POST /subscribe → 503 (sem DATABASE_URL)
{"error": "Serviço de banco de dados indisponível"}

GET / → 200 OK (retorna HTML)
```

## 🔗 Links Úteis:
- Dashboard: https://railway.app/dashboard
- Projeto: https://railway.app/project/[seu-project-id]
- Logs: https://railway.app/project/[seu-project-id]/services/[service-id]/logs

---

**Próximo Passo:** Após deploy bem-sucedido, test:/health deve retornar JSON com "status": "ok"

Se continuar com "OK" como texto, isso significa que o servidor antigo ainda está rodando.
