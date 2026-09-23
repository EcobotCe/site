/**
 * Script Principal do Website EcoBot
 * Consome os dados do Cloudflare Worker e atualiza o dashboard em tempo real.
 */

const WORKER_URL = 'https://ecobot-worker.vnxxx2303.workers.dev';

// Função para atualizar as medições na interface
async function atualizarDashboard() {
  try {
    const response = await fetch(`${WORKER_URL}/api/dados-recentes`);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const medicoes = await response.json();
    if (!medicoes || medicoes.length === 0) {
      console.warn('Nenhuma medição encontrada.');
      return;
    }

    const base = medicoes[0];

    // Mapeamento flexível dos seletores do DOM
    const elTemp = document.getElementById('temp-val') || document.querySelector('.temperatura-valor');
    const elUmid = document.getElementById('umid-val') || document.querySelector('.umidade-valor');
    const elGas = document.getElementById('gas-val') || document.querySelector('.gas-valor');
    const elBaseNome = document.getElementById('base-nome') || document.querySelector('.base-nome');
    const elUltimaAtu = document.getElementById('last-update') || document.querySelector('.ultima-atualizacao');

    if (elTemp) elTemp.textContent = `${base.temp} °C`;
    if (elUmid) elUmid.textContent = `${base.umid} %`;
    if (elGas) elGas.textContent = `${base.gas} ppm`;
    if (elBaseNome) elBaseNome.textContent = base.nome;

    if (elUltimaAtu && base.timestamp) {
      const hora = new Date(base.timestamp).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      elUltimaAtu.textContent = `Última atualização: ${hora}`;
    }

    console.log('Dashboard atualizado com sucesso:', base);
  } catch (error) {
    console.error('Falha ao atualizar o dashboard:', error);
  }
}

// Função para carregar as bases de monitorização (para mapas ou seletores)
async function carregarBases() {
  try {
    const response = await fetch(`${WORKER_URL}/api/bases`);
    if (!response.ok) return;

    const bases = await response.json();
    console.log('Bases ativas carregadas:', bases);
  } catch (error) {
    console.error('Erro ao buscar lista de bases:', error);
  }
}

// Evento de inicialização do documento
document.addEventListener('DOMContentLoaded', () => {
  // Leitura inicial
  atualizarDashboard();
  carregarBases();

  // Polling automático a cada 15 segundos
  setInterval(atualizarDashboard, 15000);
});
