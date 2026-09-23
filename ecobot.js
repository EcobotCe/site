/**
 * Script Principal do Website EcoBot
 * Gerencia a interface, navegação, i18n, gráficos e sincronização com o Cloudflare Worker.
 */

// ========== CONFIGURAÇÃO DE AMBIENTE ==========
const WORKER_URL = 'https://ecobot-worker.vnxxx2303.workers.dev';
const ECOBOT_BACKEND_URL = WORKER_URL;
const TAGO_API_BASE = 'https://api.tago.io/data';
const TAGO_FETCH_QTY = 60;

// Variáveis de estado global
let redeBases = [];
let baseSelecionada = null;
let editingBaseId = null;
let chartInstance = null;
let intervalSync = null;
let dataFiltroSelecionada = null;
let idiomaAtual = 'pt';

// ------------------------------------------------
// 1. DICIONÁRIO DE IDIOMAS COMPLETO (i18n)
// ------------------------------------------------
const dicionario = {
    pt: {
        txt_carregando: "Calibrando Sensores...",
        txt_senha_erro: "Credencial Incorreta!",
        btn_autenticar: "Autenticar",
        btn_nav_sensores: "Acessar Estações",
        txt_projeto_titulo: "Projeto",
        txt_subtitulo: "Unindo robótica de baixo custo e preservação ambiental para combater a invisibilidade dos dados climáticos no interior e construir um futuro inteligente.",
        btn_ver_dados: "Explorar Dados",
        titulo_tabela: "Por que escolher a Estação Elion?",
        tab_recurso: "Recurso",
        tab_tradicional: "Estações disponíveis no mercado",
        tab_ecobot: "Estação Elion",
        linha1_rec: "Custo de Implementação",
        linha1_trad: "Alto Custo",
        linha1_eco: "Baixíssimo Custo",
        linha2_rec: "Instalação",
        linha2_trad: "Técnico Especializado",
        linha2_eco: "Rápido e fácil",
        linha3_rec: "Tecnologia",
        linha3_trad: "Sistema Fechado",
        linha3_eco: "Open-Source e Escalável",
        txt_jornada: "Nossa Jornada",
        txt_onu: "Alinhado com a ONU 🌍",
        txt_onu_sub: "O Ecobot responde diretamente aos Objetivos de Desenvolvimento Sustentável (ODS), atuando como ferramenta tecnológica para cidades inteligentes e ação climática global.",
        txt_ods9: "Indústria, Inovação e Infraestrutura",
        txt_ods11: "Cidades e Comunidades Sustentáveis",
        txt_ods13: "Ação Contra a Mudança Global do Clima",
        txt_acompanhe: "Acompanhe nossa evolução",
        txt_modal_titulo: "Onde você está?",
        txt_modal_sub: "Para mostrar a qualidade do ar com precisão, precisamos encontrar a Base Ecobot mais próxima. Não guardamos a sua localização!",
        btn_modal_gps: "Usar Meu GPS",
        btn_modal_manual: "Escolher Base Manualmente",
        lbl_rede: "Base de Monitoramento:",
        btn_tago: "DADOS EM TEMPO REAL",
        txt_offline_titulo: "CONEXÃO PERDIDA",
        txt_offline_sub: "Os dados pararam de chegar ou a estação está desligada. Aguardando nuvem...",
        txt_alerta: "ALERTA: NÍVEL DE GÁS ELEVADO!",
        lbl_temp: "Temperatura",
        lbl_umi: "Umidade",
        lbl_gas: "Nível de gás (ppm)",
        txt_hist: "Sincronizado",
        txt_adm_titulo: "Controle do Sistema",
        btn_adicionar_base: "Adicionar Base",
        txt_adicionar_base_titulo: "Adicionar Nova Base",
        txt_adicionar_base_sub: "Adicione sua própria base de monitoramento ambiental para acompanhar os dados em tempo real.",
        btn_salvar_nova_base: "Adicionar Base",
        btn_atualizar_base: "Atualizar Base",
        txt_editar_base_titulo: "Editar Base",
        txt_pesquisa_inovacao: "Pesquisa & Inovação",
        txt_acesse_celular: "Acesse no Celular",
        txt_aponte_camera: "Aponte a câmara do seu smartphone para visualizar a dashboard em tempo real.",
        txt_hero_accent: "Plataforma inteligente para conectar estações ambientais em tempo real.",
        txt_hero_sync_desc: "Dados atualizados automaticamente.",
        txt_hero_secure_desc: "Notificações instantâneas para segurança ambiental.",
        txt_hero_open_desc: "Arquitetura open-source pronta para expansão.",
        txt_direitos: "© 2026 Projeto Ecobot. Todos os direitos reservados.",
        txt_desenvolvido: "Desenvolvido com IA, JavaScript, TailwindCSS & Chart.js",
        txt_sistema_operante: "Sistema Operante",
        txt_atualizado_as: "Atualizado às",
        txt_ultimas_leituras: "Últimas leituras",
        btn_ver_tago: "Ver dados no tago.io",
        txt_sincronizando: "Sincronizando com a nuvem...",
        txt_aguardando: "Aguardando Conexão...",
        txt_status_note: "Estações mandam dados a cada 5 minutos, mas podem chegar com atraso."
    },
    en: {
        txt_carregando: "Calibrating Sensors...",
        txt_senha_erro: "Incorrect Credential!",
        btn_autenticar: "Authenticate",
        btn_nav_sensores: "Access Stations",
        txt_projeto_titulo: "Project",
        txt_subtitulo: "Uniting low-cost robotics and environmental preservation to bring climate intelligence to remote areas.",
        btn_ver_dados: "Explore Data",
        titulo_tabela: "Why choose Elion Station?",
        tab_recurso: "Feature",
        tab_tradicional: "Market available stations",
        tab_ecobot: "Elion Station",
        linha1_rec: "Implementation Cost",
        linha1_trad: "High Cost",
        linha1_eco: "Very Low Cost",
        linha2_rec: "Installation",
        linha2_trad: "Specialized Technician",
        linha2_eco: "Fast and easy",
        linha3_rec: "Technology",
        linha3_trad: "Closed System",
        linha3_eco: "Open-Source & Scalable",
        txt_jornada: "Our Journey",
        txt_onu: "Aligned with the UN 🌍",
        txt_onu_sub: "Ecobot responds directly to the Sustainable Development Goals (SDG).",
        txt_ods9: "Industry, Innovation and Infrastructure",
        txt_ods11: "Sustainable Cities and Communities",
        txt_ods13: "Climate Action",
        txt_acompanhe: "Follow our evolution",
        txt_modal_titulo: "Where are you?",
        txt_modal_sub: "We need to locate the nearest base. We do not save your location!",
        btn_modal_gps: "Use My GPS",
        btn_modal_manual: "Choose Base Manually",
        lbl_rede: "Monitoring Base:",
        btn_tago: "REAL-TIME DATA",
        txt_offline_titulo: "CONNECTION LOST",
        txt_offline_sub: "Data stopped arriving or station is offline. Waiting for cloud...",
        txt_alerta: "ALERT: HIGH GAS LEVEL!",
        lbl_temp: "Temperature",
        lbl_umi: "Humidity",
        lbl_gas: "Gas (ppm)",
        txt_hist: "Synchronized",
        txt_adm_titulo: "System Control",
        btn_adicionar_base: "Add Base",
        txt_adicionar_base_titulo: "Add New Base",
        txt_adicionar_base_sub: "Add your own environmental monitoring base to track data in real time.",
        btn_salvar_nova_base: "Add Base",
        btn_atualizar_base: "Update Base",
        txt_editar_base_titulo: "Edit Base",
        txt_pesquisa_inovacao: "Research & Innovation",
        txt_acesse_celular: "Access on Mobile",
        txt_aponte_camera: "Point your smartphone camera to view the dashboard in real time.",
        txt_hero_accent: "Smart platform to connect environmental stations in real time.",
        txt_hero_sync_desc: "Data refreshed automatically.",
        txt_hero_secure_desc: "Instant alerts for environmental safety.",
        txt_hero_open_desc: "Open-source architecture ready to scale.",
        txt_direitos: "© 2026 Ecobot Project. All rights reserved.",
        txt_desenvolvido: "Developed with AI, JavaScript, TailwindCSS & Chart.js",
        txt_sistema_operante: "System Operational",
        txt_atualizado_as: "Updated at",
        txt_ultimas_leituras: "Latest readings",
        btn_ver_tago: "View data on tago.io",
        txt_sincronizando: "Synchronizing with the cloud...",
        txt_aguardando: "Waiting for Connection...",
        txt_status_note: "Stations send data every 5 minutes, but there may be a delay."
    },
    es: {
        txt_carregando: "Calibrando Sensores...",
        txt_senha_erro: "¡Credencial Incorrecta!",
        btn_autenticar: "Autenticar",
        btn_nav_sensores: "Acceder a Estaciones",
        txt_projeto_titulo: "Proyecto",
        txt_subtitulo: "Uniendo robótica de bajo costo y preservación ambiental para combatir la invisibilidad de los datos climáticos.",
        btn_ver_dados: "Explorar Datos",
        titulo_tabela: "¿Por qué elegir la Estación Elion?",
        tab_recurso: "Recurso",
        tab_tradicional: "Estaciones disponibles en el mercado",
        tab_ecobot: "Estación Elion",
        linha1_rec: "Costo de Implementación",
        linha1_trad: "Alto Costo",
        linha1_eco: "Costo Muy Bajo",
        linha2_rec: "Instalación",
        linha2_trad: "Técnico Especializado",
        linha2_eco: "Rápido y fácil",
        linha3_rec: "Tecnología",
        linha3_trad: "Sistema Cerrado",
        linha3_eco: "Open-Source y Escalable",
        txt_jornada: "Nuestra Jornada",
        txt_onu: "Alineado con la ONU 🌍",
        txt_onu_sub: "Ecobot responde directamente a los Objetivos de Desarrollo Sostenible (ODS).",
        txt_ods9: "Industria, Innovación e Infraestructura",
        txt_ods11: "Ciudades y Comunidades Sostenibles",
        txt_ods13: "Acción por el Clima",
        txt_acompanhe: "Sigue nuestra evolución",
        txt_modal_titulo: "¿Dónde estás?",
        txt_modal_sub: "Necesitamos encontrar la base más cercana. ¡No guardamos tu ubicación!",
        btn_modal_gps: "Usar Mi GPS",
        btn_modal_manual: "Elegir Base Manualmente",
        lbl_rede: "Base de Monitoreo:",
        btn_tago: "DATOS EN TIEMPO REAL",
        txt_offline_titulo: "CONEXIÓN PERDIDA",
        txt_offline_sub: "Esperando a la nube...",
        txt_alerta: "¡ALERTA: NIVEL DE GAS ALTO!",
        lbl_temp: "Temperatura",
        lbl_umi: "Humedad",
        lbl_gas: "Concentración de gas (ppm)",
        txt_hist: "Sincronizado",
        txt_adm_titulo: "Control del Sistema",
        btn_adicionar_base: "Agregar Base",
        txt_adicionar_base_titulo: "Agregar Nueva Base",
        txt_adicionar_base_sub: "Agregue su propia base de monitoreo ambiental para rastrear datos en tiempo real.",
        btn_salvar_nova_base: "Agregar Base",
        btn_atualizar_base: "Actualizar Base",
        txt_editar_base_titulo: "Editar Base",
        txt_pesquisa_inovacao: "Investigación e Innovación",
        txt_acesse_celular: "Accede en el Celular",
        txt_aponte_camera: "Apunta la cámara de tu smartphone para ver el panel en tiempo real.",
        txt_hero_accent: "Plataforma inteligente para conectar estaciones ambientales en tiempo real.",
        txt_hero_sync_desc: "Datos actualizados automáticamente.",
        txt_hero_secure_desc: "Alertas instantáneas para mayor seguridad ambiental.",
        txt_hero_open_desc: "Arquitectura open-source lista para escalar.",
        txt_direitos: "© 2026 Proyecto Ecobot. Todos los derechos reservados.",
        txt_desenvolvido: "Desarrollado con IA, JavaScript, TailwindCSS & Chart.js",
        txt_sistema_operante: "Sistema en Funcionamiento",
        txt_atualizado_as: "Actualizado a las",
        txt_ultimas_leituras: "Últimas lecturas",
        btn_ver_tago: "Ver datos en tago.io",
        txt_sincronizando: "Sincronizando con la nube...",
        txt_aguardando: "Esperando Conexión...",
        txt_status_note: "Las estaciones envían datos cada 5 minutos, pero puede haber demora."
    }
};

