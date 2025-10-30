// Configuração de ambiente para a aplicação
// Em produção, usamos sempre same-origin (window.location.origin + '/api') para evitar CORS

window.ENV_CONFIG = {
    // Desenvolvimento local
    API_BASE_URL_DEV: 'http://localhost:8000/api',

    // Produção (same-origin, independente do subdomínio gerado pelo Render)
    getApiUrl: function() {
        const host = (window.location.hostname || '').toLowerCase();
        const isDev = host === 'localhost' || host === '127.0.0.1';
        if (isDev) {
            return this.API_BASE_URL_DEV;
        }
        return `${window.location.origin}/api`;
    }
};
