# 📊 NineBox - Plataforma de Avaliação de Desempenho

Sistema completo de gestão de avaliações de desempenho, matriz Nine Box e planejamento de sucessão para a Reframax.

## 🚀 Tecnologias

- **Backend**: FastAPI + Python 3.13
- **Banco de Dados**: Supabase (PostgreSQL)
- **Frontend**: HTML5 + CSS3 + JavaScript (Vanilla)
- **Deploy**: Render (produção)
- **Autenticação**: Login via Supabase

## ✨ Funcionalidades

### Nine Box Matrix
- Matriz interativa de 9 quadrantes (Desempenho x Potencial)
- Drag & drop de colaboradores entre quadrantes
- Validação automática de compatibilidade de notas
- Exportação de dados modificados em CSV
- Indicadores visuais de alertas (compatibilidade de notas)

### Dashboard
- Estatísticas gerais de avaliações
- Distribuição por quadrante
- Análise de metas por grupos (Topo, Talentos, Core, etc.)
- Gráficos e métricas em tempo real

### Gestão de Pessoas
- Perfil completo de cada colaborador
- Histórico de avaliações (2024 vs 2025)
- Dados profissionais e pessoais
- Planejamento de desenvolvimento e sucessão
- Histórico de movimentações

### Filtros Avançados
- Por área, formulário, diretoria, gerência
- Por grupo de cargo e mesa de calibração
- Busca por nome

## 🏠 Rodando Localmente

### Pré-requisitos
- Python 3.11 ou superior
- Conexão com internet (Supabase)

### Instalação

1. **Clone o repositório** (ou baixe o ZIP)

2. **Instale as dependências**:
   ```powershell
   pip install -r requirements.txt
   ```

3. **Configure as variáveis de ambiente**:
   
   Crie/edite o arquivo `.env` na raiz do projeto:
   ```env
   SUPABASE_URL=https://zkhrvhumfxsucrwotxpt.supabase.co
   SUPABASE_KEY=sua_chave_aqui
   PORT=8000
   ```

4. **Teste a conexão com Supabase** (opcional):
   ```powershell
   python test_supabase_local.py
   ```

5. **Inicie a API**:
   ```powershell
   python api.py
   ```
   
   **Ou use o batch**:
   ```powershell
   .\start_server.bat
   ```

6. **Acesse no navegador**:
   ```
   http://localhost:8000/
   ```

### ⚠️ Proxy Corporativo

Se você estiver em uma rede com proxy corporativo (Zscaler, Fortinet, etc.), a API detecta automaticamente e desabilita a verificação SSL **apenas em desenvolvimento local**.

**Veja `LOCAL_SETUP.md` para detalhes completos**.

## 🌐 Produção

### Deploy Automático no Render

O projeto está configurado para deploy automático:

1. **Push para Git**:
   ```bash
   git add .
   git commit -m "Suas alterações"
   git push origin main
   ```

2. **Render faz deploy automaticamente**

3. **Configurar variáveis de ambiente no Render**:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `ALLOWED_ORIGINS` (opcional, domínios permitidos)

### Arquivos de Deploy

- `render.yaml`: Configuração de serviço Render
- `Procfile`: Comando de start para produção
- `runtime.txt`: Versão do Python (3.12.0)
- `requirements.txt`: Dependências Python

## 📁 Estrutura do Projeto

```
ninebox-app/
├── api.py                    # API FastAPI principal
├── app.js                    # JavaScript frontend (Nine Box + Dashboard)
├── config.js                 # Configuração de ambiente (dev/prod)
├── styles.css                # Estilos principais
├── login.css                 # Estilos da tela de login
├── index.html                # Página de login
├── ninebox.html              # Matriz Nine Box
├── dashboard.html            # Dashboard analítico
├── config.html               # Configurações de quadrantes
├── requirements.txt          # Dependências Python
├── .env                      # Variáveis de ambiente (local, git-ignored)
├── test_supabase_local.py    # Script de teste de conexão
├── LOCAL_SETUP.md            # Guia de configuração local
├── TROUBLESHOOTING.md        # Guia de troubleshooting
├── DEPLOY.md                 # Guia de deploy
└── image/                    # Imagens e assets
```

## 🔌 API Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api` | GET | Status da API |
| `/api/health` | GET | Health check + Supabase |
| `/api/login` | POST | Autenticação |
| `/api/usuarios` | GET | Listar usuários |
| `/api/avaliacoes` | GET | Avaliações de desempenho |
| `/api/funcionarios` | GET | Funcionários ativos |
| `/api/notas-avaliacao` | GET | Notas por avaliação |
| `/api/movimentacoes` | GET | Histórico de movimentações |
| `/api/areas-responsaveis` | GET | Áreas responsáveis |
| `/api/mesa-calibracao` | GET | Mesa de calibração |
| `/api/filtros` | GET | Valores para filtros |

**Documentação interativa**: `http://localhost:8000/docs` (Swagger)

## 🎨 Melhorias Recentes

### Interface do Modal de Colaborador
- ✅ Layout compacto e moderno
- ✅ Cabeçalho fixo (sticky) com informações principais
- ✅ Grid de duas colunas para densidade de informação
- ✅ Espaçamento otimizado (mais informação por tela)
- ✅ Chips e badges minimalistas
- ✅ Acessibilidade total: Esc para fechar, trap de foco, navegação por teclado

### Backend
- ✅ Detecção automática de ambiente (local vs produção)
- ✅ Bypass automático de SSL em ambiente local (proxy corporativo)
- ✅ Logging melhorado com emojis e indicadores visuais
- ✅ Suporte total ao Supabase em local e produção

## 🐛 Troubleshooting

### Erro de SSL Certificate em Local

**Sintoma**: `SSL: CERTIFICATE_VERIFY_FAILED`

**Solução**: A API detecta automaticamente e aplica patch SSL. Se persistir:

1. Execute o teste de conexão:
   ```powershell
   python test_supabase_local.py
   ```

2. Verifique os logs ao iniciar a API:
   ```
   WARNING: ⚠️ Ambiente LOCAL detectado - Aplicando patch SSL
   INFO: ✅ Patch SSL aplicado com sucesso
   ```

Veja `TROUBLESHOOTING.md` e `LOCAL_SETUP.md` para mais detalhes.

### Porta 8000 em uso

```powershell
# Encontrar processo
netstat -ano | findstr :8000

# Matar processo
taskkill /PID <PID> /F
```

## 📚 Documentação Adicional

- **LOCAL_SETUP.md**: Configuração detalhada do ambiente local
- **TROUBLESHOOTING.md**: Soluções para problemas comuns
- **DEPLOY.md**: Guia de deploy no Render
- **FRONTEND_DEPLOY.md**: Deploy de frontend estático
- **RENDER_SETUP.md**: Setup específico do Render

## 🔐 Segurança

- ✅ Autenticação via Supabase
- ✅ Variáveis de ambiente para credenciais
- ✅ CORS configurável
- ✅ SSL verificado em produção
- ⚠️ Bypass de SSL **APENAS** em ambiente local de desenvolvimento

## 📝 Licença

© 2025 Reframax. Todos os direitos reservados.

---

**Desenvolvido por**: Equipe Reframax + GitHub Copilot  
**Última atualização**: Outubro 2025
