/// Estado global da aplicação
let allData = [];
let filteredData = [];
let employeeData = []; // Dados dos funcionários ativos
let movementHistory = []; // Histórico de movimentações
let notasAvaliacaoData = []; // Dados de autoavaliação vs avaliação do gestor
let notasAVD2024 = []; // Notas de 2024 para comparação
let desenvolvimentoData = {}; // Dados de desenvolvimento por colaborador (cache)
let manualOverrides = {}; // Armazena mudanças manuais de quadrante: { nomeCompleto: 'posição' }
let mesaCalibracaoData = []; // Dados da mesa de calibração
const STORAGE_KEY = 'ninebox_manual_overrides';
let compactView = false; // Estado de visão compacta
let spinnerKeyframesInjected = false; // Fallback para animação do spinner

// Configuração da API - detecta ambiente automaticamente
const API_BASE_URL = (function() {
    // Se config.js foi carregado, usa a configuração dinâmica
    if (typeof window.ENV_CONFIG !== 'undefined') {
        return window.ENV_CONFIG.getApiUrl();
    }
    // Fallback para desenvolvimento local
    return 'http://localhost:8000/api';
})();

// Configuração da API
let config = {
    fatorDesempenho: 0,
    fatorPotencial: 0,
    quadrantes: {
        '1-1': { titulo: 'Enigma', eixoX: 'Atende parcialmente', eixoY: 'Supera a expectativa', corQuadrante: '#5DADE2', corTitulo: '#000000' },
        '1-2': { titulo: 'Forte Desempenho', eixoX: 'Atende dentro da expectativa', eixoY: 'Supera a expectativa', corQuadrante: '#58D68D', corTitulo: '#000000' },
        '1-3': { titulo: 'Alto Potencial', eixoX: 'Supera a expectativa', eixoY: 'Supera a expectativa', corQuadrante: '#27AE60', corTitulo: '#000000' },
        '2-1': { titulo: 'Questionável', eixoX: 'Atende parcialmente', eixoY: 'Atende dentro da expectativa', corQuadrante: '#F39C12', corTitulo: '#000000' },
        '2-2': { titulo: 'Mantenedor', eixoX: 'Atende dentro da expectativa', eixoY: 'Atende dentro da expectativa', corQuadrante: '#5DADE2', corTitulo: '#000000' },
        '2-3': { titulo: 'Forte Desempenho', eixoX: 'Supera a expectativa', eixoY: 'Atende dentro da expectativa', corQuadrante: '#58D68D', corTitulo: '#000000' },
        '3-1': { titulo: 'Insuficiente', eixoX: 'Atende parcialmente', eixoY: 'Atende parcialmente', corQuadrante: '#E74C3C', corTitulo: '#000000' },
        '3-2': { titulo: 'Eficaz', eixoX: 'Atende dentro da expectativa', eixoY: 'Atende parcialmente', corQuadrante: '#F39C12', corTitulo: '#000000' },
        '3-3': { titulo: 'Comprometido', eixoX: 'Supera a expectativa', eixoY: 'Atende parcialmente', corQuadrante: '#5DADE2', corTitulo: '#000000' }
    }
};

// Mapeamento de classificações para níveis
const classificacaoMap = {
    'Atende parcialmente': 1,
    'Atende dentro da expectativa': 2,
    'Supera a expectativa': 3
};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Guard de autenticação simples (somente para páginas que carregam app.js)
    try {
        const auth = localStorage.getItem('auth_user');
        if (!auth) {
            // Evitar loop quando página é aberta diretamente fora do servidor
            if (!location.pathname.endsWith('index.html')) {
                window.location.href = 'index.html';
                return;
            }
        }
    } catch {}

    loadConfigTable();

    // Event listeners para botões de exportação e reset
    const exportBtn = document.getElementById('exportCSVBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportModifiedCSV);
    }
    
    const resetBtn = document.getElementById('resetPositionsBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetManualChanges);
    }
    
    // Carregar mudanças salvas do localStorage
    loadChangesFromLocalStorage();
    
    // Inicializar contador
    updateChangesCounter();
    
    // Carregar dados do Supabase automaticamente
    loadDataFromSupabase();

    // Toggle visão compacta
    const compactBtn = document.getElementById('toggleCompactBtn');
    if (compactBtn) {
        compactBtn.addEventListener('click', () => toggleCompactView());
    }
});

// ===== Loader helpers =====
function showLoader(message = 'Carregando dados...') {
    const overlay = document.getElementById('appLoader');
    if (overlay) {
        // Fallback robusto: aplicar estilos críticos inline para evitar falhas caso o CSS não seja interpretado
        overlay.style.position = 'fixed';
        overlay.style.inset = '0px';
        overlay.style.zIndex = '2000';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.background = 'rgba(0, 23, 70, 0.35)';
        overlay.style.fontFamily = (getComputedStyle(document.body).fontFamily || "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif");
        // Alguns navegadores ignoram backdrop-filter sem prefixo
        overlay.style.backdropFilter = 'blur(6px)';
        overlay.style.webkitBackdropFilter = 'blur(6px)';

        // Estilizar cartão caso o CSS global falhe
        const card = overlay.querySelector('.loader-card');
        if (card) {
            card.style.background = 'rgba(255,255,255,0.95)';
            card.style.border = '1px solid rgba(0,55,151,0.18)';
            card.style.borderRadius = '16px';
            card.style.padding = '22px 26px';
            card.style.width = 'min(420px, 92vw)';
            card.style.textAlign = 'center';
            card.style.boxShadow = '0 14px 40px rgba(0,0,0,0.18)';
        }

        // Garantir tamanho da logo
        const logo = overlay.querySelector('.loader-logo');
        if (logo) {
            logo.style.height = '60px';
            logo.style.width = 'auto';
            logo.style.maxWidth = '80%';
        }

        // Garantir visual do spinner
        const spinner = overlay.querySelector('.loader-spinner');
        if (spinner) {
            spinner.style.width = '54px';
            spinner.style.height = '54px';
            spinner.style.margin = '10px auto 12px';
            spinner.style.borderRadius = '50%';
            spinner.style.border = '4px solid rgba(0, 55, 151, 0.15)';
            spinner.style.borderTopColor = '#003797';
            spinner.style.animation = 'spin 1s linear infinite';

            // Injetar @keyframes caso o CSS não tenha sido processado
            if (!spinnerKeyframesInjected) {
                const styleTag = document.createElement('style');
                styleTag.setAttribute('data-loader-spin', '');
                styleTag.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
                document.head.appendChild(styleTag);
                spinnerKeyframesInjected = true;
            }
        }

        overlay.classList.add('active');
        updateLoader(message);
    }
}

function updateLoader(message) {
    const msgEl = document.getElementById('loaderMessage');
    if (msgEl && typeof message === 'string') {
        msgEl.textContent = message;
    }
}

function hideLoader() {
    const overlay = document.getElementById('appLoader');
    if (overlay) {
        overlay.classList.remove('active');
        overlay.style.display = 'none';
    }
}

// Toggle visão compacta
function toggleCompactView() {
    compactView = !compactView;
    const btn = document.getElementById('toggleCompactBtn');
    if (btn) btn.setAttribute('aria-pressed', compactView ? 'true' : 'false');

    // Re-render usando o caminho que respeita overrides quando existirem
    const hasOverrides = Object.keys(manualOverrides || {}).length > 0;
    if (hasOverrides) {
        updateNineBoxWithOverrides();
    } else {
        updateNineBox();
    }
}

// Expandir/retrair seções colapsáveis do card de desenvolvimento
function toggleSection(sectionId) {
    const el = document.getElementById(sectionId);
    if (el) {
        el.classList.toggle('collapsed');
    }
}

// Utilitário: normalizar texto para comparações robustas (remove acentos, espaços extras e padroniza maiúsculas)
function normalizeText(str) {
    if (!str && str !== 0) return '';
    try {
        return str
            .toString()
            .normalize('NFD') // separa acentos
            .replace(/[\u0300-\u036f]/g, '') // remove marcas de acento
            .replace(/[^A-Z0-9\s]/gi, ' ') // troca pontuação incomum por espaço
            .trim()
            .replace(/\s+/g, ' ') // colapsa múltiplos espaços
            .toUpperCase();
    } catch {
        // Fallback simples caso normalize não esteja disponível
        return (str + '').trim().replace(/\s+/g, ' ').toUpperCase();
    }
}

// Carregar dados do Supabase
async function loadDataFromSupabase() {
    try {
        showLoader('Conectando ao servidor...');
        console.log('🔄 Conectando ao Supabase...');
        
        // Verificar se a API está online
        const healthResponse = await fetch(`${API_BASE_URL}/health`);
        if (!healthResponse.ok) {
            throw new Error('API não está respondendo. Certifique-se de que o servidor Python está rodando.');
        }
        
        // Carregar avaliações
        console.log('📊 Carregando avaliações...');
    updateLoader('Carregando avaliações...');
    const avaliacoesResponse = await fetch(`${API_BASE_URL}/avaliacoes`);
        const avaliacoesData = await avaliacoesResponse.json();
        
        if (avaliacoesData.data && avaliacoesData.data.length > 0) {
            parseSupabaseData(avaliacoesData.data);
            console.log(`✓ ${allData.length} avaliações carregadas`);
        }
        
        // Carregar funcionários (com paginação no frontend, caso o backend limite a 1000)
    console.log('👥 Carregando funcionários...');
    updateLoader('Carregando funcionários...');
        employeeData = await fetchAllPaged(`${API_BASE_URL}/funcionarios`, 1000, {
            uniqueKeyCandidates: ['cpf', 'CPF', 'registro', 'Registro', 'chapa', 'chapa']
        });
        if (employeeData.length > 0) {
            populateEmployeeFilters();
            console.log(`✓ ${employeeData.length} funcionários carregados (paginado)`);
            console.log('📋 Exemplo de funcionário:', employeeData[0]);
            console.log('🔑 Chaves disponíveis:', Object.keys(employeeData[0]));
        } else {
            console.warn('⚠️ Nenhum funcionário recebido.');
        }
        
        // Carregar notas por avaliação
    console.log('📝 Carregando notas por avaliação...');
    updateLoader('Carregando notas por avaliação...');
        const notasResponse = await fetch(`${API_BASE_URL}/notas-avaliacao`);
        const notasData = await notasResponse.json();
        
        if (notasData.data && notasData.data.length > 0) {
            notasAvaliacaoData = notasData.data;
            console.log(`✓ ${notasAvaliacaoData.length} notas por avaliação carregadas`);
        }
        
        // Carregar movimentações (também pode ser cortado em 1000)
    console.log('📅 Carregando histórico de movimentações...');
    updateLoader('Carregando movimentações...');
        movementHistory = await fetchAllPaged(`${API_BASE_URL}/movimentacoes`, 1000, {
            uniqueKeyCandidates: ['NOME','nome','CPF','cpf','DTMUDANCA_FUNCAO','DTMUDANCA_SALARIO','DTMUDANCA_SECAO']
        });
        console.log(`✓ ${movementHistory.length} movimentações carregadas (paginado)`);
        
        // Carregar notas AVD 2024
    console.log('📊 Carregando notas de 2024...');
    updateLoader('Carregando notas de 2024...');
        const notas2024Response = await fetch(`${API_BASE_URL}/nota-avd-2024`);
        const notas2024Data = await notas2024Response.json();
        
        if (notas2024Data.data && notas2024Data.data.length > 0) {
            notasAVD2024 = notas2024Data.data;
            console.log(`✓ ${notasAVD2024.length} notas de 2024 carregadas`);
        }

        // Carregar mesa de calibração
    console.log('🪑 Carregando mesa de calibração...');
    updateLoader('Carregando mesa de calibração...');
        try {
            const mesaResponse = await fetch(`${API_BASE_URL}/mesa-calibracao`);
            if (mesaResponse.ok) {
                const mesaData = await mesaResponse.json();
                if (mesaData.data && mesaData.data.length > 0) {
                    mesaCalibracaoData = mesaData.data;
                    console.log(`✓ ${mesaCalibracaoData.length} registros de mesa de calibração carregados`);
                    populateMesaFilter();
                } else {
                    console.warn('Mesa de calibração retornou vazio.');
                }
            } else {
                console.warn('Endpoint mesa-calibracao não disponível.');
            }
        } catch (e) {
            console.warn('Falha ao carregar mesa de calibração:', e.message);
        }
        
        // Preencher filtros
        populateFilters();
        
        // IMPORTANTE: Inicializar os dados filtrados
        filteredData = [...allData];
        
        // Renderizar o NineBox automaticamente com os dados carregados
        updateLoader('Renderizando NineBox...');
        console.log('🎨 Renderizando NineBox...');
        updateNineBox();
        updateDashboard();
        
        console.log('✅ Dados carregados e NineBox renderizado!');
        console.log(`📊 Total: ${allData.length} avaliações | ${employeeData.length} funcionários`);
        hideLoader();
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        hideLoader();
        // Remover alerta modal intrusivo; usar notificação discreta
        showNotification('error', 'Erro ao carregar dados', `${error.message}`);
    }
}

// Helper: busca paginada no endpoint adicionando limit/offset; de-duplica por chaves candidatas
async function fetchAllPaged(baseUrl, pageSize = 1000, options = {}) {
    const { uniqueKeyCandidates = [] } = options;
    let offset = 0;
    let page = 0;
    let all = [];
    let seen = new Set();

    // Utilitário para gerar uma chave única razoável para deduplicação
    const makeKey = (obj) => {
        for (const k of uniqueKeyCandidates) {
            if (obj && obj[k] !== undefined && obj[k] !== null && `${obj[k]}`.trim() !== '') {
                return `${k}:${obj[k]}`;
            }
        }
        // Fallback: hash simplista via JSON parcial
        try {
            const subset = {};
            const keys = Object.keys(obj || {}).slice(0, 5);
            keys.forEach(k => subset[k] = obj[k]);
            return JSON.stringify(subset);
        } catch {
            return Math.random().toString(36).slice(2);
        }
    };

    while (true) {
        const joiner = baseUrl.includes('?') ? '&' : '?';
        const url = `${baseUrl}${joiner}limit=${pageSize}&offset=${offset}`;
        if (page === 0) {
            console.log(`↗️ Solicitando página ${page + 1} (${offset}-${offset + pageSize - 1}) de ${baseUrl}`);
        } else {
            console.log(`↗️ Página ${page + 1} (${offset}-${offset + pageSize - 1})`);
        }
        const resp = await fetch(url);
        if (!resp.ok) {
            console.warn(`⚠️ Falha ao buscar página ${page + 1}: ${resp.status}`);
            break;
        }
        let json;
        try {
            json = await resp.json();
        } catch (e) {
            console.warn('⚠️ Resposta não-JSON para paginação.', e);
            break;
        }

        const dataPage = json?.data || [];
        if (!Array.isArray(dataPage)) {
            console.warn('⚠️ Formato inesperado (sem data array). Encerrando paginação.');
            break;
        }

        // Se o backend ignorar os parâmetros, a segunda página pode repetir a primeira; detecte e pare
        const beforeLen = all.length;
        for (const row of dataPage) {
            const key = makeKey(row);
            if (!seen.has(key)) {
                seen.add(key);
                all.push(row);
            }
        }

        console.log(`⬇️ Página ${page + 1}: recebidos ${dataPage.length}, acumulado ${all.length}`);

        if (dataPage.length < pageSize) {
            // última página
            break;
        }
        if (all.length === beforeLen) {
            // nada novo entrou; provavelmente o backend não suporta offset
            console.warn('⚠️ Nenhum novo registro após tentativa de paginação. Backend pode estar ignorando limit/offset.');
            break;
        }

        page += 1;
        offset += pageSize;

        // Segurança: evitar loops excessivos
        if (page > 200) {
            console.warn('⚠️ Interrompido por segurança após 200 páginas.');
            break;
        }
    }

    if (all.length > 0 && all.length % pageSize === 0) {
        console.log('ℹ️ Se ainda espera mais registros, é recomendável habilitar paginação no backend (limit/offset ou range).');
    }

    return all;
}

