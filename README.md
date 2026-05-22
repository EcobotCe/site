# Ecobot Backend

Backend Node.js para o Ecobot, um sistema de monitoramento ambiental que registra alertas e envia notificações por e-mail.

## Descrição

Esta aplicação recebe dados de sensores via Tago.io, registra alertas em um banco PostgreSQL e envia notificações para assinantes. Também disponibiliza uma interface web estática para inscrição e dashboard de monitoramento.

## Recursos

- API de inscrição de e-mails (`POST /subscribe`)
- API de cancelamento de inscrição (`GET /unsubscribe`)
- Histórico de alertas em banco de dados (`GET /api/alerts`)
- Consulta de dados ambientais recentes (`GET /api/dados-recentes`)
- Health check (`GET /health`)
- Agendamento de verificação automática a cada 5 minutos
- Frontend estático em `index.html` e `dashboard.html`

## Estrutura do projeto

- `server.js` - servidor principal e rotas API
- `check-alerts.js` - coleta dados de Tago.io e dispara alertas
- `setup-db.js` - cria tabelas PostgreSQL necessárias
- `index.html` - UI de inscrição e monitoramento
- `dashboard.html` - dashboard com gráficos e histórico de alertas
- `.env.example` - exemplo de variáveis de ambiente

## Pré-requisitos

- Node.js 18 ou superior
- PostgreSQL acessível via `DATABASE_URL`
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
- `DATABASE_URL` - conexão PostgreSQL interna
- `DATABASE_PUBLIC_URL` - conexão pública alternativa
- `EMAIL_USER` - conta Gmail para envio de e-mail
- `EMAIL_PASS` - senha de app do Gmail
- `TAGO_TOKEN_1` - token da base Tago.io 1
- `TAGO_TOKEN_2` - token da base Tago.io 2
- `CORS_ORIGINS` - origens permitidas separadas por vírgula

> Observação: `ALERT_EMAILS` está documentado no `.env.example`, mas o backend atual usa inscritos em `subscribers` para envio de alertas.

## Banco de dados

O projeto cria e usa as seguintes tabelas:

- `subscribers` - lista de e-mails inscritos
- `alerts` - histórico de alertas gerados
- `base_states` - último estado de cada base para evitar envios duplicados

Execute:

```powershell
npm run setup
```

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

- `POST /subscribe` - adiciona um e-mail ao banco
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

- Em Railway, prefira `DATABASE_URL` para conexões internas e use `DATABASE_PUBLIC_URL` como fallback externo.
- Mantenha o `.env` fora do controle de versão.
- Se usar Railway, configure `EMAIL_USER`, `EMAIL_PASS`, `TAGO_TOKEN_1` e `TAGO_TOKEN_2` nas variáveis de ambiente do deploy.

## Licença

MIT
