# Ecobot — Site (Frontend Estático)

Site do projeto ECOBOT - Elion, do curso técnico de Informática da EEEP
Deputado José Walfrido Monteiro (Icó-CE).

## Arquitetura atual

- **Frontend** (esta pasta): 100% estático — `index.html`, `ecobot.css`,
  `favicon.ico`, `maintenance.html`. Hospedado gratuitamente no GitHub
  Pages.
- **Backend/API**: um Cloudflare Worker (pasta `ecobot-worker/`, em
  repositório/deploy separado) que faz proxy para o TagoIO e gerencia a
  lista de bases via Workers KV. Veja `ecobot-worker/MIGRACAO.md` para o
  passo a passo de deploy.

Não há mais servidor Node/Express, banco de dados ou envio de e-mail neste
projeto — veja `ecobot-worker/MIGRACAO.md` para o histórico dessa mudança.

## Publicando no GitHub Pages

1. Suba o conteúdo desta pasta para o repositório (branch `main` ou `gh-pages`)
2. Settings → Pages → Source = branch onde estão os arquivos
3. Antes de publicar, confirme que `ECOBOT_BACKEND_URL` em `index.html`
   aponta para a URL do seu Worker (`https://ecobot-api.SEU-USUARIO.workers.dev`)

## Manutenção do site

Veja `MANUTENCAO.md`.

## Licença

MIT