function mudarIdioma(lang) {
    idiomaAtual = lang;
    ['pt', 'en', 'es'].forEach(l => {
        const btn = document.getElementById('btn_lang_' + l);
        if (btn) {
            if (l === lang) {
                btn.classList.replace('text-slate-400', 'text-ecogreen');
                btn.classList.add('font-bold');
            } else {
                btn.classList.replace('text-ecogreen', 'text-slate-400');
                btn.classList.remove('font-bold');
            }
        }
    });

    document.querySelectorAll('[data-i18n]').forEach(elemento => {
        const chave = elemento.getAttribute('data-i18n');
        if (dicionario[lang] && dicionario[lang][chave]) {
            if (chave.startsWith('linha') && chave.includes('_eco')) {
                elemento.innerHTML = `<i class="fa-solid fa-check-circle text-ecogreen text-lg drop-shadow-[0_0_8px_rgba(16,185,129,0.8)] mr-3"></i> <span>${dicionario[lang][chave]}</span>`;
            } else {
                elemento.innerHTML = dicionario[lang][chave];
            }
        }
    });

    const activeView = document.querySelector('.active-view');
    if (activeView) {
        atualizarBotaoNav(activeView.id.replace('view-', ''));
    }
    atualizarInterfaceBases();
}

// ------------------------------------------------
// 2. INICIALIZAÇÃO E CARREGAMENTO DAS BASES
// ------------------------------------------------
window.onload = function () {
    carregarBases().finally(() => {
        atualizarInterfaceBases();
        mudarIdioma('pt');

        const inputData = document.getElementById('seletor-data-historico');
        if (inputData) {
            const hoje = new Date().toISOString().split('T')[0];
            inputData.setAttribute('max', hoje);
        }

        const splash = document.getElementById('splash-screen');
        if (splash) {
            setTimeout(() => {
                splash.classList.add('opacity-0');
                setTimeout(() => splash.classList.add('hidden'), 1000);
            }, 1000);
        }
    });
};

