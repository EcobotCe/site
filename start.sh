#!/bin/bash

echo "🚀 Iniciando aplicação Node.js Ecobot"
echo "📁 Diretório: $(pwd)"
echo "📦 Node version: $(node --version)"
echo "📦 NPM version: $(npm --version)"
echo ""
echo "🔧 Instalando dependências..."
npm ci
echo ""
echo "🚀 Iniciando server.js..."
exec node server.js