// Parsear dados do Supabase (formato já é JSON)
function parseSupabaseData(data) {
    console.log('🔍 Parseando dados do Supabase...');
    console.log('📦 Amostra do primeiro registro:', data[0]);
    
    allData = data.map(row => {
        // Converter nomes das colunas do Supabase para o formato esperado pela aplicação
        // Nota: As colunas no Supabase são em minúsculas com underscores
        const mapped = {
            'Área': row.área || '',
            'Formulário': row.formulário || '',
            'Usuário Avaliado': row.usuário_avaliado || '',
            'Avaliado': row.avaliado || row.usuário_avaliado || '', // Usar avaliado, fallback para usuário_avaliado
            'Documento de Identificação': row.documento_de_identificação || '',
            'Login do Avaliado': row.login_do_avaliado || '',
            'Nota Calculada Desempenho': parseFloat(row.nota_calculada_desempenho) || 0,
            'Classificação Calculada Desempenho': row.classificação_calculada_desempenho || '',
            'Nota Calculada Potencial': parseFloat(row.nota_calculada_potencial) || 0,
            'Classificação Calculada Potencial': row.classificação_calculada_potencial || '',
            'Nota Final Desempenho': parseFloat(row.nota_final_desempenho) || 0,
            'Classificação Final Desempenho': row.classificação_final_desempenho || '',
            'Nota Final Potencial': parseFloat(row.nota_final_potencial) || 0,
            'Classificação Final Potencial': row.classificação_final_potencial || '',
            'Login do Avaliador': row.login_do_avaliador || '',
            'Avaliador': row.avaliador || ''
        };
        return mapped;
    });
    
    console.log(`✅ ${allData.length} registros parseados do Supabase`);
    console.log('📊 Primeiro registro mapeado:', allData[0]);
    console.log('🎯 Campos importantes:', {
        'Usuário Avaliado': allData[0]['Usuário Avaliado'],
        'Avaliado': allData[0]['Avaliado'],
        'Nota Final Desempenho': allData[0]['Nota Final Desempenho'],
        'Classificação Final Desempenho': allData[0]['Classificação Final Desempenho'],
        'Nota Final Potencial': allData[0]['Nota Final Potencial'],
        'Classificação Final Potencial': allData[0]['Classificação Final Potencial']
    });
}

// Tentar carregamento automático (LEGADO - substituído por loadDataFromSupabase)
async function tryAutoLoad() {
    // Esta função agora é um fallback vazio
    // O carregamento é feito via loadDataFromSupabase()
    console.log('Carregamento via Supabase ativado');
}

// Handler para upload de arquivo de avaliações
function handleAvaliacoesUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('fileNameAvaliacoes').textContent = `Arquivo: ${file.name}`;

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        parseCSV(content);
        updateLoadStatus('avaliacoes', true, allData.length);
    };
    reader.onerror = function() {
        updateLoadStatus('avaliacoes', false, 0);
    };
    reader.readAsText(file, 'UTF-8');
}

// Handler para upload de arquivo de funcionários
function handleFuncionariosUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('fileNameFuncionarios').textContent = `Arquivo: ${file.name}`;

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        parseEmployeeCSV(content);
        updateLoadStatus('funcionarios', true, employeeData.length);
    };
    reader.onerror = function() {
        updateLoadStatus('funcionarios', false, 0);
    };
    reader.readAsText(file, 'UTF-8');
}

// Handler para upload de arquivo de notas por avaliação
function handleNotasAvaliacaoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileNameElement = document.getElementById('fileNameNotasAvaliacao');
    if (fileNameElement) {
        fileNameElement.textContent = `Arquivo: ${file.name}`;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        parseNotasAvaliacaoCSV(content);
        console.log('Notas por avaliação carregadas:', notasAvaliacaoData.length);
    };
    reader.onerror = function() {
        console.error('Erro ao carregar notas por avaliação');
    };
    reader.readAsText(file, 'UTF-8');
}

// Handler para upload de arquivo de movimentações
function handleMovimentacoesUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileNameElement = document.getElementById('fileNameMovimentacoes');
    if (fileNameElement) {
        fileNameElement.textContent = `Arquivo: ${file.name}`;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        parseMovementCSV(content);
        console.log('Histórico de movimentações carregado:', movementHistory.length);
    };
    reader.onerror = function() {
        console.error('Erro ao carregar histórico de movimentações');
    };
    reader.readAsText(file, 'UTF-8');
}

// Atualizar status de carregamento
function updateLoadStatus(tipo, sucesso, registros) {
    const loadStatus = document.getElementById('loadStatus');
    const infoBox = loadStatus.parentElement;
    
    let avaliacoesOk = allData.length > 0;
    let funcionariosOk = employeeData.length > 0;
    
    if (avaliacoesOk && funcionariosOk) {
        loadStatus.innerHTML = `<strong>Todos os arquivos carregados!</strong><br>
            Avaliações: ${allData.length} registros | Funcionários: ${employeeData.length} registros`;
        infoBox.style.background = '#d4edda';
        infoBox.style.borderColor = '#28a745';
        loadStatus.style.color = '#155724';
    } else if (avaliacoesOk) {
        loadStatus.innerHTML = `<strong>Arquivo de avaliações carregado!</strong> ${allData.length} registros.<br>
            <em>Aguardando arquivo de funcionários para dados completos...</em>`;
        infoBox.style.background = '#fff3cd';
        infoBox.style.borderColor = '#ffc107';
        loadStatus.style.color = '#856404';
    } else if (funcionariosOk) {
        loadStatus.innerHTML = `<strong>Arquivo de funcionários carregado!</strong> ${employeeData.length} registros.<br>
            <em>Aguardando arquivo de avaliações...</em>`;
        infoBox.style.background = '#fff3cd';
        infoBox.style.borderColor = '#ffc107';
        loadStatus.style.color = '#856404';
    } else {
        loadStatus.innerHTML = 'Aguardando upload dos arquivos CSV...';
        infoBox.style.background = '#e3f2fd';
        infoBox.style.borderColor = '#003797';
        loadStatus.style.color = '#003797';
    }
    
    if (!sucesso && tipo) {
        loadStatus.innerHTML = `<strong>Erro ao carregar arquivo de ${tipo}.</strong> Tente novamente.`;
        infoBox.style.background = '#f8d7da';
        infoBox.style.borderColor = '#dc3545';
        loadStatus.style.color = '#721c24';
    }
}

// Carregar CSV automaticamente (LEGADO - mantido para compatibilidade)
async function autoLoadCSV() {
    const loadStatus = document.getElementById('loadStatus');
    
    try {
        loadStatus.textContent = 'Carregando arquivo_consolidado.csv...';
        
        const response = await fetch('../arquivo_consolidado.csv');
        
        if (!response.ok) {
            throw new Error('Arquivo não encontrado');
        }
        
        const content = await response.text();
        parseCSV(content);
        
        loadStatus.innerHTML = '<strong>Arquivo carregado com sucesso!</strong> ' + allData.length + ' registros encontrados.';
        loadStatus.parentElement.style.background = '#d4edda';
        loadStatus.parentElement.style.borderColor = '#28a745';
        loadStatus.style.color = '#155724';
        
    } catch (error) {
        console.error('Erro ao carregar CSV:', error);
        loadStatus.innerHTML = '<strong>Erro ao carregar arquivo.</strong> Certifique-se de que o arquivo arquivo_consolidado.csv está na pasta correta.';
        loadStatus.parentElement.style.background = '#f8d7da';
        loadStatus.parentElement.style.borderColor = '#dc3545';
        loadStatus.style.color = '#721c24';
    }
}

// Carregar dados dos funcionários ativos (LEGADO - mantido para compatibilidade)
async function autoLoadEmployeeData() {
    try {
        console.log('Carregando dados de funcionários ativos...');
        
        const response = await fetch('2025_09_30_relação_ativos.csv');
        
        if (!response.ok) {
            throw new Error('Arquivo de funcionários não encontrado');
        }
        
        const content = await response.text();
        parseEmployeeCSV(content);
        
        console.log(`${employeeData.length} registros de funcionários carregados`);
        
    } catch (error) {
        console.error('Erro ao carregar dados de funcionários:', error);
    }
}

// Parser do CSV de funcionários
function parseEmployeeCSV(content) {
    const lines = content.split('\n');
    const headers = lines[0].split(';').map(h => h.trim());
    
    employeeData = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(';').map(v => v.trim());
        const row = {};
        
        headers.forEach((header, index) => {
            row[header] = values[index];
        });
        
        employeeData.push(row);
    }
    
    // Preencher filtros adicionais
    populateEmployeeFilters();
}

// Parser do CSV de notas por avaliação
function parseNotasAvaliacaoCSV(content) {
    const lines = content.split('\n');
    const headers = lines[0].split(';').map(h => h.trim());
    
    notasAvaliacaoData = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(';').map(v => v.trim());
        const row = {};
        
        headers.forEach((header, index) => {
            row[header] = values[index];
        });
        
        notasAvaliacaoData.push(row);
    }
    
    console.log('Notas por avaliação parseadas:', notasAvaliacaoData.length);
}

// Buscar notas de autoavaliação e avaliação do gestor por nome - Adaptado para Supabase
function getAvaliacoesByName(nome) {
    // Schema: NOME, Avaliador, Tipo de Avaliador, Nota, Classificação
    const avaliacoes = notasAvaliacaoData.filter(item => {
        const itemNome = item.NOME || item.Nome || '';
        return itemNome.toUpperCase() === nome.toUpperCase();
    });
    
    const autoAvaliacao = avaliacoes.find(item => {
        const tipoAvaliador = item['Tipo de Avaliador'] || '';
        return tipoAvaliador.toUpperCase() === 'AUTO AVALIAÇÃO';
    });
    
    const avaliacaoGestor = avaliacoes.find(item => {
        const tipoAvaliador = item['Tipo de Avaliador'] || '';
        return tipoAvaliador.toUpperCase() === 'GESTOR';
    });
    
    // Normalizar dados
    const normalizeAvaliacao = (av) => {
        if (!av) return null;
        return {
            'Nota': av.Nota || 0,
            'Classificação': av['Classificação'] || av.Classificação || '',
            'Avaliador': av.Avaliador || '',
            'Tipo de Avaliador': av['Tipo de Avaliador'] || ''
        };
    };
    
    return {
        auto: normalizeAvaliacao(autoAvaliacao),
        gestor: normalizeAvaliacao(avaliacaoGestor)
    };
}

// Parser do CSV de movimentações
function parseMovementCSV(content) {
    const lines = content.split('\n');
    const headers = lines[0].split(';').map(h => h.trim());
    
    movementHistory = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(';').map(v => v.trim());
        const row = {};
        
        headers.forEach((header, index) => {
            row[header] = values[index];
        });
        
        movementHistory.push(row);
    }
    
    console.log(`Histórico carregado: ${movementHistory.length} registros`);
}

// Buscar histórico de movimentações por nome - Adaptado para Supabase
// Schema: NOME, DATAADMISSAO, DATADEMISSAO, DTMUDANCA_FUNCAO, FUNCAO, DTMUDANCA_SECAO, SECAO, DTMUDANCA_SALARIO, MOTIVO_MUDANCA_SALARIO
function getMovementHistory(nome) {
    if (!nome || movementHistory.length === 0) return [];
    
    const movements = movementHistory.filter(mov => {
        const movNome = mov.NOME || '';
        return movNome.toUpperCase() === nome.toUpperCase();
    });
    
    // Ordenar por data (mais recente primeiro)
    movements.sort((a, b) => {
        const dateA = parseDate(
            a.DTMUDANCA_SALARIO || 
            a.DTMUDANCA_FUNCAO || 
            a.DTMUDANCA_SECAO || 
            a.DATAADMISSAO
        );
        const dateB = parseDate(
            b.DTMUDANCA_SALARIO || 
            b.DTMUDANCA_FUNCAO || 
            b.DTMUDANCA_SECAO || 
            b.DATAADMISSAO
        );
        return dateB - dateA;
    });
    
    // Retornar com nomes padronizados (já estão corretos no schema)
    return movements.map(mov => ({
        'NOME': mov.NOME || '',
        'DATAADMISSAO': mov.DATAADMISSAO || '',
        'DATADEMISSAO': mov.DATADEMISSAO || '',
        'DTMUDANCA_FUNCAO': mov.DTMUDANCA_FUNCAO || '',
        'FUNCAO': mov.FUNCAO || '',
        'DTMUDANCA_SECAO': mov.DTMUDANCA_SECAO || '',
        'SECAO': mov.SECAO || '',
        'DTMUDANCA_SALARIO': mov.DTMUDANCA_SALARIO || '',
        'MOTIVO_MUDANCA_SALARIO': mov.MOTIVO_MUDANCA_SALARIO || '',
        'MOTIVO_MUDANCA_FUNCAO': '' // Não existe no schema
    }));
}

// Parse de data DD/MM/YYYY
function parseDate(dateStr) {
    if (!dateStr) return new Date(0);
    const parts = dateStr.split('/');
    if (parts.length !== 3) return new Date(0);
    return new Date(parts[2], parts[1] - 1, parts[0]);
}

// Formatar data para exibição
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return dateStr;
}