async function carregarBases() {
    try {
        const response = await fetch(`${WORKER_URL}/api/bases`);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const bases = await response.json();
        if (Array.isArray(bases) && bases.length > 0) {
            redeBases = bases.map(base => ({
                ...base,
                lat: base.lat !== null ? parseFloat(base.lat) : null,
                lon: base.lon !== null ? parseFloat(base.lon) : null
            }));
            if (!baseSelecionada) baseSelecionada = redeBases[0];
        }
    } catch (err) {
        console.error('Erro ao carregar bases do Worker:', err);
        if (redeBases.length === 0) {
            redeBases = [{ id: 'base-1', nome: 'Base Principal', lat: null, lon: null }];
            baseSelecionada = redeBases[0];
        }
    }
}

// ------------------------------------------------
// 3. LOGICA DE NAVEGAÇÃO E MODAIS
// ------------------------------------------------
function navegarPara(viewId) {
    document.querySelectorAll('.page-view').forEach(el => {
        el.classList.replace('active-view', 'hidden-view');
    });
    const targetView = document.getElementById('view-' + viewId);
    if (targetView) {
        targetView.classList.replace('hidden-view', 'active-view');
    }

    atualizarBotaoNav(viewId);

    if (viewId === 'dashboard') {
        if (!baseSelecionada && redeBases.length > 0) mudarBase(redeBases[0].id);
        sincronizarTago();
        if (!intervalSync) intervalSync = setInterval(sincronizarTago, 15000);
    } else {
        if (intervalSync) { clearInterval(intervalSync); intervalSync = null; }
    }
    window.scrollTo(0, 0);
}

