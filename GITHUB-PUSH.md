# 🚀 **FAZER PUSH PARA GITHUB**

## **1️⃣ Criar Repositório no GitHub**

1. Acesse: https://github.com/new
2. Preencha:
   - **Repository name:** `ecobot`
   - **Description:** Sistema inteligente de monitoramento ambiental
   - **Public / Private:** Escolha (recomendado Public)
   - **NÃO inicialize com README** (deixe em branco)
3. Clique: "Create repository"
4. Copie a URL: `https://github.com/seu-usuario/ecobot.git`

---

## **2️⃣ Preparar Repositório Local**

Abra PowerShell na pasta do projeto:

```bash
cd "C:\Users\Vinij\OneDrive\Anexos\site-main"
```

---

## **3️⃣ Inicializar Git**

```bash
# Iniciar repositório Git
git init

# Configurar usuário (se não tiver)
git config user.name "Seu Nome"
git config user.email "seu-email@github.com"

# Verificar configuração
git config --list
```

---

## **4️⃣ Adicionar Arquivos**

```bash
# Adicionar todos os arquivos (respeitando .gitignore)
git add .

# Verificar o que será adicionado
git status
```

**Deve mostrar:**
```
✅ Adicionado:
   - server.js
   - index.html
   - dashboard-v2.html
   - README.md
   - .github/workflows/check-alerts.yml
   - etc...

❌ Ignorado (não deve aparecer):
   - .env
   - node_modules/
   - logs/
```

---

## **5️⃣ Fazer Primeiro Commit**

```bash
git commit -m "🚀 Initial commit: Ecobot v1.0 - Sistema de Monitoramento Ambiental"
```

---

## **6️⃣ Conectar ao GitHub**

```bash
# Adicionar origin (substitua pela sua URL)
git remote add origin https://github.com/seu-usuario/ecobot.git

# Verificar
git remote -v
```

---

## **7️⃣ Fazer Push**

```bash
# Mudar branch para 'main'
git branch -M main

# Fazer push
git push -u origin main
```

Se pedir senha → use **GitHub Token** (não senha):
1. Acesse: https://github.com/settings/tokens
2. Generate token
3. Colar aqui

---

## **8️⃣ Verificar no GitHub**

1. Acesse: https://github.com/seu-usuario/ecobot
2. Verifique se todos os arquivos aparecem
3. README.md deve aparecer na página inicial

---

## ✅ **CHECKLIST ANTES DE FAZER PUSH**

```bash
# Remover arquivos de teste que não devem estar lá
rm -r logs/  # Se existir

# Verificar que .env NÃO está sendo adicionado
git status | grep ".env"
# Não deve mostrar nada

# Verificar que node_modules NÃO está sendo adicionado
git status | grep "node_modules"
# Não deve mostrar nada

# Pronto para fazer push!
git push -u origin main
```

---

## 🔐 **SEGURANÇA**

✅ O que **DEVE** estar no GitHub:
- ✓ `server.js`
- ✓ `index.html`, `dashboard-v2.html`
- ✓ `README.md`
- ✓ `.env.example` (com valores placeholder)
- ✓ `.github/workflows/`
- ✓ `package.json`
- ✓ `.gitignore`

❌ O que **NÃO** deve estar no GitHub:
- ✗ `.env` (senhas reais)
- ✗ `node_modules/` (muito grande)
- ✗ `logs/` (dados privados)
- ✗ Arquivos temporários

---

## 🔄 **FUTURAS ALTERAÇÕES**

Depois que fizer o primeiro push, para atualizações:

```bash
# Fazer alterações nos arquivos

# Adicionar mudanças
git add .

# Commit
git commit -m "Descrição da mudança"

# Push
git push origin main
```

---

## 🎯 **PRÓXIMOS PASSOS**

Depois de fazer push para GitHub:

1. **Configurar Secrets para GitHub Actions:**
   - Vá em: Settings → Secrets
   - Adicione:
     ```
     EMAIL_USER=pjt.ecobot@gmail.com
     EMAIL_PASS=gywd cgtw bocn enlb
     TAGO_TOKEN_1=seu-token
     TAGO_TOKEN_2=seu-token
     ALERT_EMAILS=seu-email@gmail.com
     ```

2. **Atualizar Railway:**
   - Conecte Railway com seu repositório GitHub
   - Railway vai fazer deploy automático!

3. **Ativar GitHub Actions:**
   - Vá em: Actions
   - Autorize o workflow `check-alerts.yml`

---

## 📞 **PRECISA DE AJUDA?**

- GitHub Docs: https://docs.github.com/pt
- Git Cheat Sheet: https://git-scm.com/
- Problemas com SSH: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

---

**🎉 Pronto! Seu projeto está no GitHub!**
