#!/usr/bin/env node

console.log('🚀 INICIANDO WRAPPER - ' + new Date().toISOString());
console.log('NODE_ENV:', process.env.NODE_ENV || 'production');
console.log('PORT:', process.env.PORT || '8080');

try {
  require('./server.js');
  console.log('✅ server.js carregado com sucesso');
} catch (error) {
  console.error('❌ ERRO AO CARREGAR server.js:', error.message);
  process.exit(1);
}