function atualizarBotaoNav(viewId) {
    const btnText = document.getElementById('btn_nav_sensores');
    const icon = document.getElementById('icon_nav_sensores');

    if (btnText && icon) {
        if (viewId === 'dashboard') {
            btnText.innerHTML = idiomaAtual === 'pt' ? 'Voltar ao Início' : idiomaAtual === 'es' ? 'Volver al Inicio' : 'Back to Home';
            icon.className = 'fa-solid fa-arrow-left text-ecogreen group-hover:-translate-x-1 transition-transform';
        } else {
            btnText.innerHTML = dicionario[idiomaAtual]['btn_nav_sensores'];
            icon.className = 'fa-solid fa-satellite-dish text-ecogreen group-hover:animate-pulse';
        }
    }
}

function acaoNavbar() {
    const activeView = document.querySelector('.active-view');
    if (activeView && activeView.id === 'view-home') {
        tentarAcessarSensores();
    } else {
        navegarPara('home');
    }
}

function atualizarInterfaceBases() {
    const seletor = document.getElementById('seletor-base');
    const baseManagement = document.getElementById('base-management');
    if (seletor) seletor.innerHTML = '';
    if (baseManagement) baseManagement.innerHTML = '';

    redeBases.forEach(base => {
        if (seletor) {
            const option = document.createElement('option');
            option.value = base.id;
            option.textContent = base.nome;
            if (baseSelecionada && base.id === baseSelecionada.id) {
                option.selected = true;
            }
            seletor.appendChild(option);
        }

        if (baseManagement) {
            const card = document.createElement('div');
            card.className = 'glass-premium p-6 rounded-[2rem] border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]';
            if (baseSelecionada && base.id === baseSelecionada.id) {
                card.className += ' border-ecogreen/40 shadow-[0_0_40px_rgba(16,185,129,0.18)]';
            } else {
                card.className += ' border-slate-700/50';
            }
            const coords = (base.lat || base.lon) ? `${base.lat ? `Lat: ${base.lat}` : ''}${base.lat && base.lon ? ' • ' : ''}${base.lon ? `Lon: ${base.lon}` : ''}` : 'Coordenadas não informadas';

            card.innerHTML = `
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <p class="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-2">Base</p>
                        <h3 class="text-xl font-bold text-white mb-2">${base.nome}</h3>
                        <p class="text-xs text-slate-500 mt-3">${coords}</p>
                    </div>
                    <div class="flex flex-col items-end gap-2">
                        <button type="button" onclick="mudarBase('${base.id}')" class="text-ecogreen text-xs font-bold uppercase tracking-[0.26em]">Selecionar</button>
                    </div>
                </div>
            `;
            baseManagement.appendChild(card);
        }
    });

    if (baseManagement && redeBases.length === 0) {
        baseManagement.innerHTML = `<div class="glass-premium p-6 rounded-[2rem] border border-slate-700/40 text-slate-400">Nenhuma base cadastrada ainda.</div>`;
    }
}

