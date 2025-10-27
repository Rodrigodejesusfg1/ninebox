// Configuração de ambiente para produção
// Este arquivo deve ser atualizado após o deploy com a URL correta da API

window.ENV_CONFIG = {
    // Desenvolvimento local
    API_BASE_URL_DEV: 'http://localhost:8000/api',
    
    // Produção no Render
    // Substitua pela URL real da sua API
    API_BASE_URL_PROD: 'https://avaliacaodedesempenhoreframax.onrender.com/api',
    
    // Detecta automaticamente o ambiente
    getApiUrl: function() {
        const isDev = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
        return isDev ? this.API_BASE_URL_DEV : this.API_BASE_URL_PROD;
    }
};
