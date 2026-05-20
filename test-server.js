#!/usr/bin/env node
/**
 * Teste mínimo para verificar se Node.js está funcionando no Railway
 */

console.log('✅ TEST SERVER INICIADO EM:', new Date().toISOString());
console.log('📊 NODE_ENV:', process.env.NODE_ENV);
console.log('🔌 PORT:', process.env.PORT || '8080');

const http = require('http');
const port = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  console.log(`📨 Requisição recebida: ${req.method} ${req.url}`);
  
  if (req.url === '/') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      message: 'Test server is running',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      port: port
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(port, () => {
  console.log(`🚀 HTTP Server rodando em porta ${port}`);
});

server.on('error', (err) => {
  console.error('❌ Erro no servidor:', err.message);
  process.exit(1);
});