function tentarAcessarSensores() {
    const modal = document.getElementById('modal-loc');
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            const box = document.getElementById('modal-loc-box');
            if (box) box.classList.remove('scale-95');
        }, 10);
    }
}

function acessarSensoresManual() {
    fecharModalLoc();
    navegarPara('dashboard');
}

function fecharModalLoc() {
    const modal = document.getElementById('modal-loc');
    const box = document.getElementById('modal-loc-box');
    if (modal && box) {
        modal.classList.add('opacity-0');
        box.classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 400);
    }
}

function acessarSensoresGPS() {
    const btn = document.querySelector('button[onclick="acessarSensoresGPS()"]');
    const icon = btn ? btn.querySelector('i') : null;
    if (icon) icon.className = 'fa-solid fa-circle-notch fa-spin text-lg md:text-xl';

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;
                let baseMaisProxima = null;
                let menorDistancia = Infinity;

                redeBases.forEach(base => {
                    if (base.lat && base.lon) {
                        const dist = Math.sqrt(Math.pow(base.lat - userLat, 2) + Math.pow(base.lon - userLon, 2));
                        if (dist < menorDistancia) {
                            menorDistancia = dist;
                            baseMaisProxima = base;
                        }
                    }
                });

                if (icon) icon.className = 'fa-solid fa-location-crosshairs text-lg md:text-xl';
                if (baseMaisProxima) {
                    baseSelecionada = baseMaisProxima;
                    const seletor = document.getElementById('seletor-base');
                    if (seletor) seletor.value = baseMaisProxima.id;
                }
                acessarSensoresManual();
            },
            (error) => {
                if (icon) icon.className = 'fa-solid fa-location-crosshairs text-lg md:text-xl';
                alert(idiomaAtual === 'pt' ? "Não foi possível acessar o GPS. Escolha manualmente." : "Cannot access GPS. Please choose manually.");
                acessarSensoresManual();
            }
        );
    } else {
        alert("GPS não suportado.");
        acessarSensoresManual();
    }
}

// ------------------------------------------------
// 4. ATUALIZAÇÃO E CONSUMO DE DADOS DA API
// ------------------------------------------------
function mudarBase(id) {
    baseSelecionada = redeBases.find(b => b.id == id);
    if (!baseSelecionada) return;
    sincronizarTago();
    atualizarInterfaceBases();
}

