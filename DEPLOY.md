# NineBox - Deploy no Render

Sistema de avaliação de desempenho com matriz Nine Box.

## 🚀 Deploy Rápido no Render

### Pré-requisitos

1. Conta no [Render](https://render.com)
2. Conta no [Supabase](https://supabase.com) com banco de dados configurado
3. Repositório Git com o código (GitHub, GitLab ou Bitbucket)

### Passo 1: Preparar o Repositório

1. **Commitar todos os arquivos**:
```bash
git add .
git commit -m "Preparar para deploy no Render"
git push origin main
```

2. **Verificar arquivos importantes**:
   - ✅ `render.yaml` - Configuração dos serviços
   - ✅ `requirements.txt` - Dependências Python
   - ✅ `runtime.txt` - Versão do Python
   - ✅ `.gitignore` - Ignora arquivos sensíveis
   - ✅ `config.js` - Configuração de ambiente

### Passo 2: Deploy no Render

#### Opção A: Deploy via Blueprint (Recomendado)

1. Acesse o [Dashboard do Render](https://dashboard.render.com/)
2. Clique em **"New +"** → **"Blueprint"**
3. Conecte seu repositório Git
4. O Render detectará automaticamente o `render.yaml`
5. Configure as variáveis de ambiente (veja abaixo)
6. Clique em **"Apply"**

#### Opção B: Deploy Manual

**Backend (API):**
1. No Render Dashboard, clique em **"New +"** → **"Web Service"**
2. Conecte seu repositório
3. Configure:
   - **Name**: `ninebox-api`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn api:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free
4. Adicione as variáveis de ambiente (veja abaixo)
5. Clique em **"Create Web Service"**

**Frontend:**
1. No Render Dashboard, clique em **"New +"** → **"Static Site"**
2. Conecte o mesmo repositório
3. Configure:
   - **Name**: `ninebox-frontend`
   - **Build Command**: `echo "No build needed"`
   - **Publish Directory**: `.` (raiz)
4. Clique em **"Create Static Site"**

### Passo 3: Configurar Variáveis de Ambiente

No serviço **ninebox-api**, adicione as seguintes variáveis:

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `SUPABASE_URL` | `https://xxx.supabase.co` | URL do seu projeto Supabase |
| `SUPABASE_KEY` | `eyJhbG...` | API Key do Supabase (anon/public) |
| `ALLOWED_ORIGINS` | `https://ninebox-frontend.onrender.com,https://seudominio.com` | Domínios permitidos (CORS) |

**Como obter as credenciais do Supabase:**
1. Acesse seu projeto no [Supabase Dashboard](https://app.supabase.com)
2. Vá em **Settings** → **API**
3. Copie:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_KEY`

### Passo 4: Atualizar URLs no Frontend

Após o deploy, você receberá duas URLs:
- Backend: `https://ninebox-api.onrender.com`
- Frontend: `https://ninebox-frontend.onrender.com`

1. Edite o arquivo `config.js`:
```javascript
API_BASE_URL_PROD: 'https://ninebox-api.onrender.com/api',
```

2. Commite e faça push:
```bash
git add config.js
git commit -m "Atualizar URL da API de produção"
git push origin main
```

O Render fará o redeploy automaticamente.

### Passo 5: Configurar CORS

No serviço da API, atualize a variável `ALLOWED_ORIGINS`:

```
ALLOWED_ORIGINS=https://ninebox-frontend.onrender.com
```

Se tiver domínio customizado:
```
ALLOWED_ORIGINS=https://ninebox-frontend.onrender.com,https://seudominio.com
```

### Passo 6: Testar o Deploy

1. Acesse o frontend: `https://ninebox-frontend.onrender.com`
2. Teste o login com credenciais válidas
3. Verifique se os dados carregam corretamente
4. Teste a navegação entre páginas

## 🔧 Configurações Adicionais

### Domínio Customizado

1. No Render Dashboard, acesse seu Static Site
2. Vá em **Settings** → **Custom Domains**
3. Adicione seu domínio e siga as instruções DNS
4. Atualize `ALLOWED_ORIGINS` na API

### Logs e Monitoramento

- **Ver logs**: Render Dashboard → seu serviço → **Logs**
- **Health checks**: A API tem endpoint `/api/health`
- **Métricas**: Disponíveis no Dashboard do Render

### Escalabilidade

O plano Free do Render tem limitações:
- ⏰ Inatividade por 15min desliga o serviço (cold start de ~30s)
- 💾 750 horas/mês de runtime
- 🚀 Para produção séria, considere plano pago

## 🐛 Troubleshooting

### API não conecta ao Supabase
- Verifique se `SUPABASE_URL` e `SUPABASE_KEY` estão corretas
- Confirme que o IP do Render não está bloqueado no Supabase
- Veja os logs: Dashboard → ninebox-api → Logs

### Erro de CORS
- Atualize `ALLOWED_ORIGINS` com a URL correta do frontend
- Formato: `https://ninebox-frontend.onrender.com` (sem barra final)

### Frontend não carrega dados
- Verifique se `config.js` tem a URL correta da API
- Abra DevTools (F12) → Console para ver erros
- Confirme que a API está online: `https://ninebox-api.onrender.com/api/health`

### Cold Start lento
- Normal no plano Free (15min de inatividade = serviço desliga)
- Primeira requisição após inatividade leva ~30 segundos
- Solução: upgrade para plano pago ou usar um "ping" periódico

## 📁 Estrutura de Arquivos

```
ninebox-app/
├── api.py                  # Backend FastAPI
├── app.js                  # Lógica principal do frontend
├── config.js               # Configuração de ambiente
├── index.html              # Página de login
├── ninebox.html            # Matriz Nine Box
├── dashboard.html          # Dashboard de estatísticas
├── config.html             # Configurações
├── styles.css              # Estilos gerais
├── login.css               # Estilos do login
├── requirements.txt        # Dependências Python
├── runtime.txt             # Versão do Python
├── render.yaml             # Configuração do Render
└── .gitignore              # Arquivos ignorados
```

## 🔐 Segurança

### Em Produção:
- [ ] Altere senhas padrão no banco de dados
- [ ] Use HTTPS (Render fornece automaticamente)
- [ ] Configure `ALLOWED_ORIGINS` com domínios específicos
- [ ] Implemente hash de senhas (bcrypt) no backend
- [ ] Adicione rate limiting
- [ ] Configure variáveis de ambiente como "secret"

### Recomendações:
1. **Nunca** commite o arquivo `.env` no Git
2. Use secrets do Render para credenciais sensíveis
3. Implemente autenticação JWT para APIs
4. Adicione validação de entrada em todos os endpoints

## 📞 Suporte

- [Documentação do Render](https://render.com/docs)
- [Documentação do Supabase](https://supabase.com/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com/)

## 📝 Licença

© 2025 Reframax. Todos os direitos reservados.
