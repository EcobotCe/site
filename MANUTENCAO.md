# 🔒 Guia de Manutenção - Ecobot

## 🚀 3 Formas de Fechar o Site

### 1️⃣ **Controle Interno (Com Senha)**
A forma mais simples e reversível. Use quando quiser manutenção temporária.

#### Como usar:
1. Na dashboard, clique no botão **"Status do Site"** (ícone de servidor)
2. Digite a **senha de administrador**
3. Clique em **"Fechar Site (Manutenção)"**
4. Para reabrir, repita o processo e clique em **"Reabrir Site"**

#### Senha padrão:
```
ecobot2026
```

**Mude a senha no arquivo `index.html` (linha ~3033):**
```javascript
const adminPassword = 'ecobot2026'; // Mude para a sua senha real
```

---

### 2️⃣ **Pausar no Railway** (Imediato)
A forma mais rápida. O site fica indisponível imediatamente.

#### Passos:
1. Acesse [railway.app](https://railway.app)
2. Faça login com sua conta GitHub
3. Selecione o projeto **"site-main"** ou **"ecobot"**
4. Vá até o **Deployment** (serviço rodando)
5. Clique em **Stop** (pausar)
6. Para reabrir, clique em **Resume** ou redeploy

**Vantagem:** Instante, ninguém consegue acessar  
**Desvantagem:** Mostra erro de conexão ao invés de página de manutenção

---

### 3️⃣ **GitHub Pages - Página Estática**
A forma mais profissional. Mostra página de manutenção linda.

#### Passos:
1. Na pasta `site-main`, existe `maintenance.html`
2. Coloque esse arquivo em um novo repositório GitHub ou branch
3. Ative **GitHub Pages** nesse repositório
4. Configure o domínio do Ecobot para apontar para essa página estática

**Como fazer:**
```bash
# 1. Crie um novo repositório (ex: ecobot-maintenance)
# 2. Copie maintenance.html para lá
# 3. Vá em Settings > Pages > Source = main branch
# 4. A página ficará disponível em:
#    https://seu-usuario.github.io/ecobot-maintenance
# 5. Configure seu domínio para apontar lá
```

---

## 🎯 Recomendação

| Situação | Método | Por quê |
|----------|--------|--------|
| Manutenção rápida (1-2 horas) | **Opção 1** | Simples, reversível, sem complexidade |
| Manutenção média (2-24 horas) | **Opção 1 + Opção 2** | Usa controle interno + para segurança |
| Manutenção longa (dias) | **Opção 3** | Página estática elegante, não consome recursos |
| Ataque/Segurança | **Opção 2** | Mais rápido, imediato |

---

## 🔐 Armazenamento de Status

O status do site é armazenado no **localStorage** do navegador:
```javascript
localStorage.getItem('ecobot-site-status'); // 'online' ou 'closed'
```

**Nota:** Cada navegador tem seu próprio localStorage. Use **Opção 2** (Railway) se precisar de controle global.

---

## 📱 Testando Localmente

```javascript
// Para simular site fechado
localStorage.setItem('ecobot-site-status', 'closed');
location.reload();

// Para reabrir
localStorage.setItem('ecobot-site-status', 'online');
location.reload();
```

---

## ⚠️ Segurança

- **Mude a senha padrão** (`ecobot2026`) no código
- **Não compartilhe a senha** publicamente
- Use **HTTPS sempre** para proteger a conexão
- Considere **2FA no GitHub** e **Railway**

---

## 📞 Suporte

Dúvidas? Verifique:
- Railway Dashboard: https://railway.app
- GitHub Pages Docs: https://pages.github.com
- Ecobot Repo: Seu repositório no GitHub