// Carregar tabela de configuração de quadrantes
function loadConfigTable() {
    const tbody = document.getElementById('quadrantConfigTable');
    if (!tbody) {
        return; // Página sem tabela de configuração
    }
    tbody.innerHTML = '';
    
    const positions = ['1-1', '1-2', '1-3', '2-1', '2-2', '2-3', '3-1', '3-2', '3-3'];
    
    positions.forEach(pos => {
        const quadrante = config.quadrantes[pos];
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>
                <input type="text" value="${quadrante.titulo}" 
                    onchange="updateQuadrantConfig('${pos}', 'titulo', this.value)">
            </td>
            <td>
                <select onchange="updateQuadrantConfig('${pos}', 'eixoX', this.value)">
                    <option value="Atende parcialmente" ${quadrante.eixoX === 'Atende parcialmente' ? 'selected' : ''}>Atende parcialmente</option>
                    <option value="Atende dentro da expectativa" ${quadrante.eixoX === 'Atende dentro da expectativa' ? 'selected' : ''}>Atende dentro da expectativa</option>
                    <option value="Supera a expectativa" ${quadrante.eixoX === 'Supera a expectativa' ? 'selected' : ''}>Supera a expectativa</option>
                </select>
            </td>
            <td>
                <select onchange="updateQuadrantConfig('${pos}', 'eixoY', this.value)">
                    <option value="Atende parcialmente" ${quadrante.eixoY === 'Atende parcialmente' ? 'selected' : ''}>Atende parcialmente</option>
                    <option value="Atende dentro da expectativa" ${quadrante.eixoY === 'Atende dentro da expectativa' ? 'selected' : ''}>Atende dentro da expectativa</option>
                    <option value="Supera a expectativa" ${quadrante.eixoY === 'Supera a expectativa' ? 'selected' : ''}>Supera a expectativa</option>
                </select>
            </td>
            <td>
                <div class="color-picker-wrapper">
                    <input type="color" value="${quadrante.corQuadrante}" 
                        onchange="updateQuadrantConfig('${pos}', 'corQuadrante', this.value)">
                    <span>${quadrante.corQuadrante}</span>
                </div>
            </td>
            <td>
                <div class="color-picker-wrapper">
                    <input type="color" value="${quadrante.corTitulo}" 
                        onchange="updateQuadrantConfig('${pos}', 'corTitulo', this.value)">
                    <span>${quadrante.corTitulo}</span>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Atualizar configuração de quadrante
function updateQuadrantConfig(position, property, value) {
    config.quadrantes[position][property] = value;
    console.log(`Quadrante ${position} atualizado: ${property} = ${value}`);
}

// Processar upload do CSV
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('fileName').textContent = `Arquivo carregado: ${file.name}`;

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        parseCSV(content);
    };
    reader.readAsText(file, 'UTF-8');
}

// Parser do CSV
function parseCSV(content) {
    const lines = content.split('\n');
    const headers = lines[0].split(';').map(h => h.trim());
    
    allData = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(';').map(v => v.trim());
        const row = {};
        
        headers.forEach((header, index) => {
            row[header] = values[index];
        });
        
        // Converter notas para números
        if (row['Nota Final Desempenho']) {
            row['Nota Final Desempenho'] = parseFloat(row['Nota Final Desempenho'].replace(',', '.'));
        }
        if (row['Nota Final Potencial']) {
            row['Nota Final Potencial'] = parseFloat(row['Nota Final Potencial'].replace(',', '.'));
        }
        
        allData.push(row);
    }
    
    console.log(`${allData.length} registros carregados`);
    
    // Preencher filtros
    populateFilters();
    
    // Aplicar configuração automaticamente
    applyConfig();
}

// Preencher dropdowns de filtro
function populateFilters() {
    const areas = [...new Set(allData.map(d => d['Área']))].sort();
    const forms = [...new Set(allData.map(d => d['Formulário']))].sort();
    
    const areaSelect = document.getElementById('filterArea');
    const formSelect = document.getElementById('filterForm');
    
    areaSelect.innerHTML = '<option value="">Todas</option>';
    formSelect.innerHTML = '<option value="">Todos</option>';
    
    areas.forEach(area => {
        if (area) {
            const option = document.createElement('option');
            option.value = area;
            option.textContent = area;
            areaSelect.appendChild(option);
        }
    });
    
    forms.forEach(form => {
        if (form) {
            const option = document.createElement('option');
            option.value = form;
            option.textContent = form;
            formSelect.appendChild(option);
        }
    });
}

// Preencher filtros de funcionários (DIRETORIA, GERENCIA, GRUPO DE CARGO) - Adaptado para Supabase
function populateEmployeeFilters() {
    // Schema relacao_ativos: diretoria, gerencia, cargo
    const getVal = (obj, keys) => keys.map(k => obj[k]).find(v => v !== undefined && v !== null && `${v}`.trim() !== '');
    const diretorias = [...new Set(employeeData.map(d => getVal(d, ['diretoria','DIRETORIA'])))]
        .filter(d => d)
        .sort();
    const gerencias = [...new Set(employeeData.map(d => getVal(d, ['gerencia','GERENCIA','gerência'])))]
        .filter(d => d)
        .sort();
    const gruposCargo = [...new Set(employeeData.map(d => getVal(d, ['cargo','CARGO'])))].filter(d => d).sort(); // Usar cargo como grupo
    
    const diretoriaSelect = document.getElementById('filterDiretoria');
    const gerenciaSelect = document.getElementById('filterGerencia');
    const grupoCargoSelect = document.getElementById('filterGrupoCargo');
    
    if (diretoriaSelect) {
        diretoriaSelect.innerHTML = '<option value="">Todas</option>';
        diretorias.forEach(dir => {
            const option = document.createElement('option');
            option.value = dir;
            option.textContent = dir;
            diretoriaSelect.appendChild(option);
        });
    }
    
    if (gerenciaSelect) {
        gerenciaSelect.innerHTML = '<option value="">Todas</option>';
        gerencias.forEach(ger => {
            const option = document.createElement('option');
            option.value = ger;
            option.textContent = ger;
            gerenciaSelect.appendChild(option);
        });
    }
    
    if (grupoCargoSelect) {
        grupoCargoSelect.innerHTML = '<option value="">Todos</option>';
        gruposCargo.forEach(grupo => {
            const option = document.createElement('option');
            option.value = grupo;
            option.textContent = grupo;
            grupoCargoSelect.appendChild(option);
        });
    }
}

// Popular filtro de Mesa (mesa_calibracao)
function populateMesaFilter() {
    const mesaSelect = document.getElementById('filterMesa');
    if (!mesaSelect) {
        console.warn('Elemento #filterMesa não encontrado');
        return;
    }

    console.log('🪑 Populando filtro de Mesa...');
    console.log('📦 Total de registros mesa_calibracao:', mesaCalibracaoData.length);
    
    if (mesaCalibracaoData.length > 0) {
        console.log('📋 Primeiro registro:', mesaCalibracaoData[0]);
        console.log('🔑 Chaves disponíveis:', Object.keys(mesaCalibracaoData[0]));
    }

    // Tentar múltiplas variações de nome do campo
    const valores = [...new Set(mesaCalibracaoData.map(r => {
        // Tentar várias formas de nomenclatura
        return r.Mesa ?? r.mesa ?? r.MESA ?? r['Mesa'] ?? r['mesa'];
    }))]
        .filter(v => v !== undefined && v !== null && `${v}`.trim() !== '')
        .sort((a,b) => {
            const strA = `${a}`;
            const strB = `${b}`;
            // Tentar ordenar numericamente se possível
            const numA = parseFloat(strA);
            const numB = parseFloat(strB);
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }
            return strA.localeCompare(strB, 'pt-BR');
        });

    console.log('✅ Valores únicos de Mesa encontrados:', valores);

    mesaSelect.innerHTML = '<option value="">Todas</option>';
    valores.forEach(v => {
        const opt = document.createElement('option');
        opt.value = `${v}`;
        opt.textContent = `Mesa ${v}`;
        mesaSelect.appendChild(opt);
    });
    
    console.log(`✅ Filtro de Mesa populado com ${valores.length} opções`);
}

// Buscar dados do funcionário por nome - Adaptado para Supabase
// Schema: registro, diretoria, gerencia, localidade, c. custo, chapa, codsecao, unidade, empresa, codcoligada, nome, cargo, admissao, cpf, corraca, sexo, naturalidade, dtnascimento, idade, escolaridade
function getEmployeeByName(nome) {
    if (!nome) return null;
    // Normalizar nome para comparação (case/acento/espaços)
    const nomeNormalizado = normalizeText(nome);

    // 0. Se possível, buscar o CPF diretamente do registro de avaliação correspondente a este nome
    let cpfAlvo = '';
    try {
        const personRow = allData.find(p => {
            const n1 = normalizeText(p['Usuário Avaliado'] || '');
            const n2 = normalizeText(p['Avaliado'] || '');
            return n1 === nomeNormalizado || n2 === nomeNormalizado;
        });
        if (personRow) {
            const doc = personRow['Documento de Identificação'] || personRow['documento_de_identificação'] || '';
            if (doc) {
                cpfAlvo = (doc + '').replace(/\D/g, '');
            }
        }
    } catch {}
    
    // Funções auxiliares
    const getNomeEmp = (emp) => normalizeText(emp.nome || emp.NOME || emp['Nome'] || '');
    const getCpfEmp = (emp) => ((emp.cpf || emp.CPF || '') + '').replace(/\D/g, '');
    
    // 1. Tentar encontrar por CPF (mais confiável)
    let employee = null;
    if (cpfAlvo && cpfAlvo.length >= 9) {
        employee = employeeData.find(emp => getCpfEmp(emp) === cpfAlvo);
    }
    
    // 2. Tentar correspondência exata por nome
    if (!employee) {
        employee = employeeData.find(emp => getNomeEmp(emp) === nomeNormalizado);
    }
    
    // 3. Se não encontrar, tentar por CPF vindo do próprio parâmetro (caso nome seja CPF)
    if (!employee && nome.length === 11 && /^\d+$/.test(nome)) {
        employee = employeeData.find(emp => getCpfEmp(emp) === nome);
    }
    
    // 4. Se não encontrar, tentar correspondência parcial (contém)
    if (!employee) {
        employee = employeeData.find(emp => {
            const empNome = getNomeEmp(emp);
            return empNome.includes(nomeNormalizado) || nomeNormalizado.includes(empNome);
        });
    }
    
    // 5. Se ainda não encontrar, tentar busca por palavras (útil para nomes compostos)
    if (!employee) {
        const palavrasNome = nomeNormalizado.split(' ').filter(p => p.length > 2);
        employee = employeeData.find(emp => {
            const empNome = getNomeEmp(emp);
            // Verificar se todas as palavras principais do nome estão presentes
            return palavrasNome.every(palavra => empNome.includes(palavra));
        });
    }
    
    // Se não encontrar de jeito nenhum, tentar buscar na mesa de calibração como fallback
    if (!employee) {
        const mesaData = getMesaByName(nome);
        if (mesaData && mesaData.cargo) {
            // Retornar estrutura básica com dados da mesa
            return {
                'Registro': '',
                'NOME': mesaData.nome || nome,
                'CARGO': mesaData.cargo || '',
                'GRUPO DE CARGO': mesaData.cargo || '',
                'DIRETORIA': mesaData.diretoria || '',
                'GERENCIA': '',
                'UNIDADE': '',
                'LOCALIDADE': mesaData.localidade || '',
                'TIPO': '',
                'ADMISSAO': '',
                'IDADE': '',
                'SEXO': '',
                'NATURALIDADE': '',
                'ESCOLARIDADE': '',
                'CIDADE': mesaData.localidade || '',
                'ESTADO': '',
                'CPF': '',
                'EMPRESA': '',
                'CODSECAO': ''
            };
        }
    }
    
    // Normalizar nomes das propriedades para o formato esperado (em maiúsculas)
    if (employee) {
        return {
            'Registro': employee.registro || employee.Registro || '',
            'NOME': employee.nome || employee.NOME || employee.Nome || '',
            'CARGO': employee.cargo || employee.CARGO || employee.Cargo || '',
            'GRUPO DE CARGO': employee.cargo || employee.CARGO || '', // Não existe no schema, usar cargo como fallback
            'DIRETORIA': employee.diretoria || employee.DIRETORIA || employee.Diretoria || '',
            'GERENCIA': employee.gerencia || employee.GERENCIA || employee.gerência || '',
            'UNIDADE': employee.unidade || employee.UNIDADE || employee.Unidade || '',
            'LOCALIDADE': employee.localidade || employee.LOCALIDADE || employee.Localidade || '',
            'TIPO': employee.corraca || employee.CORRACA || '', // corraca é o campo de raça/cor
            'ADMISSAO': employee.admissao || employee.ADMISSAO || employee.admissão || employee.admissao || '',
            'IDADE': employee.idade || employee.IDADE || employee.Idade || '',
            'SEXO': employee.sexo || employee.SEXO || employee.Sexo || '',
            'NATURALIDADE': employee.naturalidade || employee.NATURALIDADE || employee.Naturalidade || '',
            'ESCOLARIDADE': employee.escolaridade || employee.ESCOLARIDADE || employee.Escolaridade || '',
            'CIDADE': employee.localidade || employee.LOCALIDADE || employee.Localidade || '', // Usar localidade para cidade
            'ESTADO': '', // Não existe no schema
            'CPF': employee.cpf || employee.CPF || employee.Cpf || '',
            'EMPRESA': employee.empresa || employee.EMPRESA || employee.Empresa || '',
            'CODSECAO': employee.codsecao || employee.CODSECAO || employee.CodSecao || ''
        };
    }
    
    return null;
}