function aplicarFiltroData() {
    const input = document.getElementById('seletor-data-historico');
    if (!input || !input.value) return;

    dataFiltroSelecionada = input.value;

    if (intervalSync) {
        clearInterval(intervalSync);
        intervalSync = null;
    }

    const btnVoltar = document.getElementById('btn-voltar-tempo-real');
    if (btnVoltar) btnVoltar.classList.remove('hidden');

    sincronizarTago();
}

function voltarTempoReal() {
    dataFiltroSelecionada = null;

    const input = document.getElementById('seletor-data-historico');
    if (input) input.value = '';

    const btnVoltar = document.getElementById('btn-voltar-tempo-real');
    if (btnVoltar) btnVoltar.classList.add('hidden');

    sincronizarTago();
    if (!intervalSync) intervalSync = setInterval(sincronizarTago, 15000);
}

async function sincronizarTago() {
    if (!baseSelecionada && redeBases.length > 0) {
        baseSelecionada = redeBases[0];
    }

    try {
        let url = `${WORKER_URL}/api/dados-recentes`;
        const params = new URLSearchParams();

        if (baseSelecionada && baseSelecionada.id) {
            params.append('baseId', baseSelecionada.id);
        }
        if (dataFiltroSelecionada) {
            params.append('data', dataFiltroSelecionada);
        }

        const queryString = params.toString();
        if (queryString) url += `?${queryString}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Worker respondeu com status ${response.status}`);

        const dadosRecebidos = await response.json();
        if (!dadosRecebidos) return;

        let baseAtual = Array.isArray(dadosRecebidos) 
            ? (dadosRecebidos.find(b => b.id === baseSelecionada?.id || b.nome === baseSelecionada?.nome) || dadosRecebidos[0])
            : dadosRecebidos;

        if (!baseAtual) return;

        // Atualização dos elementos da página
        const elTemp = document.getElementById('temp-val') || document.querySelector('.temperatura-valor');
        const elUmid = document.getElementById('umid-val') || document.querySelector('.umidade-valor');
        const elGas  = document.getElementById('gas-val')  || document.querySelector('.gas-valor');
        const elNome = document.getElementById('base-nome') || document.querySelector('.base-nome');
        const elAtualizacao = document.getElementById('last-update') || document.querySelector('.ultima-atualizacao');

        if (elTemp && baseAtual.temp !== undefined) elTemp.textContent = `${baseAtual.temp} °C`;
        if (elUmid && baseAtual.umid !== undefined) elUmid.textContent = `${baseAtual.umid} %`;
        if (elGas  && baseAtual.gas  !== undefined) elGas.textContent  = `${baseAtual.gas} ppm`;
        if (elNome && baseAtual.nome) elNome.textContent = baseAtual.nome;

        if (elAtualizacao) {
            const timestamp = baseAtual.timestamp || new Date();
            const horaFormatada = new Date(timestamp).toLocaleTimeString('pt-BR', {
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
            const prefixo = dicionario[idiomaAtual]?.txt_atualizado_as || 'Atualizado às';
            elAtualizacao.textContent = `${prefixo} ${horaFormatada}`;
        }

        if (baseAtual.dados && Array.isArray(baseAtual.dados)) {
            atualizarGraficoDashboard(baseAtual.dados);
        }

    } catch (err) {
        console.error('Erro na sincronização de dados:', err);
    }
}

// Alias para compatibilidade
const atualizarDashboard = sincronizarTago;

// ------------------------------------------------
// 5. RENDERIZAÇÃO DO GRÁFICO (CHART.JS)
// ------------------------------------------------
function atualizarGraficoDashboard(historicoDados) {
    const canvas = document.getElementById('chart-dashboard');
    if (!canvas || typeof Chart === 'undefined') return;

    const leiturasTemp = historicoDados
        .filter(d => d.variable === 'temperatura' || d.variable === 'temp')
        .slice(0, 15)
        .reverse();

    const labels = leiturasTemp.map(d => new Date(d.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    const valores = leiturasTemp.map(d => d.value);

    if (chartInstance) {
        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = valores;
        chartInstance.update();
    } else {
        const ctx = canvas.getContext('2d');
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Temperatura (°C)',
                    data: valores,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#94A3B8' }, grid: { display: false } },
                    y: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(51, 65, 85, 0.3)' } }
                }
            }
        });
    }
}
