// ── Ecobot Config ──────────────────────────────────────────

// ========== CONFIGURAÇÃO DE AMBIENTE ==========
        const API_URL = 'https://ecobotce.github.io/site/';
        const ECOBOT_BACKEND_URL = 'https://ecobotce.github.io/site/';
        const TAGO_API_BASE = 'https://api.tago.io/data';
        const TAGO_FETCH_QTY = 60;

        // Quando null, o dashboard busca os dados mais recentes em tempo real
        // (comportamento original). Quando preenchido com uma string "YYYY-MM-DD",
        // o dashboard busca apenas os dados daquele dia específico.
        let dataFiltroSelecionada = null;

// ── Ecobot Main ─────────────────────────────────────────────

// ------------------------------------------------
        // 1. DICIONÁRIO DE IDIOMAS
        // ------------------------------------------------
        const dicionario = {
            pt: {
                txt_carregando: "Calibrando Sensores...",
                txt_senha_erro: "Credencial Incorreta!", btn_autenticar: "Autenticar", btn_nav_sensores: "Acessar Estações",
                txt_projeto_titulo: "Projeto", txt_subtitulo: "Unindo robótica de baixo custo e preservação ambiental para combater a invisibilidade dos dados climáticos no interior e construir um futuro inteligente.",
                btn_ver_dados: "Explorar Dados", titulo_tabela: "Por que escolher a Estação Elion?", tab_recurso: "Recurso",
                tab_tradicional: "Estações disponíveis no mercado", tab_ecobot: "Estação Elion",
                linha1_rec: "Custo de Implementação", linha1_trad: "Alto Custo", linha1_eco: "Baixíssimo Custo",
                linha2_rec: "Instalação", linha2_trad: "Técnico Especializado", linha2_eco: "Rápido e fácil",
                linha3_rec: "Tecnologia", linha3_trad: "Sistema Fechado", linha3_eco: "Open-Source e Escalável",
                txt_jornada: "Nossa Jornada", txt_onu: "Alinhado com a ONU 🌍",
                txt_onu_sub: "O Ecobot responde diretamente aos Objetivos de Desenvolvimento Sustentável (ODS), atuando como ferramenta tecnológica para cidades inteligentes e ação climática global.",
                txt_ods9: "Indústria, Inovação e Infraestrutura", txt_ods11: "Cidades e Comunidades Sustentáveis", txt_ods13: "Ação Contra a Mudança Global do Clima",
                txt_acompanhe: "Acompanhe nossa evolução", txt_modal_titulo: "Onde você está?",
                txt_modal_sub: "Para mostrar a qualidade do ar com precisão, precisamos encontrar a Base Ecobot mais próxima. Não guardamos a sua localização!",
                btn_modal_gps: "Usar Meu GPS", btn_modal_manual: "Escolher Base Manualmente",
                lbl_rede: "Base de Monitoramento:", btn_tago: "DADOS EM TEMPO REAL",
                txt_offline_titulo: "CONEXÃO PERDIDA", txt_offline_sub: "Os dados pararam de chegar ou a estação está desligada. Aguardando nuvem...",
                txt_alerta: "ALERTA: NÍVEL DE GÁS ELEVADO!", lbl_temp: "Temperatura", lbl_umi: "Umidade", lbl_gas: "Nível de gás (%)",
                txt_hist: "Sincronizado", txt_adm_titulo: "Controle do Sistema",
                btn_adicionar_base: "Adicionar Base", txt_adicionar_base_titulo: "Adicionar Nova Base",
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
                txt_senha_erro: "Incorrect Credential!", btn_autenticar: "Authenticate", btn_nav_sensores: "Access Stations",
                txt_projeto_titulo: "Project", txt_subtitulo: "Uniting low-cost robotics and environmental preservation to bring climate intelligence to remote areas.",
                btn_ver_dados: "Explore Data", titulo_tabela: "Why choose Elion Station?", tab_recurso: "Feature",
                tab_tradicional: "Market available stations", tab_ecobot: "Elion Station",
                linha1_rec: "Implementation Cost", linha1_trad: "High Cost", linha1_eco: "Very Low Cost",
                linha2_rec: "Installation", linha2_trad: "Specialized Technician", linha2_eco: "Fast and easy",
                linha3_rec: "Technology", linha3_trad: "Closed System", linha3_eco: "Open-Source & Scalable",
                txt_jornada: "Our Journey", txt_onu: "Aligned with the UN 🌍",
                txt_onu_sub: "Ecobot responds directly to the Sustainable Development Goals (SDG).",
                txt_ods9: "Industry, Innovation and Infrastructure", txt_ods11: "Sustainable Cities and Communities", txt_ods13: "Climate Action",
                txt_acompanhe: "Follow our evolution", txt_modal_titulo: "Where are you?",
                txt_modal_sub: "We need to locate the nearest base. We do not save your location!",
                btn_modal_gps: "Use My GPS", btn_modal_manual: "Choose Base Manually",
                lbl_rede: "Monitoring Base:", btn_tago: "REAL-TIME DATA",
                txt_offline_titulo: "CONNECTION LOST", txt_offline_sub: "Data stopped arriving or station is offline. Waiting for cloud...",
                txt_alerta: "ALERT: HIGH GAS LEVEL!", lbl_temp: "Temperature", lbl_umi: "Humidity", lbl_gas: "Gas (%)",
                txt_hist: "Synchronized", txt_adm_titulo: "System Control",
                btn_adicionar_base: "Add Base", txt_adicionar_base_titulo: "Add New Base",
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
                txt_senha_erro: "¡Credencial Incorrecta!", btn_autenticar: "Autenticar", btn_nav_sensores: "Acceder a Estaciones",
                txt_projeto_titulo: "Proyecto", txt_subtitulo: "Uniendo robótica de bajo costo y preservación ambiental para combatir la invisibilidad de los datos climáticos.",
                btn_ver_dados: "Explorar Datos", titulo_tabela: "¿Por qué elegir la Estación Elion?", tab_recurso: "Recurso",
                tab_tradicional: "Estaciones disponibles en el mercado", tab_ecobot: "Estación Elion",
                linha1_rec: "Costo de Implementación", linha1_trad: "Alto Costo", linha1_eco: "Costo Muy Bajo",
                linha2_rec: "Instalación", linha2_trad: "Técnico Especializado", linha2_eco: "Rápido y fácil",
                linha3_rec: "Tecnología", linha3_trad: "Sistema Cerrado", linha3_eco: "Open-Source y Escalable",
                txt_jornada: "Nuestra Jornada", txt_onu: "Alineado con la ONU 🌍",
                txt_onu_sub: "Ecobot responde directamente a los Objetivos de Desarrollo Sostenible (ODS).",
                txt_ods9: "Industria, Innovación e Infraestructura", txt_ods11: "Ciudades y Comunidades Sostenibles", txt_ods13: "Acción por el Clima",
                txt_acompanhe: "Sigue nuestra evolución", txt_modal_titulo: "¿Dónde estás?",
                txt_modal_sub: "Necesitamos encontrar la base más cercana. ¡No guardamos tu ubicación!",
                btn_modal_gps: "Usar Mi GPS", btn_modal_manual: "Elegir Base Manualmente",
                lbl_rede: "Base de Monitoreo:", btn_tago: "DATOS EN TIEMPO REAL",
                txt_offline_titulo: "CONEXIÓN PERDIDA", txt_offline_sub: "Esperando a la nube...",
                txt_alerta: "¡ALERTA: NIVEL DE GAS ALTO!", lbl_temp: "Temperatura", lbl_umi: "Humedad", lbl_gas: "Concentración de gas (%)",
                txt_hist: "Sincronizado", txt_adm_titulo: "Control del Sistema",
                btn_adicionar_base: "Agregar Base", txt_adicionar_base_titulo: "Agregar Nueva Base",
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

        let idiomaAtual = 'pt';

        function mudarIdioma(lang) {
            idiomaAtual = lang;
            ['pt', 'en', 'es'].forEach(l => {
                const btn = document.getElementById('btn_lang_' + l);
                if (l === lang) {
                    btn.classList.replace('text-slate-400', 'text-ecogreen');
                    btn.classList.add('font-bold');
                } else {
                    btn.classList.replace('text-ecogreen', 'text-slate-400');
                    btn.classList.remove('font-bold');
                }
            });

            document.querySelectorAll('[data-i18n]').forEach(elemento => {
                const chave = elemento.getAttribute('data-i18n');
                if (dicionario[lang][chave]) {
                    if (chave.startsWith('linha') && chave.includes('_eco')) {
                        elemento.innerHTML = `<i class="fa-solid fa-check-circle text-ecogreen text-lg drop-shadow-[0_0_8px_rgba(16,185,129,0.8)] mr-3"></i> <span data-i18n="${chave}">${dicionario[lang][chave]}</span>`;
                    } else {
                        elemento.innerHTML = dicionario[lang][chave];
                    }
                }
            });
            atualizarBotaoNav(document.querySelector('.active-view').id.replace('view-', ''));
            atualizarInterfaceBases();
        }

        // ------------------------------------------------
        // 2. VARIÁVEIS GLOBAIS & INICIALIZAÇÃO
        // ------------------------------------------------
        let redeBases = [];
        let baseSelecionada = null;
        let editingBaseId = null;
        let chartInstance = null;
        let intervalSync = null;

        window.onload = function () {
            carregarBases().finally(() => {
                atualizarInterfaceBases();
                mudarIdioma('pt');
                carregarConfiguracoesAlertas(); // Carregar alertas salvos
                carregarCredenciaisInterface(); // Carregar credenciais nos campos

                // Impede a seleção de datas futuras no seletor de histórico
                // (não existem dados de sensor ainda para o futuro).
                const inputData = document.getElementById('seletor-data-historico');
                if (inputData) {
                    const hoje = new Date().toISOString().split('T')[0];
                    inputData.setAttribute('max', hoje);
                }

                setTimeout(() => {
                    document.getElementById('splash-screen').classList.add('opacity-0');
                    setTimeout(() => document.getElementById('splash-screen').classList.add('hidden'), 1000);
                }, 1500);
            });
        };

        async function carregarBases() {
            const backendUrl = ECOBOT_BACKEND_URL || (window.location.protocol === 'file:' ? 'http://localhost:8080' : window.location.origin);
            try {
                const response = await fetch(`${backendUrl}/api/bases`);
                if (!response.ok) {
                    throw new Error('Falha ao carregar bases do servidor');
                }
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
                console.error('Erro ao carregar bases do servidor:', err);
                if (!redeBases.length) {
                    redeBases = [];
                }
            }
        }

        // ------------------------------------------------
        // 3. NAVEGAÇÃO & MODAIS
        // ------------------------------------------------
        function navegarPara(viewId) {
            document.querySelectorAll('.page-view').forEach(el => {
                el.classList.replace('active-view', 'hidden-view');
            });
            document.getElementById('view-' + viewId).classList.replace('hidden-view', 'active-view');

            atualizarBotaoNav(viewId);

            if (viewId === 'dashboard') {
                if (!baseSelecionada && redeBases.length > 0) mudarBase(redeBases[0].id);
                // Atualiza imediatamente e depois a cada 30 segundos
                sincronizarTago();
                if (!intervalSync) intervalSync = setInterval(sincronizarTago, 30000);
            } else if (viewId === 'alertas') {
                carregarHistoricoAlertas();
                if (intervalSync) { clearInterval(intervalSync); intervalSync = null; }
            } else {
                if (intervalSync) { clearInterval(intervalSync); intervalSync = null; }
            }
            window.scrollTo(0, 0);
        }

        function atualizarBotaoNav(viewId) {
            const btnText = document.getElementById('btn_nav_sensores');
            const icon = document.getElementById('icon_nav_sensores');

            if (viewId === 'dashboard') {
                btnText.innerHTML = idiomaAtual === 'pt' ? 'Voltar ao Início' : idiomaAtual === 'es' ? 'Volver al Inicio' : 'Back to Home';
                icon.className = 'fa-solid fa-arrow-left text-ecogreen group-hover:-translate-x-1 transition-transform';
            } else {
                btnText.innerHTML = dicionario[idiomaAtual]['btn_nav_sensores'];
                icon.className = 'fa-solid fa-satellite-dish text-ecogreen group-hover:animate-pulse';
            }
        }

        function acaoNavbar() {
            const currentView = document.querySelector('.active-view').id;
            if (currentView === 'view-home') tentarAcessarSensores();
            else navegarPara('home');
        }

        function atualizarInterfaceBases() {
            const seletor = document.getElementById('seletor-base');
            const baseManagement = document.getElementById('base-management');
            seletor.innerHTML = '';
            if (baseManagement) baseManagement.innerHTML = '';

            redeBases.forEach(base => {
                const option = document.createElement('option');
                option.value = base.id;
                option.textContent = base.nome;
                if (baseSelecionada && base.id === baseSelecionada.id) {
                    option.selected = true;
                }
                seletor.appendChild(option);

                if (baseManagement) {
                    const card = document.createElement('div');
                    card.className = 'glass-premium p-6 rounded-[2rem] border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]';
                    if (baseSelecionada && base.id === baseSelecionada.id) {
                        card.className += ' border-ecogreen/40 shadow-[0_0_40px_rgba(16,185,129,0.18)]';
                    } else {
                        card.className += ' border-slate-700/50';
                    }
                    const tokenPreview = base.token ? `${base.token.slice(0, 6)}...${base.token.slice(-6)}` : 'Sem token';
                    const coords = base.lat || base.lon ? `${base.lat ? `Lat: ${base.lat}` : ''}${base.lat && base.lon ? ' • ' : ''}${base.lon ? `Lon: ${base.lon}` : ''}` : 'Coordenadas não informadas';

                    card.innerHTML = `
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <p class="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-2">Base</p>
                                <h3 class="text-xl font-bold text-white mb-2">${base.nome}</h3>
                                <p class="text-sm text-slate-400 break-all">${tokenPreview}</p>
                                <p class="text-xs text-slate-500 mt-3">${coords}</p>
                            </div>
                            <div class="flex flex-col items-end gap-2">
                                <button type="button" onclick="mudarBase(${base.id})" class="text-ecogreen text-xs font-bold uppercase tracking-[0.26em]">Selecionar</button>
                                <button type="button" onclick="editarBase(${base.id})" class="text-slate-300 text-xs hover:text-ecogreen flex items-center gap-2"><i class="fa-solid fa-pen-to-square"></i>Editar</button>
                                <button type="button" onclick="removerBase(${base.id})" class="text-red-400 text-xs hover:text-red-200 flex items-center gap-2"><i class="fa-solid fa-trash"></i>Excluir</button>
                            </div>
                        </div>
                    `;
                    baseManagement.appendChild(card);
                }
            });

            if (baseManagement && redeBases.length === 0) {
                baseManagement.innerHTML = `<div class="glass-premium p-6 rounded-[2rem] border border-slate-700/40 text-slate-400">Nenhuma base cadastrada ainda. Clique em "Adicionar Base" para começar.</div>`;
            }
        }

        function tentarAcessarSensores() {
            document.getElementById('modal-loc').classList.remove('hidden');
            setTimeout(() => {
                document.getElementById('modal-loc').classList.remove('opacity-0');
                document.getElementById('modal-loc-box').classList.remove('scale-95');
            }, 10);
        }

        function acessarSensoresManual() {
            fecharModalLoc();
            navegarPara('dashboard');
        }

        function acessarSensoresGPS() {
            const btn = document.querySelector('button[onclick="acessarSensoresGPS()"]');
            const icon = btn.querySelector('i');
            icon.className = 'fa-solid fa-circle-notch fa-spin text-lg md:text-xl';

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

                        icon.className = 'fa-solid fa-location-crosshairs text-lg md:text-xl';
                        if (baseMaisProxima) {
                            baseSelecionada = baseMaisProxima;
                            document.getElementById('seletor-base').value = baseMaisProxima.id;
                        }
                        acessarSensoresManual();
                    },
                    (error) => {
                        icon.className = 'fa-solid fa-location-crosshairs text-lg md:text-xl';
                        alert(idiomaAtual === 'pt' ? "Não foi possível acessar o GPS. Escolha manualmente." : "Cannot access GPS. Please choose manually.");
                        acessarSensoresManual();
                    }
                );
            } else {
                alert("GPS não suportado.");
                acessarSensoresManual();
            }
        }

        function fecharModalLoc() {
            document.getElementById('modal-loc').classList.add('opacity-0');
            document.getElementById('modal-loc-box').classList.add('scale-95');
            setTimeout(() => { document.getElementById('modal-loc').classList.add('hidden'); }, 400);
        }

        function abrirModalAdicionarBase(id = null) {
            const modalTitle = document.getElementById('modal-title-base');
            const saveText = document.getElementById('btn-salvar-base-text');
            const nomeInput = document.getElementById('nova-nome');
            const tokenInput = document.getElementById('nova-token');
            const latInput = document.getElementById('nova-lat');
            const lonInput = document.getElementById('nova-lon');

            if (id) {
                const base = redeBases.find(b => b.id == id);
                if (base) {
                    editingBaseId = base.id;
                    modalTitle.innerText = dicionario[idiomaAtual]['txt_editar_base_titulo'];
                    saveText.innerText = dicionario[idiomaAtual]['btn_atualizar_base'];
                    nomeInput.value = base.nome;
                    tokenInput.value = base.token;
                    latInput.value = base.lat || '';
                    lonInput.value = base.lon || '';
                }
            } else {
                editingBaseId = null;
                modalTitle.innerText = dicionario[idiomaAtual]['txt_adicionar_base_titulo'];
                saveText.innerText = dicionario[idiomaAtual]['btn_salvar_nova_base'];
                nomeInput.value = '';
                tokenInput.value = '';
                latInput.value = '';
                lonInput.value = '';
            }

            const modal = document.getElementById('modal-adicionar-base');
            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                document.getElementById('modal-adicionar-base-box').classList.remove('scale-95');
            }, 10);
            setTimeout(() => nomeInput.focus(), 100);
        }

        function fecharModalAdicionarBase() {
            document.getElementById('modal-adicionar-base').classList.add('opacity-0');
            document.getElementById('modal-adicionar-base-box').classList.add('scale-95');
            setTimeout(() => { document.getElementById('modal-adicionar-base').classList.add('hidden'); }, 400);
        }

        async function salvarNovaBase() {
            const nome = document.getElementById('nova-nome').value;
            const token = document.getElementById('nova-token').value;
            const lat = document.getElementById('nova-lat').value;
            const lon = document.getElementById('nova-lon').value;

            if (!nome || !token) {
                alert(idiomaAtual === 'pt' ? "Nome e Token são obrigatórios!" : idiomaAtual === 'es' ? "¡Nombre y Token son obligatorios!" : "Name and Token are required!");
                return;
            }

            const backendUrl = ECOBOT_BACKEND_URL || (window.location.protocol === 'file:' ? 'http://localhost:8080' : window.location.origin);
            const payload = { nome, token, lat: lat || null, lon: lon || null };

            try {
                let response;
                if (editingBaseId) {
                    payload.id = editingBaseId;
                    response = await fetch(`${backendUrl}/api/bases`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                } else {
                    response = await fetch(`${backendUrl}/api/bases`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                }
                if (!response.ok) {
                    const errorBody = await response.json().catch(() => ({}));
                    throw new Error(errorBody.error || 'Não foi possível salvar a base.');
                }
                const savedBase = await response.json();
                await carregarBases();
                if (!baseSelecionada || editingBaseId) {
                    baseSelecionada = savedBase;
                }
                editingBaseId = null;
                fecharModalAdicionarBase();
                atualizarInterfaceBases();
                if (document.getElementById('view-dashboard').classList.contains('active-view')) {
                    sincronizarTago();
                }
            } catch (err) {
                console.error('Erro ao salvar base:', err);
                alert(idiomaAtual === 'pt' ? 'Erro ao salvar base. Verifique o console.' : 'Error saving base. Check console.');
            }
        }

        function editarBase(id) {
            abrirModalAdicionarBase(id);
        }

        async function removerBase(id) {
            const confirmMsg = idiomaAtual === 'pt'
                ? 'Tem certeza que deseja excluir esta base?'
                : idiomaAtual === 'es'
                    ? '¿Seguro que desea eliminar esta base?'
                    : 'Are you sure you want to delete this base?';
            if (!confirm(confirmMsg)) return;

            try {
                const backendUrl = ECOBOT_BACKEND_URL || (window.location.protocol === 'file:' ? 'http://localhost:8080' : window.location.origin);
                const response = await fetch(`${backendUrl}/api/bases/${id}`, { method: 'DELETE' });
                if (!response.ok) {
                    const errorBody = await response.json().catch(() => ({}));
                    throw new Error(errorBody.error || 'Não foi possível excluir a base.');
                }
                await carregarBases();
                if (baseSelecionada && baseSelecionada.id == id) {
                    baseSelecionada = redeBases[0] || null;
                }
                atualizarInterfaceBases();
                if (baseSelecionada && document.getElementById('view-dashboard').classList.contains('active-view')) {
                    sincronizarTago();
                }
            } catch (err) {
                console.error('Erro ao excluir base:', err);
                alert(idiomaAtual === 'pt' ? 'Erro ao excluir base. Verifique o console.' : 'Error deleting base. Check console.');
            }
        }


        // ------------------------------------------------
        // 6. SINCRONIZAÇÃO TAGO.IO & GRÁFICO
        // ------------------------------------------------
        function mudarBase(id) {
            baseSelecionada = redeBases.find(b => b.id == id);
            if (!baseSelecionada) return;
            sincronizarTago();
            atualizarInterfaceBases();
        }

        // Chamada pelo botão "Ver" do seletor de data no HTML.
        // Recebe uma string no formato "YYYY-MM-DD" (valor nativo de <input type="date">).
        function aplicarFiltroData() {
            const input = document.getElementById('seletor-data-historico');
            if (!input || !input.value) return;

            dataFiltroSelecionada = input.value;

            // Enquanto estiver vendo um dia específico, pausa o auto-refresh de
            // 30s para não gastar requisições à toa — o histórico de um dia
            // passado não muda. O refresh volta a funcionar normalmente ao
            // clicar em "Voltar ao tempo real".
            if (intervalSync) {
                clearInterval(intervalSync);
                intervalSync = null;
            }

            const btnVoltar = document.getElementById('btn-voltar-tempo-real');
            if (btnVoltar) btnVoltar.classList.remove('hidden');

            sincronizarTago();
        }

        // Chamada pelo botão "Voltar ao tempo real", que aparece somente
        // depois que um filtro de data foi aplicado.
        function voltarTempoReal() {
            dataFiltroSelecionada = null;

            const input = document.getElementById('seletor-data-historico');
            if (input) input.value = '';

            const btnVoltar = document.getElementById('btn-voltar-tempo-real');
            if (btnVoltar) btnVoltar.classList.add('hidden');

            sincronizarTago();
            if (!intervalSync) intervalSync = setInterval(sincronizarTago, 30000);
        }

        async function sincronizarTago() {
            if (!baseSelecionada) return;

            try {
                // Busca os dados mais recentes para preencher o gráfico corretamente
                const backendUrl = ECOBOT_BACKEND_URL || (window.location.protocol === 'file:' ? 'http://localhost:8080' : window.location.origin);

                // Quando há uma data selecionada pelo usuário, busca somente os
                // dados daquele dia (00:00:00 até 23:59:59). Caso contrário,
                // mantém o comportamento original: últimos TAGO_FETCH_QTY registros.
                let filtroDataParams = '';
                if (dataFiltroSelecionada) {
                    const inicio = `${dataFiltroSelecionada} 00:00:00`;
                    const fim = `${dataFiltroSelecionada} 23:59:59`;
                    filtroDataParams = `&start_date=${encodeURIComponent(inicio)}&end_date=${encodeURIComponent(fim)}`;
                }

                // Quando filtrando por um dia inteiro, pede mais registros (até 500)
                // já que um dia inteiro pode ter mais pontos do que os 60 padrão de
                // "tempo real". Sem filtro de data, mantém o qty padrão.
                const qtyEfetivo = dataFiltroSelecionada ? 500 : TAGO_FETCH_QTY;

                const proxyUrl = `${backendUrl}/api/test-tago?token=${encodeURIComponent(baseSelecionada.token)}&qty=${qtyEfetivo}${filtroDataParams}`;
                const directUrl = `${TAGO_API_BASE}?qty=${qtyEfetivo}${filtroDataParams}`;

                const fetchData = async (url, useDirect = false) => {
                    const headers = useDirect
                        ? { 'Content-Type': 'application/json', 'Device-Token': baseSelecionada.token }
                        : { 'Content-Type': 'application/json' };
                    const response = await fetch(url, {
                        method: 'GET',
                        mode: 'cors',
                        cache: 'no-store',
                        headers
                    });
                    if (!response.ok) {
                        throw new Error(`TagO API retornou ${response.status} ${response.statusText}`);
                    }
                    return response.json();
                };

                let json;
                try {
                    json = await fetchData(proxyUrl, false);
                } catch (proxyError) {
                    console.warn('Proxy TagO falhou, tentando acesso direto:', proxyError.message);
                    json = await fetchData(directUrl, true);
                }

                const data = Array.isArray(json.result)
                    ? json.result
                    : Array.isArray(json.dados?.result)
                        ? json.dados.result
                        : [];

                const normalize = (value) => value ? value.toString().toLowerCase().trim() : '';
                const sortByTime = (arr) => arr
                    .filter(d => d && d.time)
                    .map(d => ({ ...d, __time: new Date(d.time).getTime() }))
                    .filter(d => !Number.isNaN(d.__time))
                    .sort((a, b) => a.__time - b.__time);

                const t = sortByTime(data.filter(d => {
                    const v = normalize(d.variable);
                    return /temp|temperatura/.test(v);
                }));
                const u = sortByTime(data.filter(d => {
                    const v = normalize(d.variable);
                    return /umid|humidity/.test(v);
                }));
                const g = sortByTime(data.filter(d => {
                    const v = normalize(d.variable);
                    return /gas|mq|co2/.test(v);
                }));

                const baseNomeBadge = baseSelecionada ? baseSelecionada.nome : 'Base não selecionada';
                const statusNote = dicionario[idiomaAtual].txt_status_note;

                document.getElementById('status-badge').innerHTML = `
                    <span class="bg-ecogreen/20 text-ecogreen border border-ecogreen/50 px-5 py-2.5 rounded-full text-xs font-black tracking-widest block shadow-md">${baseNomeBadge}</span>
                    <p class="text-[10px] text-slate-400 mt-2">${statusNote}</p>
                `;

                const safeParse = (val) => {
                    if (val === null || val === undefined) return null;
                    let num = parseFloat(String(val).replace(',', '.').trim());
                    return isNaN(num) ? null : num;
                };

                const valT = t.length > 0 ? safeParse(t[t.length - 1].value) : null;
                const valU = u.length > 0 ? safeParse(u[u.length - 1].value) : null;
                const valC = g.length > 0 ? safeParse(g[g.length - 1].value) : null;  // gás em porcentagem

                // Dados globais sincronizados
                window.dadosAtuais = { temp: t, umi: u, gas: g };
                window.elionTemp = valT;
                window.elionUmi = valU;
                window.elionGas = valC;

                // Atualização dos cards
                document.getElementById('temp').innerText = valT !== null ? valT : '--';
                document.getElementById('umi').innerText = valU !== null ? valU : '--';
                document.getElementById('gas').innerText = valC !== null ? valC + '%' : '--';

                // Alerta baseado em gás e base ativa
                const baseNomeAlerta = baseSelecionada ? baseSelecionada.nome : 'Desconhecida';
                const alertaGasAtivo = valC !== null && valC > 10;

                if (alertaGasAtivo) {
                    document.getElementById('alerta-gas').classList.remove('hidden');
                    document.getElementById('alerta-gas-text').innerHTML = `ALERTA: NÍVEL DE GÁS ELEVADO na base <strong>${baseNomeAlerta}</strong>!`;

                    // Enviar alerta por email/WhatsApp se configurado e se ainda não foi enviado para esta condição
                    const mensagemAlerta = `🚨 ALERTA CRÍTICO: Nível de gás elevado detectado!\nValor atual: ${valC}%\nLimite: 10%`;
                    enviarAlerta('gas', mensagemAlerta, baseNomeAlerta, valC);
                } else {
                    document.getElementById('alerta-gas').classList.add('hidden');
                }

                let now = new Date();
                let horaFormatada = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

                let textoAtualizado = dicionario[idiomaAtual].txt_atualizado_as || "Atualizado às";
                const baseNome = baseSelecionada ? baseSelecionada.nome : 'Sem base';

                if (dataFiltroSelecionada) {
                    // Modo histórico: mostra qual dia está sendo exibido, em vez
                    // do tempo relativo de "tempo real".
                    const [ano, mes, dia] = dataFiltroSelecionada.split('-');
                    document.getElementById('hora-sync').innerText =
                        `📅 Exibindo dados de ${dia}/${mes}/${ano} • Base: ${baseNome}`;
                } else {
                    // Tempo relativo desde a última leitura do sensor
                    let tempoRelativo = '';
                    if (t.length > 0 && t[t.length-1].time) {
                        const diffMs = Date.now() - new Date(t[t.length-1].time).getTime();
                        const diffMin = Math.floor(diffMs / 60000);
                        if (diffMin < 1) tempoRelativo = ' • Agora mesmo';
                        else if (diffMin === 1) tempoRelativo = ' • Há 1 min';
                        else if (diffMin < 60) tempoRelativo = ` • Há ${diffMin} min`;
                        else tempoRelativo = ` • Há ${Math.floor(diffMin/60)}h`;
                    }
                    document.getElementById('hora-sync').innerText = `${textoAtualizado} ${horaFormatada} • Base: ${baseNome}${tempoRelativo}`;
                }

                atualizarGrafico(t, u, g);

            } catch (err) {
                console.error("Erro na sincronização:", err);
                // Mostra estado de erro visível nos cards
                ['temp','umi','gas'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el && el.innerText === '--') el.innerText = '!';
                });
                document.getElementById('hora-sync').innerText = '⚠️ Falha ao buscar dados — tentando novamente...';
            }
        }

        // Estado atual do filtro do gráfico
        // let filtroGraficoAtual = 'todos'; // 'todos', 'temp', 'umi', 'gas'

        function atualizarGrafico(arrT, arrU, arrG) {
            const canvasGrafico = document.getElementById('graficoSensor');
            if (!canvasGrafico) return;
            const ctx = canvasGrafico.getContext('2d');

            const safeParseNum = (val) => {
                if (val === null || val === undefined) return null;
                let num = parseFloat(String(val).replace(',', '.').trim());
                return isNaN(num) ? null : num;
            };

            // ── CORREÇÃO: cada sensor já vem ordenado por tempo (sortByTime).
            // Pegamos os últimos N valores de CADA sensor diretamente por índice,
            // sem agrupar por minuto. A base envia a cada 5 min, então os pontos
            // têm timestamps distintos — agrupar por HH:MM colapsa tudo num único ponto.
            //
            // No modo "tempo real" mantemos só os últimos 20 pontos (gráfico
            // limpo, focado no que está acontecendo agora). No modo "histórico"
            // (um dia específico selecionado), usamos um limite bem maior para
            // mostrar o dia completo — um dia inteiro com leituras a cada 5 min
            // pode ter até ~288 pontos por sensor.
            const MAX_PONTOS = dataFiltroSelecionada ? 300 : 20;

            const ultT = arrT.slice(-MAX_PONTOS);
            const ultU = arrU.slice(-MAX_PONTOS);
            const ultG = arrG.slice(-MAX_PONTOS);

            // Usa o array com mais pontos como referência do eixo X
            const refArr = [ultT, ultU, ultG].reduce((a, b) => a.length >= b.length ? a : b);
            const labels = refArr.map(d => {
                if (!d.time) return '';
                const dt = new Date(d.time);
                return `${dt.getHours().toString().padStart(2,'0')}:${dt.getMinutes().toString().padStart(2,'0')}`;
            });

            // Valores diretos por índice — sem deduplicar por minuto
            const dataT = ultT.map(d => safeParseNum(d.value));
            const dataU = ultU.map(d => safeParseNum(d.value));
            const dataG = ultG.map(d => safeParseNum(d.value));

            // Preenche com null no início para alinhar datasets de tamanhos diferentes
            const maxLen = labels.length;
            const padArr = arr => arr.length < maxLen
                ? [...Array(maxLen - arr.length).fill(null), ...arr]
                : arr;
            const paddedT = padArr(dataT);
            const paddedU = padArr(dataU);
            const paddedG = padArr(dataG);

            if (chartInstance) {
                chartInstance.data.labels = labels;
                chartInstance.data.datasets[0].data = paddedT;
                chartInstance.data.datasets[1].data = paddedU;
                chartInstance.data.datasets[2].data = paddedG;
                chartInstance.data.datasets[0].hidden = false;
                chartInstance.data.datasets[1].hidden = false;
                chartInstance.data.datasets[2].hidden = false;
                chartInstance.update('active');
            } else {
                Chart.defaults.color = 'rgba(255, 255, 255, 0.7)';
                Chart.defaults.font.family = "'Poppins', sans-serif";

                chartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [
                            { label: 'Temperatura (°C)', data: paddedT, spanGaps: true, borderColor: '#f97316', backgroundColor: 'rgba(249, 115, 22, 0.15)', borderWidth: 3, tension: 0.4, fill: true, pointBackgroundColor: '#f97316', pointRadius: 3, pointHoverRadius: 6, yAxisID: 'y' },
                            { label: 'Umidade (%)', data: paddedU, spanGaps: true, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.15)', borderWidth: 3, tension: 0.4, fill: true, pointBackgroundColor: '#3b82f6', pointRadius: 3, pointHoverRadius: 6, yAxisID: 'y' },
                            { label: 'Gás (%)', data: paddedG, spanGaps: true, borderColor: '#eab308', backgroundColor: 'rgba(234, 179, 8, 0.15)', borderWidth: 3, tension: 0.4, fill: true, pointBackgroundColor: '#eab308', pointRadius: 3, pointHoverRadius: 6, yAxisID: 'y1' }
                        ]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        animation: {
                            duration: 1000,
                            easing: 'easeInOutQuart'
                        },
                        plugins: {
                            legend: { position: 'top', labels: { boxWidth: 12, usePointStyle: true, padding: 20, font: { weight: '600', size: 12 } } },
                            tooltip: {
                                backgroundColor: 'rgba(2, 6, 23, 0.95)',
                                titleFont: { size: 13, family: "'Montserrat', sans-serif" },
                                bodyFont: { size: 12 },
                                padding: 15,
                                cornerRadius: 12,
                                borderColor: 'rgba(255,255,255,0.1)',
                                borderWidth: 1,
                                callbacks: {
                                    title: (items) => `🕐 ${items[0].label}`,
                                    label: (item) => {
                                        const units = ['°C', '%', '%'];
                                        const u = units[item.datasetIndex] || '';
                                        return ` ${item.dataset.label}: ${item.formattedValue}${u}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            x: { grid: { color: 'rgba(255, 255, 255, 0.03)', drawBorder: false }, ticks: { maxTicksLimit: 8, font: { size: 10 } } },
                            y: { type: 'linear', display: true, position: 'left', grid: { color: 'rgba(255, 255, 255, 0.03)', drawBorder: false }, ticks: { font: { size: 11 } } },
                            y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { font: { size: 11 } } }
                        },
                        interaction: { mode: 'index', intersect: false }
                    }
                });
            }
        }

        // Função para atualizar campos de alertas baseado nos checkboxes
        function atualizarCamposAlertas() {
            const usarEmail = document.getElementById('usar-email').checked;
            const emailInput = document.getElementById('email-alerta');

            if (emailInput) {
                emailInput.disabled = !usarEmail;
                emailInput.style.opacity = usarEmail ? '1' : '0.5';
            }
        }

        // Função para atualizar alertas baseado nos checkboxes principais
        function atualizarAlertas() {
            const alertTypes = ['temp', 'gas', 'umi', 'queimada'];

            alertTypes.forEach(tipo => {
                const checkbox = document.getElementById(`ativar-${tipo}`);
                const canaisDiv = document.getElementById(`canais-${tipo}`);

                if (checkbox && canaisDiv) {
                    if (checkbox.checked) {
                        canaisDiv.classList.remove('hidden');
                    } else {
                        canaisDiv.classList.add('hidden');
                        // Desmarcar todos os canais quando desativar o alerta
                        const canaisCheckboxes = canaisDiv.querySelectorAll('.alerta-canal');
                        canaisCheckboxes.forEach(cb => cb.checked = false);
                    }
                }
            });
        }

        const alertaEstadoKey = 'ecobot-alertas-estado';

        function carregarEstadoAlertas() {
            try {
                return JSON.parse(localStorage.getItem(alertaEstadoKey) || '{}');
            } catch (err) {
                console.error('Erro ao carregar estado de alertas:', err);
                return {};
            }
        }

        function salvarEstadoAlertas(estado) {
            try {
                localStorage.setItem(alertaEstadoKey, JSON.stringify(estado));
            } catch (err) {
                console.error('Erro ao salvar estado de alertas:', err);
            }
        }

        function deveEnviarAlerta(tipo, baseNome, valorAtual, condicaoAtiva) {
            if (valorAtual === null || valorAtual === undefined) return false;
            const estado = carregarEstadoAlertas();
            const chave = `${tipo}_${baseNome}`;
            const estadoAtual = estado[chave] || { ativo: false, ultimoValor: null, ultimaEnvio: 0 };
            const agora = Date.now();
            const tempoDesdeUltimoEnvio = agora - (estadoAtual.ultimaEnvio || 0);
            const reenvioLongoPrazo = 30 * 60 * 1000; // 30 minutos

            const valorAtualNum = parseFloat(String(valorAtual).replace(',', '.'));
            const ultimoValorNum = estadoAtual.ultimoValor !== null ? parseFloat(String(estadoAtual.ultimoValor).replace(',', '.')) : null;
            const limiteMudanca = tipo === 'gas' ? 5 : tipo === 'temp' ? 2 : 5;
            const mudouSuficiente = estadoAtual.ultimoValor === null || isNaN(valorAtualNum) || isNaN(ultimoValorNum)
                ? String(valorAtual) !== String(estadoAtual.ultimoValor)
                : Math.abs(valorAtualNum - ultimoValorNum) >= limiteMudanca;
            const deveReenviar = condicaoAtiva && (!estadoAtual.ativo || mudouSuficiente || tempoDesdeUltimoEnvio >= reenvioLongoPrazo);

            if (deveReenviar) {
                estado[chave] = { ativo: true, ultimoValor: valorAtual, ultimaEnvio: agora };
                salvarEstadoAlertas(estado);
                return true;
            }

            if (!condicaoAtiva && estadoAtual.ativo) {
                estado[chave] = { ativo: false, ultimoValor: valorAtual, ultimaEnvio: estadoAtual.ultimaEnvio || 0 };
                salvarEstadoAlertas(estado);
            }

            return false;
        }

        // Função para enviar alertas por email e WhatsApp
        async function enviarAlerta(tipo, mensagem, baseNome, valor) {
            try {
                // Pega as configurações salvas no painel (quais canais estão ativos e os contatos)
                const config = JSON.parse(localStorage.getItem('ecobot-alertas-config') || '{}');
                if (!config.alertas || !config.alertas[tipo]) return;

                // Verifica se já não mandou esse alerta há pouco tempo (evita spam)
                if (!deveEnviarAlerta(tipo, baseNome, valor, true)) {
                    return;
                }

                const canais = config.alertas[tipo];
                const assunto = `🚨 ALERTA - ${tipo.toUpperCase()} CRÍTICO`;
                const corpoCompleto = `Atenção! A base "${baseNome}" registrou níveis perigosos.\n\nDetalhes: ${mensagem}\nValor registrado: ${valor}`;

                // 🟢 DISPARO DE E-MAIL
                if (canais.includes('email') && config.email) {
                    console.log("Preparando para enviar E-mail...");
                    await enviarEmail(config.email, assunto, corpoCompleto, baseNome);
                }

            } catch (err) {
                console.error('Erro ao enviar alerta:', err);
            }
        }

        // ------------------------------------------------
        // EmailJS REMOVIDO — alertas por e-mail são gerenciados
        // exclusivamente pelo backend (Nodemailer + /subscribe).
        // As funções abaixo são stubs para não quebrar chamadas existentes.
        // ------------------------------------------------
        function iniciarEmailJS() { return false; }
        function carregarCredenciaisEmailJS() {}
        function atualizarCredenciais(tipo, valor) { showToast('Credenciais gerenciadas pelo servidor.', 'warning'); }
        function validarCredenciais() { return []; }
        function carregarCredenciaisInterface() { carregarCredenciaisEmailJS(); }

        async function enviarEmail(destinatario, assunto, corpo, baseNome) {
            // E-mails são enviados pelo backend automaticamente via Nodemailer.
            // Esta função não faz nada no front-end para evitar duplicatas.
            console.log('[enviarEmail] Ignorado — backend gerencia envio de alertas.');
            return false;
        }

        async function testarConectividadeEmailJS() {
            const statusElement = document.getElementById('status-emailjs');
            if (!statusElement) return;
            statusElement.innerHTML = '<i class="fa-solid fa-circle-check text-green-500 text-xs"></i> <span class="text-xs text-green-500">Gerenciado pelo servidor</span>';
            showToast('✅ Alertas por e-mail são gerenciados pelo servidor backend (Nodemailer).', 'success');
        }

        function validarCredenciaisInterface() {
            const statusElement = document.getElementById('status-credenciais');
            if (statusElement) {
                statusElement.innerHTML = '<i class="fa-solid fa-circle-check text-green-500"></i> Status: E-mail gerenciado pelo servidor';
            }
        }

        // ------------------------------------------------
        // HISTÓRICO DE ALERTAS — busca do backend e renderiza
        // ------------------------------------------------
        async function carregarHistoricoAlertas() {
            const container = document.getElementById('historico-alertas');
            if (!container) return;

            container.innerHTML = `
                <div class="flex items-center justify-center py-6 gap-3 text-slate-400">
                    <i class="fa-solid fa-circle-notch fa-spin text-ecogreen"></i>
                    <span class="text-sm">Carregando histórico...</span>
                </div>`;

            try {
                const backendUrl = ECOBOT_BACKEND_URL || window.location.origin;
                const response = await fetch(`${backendUrl}/api/alerts`);

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const alertas = await response.json();

                if (!Array.isArray(alertas) || alertas.length === 0) {
                    container.innerHTML = `
                        <div class="text-center text-slate-500 py-8">
                            <i class="fa-solid fa-inbox text-4xl mb-4 block"></i>
                            <p>Nenhum alerta registrado ainda.</p>
                        </div>`;
                    return;
                }

                const nivelClasses = {
                    critico:    { bg: 'bg-red-500/10 border-red-500/30',     badge: 'bg-red-500/20 text-red-400',     icon: 'fa-triangle-exclamation', label: 'CRÍTICO' },
                    aviso:      { bg: 'bg-yellow-500/10 border-yellow-500/30', badge: 'bg-yellow-500/20 text-yellow-400', icon: 'fa-exclamation-circle',  label: 'AVISO' },
                    offline:    { bg: 'bg-slate-500/10 border-slate-500/30',  badge: 'bg-slate-500/20 text-slate-400',  icon: 'fa-plug-circle-xmark',    label: 'OFFLINE' },
                    recuperacao:{ bg: 'bg-green-500/10 border-green-500/30',  badge: 'bg-green-500/20 text-green-400',  icon: 'fa-circle-check',         label: 'RECUPERADO' },
                    ok:         { bg: 'bg-green-500/10 border-green-500/30',  badge: 'bg-green-500/20 text-green-400',  icon: 'fa-circle-check',         label: 'OK' }
                };

                container.innerHTML = alertas.slice(0, 20).map(alerta => {
                    const cfg = nivelClasses[alerta.nivel] || nivelClasses.aviso;
                    const data = new Date(alerta.timestamp).toLocaleString('pt-BR');
                    const msgs = Array.isArray(alerta.mensagens) ? alerta.mensagens.join(' • ') : alerta.mensagens;
                    return `
                        <div class="flex gap-3 items-start p-4 rounded-xl border ${cfg.bg} transition-all">
                            <span class="flex-shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.badge}">
                                <i class="fa-solid ${cfg.icon} mr-1"></i>${cfg.label}
                            </span>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm text-white font-medium truncate">${alerta.base}</p>
                                <p class="text-xs text-slate-400 mt-0.5 leading-relaxed">${msgs}</p>
                            </div>
                            <span class="flex-shrink-0 text-[10px] text-slate-500 whitespace-nowrap">${data}</span>
                        </div>`;
                }).join('');

            } catch (err) {
                console.error('Erro ao carregar histórico de alertas:', err);
                container.innerHTML = `
                    <div class="text-center text-slate-500 py-8">
                        <i class="fa-solid fa-triangle-exclamation text-yellow-500 text-3xl mb-3 block"></i>
                        <p class="text-sm">Não foi possível carregar o histórico.</p>
                        <button type="button" onclick="carregarHistoricoAlertas()" class="mt-3 text-ecogreen text-xs underline">Tentar novamente</button>
                    </div>`;
            }
        }

        // Funções de teste de conectividade
        async function testarConectividadeTagO() {
            const statusElement = document.getElementById('status-tago');
            statusElement.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-blue-400 text-xs"></i> <span class="text-xs text-blue-400">Testando...</span>';

            if (!baseSelecionada || !baseSelecionada.token) {
                statusElement.innerHTML = '<i class="fa-solid fa-circle-xmark text-red-500 text-xs"></i> <span class="text-xs text-red-500">Token não configurado</span>';
                showToast('❌ Selecione uma base com Token TagO válido antes de testar.', 'error');
                return;
            }

            try {
                const token = baseSelecionada.token;
                const backendUrl = ECOBOT_BACKEND_URL || (window.location.protocol === 'file:' ? 'http://localhost:8080' : window.location.origin);
                const proxyUrl = `${backendUrl}/api/test-tago?token=${encodeURIComponent(token)}&qty=1`;
                const directUrl = `https://api.tago.io/data?qty=1`;

                const fetchWithHeaders = async (url, useDirect = false) => {
                    const headers = useDirect
                        ? { 'Content-Type': 'application/json', 'Device-Token': token }
                        : { 'Content-Type': 'application/json' };
                    const response = await fetch(url, {
                        method: 'GET',
                        mode: 'cors',
                        cache: 'no-store',
                        headers
                    });
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    return response;
                };

                let response;
                try {
                    response = await fetchWithHeaders(proxyUrl, false);
                } catch (proxyError) {
                    console.warn('Proxy TagO falhou, tentando acesso direto:', proxyError.message);
                    response = await fetchWithHeaders(directUrl, true);
                }

                if (response.ok) {
                    statusElement.innerHTML = '<i class="fa-solid fa-circle-check text-green-500 text-xs"></i> <span class="text-xs text-green-500">Conectado</span>';
                    showToast('✅ API TagO funcionando corretamente', 'success');
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (err) {
                console.error('Erro na conectividade TagO:', err);
                statusElement.innerHTML = '<i class="fa-solid fa-circle-xmark text-red-500 text-xs"></i> <span class="text-xs text-red-500">Erro</span>';
                const errorMsg = err.message.includes('Failed to fetch') ?
                    '❌ CORS ou rede bloqueada. Execute em servidor local (ex: Live Server) ou use o servidor backend.' :
                    '❌ Erro na conexão com API TagO';
                showToast(errorMsg, 'error');
            }
        }

        // Função para atualizar o semáforo climático
        function atualizarSemaforo() {
            try {
                const getLast = (arr) => {
                    if (!arr || !Array.isArray(arr) || arr.length === 0) return null;
                    const safeParse = (val) => {
                        if (val === null || val === undefined) return null;
                        const num = parseFloat(String(val).replace(',', '.').trim());
                        return isNaN(num) ? null : num;
                    };
                    return safeParse(arr[arr.length - 1].value);
                };

                const temp = window.dadosAtuais ? getLast(window.dadosAtuais.temp) : null;
                const umi = window.dadosAtuais ? getLast(window.dadosAtuais.umi) : null;
                const gas = window.dadosAtuais ? getLast(window.dadosAtuais.gas) : null;

                const tempText = temp !== null ? temp : document.getElementById('temp').textContent.trim();
                const umiText = umi !== null ? umi : document.getElementById('umi').textContent.trim();
                const gasText = gas !== null ? gas : document.getElementById('gas').textContent.trim();

                const tempVal = (typeof temp === 'number') ? temp : (tempText !== '--' && tempText !== '') ? parseFloat(String(tempText).replace(',', '.')) : null;
                const umiVal = (typeof umi === 'number') ? umi : (umiText !== '--' && umiText !== '') ? parseFloat(String(umiText).replace(',', '.')) : null;
                const gasVal = (typeof gas === 'number') ? gas : (gasText !== '--' && gasText !== '') ? parseFloat(String(gasText).replace(',', '.')) : null;

                const semaforoVerde = document.getElementById('semaforo-verde');
                const semaforoAmarelo = document.getElementById('semaforo-amarelo');
                const semaforoVermelho = document.getElementById('semaforo-vermelho');
                const status = document.getElementById('semaforo-status');

                if (!semaforoVerde || !semaforoAmarelo || !semaforoVermelho || !status) return;

                // Reset das animações
                semaforoVerde.classList.remove('eco-pulse');
                semaforoAmarelo.classList.remove('eco-pulse');
                semaforoVermelho.classList.remove('eco-pulse');

                // === CONDIÇÕES ATUALIZADAS ===
                const baseNomeSemaforo = baseSelecionada ? baseSelecionada.nome : 'Desconhecida';
                const riscoQueimadaAtivo = tempVal !== null && umiVal !== null && tempVal >= 32 && umiVal <= 40;
                const mensagemQueimada = `⚠️ ALERTA DE RISCO DE QUEIMADA: Temperatura ${tempVal !== null ? `${tempVal}°C` : 'N/D'} e umidade ${umiVal !== null ? `${umiVal}%` : 'N/D'}. Condições secas para fogo.`;

                if ((tempVal !== null && tempVal > 35) || (gasVal !== null && gasVal > 10) || (umiVal !== null && umiVal < 30)) {
                    semaforoVermelho.classList.add('eco-pulse');
                    status.textContent = '🚨 Condições críticas detectadas!';
                    status.style.color = '#ef4444';

                    // Enviar alertas para condições críticas
                    if (tempVal !== null && tempVal > 35) {
                        const mensagemTemp = `🚨 ALERTA CRÍTICO: Temperatura muito elevada!\nValor atual: ${tempVal}°C\nLimite: 35°C`;
                        enviarAlerta('temp', mensagemTemp, baseNomeSemaforo, tempVal);
                    }
                    if (gasVal !== null && gasVal > 10) {
                        const mensagemGas = `🚨 ALERTA CRÍTICO: Nível de gás muito elevado!\nValor atual: ${gasVal}%\nLimite: 10%`;
                        enviarAlerta('gas', mensagemGas, baseNomeSemaforo, gasVal);
                    }
                    if (umiVal !== null && umiVal < 30) {
                        const mensagemUmi = `🚨 ALERTA CRÍTICO: Umidade muito baixa!\nValor atual: ${umiVal}%\nLimite mínimo: 30%`;
                        enviarAlerta('umi', mensagemUmi, baseNomeSemaforo, umiVal);
                    }
                    if (riscoQueimadaAtivo) {
                        enviarAlerta('queimada', mensagemQueimada, baseNomeSemaforo, `${tempVal}/${umiVal}`);
                    }
                }
                else if ((tempVal !== null && tempVal > 30) || (gasVal !== null && gasVal > 5) || (umiVal !== null && umiVal < 40) || riscoQueimadaAtivo) {
                    semaforoAmarelo.classList.add('eco-pulse');
                    status.textContent = '⚠️ Atenção - Monitore os níveis ambientais';
                    status.style.color = '#f59e0b';

                    // Enviar alertas para condições de atenção (apenas uma vez por sessão)
                    const alertaKey = `alerta_${new Date().toDateString()}`;
                    if (!sessionStorage.getItem(alertaKey)) {
                        if (gasVal !== null && gasVal > 5) {
                            const mensagemGas = `⚠️ ALERTA: Nível de gás elevado detectado\nValor atual: ${gasVal}%\nLimite de atenção: 5%`;
                            enviarAlerta('gas', mensagemGas, baseNomeSemaforo, gasVal);
                        }
                        if (riscoQueimadaAtivo) {
                            enviarAlerta('queimada', mensagemQueimada, baseNomeSemaforo, `${tempVal}/${umiVal}`);
                        }
                        sessionStorage.setItem(alertaKey, 'sent');
                    }
                }
                else if (tempVal !== null || umiVal !== null || gasVal !== null) {
                    semaforoVerde.classList.add('eco-pulse');
                    status.textContent = '✅ Condições ambientais ideais';
                    status.style.color = '#10b981';
                } else {
                    status.textContent = '📊 Aguardando dados dos sensores...';
                    status.style.color = '#64748b';
                }

            } catch (err) {
                console.error('Erro ao atualizar semáforo:', err);
            }
        }

        // Função para salvar configurações de alertas
        function salvarConfiguracoesAlertas() {
            const usarEmail = document.getElementById('usar-email').checked;
            const email = document.getElementById('email-alerta').value.trim();

            if (usarEmail && !email) {
                showToast('⚠️ Informe um e-mail para receber os alertas.', 'warning');
                return;
            }

            // Recolher configuração de alertas
            const alertas = {};
            const tiposAlertas = ['temp', 'gas', 'umi', 'queimada'];

            tiposAlertas.forEach(tipo => {
                const checkbox = document.getElementById(`ativar-${tipo}`);
                if (checkbox && checkbox.checked) {
                    const canais = [];
                    const canaisCheckboxes = document.querySelectorAll(`.alerta-canal[data-alerta="${tipo}"]`);
                    canaisCheckboxes.forEach(cb => {
                        if (cb.checked) {
                            canais.push(cb.getAttribute('data-canal'));
                        }
                    });

                    if (usarEmail && canais.length === 0) {
                        canais.push('email');
                    }

                    if (canais.length > 0) {
                        alertas[tipo] = canais;
                    }
                }
            });

            // Verificar se pelo menos um alerta foi configurado
            if (Object.keys(alertas).length === 0) {
                const warningMsg = idiomaAtual === 'pt'
                    ? 'Por favor, ative pelo menos um alerta e escolha um canal de contato.'
                    : idiomaAtual === 'es'
                        ? 'Por favor, active al menos una alerta y elija un canal de contacto.'
                        : 'Please enable at least one alert and choose a contact channel.';
                showToast(warningMsg, 'warning');
                return;
            }

            // Salvar no localStorage
            try {
                const configAlertas = {
                    email: usarEmail ? email : null,
                    alertas: alertas,
                    dataSave: new Date().toLocaleString('pt-BR')
                };

                localStorage.setItem('ecobot-alertas-config', JSON.stringify(configAlertas));

                const successMsg = idiomaAtual === 'pt'
                    ? '✅ Todas as configurações de alertas foram salvas com sucesso!'
                    : idiomaAtual === 'es'
                        ? '✅ ¡Todas las configuraciones de alertas se han guardado con éxito!'
                        : '✅ All alert settings have been saved successfully!';
                showToast(successMsg, 'success');

                // Create particles effect on the save button
                const saveButton = document.querySelector('button[onclick="salvarConfiguracoesAlertas()"]');
                if (saveButton) {
                    createParticles(saveButton);
                }

                // Carregar configuração salva para confirmar
                carregarConfiguracoesAlertas();
            } catch (err) {
                const errorMsg = idiomaAtual === 'pt'
                    ? 'Erro ao salvar configurações.'
                    : 'Error saving settings.';
                console.error('Erro ao salvar alertas:', err);
                showToast(errorMsg, 'error');
            }
        }

        function carregarConfiguracoesAlertas() {
            try {
                const config = localStorage.getItem('ecobot-alertas-config');
                if (!config) return;

                const configParsed = JSON.parse(config);

                // Restaurar campos de contato
                if (configParsed.email) {
                    document.getElementById('usar-email').checked = true;
                    document.getElementById('email-alerta').value = configParsed.email;
                }

                // Restaurar alertas e canais
                if (configParsed.alertas) {
                    Object.keys(configParsed.alertas).forEach(tipo => {
                        const checkbox = document.getElementById(`ativar-${tipo}`);
                        if (checkbox) {
                            checkbox.checked = true;
                            const canais = configParsed.alertas[tipo];

                            canais.forEach(canal => {
                                const canalCheckbox = document.querySelector(`.alerta-canal[data-alerta="${tipo}"][data-canal="${canal}"]`);
                                if (canalCheckbox) {
                                    canalCheckbox.checked = true;
                                }
                            });
                        }
                    });
                }

                atualizarCamposAlertas();
                atualizarAlertas();
            } catch (err) {
                console.error('Erro ao carregar configurações de alertas:', err);
            }
        }

        // Função para carregar credenciais EmailJS do localStorage
        function carregarCredenciaisInterface() {
            carregarCredenciaisEmailJS();
        }

        // Toast Notification Functions
        function showToast(message, type = 'success', duration = 5000) {
            const toastContainer = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;

            const icon = type === 'success' ? 'fa-check-circle' :
                type === 'error' ? 'fa-exclamation-circle' :
                    'fa-exclamation-triangle';

            toast.innerHTML = `
                <div class="flex items-center">
                    <i class="fas ${icon} icon"></i>
                    <span class="flex-1">${message}</span>
                    <button type="button" class="close-btn" title="Fechar aviso" aria-label="Fechar aviso" onclick="this.parentElement.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;

            toastContainer.appendChild(toast);

            // Trigger animation
            setTimeout(() => toast.classList.add('show'), 10);

            // Auto remove
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 500);
            }, duration);
        }

        function createParticles(element) {
            const particlesContainer = document.createElement('div');
            particlesContainer.className = 'particles';
            element.appendChild(particlesContainer);

            for (let i = 0; i < 20; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.animationDelay = Math.random() * 2 + 's';
                particlesContainer.appendChild(particle);
            }

            setTimeout(() => particlesContainer.remove(), 3000);
        }

        // Checkbox customizado e inicialização dos filtros
        document.addEventListener('DOMContentLoaded', function () {
            // Inicializar campos de alertas e EmailJS
            carregarCredenciaisInterface();
            atualizarCamposAlertas();
            atualizarAlertas();

            // Botões de filtro do gráfico - REMOVIDOS
            // const btnTodos = document.getElementById('btn-grafico-todos');
            // const btnTemp = document.getElementById('btn-grafico-temp');
            // const btnUmi = document.getElementById('btn-grafico-umi');
            // const btnGas = document.getElementById('btn-grafico-gas');

            // if (btnTodos && btnTemp && btnUmi && btnGas) {
            const closeAlertaGas = document.getElementById('close-alerta-gas');
            if (closeAlertaGas) {
                closeAlertaGas.addEventListener('click', () => {
                    const alertaGas = document.getElementById('alerta-gas');
                    if (alertaGas) {
                        alertaGas.classList.add('hidden');
                        alertaGas.classList.remove('animate-pulse');
                    }
                });
            }
            // }
        });

        // Chamar atualizarSemaforo quando os dados são atualizados
        // Interceptar a função sincronizarTago para chamar atualizarSemaforo após atualização
        const _sincronizarTago = sincronizarTago;
        window.sincronizarTago = async function () {
            try {
                await _sincronizarTago.call(this);
                setTimeout(() => {
                    atualizarSemaforo();
                }, 200);
            } catch (err) {
                console.error('Erro na sincronização:', err);
            }
        };

        // Também chamar o semáforo na inicialização
        setTimeout(() => {
            atualizarSemaforo();
        }, 1000);
        // Função para inscrever e-mail no servidor de alertas (backend /subscribe)
        async function subscreverAlertas() {
            const emailInput = document.getElementById("email_input");
            const email = emailInput ? emailInput.value.trim() : '';

            if (!email || !email.includes("@")) {
                showToast('Por favor, insira um e-mail válido!', 'warning');
                return;
            }

            const backendUrl = ECOBOT_BACKEND_URL || window.location.origin;

            try {
                // Usar AbortController para timeout customizado (60 segundos)
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 60000);

                const response = await fetch(`${backendUrl}/subscribe`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                    signal: controller.signal
                });

                clearTimeout(timeout);
                const texto = await response.text();

                if (response.ok) {
                    showToast(`✅ ${texto}`, 'success');
                    if (emailInput) emailInput.value = '';
                } else if (response.status === 409) {
                    showToast('ℹ️ Este e-mail já está inscrito na lista de alertas.', 'warning');
                } else {
                    showToast(`❌ Erro: ${texto}`, 'error');
                }
            } catch (erro) {
                console.error('Erro ao inscrever no backend:', erro);
                if (erro.name === 'AbortError') {
                    showToast('⏱️ Requisição expirou. Servidor pode estar lento. Tente novamente.', 'error');
                } else {
                    showToast('❌ Não foi possível conectar ao servidor. Verifique a conexão.', 'error');
                }
            }
        }