// Função de diagnóstico para verificar correspondência de nomes
// Use no console: diagnosticarNomes()
function diagnosticarNomes() {
    console.log('🔍 DIAGNÓSTICO DE CORRESPONDÊNCIA DE NOMES');
    console.log('==========================================');
    console.log(`Total de avaliações: ${allData.length}`);
    console.log(`Total de funcionários: ${employeeData.length}`);
    console.log('');
    
    const naoEncontrados = [];
    const encontrados = [];
    const semCargo = [];
    
    allData.forEach(person => {
        const nome = person['Usuário Avaliado'] || person['Avaliado'];
        const empData = getEmployeeByName(nome);
        
        if (!empData) {
            naoEncontrados.push(nome);
        } else if (!empData['CARGO']) {
            semCargo.push({ nome, empData });
        } else {
            encontrados.push(nome);
        }
    });
    
    console.log(`✅ Encontrados com cargo: ${encontrados.length}`);
    console.log(`⚠️ Encontrados sem cargo: ${semCargo.length}`);
    console.log(`❌ Não encontrados: ${naoEncontrados.length}`);
    console.log('');
    
    if (naoEncontrados.length > 0) {
        console.log('❌ NOMES NÃO ENCONTRADOS EM relacao_ativos:');
        naoEncontrados.slice(0, 10).forEach(nome => console.log(`   - ${nome}`));
        if (naoEncontrados.length > 10) {
            console.log(`   ... e mais ${naoEncontrados.length - 10} pessoas`);
        }
        console.log('');
    }
    
    if (semCargo.length > 0) {
        console.log('⚠️ ENCONTRADOS MAS SEM CAMPO CARGO:');
        semCargo.slice(0, 5).forEach(item => {
            console.log(`   - ${item.nome}`);
            console.log(`     Dados:`, item.empData);
        });
        console.log('');
    }
    
    // Mostrar alguns exemplos de nomes da relacao_ativos
    console.log('📋 EXEMPLOS DE NOMES EM relacao_ativos (primeiros 5):');
    employeeData.slice(0, 5).forEach(emp => {
        console.log(`   - ${emp.nome || emp.NOME || '(sem nome)'} | Cargo: ${emp.cargo || emp.CARGO || '(sem cargo)'}`);
    });
    
    return {
        encontrados: encontrados.length,
        semCargo: semCargo.length,
        naoEncontrados: naoEncontrados.length,
        listaNaoEncontrados: naoEncontrados,
        listaSemCargo: semCargo
    };
}

// Buscar dados de mesa de calibração por nome
function getMesaByName(nome) {
    if (!nome || mesaCalibracaoData.length === 0) return null;

    const norm = s => (s || '').toString().trim().toUpperCase();
    const target = norm(nome);

    // Buscar por correspondência exata
    let rec = mesaCalibracaoData.find(r => {
        const nomeCampo = r.NOME || r.nome || r.Nome || '';
        return norm(nomeCampo) === target;
    });
    
    // Se não encontrar, tentar correspondência parcial
    if (!rec) {
        rec = mesaCalibracaoData.find(r => {
            const nomeCampo = r.NOME || r.nome || r.Nome || '';
            const nomeNorm = norm(nomeCampo);
            return nomeNorm.includes(target) || target.includes(nomeNorm);
        });
    }
    
    if (!rec) return null;

    // Normalizar campos potenciais (com/sem acento/caixa)
    const get = (obj, keys) => {
        for (const k of keys) {
            if (obj[k] !== undefined && obj[k] !== null) {
                return obj[k];
            }
        }
        return '';
    };

    return {
        nome: get(rec, ['NOME','nome','Nome']),
        cargo: get(rec, ['CARGO','cargo','Cargo']),
        lider: get(rec, ['Líder','Lider','lider','líder']),
        pai: get(rec, ['Pai','pai','PAI']),
        avo: get(rec, ['Avô','Avo','avô','avo','AVÔ','AVO']),
        mesa: get(rec, ['Mesa','mesa','MESA']),
        diretoria: get(rec, ['DIRETORIA','diretoria','Diretoria']),
        localidade: get(rec, ['Localidade','localidade','LOCALIDADE']),
        calibracao: get(rec, ['Calibração?','Calibracao?','calibração?','calibracao?','Calibração','calibração'])
    };
}

// Normalizar notas para escala 0-10
function normalizeScore(score, maxScore) {
    if (!score || score === 'N/A' || isNaN(parseFloat(score))) return null;
    const numScore = parseFloat(score);
    return (numScore / maxScore) * 10;
}

// Buscar nota de 2024 do funcionário
function getNota2024(nome) {
    console.log('🔍 Buscando nota 2024 para:', nome);
    console.log('📊 Total de notas 2024 disponíveis:', notasAVD2024.length);
    
    if (!nome || !notasAVD2024 || notasAVD2024.length === 0) {
        console.log('❌ Sem dados de 2024 disponíveis');
        return null;
    }
    
    // Debug: mostrar alguns registros de exemplo
    if (notasAVD2024.length > 0) {
        console.log('📋 Exemplo de registro 2024:', notasAVD2024[0]);
        console.log('📋 Colunas disponíveis:', Object.keys(notasAVD2024[0]));
    }
    
    const nota = notasAVD2024.find(n => {
        // Na tabela nota_avd_2024, o nome está na coluna "Avaliado"
        const nomeNota = n.Avaliado || n.avaliado || n.Colaborador || n.NOME || n.nome || '';
        const match = nomeNota.toUpperCase() === nome.toUpperCase();
        if (match) {
            console.log('🎯 Match encontrado! Nome no registro:', nomeNota);
        }
        return match;
    });
    
    if (nota) {
        console.log('✅ Nota 2024 encontrada:', nota);
        if (nota.NotaConsensada) {
            const notaNormalizada = normalizeScore(nota.NotaConsensada, 5);
            console.log(`📈 Nota normalizada: ${nota.NotaConsensada} → ${notaNormalizada}`);
            return notaNormalizada;
        } else {
            console.log('⚠️ Registro encontrado mas sem NotaConsensada');
        }
    } else {
        console.log('❌ Nota 2024 não encontrada para:', nome);
        // Debug: mostrar alguns nomes disponíveis
        const nomesDisponiveis = notasAVD2024.slice(0, 5).map(n => n.Avaliado || n.avaliado || 'SEM NOME');
        console.log('📝 Exemplos de nomes disponíveis:', nomesDisponiveis);
    }
    
    return null;
}

// Calcular variação entre 2024 e 2025
function getPerformanceComparison(nome, nota2025) {
    console.log('📊 Comparando desempenho para:', nome, 'Nota 2025:', nota2025);
    
    const nota2024 = getNota2024(nome);
    
    if (!nota2024 || !nota2025 || isNaN(nota2025)) {
        console.log('❌ Comparação não disponível - nota2024:', nota2024, 'nota2025:', nota2025);
        return null;
    }
    
    // Normalizar nota 2025 (0-4) para 0-10
    const nota2025Normalizada = normalizeScore(nota2025, 4);
    
    if (!nota2025Normalizada) {
        console.log('❌ Erro ao normalizar nota 2025');
        return null;
    }
    
    const variacao = nota2025Normalizada - nota2024;
    const variacaoPercentual = ((nota2025Normalizada - nota2024) / nota2024) * 100;
    
    const resultado = {
        nota2024: nota2024.toFixed(2),
        nota2025: nota2025Normalizada.toFixed(2),
        variacao: variacao.toFixed(2),
        variacaoPercentual: variacaoPercentual.toFixed(1),
        tendencia: variacao > 0 ? 'aumento' : variacao < 0 ? 'queda' : 'estável'
    };
    
    console.log('✅ Comparação calculada:', resultado);
    return resultado;
}

// ====== FUNÇÕES DE DESENVOLVIMENTO DE COLABORADORES ======

