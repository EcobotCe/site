# Ecobot Backend

Backend Node.js para o Ecobot, um sistema de monitoramento ambiental que registra alertas em arquivos JSON locais e envia notificações por e-mail.

## Descrição

Esta aplicação recebe dados de sensores via Tago.io, registra alertas e estados em arquivos JSON locais e envia notificações por e-mail. Também disponibiliza uma interface web estática para inscrição e consulta de dados com tema claro consistente.

## Recursos

- API de inscrição de e-mails (`POST /subscribe`)
- API de cancelamento de inscrição (`GET /unsubscribe`)
- Histórico de alertas persistido em JSON local (`GET /api/alerts`)
- Consulta de dados ambientais recentes (`GET /api/dados-recentes`)
- Health check (`GET /health`)
- Agendamento de verificação automática a cada 5 minutos
- Frontend estático em `index.html`

## Estrutura do projeto

- `server.js` - servidor principal e rotas API
- `check-alerts.js` - coleta dados de Tago.io e dispara alertas
- `index.html` - UI de inscrição e monitoramento
- `dashboard.html` - dashboard com gráficos e histórico de alertas
- `data/` - arquivos JSON usados para persistência local

## Pré-requisitos

- Node.js 18 ou superior
- Conta Gmail com senha de aplicativo para envio de e-mails
- Tokens válidos do Tago.io para suas bases

## Instalação

```powershell
git clone <repo-url>
cd custom-formula
npm install
```

## Configuração

Copie `.env.example` para `.env` e preencha os valores:

- `PORT` - porta do servidor
- `NODE_ENV` - ambiente (`development` ou `production`)
- `EMAIL_USER` - conta Gmail para envio de e-mail
- `EMAIL_PASS` - senha de app do Gmail
- `TAGO_TOKEN_1` - token da base Tago.io 1
- `TAGO_TOKEN_2` - token da base Tago.io 2
- `CORS_ORIGINS` - origens permitidas separadas por vírgula

> Observação: a persistência é local em arquivos JSON dentro de `data/`.

## Persistência

A aplicação salva dados em arquivos JSON dentro da pasta `data/`:

- `subscribers.json` - lista de e-mails inscritos
- `alerts.json` - histórico de alertas gerados
- `base_states.json` - último estado de cada base para evitar envios duplicados
- `bases.json` - bases cadastradas
- `subscriber_preferences.json` - preferências de alertas por inscrito

A persistência é local, sem PostgreSQL nem scripts de migração de banco de dados.

## Execução

Modo desenvolvimento:

```powershell
npm run dev
```

Modo produção:

```powershell
npm start
```

Rodar verificação manual de alertas:

```powershell
npm run check
```

## Endpoints principais

- `POST /subscribe` - adiciona um e-mail ao armazenamento local
- `GET /unsubscribe?email=<email>` - remove inscrição
- `GET /api/alerts` - retorna alertas registrados
- `GET /api/dados-recentes` - retorna dados recentes das bases
- `GET /health` - retorna status do serviço

## Como funciona o alerta de gás

- O sensor `gas` é tratado como porcentagem
- Limite de atenção: `> 5%`
- Limite crítico: `> 10%`
- Dados com variável `co2` ou `gas` são aceitos

## Observações de deploy

- A persistência é local em arquivos JSON em `data/` e não depende de PostgreSQL.
- O frontend já usa tema claro uniforme para evitar partes escuras ou inconsistentes no layout.
- Mantenha o `.env` fora do controle de versão.
- Configure `EMAIL_USER`, `EMAIL_PASS`, `TAGO_TOKEN_1` e `TAGO_TOKEN_2` nas variáveis de ambiente do deploy.

## Licença

MIT