// Buscar dados de desenvolvimento de um colaborador
async function getDesenvolvimento(nome) {
    // Verificar cache primeiro
    if (desenvolvimentoData[nome]) {
        return desenvolvimentoData[nome];
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/desenvolvimento/${encodeURIComponent(nome)}`);
        const result = await response.json();
        
        if (result.found && result.data) {
            desenvolvimentoData[nome] = result.data;
            return result.data;
        }
        
        return null;
    } catch (error) {
        console.error('Erro ao buscar desenvolvimento:', error);
        return null;
    }
}

// Salvar dados de desenvolvimento de um colaborador
async function saveDesenvolvimento(nome, dados) {
    try {
        // Buscar CPF do funcionário
        const empData = getEmployeeByName(nome);
        const cpf = empData ? empData['CPF'] : '';
        
        const payload = {
            colaborador: nome,
            cpf: cpf,
            ...dados
        };
        
        const response = await fetch(`${API_BASE_URL}/desenvolvimento`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Atualizar cache
            desenvolvimentoData[nome] = result.data[0] || payload;
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Erro ao salvar desenvolvimento:', error);
        return false;
    }
}

// Aplicar configuração
function applyConfig() {
    const fatorDesempenhoInput = document.getElementById('fator-desempenho');
    const fatorPotencialInput = document.getElementById('fator-potencial');

    if (fatorDesempenhoInput) {
        config.fatorDesempenho = parseFloat(fatorDesempenhoInput.value) || 0;
    }
    if (fatorPotencialInput) {
        config.fatorPotencial = parseFloat(fatorPotencialInput.value) || 0;
    }

    console.log('Configuração aplicada:', config);

    if (allData.length > 0) {
        filteredData = [...allData];
        updateNineBox();
        updateDashboard();
    } else {
        console.warn('Nenhum dado carregado para aplicar configuração.');
    }
}

// Restaurar configuração padrão
function resetConfig() {
    document.getElementById('fator-desempenho').value = 0;
    document.getElementById('fator-potencial').value = 0;
    
    // Restaurar quadrantes padrão
    config.quadrantes = {
        '1-1': { titulo: 'Enigma', eixoX: 'Atende parcialmente', eixoY: 'Supera a expectativa', corQuadrante: '#5DADE2', corTitulo: '#000000' },
        '1-2': { titulo: 'Forte Desempenho', eixoX: 'Atende dentro da expectativa', eixoY: 'Supera a expectativa', corQuadrante: '#58D68D', corTitulo: '#000000' },
        '1-3': { titulo: 'Alto Potencial', eixoX: 'Supera a expectativa', eixoY: 'Supera a expectativa', corQuadrante: '#27AE60', corTitulo: '#000000' },
        '2-1': { titulo: 'Questionável', eixoX: 'Atende parcialmente', eixoY: 'Atende dentro da expectativa', corQuadrante: '#F39C12', corTitulo: '#000000' },
        '2-2': { titulo: 'Mantenedor', eixoX: 'Atende dentro da expectativa', eixoY: 'Atende dentro da expectativa', corQuadrante: '#5DADE2', corTitulo: '#000000' },
        '2-3': { titulo: 'Forte Desempenho', eixoX: 'Supera a expectativa', eixoY: 'Atende dentro da expectativa', corQuadrante: '#58D68D', corTitulo: '#000000' },
        '3-1': { titulo: 'Insuficiente', eixoX: 'Atende parcialmente', eixoY: 'Atende parcialmente', corQuadrante: '#E74C3C', corTitulo: '#000000' },
        '3-2': { titulo: 'Eficaz', eixoX: 'Atende dentro da expectativa', eixoY: 'Atende parcialmente', corQuadrante: '#F39C12', corTitulo: '#000000' },
        '3-3': { titulo: 'Comprometido', eixoX: 'Supera a expectativa', eixoY: 'Atende parcialmente', corQuadrante: '#5DADE2', corTitulo: '#000000' }
    };
    
    loadConfigTable();
    applyConfig();
}

// Mapear pessoa para quadrante baseado nas classificações
function getGridPositionByClassification(classifDesempenho, classifPotencial) {
    const nivelDesempenho = classificacaoMap[classifDesempenho] || 2;
    const nivelPotencial = classificacaoMap[classifPotencial] || 2;
    
    // Potencial: 3=linha 1, 2=linha 2, 1=linha 3 (invertido)
    const linha = 4 - nivelPotencial; // 3->1, 2->2, 1->3
    
    // Desempenho: 1=coluna 1, 2=coluna 2, 3=coluna 3
    const coluna = nivelDesempenho;
    
    return `${linha}-${coluna}`;
}

// Calcular ranking de uma pessoa
function calculateRanking(person) {
    const desempenho = person['Nota Final Desempenho'] || 0;
    const potencial = person['Nota Final Potencial'] || 0;
    
    return (config.fatorDesempenho * desempenho) + (config.fatorPotencial * potencial);
}

// Converter cores hex para RGBA para efeitos visuais
function hexToRgba(hex, alpha = 1) {
    if (!hex) {
        return `rgba(0, 0, 0, ${alpha})`;
    }

    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
        cleanHex = cleanHex.split('').map(char => char + char).join('');
    }

    const bigint = parseInt(cleanHex, 16);
    if (Number.isNaN(bigint)) {
        return `rgba(0, 0, 0, ${alpha})`;
    }

    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Criar cartão visual do colaborador dentro do quadrante
function createPersonItem(person, index, position, options = {}) {
    const personDiv = document.createElement('div');
    personDiv.className = 'person-item';
    personDiv.dataset.position = position;

    const nome = (person['Usuário Avaliado'] || person['Avaliado'] || 'Colaborador');
    personDiv.dataset.personName = nome;

    const empData = getEmployeeByName(nome);
    
    // Debug: verificar se não encontrou o funcionário
    if (!empData) {
        console.warn(`⚠️ Funcionário não encontrado em relacao_ativos: "${nome}"`);
    } else if (!empData['CARGO']) {
        console.warn(`⚠️ Funcionário encontrado mas sem cargo: "${nome}"`, empData);
    }
    
    const cargo = empData && empData['CARGO'] ? empData['CARGO'] : 'Cargo não informado';

    // Visão compacta: apenas nome
    if (compactView) {
        personDiv.classList.add('person-item--compact');
        personDiv.innerHTML = `<span class="compact-name" title="${nome}">${nome}</span>`;
        personDiv.addEventListener('click', event => {
            event.stopPropagation();
            showPersonDetail(person);
        });
        return personDiv;
    }

    const desempenhoValue = parseFloat(person['Nota Final Desempenho']);
    const potencialValue = parseFloat(person['Nota Final Potencial']);
    const notaDesempenho = Number.isFinite(desempenhoValue) ? desempenhoValue.toFixed(2) : '--';
    const notaPotencial = Number.isFinite(potencialValue) ? potencialValue.toFixed(2) : '--';

    const classifDesempenho = person['Classificação Final Desempenho'] || 'Sem classificação';
    const classifPotencial = person['Classificação Final Potencial'] || 'Sem classificação';

    const rankingEnabled = options.showRanking !== false && Number.isFinite(person.ranking) && person.ranking > 0;
    const rankingText = rankingEnabled ? person.ranking.toFixed(2) : null;

    let indicatorMarkup = '';
    if (options.analysis) {
        const { status, message } = options.analysis;
        const icon = status === 'success' ? '✓' : status === 'warning' ? '!' : '✕';
        indicatorMarkup = `<span class="person-indicator person-indicator--${status}" title="${message}">${icon}</span>`;
        personDiv.classList.add(`person-item--${status}`);
        personDiv.title = message;
    }

    if (options.override) {
        personDiv.classList.add('person-item--manual');
    }

    const rankingMarkup = rankingText ? `
            <div class="metric">
                <span class="metric-label">Ranking</span>
                <span class="metric-value">${rankingText}</span>
            </div>
        ` : '';

    personDiv.innerHTML = `
        <div class="person-header">
            <div class="person-rank">${index + 1}</div>
            <div class="person-identity">
                <span class="person-name">${nome}</span>
                <span class="person-role">${cargo}</span>
            </div>
            ${indicatorMarkup}
        </div>
        <div class="person-scores">
            <span class="score-item"><strong>D:</strong> ${notaDesempenho}</span>
            <span class="score-item"><strong>P:</strong> ${notaPotencial}</span>
            ${rankingText ? `<span class="score-item"><strong>R:</strong> ${rankingText}</span>` : ''}
        </div>
    `;

    personDiv.addEventListener('click', event => {
        event.stopPropagation();
        showPersonDetail(person);
    });

    return personDiv;
}

// Resetar estilos e conteúdo dos quadrantes antes da renderização
function resetQuadrantBoxes() {
    for (let i = 1; i <= 3; i++) {
        for (let j = 1; j <= 3; j++) {
            const boxId = `${i}-${j}`;
            const listElement = document.getElementById(`box-${boxId}`);
            const countElement = document.getElementById(`count-${boxId}`);
            const quadrante = config.quadrantes[boxId] || {};
            const accent = quadrante.corQuadrante || '#003797';

            if (listElement) {
                listElement.innerHTML = '';
                listElement.style.background = 'transparent';
            }

            if (countElement) {
                countElement.textContent = '0';
            }

            const boxContainer = listElement ? listElement.parentElement : null;
            if (boxContainer) {
                boxContainer.style.setProperty('--accent-color', accent);
                boxContainer.style.background = '#ffffff';
                boxContainer.style.borderColor = hexToRgba(accent, 0.18);
                boxContainer.style.boxShadow = `0 18px 32px ${hexToRgba(accent, 0.1)}`;
            }

            // Aplicar cor do topo do box (antes pseudo-elemento)
            if (listElement && listElement.parentElement) {
                listElement.parentElement.style.setProperty('--accent-color', accent);
            }

            if (boxContainer) {
                const titleDiv = boxContainer.querySelector('.box-title');
                if (titleDiv) {
                    titleDiv.textContent = quadrante.titulo;
                    titleDiv.style.color = quadrante.corTitulo || '#1a2332';
                }
            }
        }
    }
}

// Atualizar Nine Box
function updateNineBox() {
    resetQuadrantBoxes();
    
    // Agrupar pessoas por quadrante
    const boxes = {};
    
    filteredData.forEach(person => {
        const classifDesempenho = person['Classificação Final Desempenho'];
        const classifPotencial = person['Classificação Final Potencial'];
        
        if (!classifDesempenho || !classifPotencial) return;
        
        const position = getGridPositionByClassification(classifDesempenho, classifPotencial);
        
        if (!boxes[position]) {
            boxes[position] = [];
        }
        
        // Adicionar ranking
        person.ranking = calculateRanking(person);
        boxes[position].push(person);
    });
    
    // Preencher boxes com pessoas ordenadas por ranking
    Object.keys(boxes).forEach(position => {
        const boxElement = document.getElementById(`box-${position}`);
        const countElement = document.getElementById(`count-${position}`);
        const people = boxes[position];
        
        // Ordenar por ranking decrescente
        people.sort((a, b) => b.ranking - a.ranking);
        
        if (countElement) {
            countElement.textContent = people.length;
        }
        if (!boxElement) {
            return;
        }
        
        people.forEach((person, index) => {
            const personDiv = createPersonItem(person, index, position);
            boxElement.appendChild(personDiv);
        });
    });
    
    // Inicializar drag and drop
    initializeDragAndDrop();
}

// Aplicar filtros
function applyFilters() {
    const areaFilter = document.getElementById('filterArea').value;
    const formFilter = document.getElementById('filterForm').value;
    const nameFilter = document.getElementById('filterName').value.toLowerCase();
    const diretoriaFilter = document.getElementById('filterDiretoria')?.value || '';
    const gerenciaFilter = document.getElementById('filterGerencia')?.value || '';
    const grupoCargoFilter = document.getElementById('filterGrupoCargo')?.value || '';
    const mesaFilter = document.getElementById('filterMesa')?.value || '';
    
    filteredData = allData.filter(person => {
        const matchArea = !areaFilter || person['Área'] === areaFilter;
        const matchForm = !formFilter || person['Formulário'] === formFilter;
        const matchName = !nameFilter || 
            (person['Usuário Avaliado'] || person['Avaliado'] || '').toLowerCase().includes(nameFilter);
        
        // Filtros de funcionário
        let matchDiretoria = true;
        let matchGerencia = true;
        let matchGrupoCargo = true;
        
        if (diretoriaFilter || gerenciaFilter || grupoCargoFilter) {
            const empData = getEmployeeByName(person['Usuário Avaliado'] || person['Avaliado']);
            if (empData) {
                matchDiretoria = !diretoriaFilter || empData['DIRETORIA'] === diretoriaFilter;
                matchGerencia = !gerenciaFilter || empData['GERENCIA'] === gerenciaFilter;
                matchGrupoCargo = !grupoCargoFilter || empData['GRUPO DE CARGO'] === grupoCargoFilter;
            } else {
                // Se não encontrou dados do funcionário e há filtros ativos, não incluir
                if (diretoriaFilter || gerenciaFilter || grupoCargoFilter) {
                    return false;
                }
            }
        }
        
        // Filtro por mesa de calibração
        let matchMesa = true;
        if (mesaFilter) {
            const mesa = getMesaByName(person['Usuário Avaliado'] || person['Avaliado']);
            matchMesa = mesa ? `${mesa.mesa}` === `${mesaFilter}` : false;
        }

        return matchArea && matchForm && matchName && matchDiretoria && matchGerencia && matchGrupoCargo && matchMesa;
    });
    
    console.log(`${filteredData.length} registros após filtros`);
    
    updateNineBox();
    updateDashboard();
}

// Limpar filtros
function clearFilters() {
    document.getElementById('filterArea').value = '';
    document.getElementById('filterForm').value = '';
    document.getElementById('filterName').value = '';
    
    if (document.getElementById('filterDiretoria')) {
        document.getElementById('filterDiretoria').value = '';
    }
    if (document.getElementById('filterGerencia')) {
        document.getElementById('filterGerencia').value = '';
    }
    if (document.getElementById('filterGrupoCargo')) {
        document.getElementById('filterGrupoCargo').value = '';
    }
    
    filteredData = [...allData];
    updateNineBox();
    updateDashboard();
}

// Atualizar dashboard
function updateDashboard() {
    // Se os elementos do dashboard não existirem nesta página, ignore silenciosamente
    const totalEl = document.getElementById('total-count');
    const perfEl = document.getElementById('avg-performance');
    const potEl = document.getElementById('avg-potential');
    const areaEl = document.getElementById('area-count');

    if (!totalEl || !perfEl || !potEl || !areaEl) {
        // Dashboard não está presente (ex.: página Nine Box). Evitar erro de null.textContent
        return;
    }

    const total = filteredData.length;
    const avgPerformance = filteredData.reduce((sum, p) => sum + (p['Nota Final Desempenho'] || 0), 0) / (total || 1);
    const avgPotential = filteredData.reduce((sum, p) => sum + (p['Nota Final Potencial'] || 0), 0) / (total || 1);
    const areas = new Set(filteredData.map(p => p['Área'])).size;

    totalEl.textContent = total;
    perfEl.textContent = avgPerformance.toFixed(2);
    potEl.textContent = avgPotential.toFixed(2);
    areaEl.textContent = areas;
    
    // Estatísticas detalhadas por quadrante
    const quadrantStats = {};
    
    filteredData.forEach(person => {
        const classifDesempenho = person['Classificação Final Desempenho'];
        const classifPotencial = person['Classificação Final Potencial'];
        
        if (!classifDesempenho || !classifPotencial) return;
        
        const position = getGridPositionByClassification(classifDesempenho, classifPotencial);
        
        if (!quadrantStats[position]) {
            quadrantStats[position] = {
                count: 0,
                people: []
            };
        }
        
        quadrantStats[position].count++;
        quadrantStats[position].people.push(person);
    });
    
        // ===== Resumo por grupos (alerta x core x topo) =====
        const positionFor = (d, p) => getGridPositionByClassification(d, p);
        const boxesCount = {};
        filteredData.forEach(person => {
                const d = person['Classificação Final Desempenho'];
                const t = person['Classificação Final Potencial'];
                if (!d || !t) return;
                const pos = positionFor(d, t);
                boxesCount[pos] = (boxesCount[pos] || 0) + 1;
        });

        const count = pos => boxesCount[pos] || 0;
        const perc = n => total ? ((n / total) * 100) : 0;
        const inRange = (v, min, max) => v >= min && v <= max;

        const grupoAlerta = count('3-1') + count('2-1') + count('3-2'); // vermelho + laranja
        const grupoCore = count('1-1') + count('2-2') + count('3-3');   // azuis centrais
        const grupoTopo = count('1-2') + count('1-3') + count('2-3');   // verdes superiores

        const pAlerta = perc(grupoAlerta);
        const pCore = perc(grupoCore);
        const pTopo = perc(grupoTopo);

        const sAlerta = inRange(pAlerta, 10, 20) ? 'ok' : (pAlerta < 10 ? 'low' : 'high');
        const sCore = inRange(pCore, 70, 80) ? 'ok' : (pCore < 70 ? 'low' : 'high');
        const sTopo = inRange(pTopo, 5, 15) ? 'ok' : (pTopo < 5 ? 'low' : 'high');

        let detailedHTML = `
            <div style="margin-top: 24px;">
                <h2>🎯 Proporção por Grupo de Quadrantes</h2>
                <div class="target-grid">
                    <div class="target-card ${sAlerta}">
                        <div class="target-title">Alerta (Vermelho + Laranja)</div>
                        <div class="target-value">${pAlerta.toFixed(1)}% <span class="target-count">(${grupoAlerta}/${total})</span></div>
                        <div class="target-range">Meta: 10–20%</div>
                        <div class="target-status">${sAlerta === 'ok' ? 'Dentro do recomendado' : sAlerta === 'low' ? 'Abaixo do recomendado' : 'Acima do recomendado'}</div>
                    </div>
                    <div class="target-card ${sCore}">
                        <div class="target-title">Core (Centrais Azuis)</div>
                        <div class="target-value">${pCore.toFixed(1)}% <span class="target-count">(${grupoCore}/${total})</span></div>
                        <div class="target-range">Meta: 70–80%</div>
                        <div class="target-status">${sCore === 'ok' ? 'Dentro do recomendado' : sCore === 'low' ? 'Abaixo do recomendado' : 'Acima do recomendado'}</div>
                    </div>
                    <div class="target-card ${sTopo}">
                        <div class="target-title">Topo (Verdes Superiores)</div>
                        <div class="target-value">${pTopo.toFixed(1)}% <span class="target-count">(${grupoTopo}/${total})</span></div>
                        <div class="target-range">Meta: 5–15%</div>
                        <div class="target-status">${sTopo === 'ok' ? 'Dentro do recomendado' : sTopo === 'low' ? 'Abaixo do recomendado' : 'Acima do recomendado'}</div>
                    </div>
                </div>
            </div>
        `;

        detailedHTML += '<div style="margin-top: 30px;"><h2>📋 Distribuição por Quadrante</h2>';
    detailedHTML += '<div class="stats-grid" style="margin-top: 20px;">';
    
    Object.keys(config.quadrantes).forEach(position => {
        const stats = quadrantStats[position] || { count: 0 };
        const percentage = ((stats.count / total) * 100).toFixed(1);
        const quadrante = config.quadrantes[position];
        
        detailedHTML += `
            <div class="stat-card">
                <div class="stat-label">${quadrante.titulo}</div>
                <div class="stat-value">${stats.count}</div>
                <div class="stat-label">${percentage}%</div>
            </div>
        `;
    });
    
    detailedHTML += '</div></div>';
    
    const detailedStatsEl = document.getElementById('detailedStats');
    if (detailedStatsEl) {
        detailedStatsEl.innerHTML = detailedHTML;
    }
}

// Mostrar detalhes do quadrante
function showBoxDetail(row, col) {
    const position = `${row}-${col}`;
    const people = [];
    
    filteredData.forEach(person => {
        const classifDesempenho = person['Classificação Final Desempenho'];
        const classifPotencial = person['Classificação Final Potencial'];
        
        if (!classifDesempenho || !classifPotencial) return;
        
        const pos = getGridPositionByClassification(classifDesempenho, classifPotencial);
        if (pos === position) {
            person.ranking = calculateRanking(person);
            people.push(person);
        }
    });
    
    // Ordenar por ranking decrescente
    people.sort((a, b) => b.ranking - a.ranking);
    
    const quadrante = config.quadrantes[position];
    let html = `<h2>${quadrante.titulo}</h2>`;
    html += `<p style="color: #666; margin: 10px 0;">Total: ${people.length} pessoas</p>`;
    html += '<div style="max-height: 400px; overflow-y: auto;">';
    
    people.forEach((person, index) => {
        const rankingText = person.ranking > 0 ? ` - Ranking: ${person.ranking.toFixed(2)}` : '';
        html += `
            <div class="person-detail">
                <strong>${index + 1}º</strong> ${person['Usuário Avaliado'] || person['Avaliado']}${rankingText}<br>
                <strong>Área:</strong> ${person['Área']}<br>
                <strong>Desempenho:</strong> ${person['Nota Final Desempenho'].toFixed(2)} (${person['Classificação Final Desempenho']})<br>
                <strong>Potencial:</strong> ${person['Nota Final Potencial'].toFixed(2)} (${person['Classificação Final Potencial']})<br>
                <strong>Avaliador:</strong> ${person['Avaliador']}
            </div>
        `;
    });
    
    html += '</div>';
    
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modal').classList.add('active');
}

// Mostrar detalhes de uma pessoa
async function showPersonDetail(person) {
    const ranking = calculateRanking(person);
    const position = getGridPositionByClassification(
        person['Classificação Final Desempenho'],
        person['Classificação Final Potencial']
    );
    const quadrante = config.quadrantes[position];
    const nome = person['Usuário Avaliado'] || person['Avaliado'];
    
    // Buscar dados adicionais do funcionário
    const empData = getEmployeeByName(nome);
    
    // Header e shell minimalista e horizontal
    const cargo = empData ? (empData['CARGO'] || 'Colaborador') : 'Colaborador';
    const diretoria = empData ? (empData['DIRETORIA'] || '') : '';
    const gerencia = empData ? (empData['GERENCIA'] || '') : '';
    const area = person['Área'] || '';
    const desempenhoNota = (person['Nota Final Desempenho'] ?? 0).toFixed(2);
    const potencialNota = (person['Nota Final Potencial'] ?? 0).toFixed(2);

    let html = `
        <div class="detail-shell" style="--accent-color: ${quadrante?.corQuadrante || '#003797'};">
            <div class="detail-header">
                <div class="header-main">
                    <h2 class="header-name">${nome}</h2>
                    <div class="header-role">${cargo}</div>
                    <div class="header-sub">${[area, diretoria, gerencia].filter(Boolean).join(' • ')}</div>
                </div>
                <div class="header-metrics">
                    <span class="chip"><span class="chip-label">D</span> ${desempenhoNota}</span>
                    <span class="chip"><span class="chip-label">P</span> ${potencialNota}</span>
                    ${ranking > 0 ? `<span class="chip"><span class="chip-label">R</span> ${ranking.toFixed(2)}</span>` : ''}
                    <span class="chip chip--accent">${quadrante?.titulo || 'Quadrante'}</span>
                </div>
            </div>
            <div class="detail-grid">
                <div>
    `;
    
    // Card de Avaliação de Desempenho (sem emojis)
    html += `
        <div class="person-detail">
            <h3>Avaliação de Desempenho</h3>
            <div class="person-detail-content">
                <div class="info-grid-2col">
                    <div class="info-row-compact">
                        <strong>Área</strong>
                        <span>${person['Área']}</span>
                    </div>
                    <div class="info-row-compact">
                        <strong>Formulário</strong>
                        <span>${person['Formulário']}</span>
                    </div>
                    <div class="info-row-compact">
                        <strong>Desempenho</strong>
                        <span>
                            <span class="badge badge-success">${person['Nota Final Desempenho'].toFixed(2)}</span>
                            ${person['Classificação Final Desempenho']}
                        </span>
                    </div>
                    <div class="info-row-compact">
                        <strong>Potencial</strong>
                        <span>
                            <span class="badge badge-success">${person['Nota Final Potencial'].toFixed(2)}</span>
                            ${person['Classificação Final Potencial']}
                        </span>
                    </div>
                    <div class="info-row-compact">
                        <strong>Quadrante</strong>
                        <span><span class="badge">${quadrante.titulo}</span></span>
                    </div>
                    ${ranking > 0 ? `
                    <div class="info-row-compact">
                        <strong>Ranking</strong>
                        <span><span class="badge badge-warning">${ranking.toFixed(2)}</span></span>
                    </div>
                    ` : ''}
                    <div class="info-row-compact" style="grid-column: 1 / -1;">
                        <strong>Avaliador</strong>
                        <span>${person['Avaliador']}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Card de Comparação com 2024
    const comparison = getPerformanceComparison(nome, person['Nota Final Desempenho']);
    if (comparison) {
        const isPositive = comparison.tendencia === 'aumento';
        const isNegative = comparison.tendencia === 'queda';
        const iconTendencia = '';
        const corTendencia = isPositive ? '#4caf50' : isNegative ? '#f44336' : '#ff9800';
        const textTendencia = isPositive ? 'Aumento' : isNegative ? 'Queda' : 'Estável';
        
        html += `
            <div class="person-detail" style="border-left: 4px solid ${corTendencia};">
                <h3>Comparação de Desempenho (2024 vs 2025)</h3>
                <div class="person-detail-content">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                        <div style="text-align: center; padding: 10px; background: #f5f5f5; border-radius: 6px;">
                            <div style="font-size: 0.75em; color: #666; margin-bottom: 3px;">2024</div>
                            <div style="font-size: 1.5em; font-weight: bold; color: #003797;">${comparison.nota2024}</div>
                        </div>
                        <div style="text-align: center; padding: 10px; background: #e3f2fd; border-radius: 6px; border: 2px solid #003797;">
                            <div style="font-size: 0.75em; color: #666; margin-bottom: 3px;">2025</div>
                            <div style="font-size: 1.5em; font-weight: bold; color: #003797;">${comparison.nota2025}</div>
                        </div>
                        <div style="text-align: center; padding: 10px; background: ${corTendencia}15; border-radius: 6px; border: 2px solid ${corTendencia};">
                            <div style="font-size: 0.75em; color: #666; margin-bottom: 3px;">Variação</div>
                            <div style="font-size: 1.5em; font-weight: bold; color: ${corTendencia};">
                                ${parseFloat(comparison.variacao) > 0 ? '+' : ''}${comparison.variacao}
                            </div>
                        </div>
                    </div>
                    <div style="text-align: center; padding: 8px; background: ${corTendencia}; color: white; border-radius: 6px; font-weight: 600; font-size: 0.85em;">
                        ${textTendencia} de ${Math.abs(parseFloat(comparison.variacaoPercentual)).toFixed(1)}% em relação a 2024
                    </div>
                </div>
            </div>
        `;
    }
    
    // Card de Informações Profissionais
    if (empData) {
        const mesa = getMesaByName(nome);
        
        html += `
            <div class="person-detail">
                <h3>Informações Profissionais</h3>
                <div class="person-detail-content">
                    <div class="info-grid-2col">
                        <div class="info-row-compact">
                            <strong>Registro</strong>
                            <span>${empData['Registro'] || 'N/A'}</span>
                        </div>
                        <div class="info-row-compact">
                            <strong>Cargo</strong>
                            <span>${empData['CARGO'] || 'N/A'}</span>
                        </div>
                        <div class="info-row-compact">
                            <strong>Diretoria</strong>
                            <span>${empData['DIRETORIA'] || 'N/A'}</span>
                        </div>
                        <div class="info-row-compact">
                            <strong>Gerência</strong>
                            <span>${empData['GERENCIA'] || 'N/A'}</span>
                        </div>
                        <div class="info-row-compact">
                            <strong>Unidade</strong>
                            <span>${empData['UNIDADE'] || 'N/A'}</span>
                        </div>
                        <div class="info-row-compact">
                            <strong>Localidade</strong>
                            <span>${empData['LOCALIDADE'] || 'N/A'}</span>
                        </div>
                        <div class="info-row-compact">
                            <strong>Data de Admissão</strong>
                            <span>${empData['ADMISSAO'] || 'N/A'}</span>
                        </div>
                        ${mesa ? `
                        <div class="info-row-compact">
                            <strong>Mesa</strong>
                            <span>${mesa.mesa !== undefined && mesa.mesa !== '' ? mesa.mesa : 'N/A'}</span>
                        </div>
                        <div class="info-row-compact">
                            <strong>Líder</strong>
                            <span>${mesa.lider || 'N/A'}</span>
                        </div>
                        <div class="info-row-compact">
                            <strong>Pai</strong>
                            <span>${mesa.pai || 'N/A'}</span>
                        </div>
                        <div class="info-row-compact">
                            <strong>Avô</strong>
                            <span>${mesa.avo || 'N/A'}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Card de Dados Pessoais
        html += `
            <div class="person-detail">
                <h3>Dados Pessoais</h3>
                <div class="person-detail-content">
                    <div class="info-grid-2col">
                        <div class="info-row-compact">
                            <strong>Idade</strong>
                            <span>${empData['IDADE'] || 'N/A'} anos</span>
                        </div>
                        <div class="info-row-compact">
                            <strong>Sexo</strong>
                            <span>${empData['SEXO'] || 'N/A'}</span>
                        </div>
                        <div class="info-row-compact">
                            <strong>Naturalidade</strong>
                            <span>${empData['NATURALIDADE'] || 'N/A'}</span>
                        </div>
                        <div class="info-row-compact">
                            <strong>Escolaridade</strong>
                            <span>${empData['ESCOLARIDADE'] || 'N/A'}</span>
                        </div>
                        <div class="info-row-compact">
                            <strong>Cidade</strong>
                            <span>${empData['CIDADE'] || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="no-data-message">
                <strong>Informações Complementares Não Encontradas</strong>
                <p style="margin: 10px 0 0 0;">Os dados adicionais deste colaborador não estão disponíveis no cadastro.</p>
            </div>
        `;
    }
    
    // Encerrar a coluna esquerda e abrir a direita
    html += `
                </div>
                <div>
    `;

    // Card de Desenvolvimento e Sucessão
    html += await generateDesenvolvimentoCard(nome, empData);
    
    // Comparativo de Avaliações (autoavaliação vs gestor)
    html += generateComparisonCard(nome);
    
    // Histórico de Movimentações
    const movements = getMovementHistory(nome);
    if (movements.length > 0) {
        html += generateMovementTimeline(movements);
    } else if (movementHistory.length > 0) {
        html += `
            <div class="person-detail">
                <h3>Histórico de Movimentações</h3>
                <div class="person-detail-content">
                    <p style="color: #546e7a; text-align: center; margin: 0;">Nenhuma movimentação registrada para este colaborador.</p>
                </div>
            </div>
        `;
    }
    
    html += `
                </div>
            </div>
        </div>`; // Fecha detail-grid + shell
    
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modal').classList.add('active');
}

// Gerar card de comparação de avaliações
function generateComparisonCard(nome) {
    const avaliacoes = getAvaliacoesByName(nome);
    
    // Se não houver dados de notas
    if (!avaliacoes.auto && !avaliacoes.gestor) {
        return '';
    }
    
    let html = `
        <div class="person-detail">
            <h3>Comparativo de Avaliações</h3>
            <div class="person-detail-content">
    `;
    
    // Se tiver ambas as avaliações, mostrar comparação
    if (avaliacoes.auto && avaliacoes.gestor) {
        const notaAuto = parseFloat(avaliacoes.auto['Nota']) || 0;
        const notaGestor = parseFloat(avaliacoes.gestor['Nota']) || 0;
        const diferenca = notaGestor - notaAuto;
        const diferencaAbs = Math.abs(diferenca);
        
        let badgeClass = 'difference-neutral';
        let sinalDiferenca = '';
        let textoDiferenca = 'Notas equivalentes';
        
        if (diferenca > 0) {
            badgeClass = 'difference-positive';
            sinalDiferenca = '+';
            textoDiferenca = 'Gestor avaliou acima da autoavaliação';
        } else if (diferenca < 0) {
            badgeClass = 'difference-negative';
            textoDiferenca = 'Gestor avaliou abaixo da autoavaliação';
        }
        
        html += `
            <div class="comparison-container">
                <div class="comparison-card auto">
                    <div class="comparison-title">Autoavaliação</div>
                    <div class="comparison-nota">${notaAuto.toFixed(2)}</div>
                    <div class="comparison-classificacao">${avaliacoes.auto['Classificação'] || 'N/A'}</div>
                </div>
                
                <div class="comparison-card gestor">
                    <div class="comparison-title">Avaliação do Gestor</div>
                    <div class="comparison-nota">${notaGestor.toFixed(2)}</div>
                    <div class="comparison-classificacao">${avaliacoes.gestor['Classificação'] || 'N/A'}</div>
                    <div style="margin-top: 8px; font-size: 0.85em; color: #546e7a;">
                        <strong>Avaliador:</strong> ${avaliacoes.gestor['Avaliador'] || 'N/A'}
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 15px;">
                <div class="${badgeClass} difference-badge">
                    Diferença: ${sinalDiferenca}${diferencaAbs.toFixed(2)}
                </div>
                <p style="color: #546e7a; margin-top: 10px; font-size: 0.95em;">
                    ${textoDiferenca}
                </p>
            </div>
        `;
    } 
    // Se tiver só autoavaliação
    else if (avaliacoes.auto) {
        const notaAuto = parseFloat(avaliacoes.auto['Nota']) || 0;
        
        html += `
            <div style="text-align: center; padding: 20px;">
                <div class="comparison-card auto" style="display: inline-block; width: auto; min-width: 250px;">
                    <div class="comparison-title">Autoavaliação</div>
                    <div class="comparison-nota">${notaAuto.toFixed(2)}</div>
                    <div class="comparison-classificacao">${avaliacoes.auto['Classificação'] || 'N/A'}</div>
                </div>
                <p style="color: #856404; margin-top: 15px; font-size: 0.95em;">
                    Avaliação do gestor não encontrada
                </p>
            </div>
        `;
    }
    // Se tiver só avaliação do gestor
    else if (avaliacoes.gestor) {
        const notaGestor = parseFloat(avaliacoes.gestor['Nota']) || 0;
        
        html += `
            <div style="text-align: center; padding: 20px;">
                <div class="comparison-card gestor" style="display: inline-block; width: auto; min-width: 250px;">
                    <div class="comparison-title">Avaliação do Gestor</div>
                    <div class="comparison-nota">${notaGestor.toFixed(2)}</div>
                    <div class="comparison-classificacao">${avaliacoes.gestor['Classificação'] || 'N/A'}</div>
                    <div style="margin-top: 8px; font-size: 0.85em; color: #546e7a;">
                        <strong>Avaliador:</strong> ${avaliacoes.gestor['Avaliador'] || 'N/A'}
                    </div>
                </div>
                <p style="color: #856404; margin-top: 15px; font-size: 0.95em;">
                    Autoavaliação não encontrada
                </p>
            </div>
        `;
    }
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

// Gerar card de desenvolvimento e sucessão
async function generateDesenvolvimentoCard(nome, empData) {
    // Buscar dados existentes
    const dev = await getDesenvolvimento(nome);
    
    const cpf = empData ? empData['CPF'] : '';
    
    // Gerar opções do datalist com todos os funcionários
    let datalistOptions = '';
    employeeData.forEach(emp => {
        const empNome = emp.nome || '';
        if (empNome) {
            datalistOptions += `<option value="${empNome}"></option>`;
        }
    });
    
    let html = `
        <div class="person-detail dev-card">
            <h3>Planejamento de Desenvolvimento e Sucessão</h3>
            <div class="person-detail-content">
                <form id="form-desenvolvimento" onsubmit="return false;" style="display: grid; gap: 16px;">
                    <datalist id="funcionarios-list">${datalistOptions}</datalist>

                    <div class="dev-section" id="dev-sec-1">
                        <div class="section-header" onclick="toggleSection('dev-sec-1')">
                            <span>Pessoa 1 (Opcional)</span>
                            <span class="hint">dados do sucessor</span>
                        </div>
                        <div class="collapsible-content">
                            <div class="form-row">
                                <input type="text" id="dev-sucessao-pessoa1" list="funcionarios-list" placeholder="Digite o nome ou escolha na lista" value="${dev && dev.sucessao_pessoa1 ? dev.sucessao_pessoa1 : ''}" onchange="preencherInfoSucessor(1, this.value)">
                            </div>
                            <div id="info-sucessor-1" class="inline-info" style="display:none;"></div>
                            <div class="form-grid-2col" style="margin-top:10px;">
                                <div class="form-row">
                                    <label>Prontidão</label>
                                    <select id="dev-prontidao-pessoa1" onchange="toggleProntidaoOutros(1, this.value)">
                                        <option value="">Selecione...</option>
                                        <option value="Imediata" ${dev && dev.prontidao_pessoa1 === 'Imediata' ? 'selected' : ''}>Imediata</option>
                                        <option value="Até 12m" ${dev && dev.prontidao_pessoa1 === 'Até 12m' ? 'selected' : ''}>Até 12m</option>
                                        <option value="2-3 anos" ${dev && dev.prontidao_pessoa1 === '2-3 anos' ? 'selected' : ''}>2-3 anos</option>
                                        <option value="Outros" ${dev && dev.prontidao_pessoa1 === 'Outros' ? 'selected' : ''}>Outros</option>
                                    </select>
                                    <input type="text" id="dev-prontidao-pessoa1-outros" placeholder="Especifique..." style="margin-top:6px; display:${dev && dev.prontidao_pessoa1 === 'Outros' ? 'block' : 'none'};" value="${dev && dev.prontidao_pessoa1_outros ? dev.prontidao_pessoa1_outros : ''}">
                                </div>
                                <div class="form-row">
                                    <label>Quem indicou</label>
                                    <input type="text" id="dev-indicador-pessoa1" placeholder="Nome de quem indicou" value="${dev && dev.indicador_pessoa1 ? dev.indicador_pessoa1 : ''}">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="dev-section collapsed" id="dev-sec-2">
                        <div class="section-header" onclick="toggleSection('dev-sec-2')">
                            <span>Pessoa 2 (Opcional)</span>
                            <span class="hint">clique para expandir</span>
                        </div>
                        <div class="collapsible-content">
                            <div class="form-row">
                                <input type="text" id="dev-sucessao-pessoa2" list="funcionarios-list" placeholder="Digite o nome ou escolha na lista" value="${dev && dev.sucessao_pessoa2 ? dev.sucessao_pessoa2 : ''}" onchange="preencherInfoSucessor(2, this.value)">
                            </div>
                            <div id="info-sucessor-2" class="inline-info" style="display:none;"></div>
                            <div class="form-grid-2col" style="margin-top:10px;">
                                <div class="form-row">
                                    <label>Prontidão</label>
                                    <select id="dev-prontidao-pessoa2" onchange="toggleProntidaoOutros(2, this.value)">
                                        <option value="">Selecione...</option>
                                        <option value="Imediata" ${dev && dev.prontidao_pessoa2 === 'Imediata' ? 'selected' : ''}>Imediata</option>
                                        <option value="Até 12m" ${dev && dev.prontidao_pessoa2 === 'Até 12m' ? 'selected' : ''}>Até 12m</option>
                                        <option value="2-3 anos" ${dev && dev.prontidao_pessoa2 === '2-3 anos' ? 'selected' : ''}>2-3 anos</option>
                                        <option value="Outros" ${dev && dev.prontidao_pessoa2 === 'Outros' ? 'selected' : ''}>Outros</option>
                                    </select>
                                    <input type="text" id="dev-prontidao-pessoa2-outros" placeholder="Especifique..." style="margin-top:6px; display:${dev && dev.prontidao_pessoa2 === 'Outros' ? 'block' : 'none'};" value="${dev && dev.prontidao_pessoa2_outros ? dev.prontidao_pessoa2_outros : ''}">
                                </div>
                                <div class="form-row">
                                    <label>Quem indicou</label>
                                    <input type="text" id="dev-indicador-pessoa2" placeholder="Nome de quem indicou" value="${dev && dev.indicador_pessoa2 ? dev.indicador_pessoa2 : ''}">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="dev-section collapsed" id="dev-sec-3">
                        <div class="section-header" onclick="toggleSection('dev-sec-3')">
                            <span>Pessoa 3 (Opcional)</span>
                            <span class="hint">clique para expandir</span>
                        </div>
                        <div class="collapsible-content">
                            <div class="form-row">
                                <input type="text" id="dev-sucessao-pessoa3" list="funcionarios-list" placeholder="Digite o nome ou escolha na lista" value="${dev && dev.sucessao_pessoa3 ? dev.sucessao_pessoa3 : ''}" onchange="preencherInfoSucessor(3, this.value)">
                            </div>
                            <div id="info-sucessor-3" class="inline-info" style="display:none;"></div>
                            <div class="form-grid-2col" style="margin-top:10px;">
                                <div class="form-row">
                                    <label>Prontidão</label>
                                    <select id="dev-prontidao-pessoa3" onchange="toggleProntidaoOutros(3, this.value)">
                                        <option value="">Selecione...</option>
                                        <option value="Imediata" ${dev && dev.prontidao_pessoa3 === 'Imediata' ? 'selected' : ''}>Imediata</option>
                                        <option value="Até 12m" ${dev && dev.prontidao_pessoa3 === 'Até 12m' ? 'selected' : ''}>Até 12m</option>
                                        <option value="2-3 anos" ${dev && dev.prontidao_pessoa3 === '2-3 anos' ? 'selected' : ''}>2-3 anos</option>
                                        <option value="Outros" ${dev && dev.prontidao_pessoa3 === 'Outros' ? 'selected' : ''}>Outros</option>
                                    </select>
                                    <input type="text" id="dev-prontidao-pessoa3-outros" placeholder="Especifique..." style="margin-top:6px; display:${dev && dev.prontidao_pessoa3 === 'Outros' ? 'block' : 'none'};" value="${dev && dev.prontidao_pessoa3_outros ? dev.prontidao_pessoa3_outros : ''}">
                                </div>
                                <div class="form-row">
                                    <label>Quem indicou</label>
                                    <input type="text" id="dev-indicador-pessoa3" placeholder="Nome de quem indicou" value="${dev && dev.indicador_pessoa3 ? dev.indicador_pessoa3 : ''}">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="form-grid-2col">
                        <div class="form-row">
                            <label>Aptidão de carreira</label>
                            <select id="dev-aptidao">
                                <option value="">Selecione...</option>
                                <option value="Liderança" ${dev && dev.aptidao_carreira === 'Liderança' ? 'selected' : ''}>Liderança</option>
                                <option value="Gestão" ${dev && dev.aptidao_carreira === 'Gestão' ? 'selected' : ''}>Gestão</option>
                                <option value="Técnico" ${dev && dev.aptidao_carreira === 'Técnico' ? 'selected' : ''}>Técnico</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <label>Risco de saída</label>
                            <select id="dev-risco">
                                <option value="">Selecione...</option>
                                <option value="Alto" ${dev && dev.risco_saida === 'Alto' ? 'selected' : ''}>Alto</option>
                                <option value="Médio" ${dev && dev.risco_saida === 'Médio' ? 'selected' : ''}>Médio</option>
                                <option value="Baixo" ${dev && dev.risco_saida === 'Baixo' ? 'selected' : ''}>Baixo</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <label>Impacto de saída</label>
                            <select id="dev-impacto">
                                <option value="">Selecione...</option>
                                <option value="Alto" ${dev && dev.impacto_saida === 'Alto' ? 'selected' : ''}>Alto</option>
                                <option value="Médio" ${dev && dev.impacto_saida === 'Médio' ? 'selected' : ''}>Médio</option>
                                <option value="Baixo" ${dev && dev.impacto_saida === 'Baixo' ? 'selected' : ''}>Baixo</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <label>Pessoa chave/Técnica</label>
                            <select id="dev-chave">
                                <option value="">Selecione...</option>
                                <option value="Sim" ${dev && dev.pessoa_chave_tecnica === 'Sim' ? 'selected' : ''}>Sim</option>
                                <option value="Não" ${dev && dev.pessoa_chave_tecnica === 'Não' ? 'selected' : ''}>Não</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <label>Comentários adicionais</label>
                        <textarea id="dev-comentarios" rows="3" placeholder="Observações sobre o desenvolvimento do colaborador...">${dev && dev.comentarios ? dev.comentarios : ''}</textarea>
                    </div>

                    <div class="dev-footer-actions">
                        <div id="dev-status" style="display:none;"></div>
                        <button type="button" class="dev-save-btn" onclick="salvarDesenvolvimento('${nome}')">Salvar Informações</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    return html;
}

// Toggle campo "Outros" para prontidão
function toggleProntidaoOutros(numero, valor) {
    const outrosField = document.getElementById(`dev-prontidao-pessoa${numero}-outros`);
    if (outrosField) {
        outrosField.style.display = valor === 'Outros' ? 'block' : 'none';
    }
}

// Preencher informações do sucessor ao selecionar da lista
async function preencherInfoSucessor(numero, nome) {
    const infoDiv = document.getElementById(`info-sucessor-${numero}`);
    
    if (!nome || nome.trim() === '') {
        infoDiv.style.display = 'none';
        infoDiv.innerHTML = '';
        return;
    }
    
    // Buscar dados do funcionário
    const empData = getEmployeeByName(nome);
    
    if (!empData) {
        infoDiv.style.display = 'block';
        infoDiv.innerHTML = '<span style="color: #d32f2f;">❌ Funcionário não encontrado na base de dados</span>';
        return;
    }
    
    // Buscar notas de avaliação (auto e gestor)
    const avaliacoes = getAvaliacoesByName(nome);
    
    // Montar HTML com informações
    let html = '<div style="display: grid; gap: 8px;">';
    html += '<div style="font-weight: 600; color: #003797; margin-bottom: 5px;">📋 Informações do Sucessor</div>';
    
    // Linha 1: Cargo e Idade
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">';
    html += `<div><strong>Cargo:</strong> ${empData['CARGO'] || 'N/A'}</div>`;
    html += `<div><strong>Idade:</strong> ${empData['IDADE'] || 'N/A'} anos</div>`;
    html += '</div>';
    
    // Linha 2: Admissão e Diretoria
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">';
    html += `<div><strong>Admissão:</strong> ${empData['ADMISSAO'] || 'N/A'}</div>`;
    html += `<div><strong>Diretoria:</strong> ${empData['DIRETORIA'] || 'N/A'}</div>`;
    html += '</div>';
    
    // Linha 3: Gerência e Unidade
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">';
    html += `<div><strong>Gerência:</strong> ${empData['GERENCIA'] || 'N/A'}</div>`;
    html += `<div><strong>Unidade:</strong> ${empData['UNIDADE'] || 'N/A'}</div>`;
    html += '</div>';
    
    // Notas de avaliação
    if (avaliacoes.auto || avaliacoes.gestor) {
        html += '<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #90caf9;">';
        html += '<div style="font-weight: 600; color: #003797; margin-bottom: 5px;">📊 Avaliações de Desempenho</div>';
        html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">';
        
        if (avaliacoes.auto) {
            html += `<div><strong>Autoavaliação:</strong> ${avaliacoes.auto.Nota || 'N/A'} - ${avaliacoes.auto.Classificação || 'N/A'}</div>`;
        } else {
            html += `<div><strong>Autoavaliação:</strong> N/A</div>`;
        }
        
        if (avaliacoes.gestor) {
            html += `<div><strong>Avaliação Gestor:</strong> ${avaliacoes.gestor.Nota || 'N/A'} - ${avaliacoes.gestor.Classificação || 'N/A'}</div>`;
        } else {
            html += `<div><strong>Avaliação Gestor:</strong> N/A</div>`;
        }
        
        html += '</div></div>';
    }
    
    html += '</div>';
    
    infoDiv.style.display = 'block';
    infoDiv.innerHTML = html;
}

// Gerar timeline de movimentações
function generateMovementTimeline(movements) {
    if (!movements || movements.length === 0) return '';
    
    // Resumo estatístico
    const totalMovimentacoes = movements.length;
    const ultimaData = movements[0]['DTMUDANCA_SALARIO'] || movements[0]['DTMUDANCA_FUNCAO'] || movements[0]['DTMUDANCA_SECAO'];
    
    // Contar motivos
    const motivosCount = {};
    movements.forEach(mov => {
        const motivo = mov['MOTIVO_MUDANCA_SALARIO'] || 'Outros';
        if (motivo && motivo !== 'N/A') {
            motivosCount[motivo] = (motivosCount[motivo] || 0) + 1;
        }
    });
    
    const motivoMaisFrequente = Object.keys(motivosCount).length > 0 
        ? Object.keys(motivosCount).reduce((a, b) => motivosCount[a] > motivosCount[b] ? a : b)
        : 'N/A';
    
    let html = `
        <div class="person-detail">
            <h3>Histórico de Movimentações</h3>
            <div class="person-detail-content">
                <div class="stats-summary">
                    <div class="stats-grid-timeline">
                        <div class="stat-item">
                            <div class="stat-item-label">Total de Movimentações</div>
                            <div class="stat-item-value">${totalMovimentacoes}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-item-label">Última Movimentação</div>
                            <div class="stat-item-value" style="font-size: 1.3em;">${ultimaData}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-item-label">Motivo Mais Frequente</div>
                            <div class="stat-item-value" style="font-size: 1em;">${motivoMaisFrequente}</div>
                            <div style="color: #546e7a; font-size: 0.9em; margin-top: 5px;">
                                ${motivosCount[motivoMaisFrequente] || 0}x
                            </div>
                        </div>
                    </div>
                </div>
                
                <h4 style="color: #1a2332; margin: 25px 0 15px 0; font-size: 1em; font-weight: 600;">Linha do Tempo</h4>
                <div class="timeline">`;
    
    movements.forEach((mov, index) => {
        const data = mov['DTMUDANCA_SALARIO'] || mov['DTMUDANCA_FUNCAO'] || mov['DTMUDANCA_SECAO'] || mov['DATAADMISSAO'];
        const funcao = mov['FUNCAO'] || 'N/A';
        const secao = mov['SECAO'] || 'N/A';
        const motivo = mov['MOTIVO_MUDANCA_SALARIO'] || 'N/A';
        
        const isRecent = index < 3;
        const markerColor = isRecent ? '#003797' : '#78909c';
        
        html += `
            <div class="timeline-item">
                <div class="timeline-marker" style="background: ${markerColor}; box-shadow: 0 0 0 2px ${markerColor};"></div>
                ${index < movements.length - 1 ? '<div class="timeline-line"></div>' : ''}
                <div class="timeline-content">
                    <div class="timeline-date">${data}</div>
                    <div style="margin-bottom: 8px;">
                        <strong style="color: #1a2332;">Função:</strong> 
                        <span style="color: #546e7a;">${funcao}</span>
                    </div>
                    <div style="margin-bottom: 8px;">
                        <strong style="color: #1a2332;">Seção:</strong> 
                        <span style="color: #546e7a;">${secao}</span>
                    </div>
                    ${motivo && motivo !== 'N/A' ? `
                        <div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #003797;">
                            <small style="color: #546e7a; font-weight: 600;">MOTIVO DA MUDANÇA</small>
                            <div style="color: #1a2332; margin-top: 3px;">${motivo}</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    html += `
                </div>
            </div>
        </div>
    `;
    
    return html;
}

// Fechar modal
function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

// Salvar dados de desenvolvimento
async function salvarDesenvolvimento(nome) {
    const statusDiv = document.getElementById('dev-status');
    
    try {
        statusDiv.style.display = 'block';
        statusDiv.style.background = '#e3f2fd';
        statusDiv.style.color = '#003797';
        statusDiv.innerHTML = '⏳ Salvando...';
        
        const dados = {
            // Pessoa 1
            sucessao_pessoa1: document.getElementById('dev-sucessao-pessoa1').value || null,
            prontidao_pessoa1: document.getElementById('dev-prontidao-pessoa1').value || null,
            prontidao_pessoa1_outros: document.getElementById('dev-prontidao-pessoa1').value === 'Outros' 
                ? document.getElementById('dev-prontidao-pessoa1-outros').value 
                : null,
            indicador_pessoa1: document.getElementById('dev-indicador-pessoa1').value || null,
            
            // Pessoa 2
            sucessao_pessoa2: document.getElementById('dev-sucessao-pessoa2').value || null,
            prontidao_pessoa2: document.getElementById('dev-prontidao-pessoa2').value || null,
            prontidao_pessoa2_outros: document.getElementById('dev-prontidao-pessoa2').value === 'Outros' 
                ? document.getElementById('dev-prontidao-pessoa2-outros').value 
                : null,
            indicador_pessoa2: document.getElementById('dev-indicador-pessoa2').value || null,
            
            // Pessoa 3
            sucessao_pessoa3: document.getElementById('dev-sucessao-pessoa3').value || null,
            prontidao_pessoa3: document.getElementById('dev-prontidao-pessoa3').value || null,
            prontidao_pessoa3_outros: document.getElementById('dev-prontidao-pessoa3').value === 'Outros' 
                ? document.getElementById('dev-prontidao-pessoa3-outros').value 
                : null,
            indicador_pessoa3: document.getElementById('dev-indicador-pessoa3').value || null,
            
            // Outros campos
            aptidao_carreira: document.getElementById('dev-aptidao').value,
            risco_saida: document.getElementById('dev-risco').value,
            impacto_saida: document.getElementById('dev-impacto').value,
            pessoa_chave_tecnica: document.getElementById('dev-chave').value,
            comentarios: document.getElementById('dev-comentarios').value
        };
        
        const sucesso = await saveDesenvolvimento(nome, dados);
        
        if (sucesso) {
            statusDiv.style.background = '#d4edda';
            statusDiv.style.color = '#155724';
            statusDiv.innerHTML = '✅ Dados salvos com sucesso!';
            
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 3000);
        } else {
            throw new Error('Falha ao salvar');
        }
    } catch (error) {
        console.error('Erro ao salvar:', error);
        statusDiv.style.background = '#f8d7da';
        statusDiv.style.color = '#721c24';
        statusDiv.innerHTML = '❌ Erro ao salvar. Tente novamente.';
    }
}

// Event listener para mostrar/ocultar campo "Outros" da sucessão
document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'dev-sucessao') {
        const outrosField = document.getElementById('dev-sucessao-outros');
        if (outrosField) {
            outrosField.style.display = e.target.value === 'Outros' ? 'block' : 'none';
        }
    }
});

// Fechar modal ao clicar fora
document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

// ====== DRAG AND DROP FUNCTIONALITY ======

// Inicializar drag and drop nos items
function initializeDragAndDrop() {
    const personItems = document.querySelectorAll('.person-item');
    
    personItems.forEach(item => {
        item.setAttribute('draggable', 'true');
        
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
    });
    
    // Usar .person-list como target para drop
    const personLists = document.querySelectorAll('.person-list');
    personLists.forEach(list => {
        list.addEventListener('dragover', handleDragOver);
        list.addEventListener('drop', handleDrop);
        list.addEventListener('dragleave', handleDragLeave);
    });
}

let draggedElement = null;
let draggedPersonData = null;

function handleDragStart(e) {
    draggedElement = e.target;
    draggedElement.classList.add('dragging');

    const personName = draggedElement.dataset.personName || (draggedElement.querySelector('.person-name')?.textContent || '').trim();

    if (!personName) {
        console.error('Não foi possível identificar o colaborador arrastado.');
        return;
    }

    console.log('Dragging person:', personName);

    draggedPersonData = filteredData.find(p => {
        const name = (p['Usuário Avaliado'] || p['Avaliado'] || '').trim();
        return name === personName;
    });

    if (draggedPersonData) {
        console.log('Person data found:', draggedPersonData);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', personName);
    } else {
        console.error('Person data not found for:', personName);
    }
}

function handleDragEnd(e) {
    draggedElement.classList.remove('dragging');
    draggedElement = null;
    draggedPersonData = null;
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    
    e.dataTransfer.dropEffect = 'move';
    
    const targetList = e.currentTarget;
    // Adicionar efeito visual no container .box
    const boxContainer = targetList.closest('.box');
    if (boxContainer && !boxContainer.classList.contains('drag-over')) {
        boxContainer.classList.add('drag-over');
    }
    
    return false;
}

function handleDragLeave(e) {
    const targetList = e.currentTarget;
    const boxContainer = targetList.closest('.box');
    if (boxContainer) {
        boxContainer.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    e.preventDefault();
    
    const targetList = e.currentTarget;
    targetList.classList.remove('drag-over');
    
    console.log('Drop event triggered');
    console.log('Dragged person data:', draggedPersonData);
    
    if (!draggedPersonData) {
        console.error('No dragged person data available');
        return false;
    }
    
    // Obter posição do quadrante de destino do ID da person-list
    const boxId = targetList.id.replace('box-', '');
    const targetQuadrant = config.quadrantes[boxId];
    
    console.log('Target box:', boxId);
    console.log('Target quadrant:', targetQuadrant);
    
    const personName = draggedPersonData['Usuário Avaliado'] || draggedPersonData['Avaliado'];
    const notaDesempenho = draggedPersonData['Nota Final Desempenho'];
    const notaPotencial = draggedPersonData['Nota Final Potencial'];
    
    console.log('Moving person:', personName, 'to quadrant:', boxId);
    
    // Verificar se as notas correspondem ao quadrante
    const analysis = analyzeQuadrantFit(
        notaDesempenho, 
        notaPotencial, 
        targetQuadrant.eixoX, 
        targetQuadrant.eixoY
    );
    
    console.log('Analysis:', analysis);
    
    // Salvar override manual
    manualOverrides[personName] = boxId;
    
    console.log('Manual overrides updated:', manualOverrides);
    
    // Salvar no localStorage automaticamente
    saveChangesToLocalStorage();
    
    // Mostrar notificação
    showNotification(
        analysis.status,
        `${personName} movido para "${targetQuadrant.titulo}"`,
        analysis.message
    );
    
    // Atualizar visualização
    console.log('Updating Nine Box with overrides...');
    updateNineBoxWithOverrides();
    
    return false;
}

// Analisar se a pessoa está adequada ao quadrante
function analyzeQuadrantFit(notaDesempenho, notaPotencial, expectedDesempenho, expectedPotencial) {
    const classifDesempenho = getClassificationByScore(notaDesempenho);
    const classifPotencial = getClassificationByScore(notaPotencial);
    
    const desempenhoMatch = classifDesempenho === expectedDesempenho;
    const potencialMatch = classifPotencial === expectedPotencial;
    
    let status = 'success';
    let message = '';
    
    if (desempenhoMatch && potencialMatch) {
        status = 'success';
        message = `✓ Notas compatíveis: Desempenho "${classifDesempenho}", Potencial "${classifPotencial}"`;
    } else if (!desempenhoMatch && !potencialMatch) {
        status = 'error';
        message = `⚠ Notas incompatíveis: A pessoa tem Desempenho "${classifDesempenho}" (esperado: "${expectedDesempenho}") e Potencial "${classifPotencial}" (esperado: "${expectedPotencial}")`;
    } else if (!desempenhoMatch) {
        status = 'warning';
        message = `⚠ Desempenho incompatível: A pessoa tem "${classifDesempenho}" (esperado: "${expectedDesempenho}"). Potencial está correto.`;
    } else {
        status = 'warning';
        message = `⚠ Potencial incompatível: A pessoa tem "${classifPotencial}" (esperado: "${expectedPotencial}"). Desempenho está correto.`;
    }
    
    return { status, message };
}

// Converter nota em classificação
function getClassificationByScore(score) {
    if (score < 2) return 'Atende parcialmente';
    if (score < 3) return 'Atende dentro da expectativa';
    return 'Supera a expectativa';
}

// Mostrar notificação
function showNotification(type, title, message) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Atualizar Nine Box com overrides manuais
function updateNineBoxWithOverrides() {
    resetQuadrantBoxes();

    const boxes = {};

    filteredData.forEach(person => {
        const personName = person['Usuário Avaliado'] || person['Avaliado'];
        let position;

        if (manualOverrides[personName]) {
            position = manualOverrides[personName];
        } else {
            const classifDesempenho = person['Classificação Final Desempenho'];
            const classifPotencial = person['Classificação Final Potencial'];

            if (!classifDesempenho || !classifPotencial) {
                return;
            }

            position = getGridPositionByClassification(classifDesempenho, classifPotencial);
        }

        if (!boxes[position]) {
            boxes[position] = [];
        }

        person.ranking = calculateRanking(person);
        boxes[position].push(person);
    });

    Object.keys(boxes).forEach(position => {
        const boxElement = document.getElementById(`box-${position}`);
        const countElement = document.getElementById(`count-${position}`);

        if (!boxElement) {
            return;
        }

        const people = boxes[position];
        people.sort((a, b) => b.ranking - a.ranking);

        if (countElement) {
            countElement.textContent = people.length;
        }

        people.forEach((person, index) => {
            const personName = person['Usuário Avaliado'] || person['Avaliado'];
            const quadrante = config.quadrantes[position] || {};
            const hasManualOverride = Boolean(manualOverrides[personName]);
            let analysis = null;

            if (hasManualOverride) {
                analysis = analyzeQuadrantFit(
                    person['Nota Final Desempenho'],
                    person['Nota Final Potencial'],
                    quadrante.eixoX,
                    quadrante.eixoY
                );
            }

            const personDiv = createPersonItem(person, index, position, {
                analysis,
                override: hasManualOverride
            });

            boxElement.appendChild(personDiv);
        });
    });

    initializeDragAndDrop();
}

// Resetar mudanças manuais de posição
function resetManualChanges() {
    if (Object.keys(manualOverrides).length === 0) {
        showNotification('warning', 'Nenhuma alteração manual', 'Não há posições manuais para resetar.');
        return;
    }
    
    if (confirm('Deseja resetar todas as posições manuais? Esta ação removerá todas as alterações salvas.')) {
        const count = Object.keys(manualOverrides).length;
        manualOverrides = {};
        
        // Limpar localStorage
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error('Erro ao limpar localStorage:', error);
        }
        
        updateChangesCounter();
        showNotification('success', 'Posições resetadas', `${count} colaborador(es) retornaram às suas posições originais baseadas nas notas.`);
        
        updateNineBox();
    }
}

// Salvar mudanças no localStorage
function saveChangesToLocalStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(manualOverrides));
        console.log('Mudanças salvas no localStorage:', manualOverrides);
        updateChangesCounter();
    } catch (error) {
        console.error('Erro ao salvar no localStorage:', error);
        showNotification('error', 'Erro ao salvar', 'Não foi possível salvar as alterações localmente.');
    }
}

// Carregar mudanças do localStorage
function loadChangesFromLocalStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            manualOverrides = JSON.parse(saved);
            console.log('Mudanças carregadas do localStorage:', manualOverrides);
            const count = Object.keys(manualOverrides).length;
            if (count > 0) {
                updateChangesCounter();
                showNotification('success', 'Posições carregadas', `${count} alteração(ões) manual(is) foram restauradas.`);
            }
            return true;
        }
    } catch (error) {
        console.error('Erro ao carregar do localStorage:', error);
    }
    return false;
}

// Atualizar contador de mudanças
function updateChangesCounter() {
    const counter = document.getElementById('changesCount');
    if (counter) {
        const count = Object.keys(manualOverrides).length;
        counter.textContent = count;
        
        // Mostrar/ocultar o contador
        const counterContainer = counter.parentElement;
        if (counterContainer) {
            counterContainer.style.display = count > 0 ? 'flex' : 'none';
        }
    }
}

// Exportar CSV modificado
function exportModifiedCSV() {
    if (!allData || allData.length === 0) {
        showNotification('error', 'Sem dados', 'Não há dados para exportar. Carregue o arquivo de avaliações primeiro.');
        return;
    }
    
    // Criar cópia dos dados com as mudanças aplicadas
    const modifiedData = allData.map(person => {
        const personName = person['Usuário Avaliado'] || person['Avaliado'];
        const override = manualOverrides[personName];
        
        if (override) {
            // Pegar informações do quadrante de destino
            const quadrante = config.quadrantes[override];
            
            return {
                ...person,
                'Quadrante Manual': override,
                'Classificação Manual Desempenho': quadrante.eixoX,
                'Classificação Manual Potencial': quadrante.eixoY,
                'Título Quadrante': quadrante.titulo
            };
        }
        
        return person;
    });
    
    // Gerar cabeçalhos do CSV
    const headers = [
        'Área',
        'Formulário',
        'Usuário Avaliado',
        'Nota Final Desempenho',
        'Classificação Final Desempenho',
        'Nota Final Potencial',
        'Classificação Final Potencial',
        'Avaliador',
        'Quadrante Manual',
        'Classificação Manual Desempenho',
        'Classificação Manual Potencial',
        'Título Quadrante'
    ];
    
    let csvContent = headers.join(';') + '\n';
    
    modifiedData.forEach(person => {
        const row = [
            person['Área'] || '',
            person['Formulário'] || '',
            person['Usuário Avaliado'] || person['Avaliado'] || '',
            person['Nota Final Desempenho'] || '',
            person['Classificação Final Desempenho'] || '',
            person['Nota Final Potencial'] || '',
            person['Classificação Final Potencial'] || '',
            person['Avaliador'] || '',
            person['Quadrante Manual'] || '',
            person['Classificação Manual Desempenho'] || '',
            person['Classificação Manual Potencial'] || '',
            person['Título Quadrante'] || ''
        ];
        csvContent += row.join(';') + '\n';
    });
    
    // Criar e baixar o arquivo
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `ninebox_modificado_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    const changedCount = Object.keys(manualOverrides).length;
    showNotification('success', 'CSV exportado', `Arquivo exportado com sucesso! ${changedCount} colaborador(es) com posições modificadas.`);
}

// Mensagem inicial
console.log('Nine Box App carregado. Faça upload do arquivo CSV para começar.');
