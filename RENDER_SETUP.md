# 🔧 Configuração Manual no Render Dashboard

## O problema: Render está ignorando o render.yaml

Se você criou o serviço manualmente no Dashboard, ele não usa o `render.yaml` automaticamente. Siga este guia para configurar corretamente.

---

## ✅ Solução Rápida

### Opção A: Usar o Procfile (Mais Fácil)

1. **Já criamos o arquivo `Procfile`** na raiz do projeto com:
   ```
   web: uvicorn api:app --host 0.0.0.0 --port $PORT
   ```

2. **Commit e push**:
   ```bash
   git add Procfile
   git commit -m "Add Procfile para Render"
   git push origin main
   ```

3. **No Render Dashboard**:
   - Vá no seu serviço `ninebox-api`
   - Clique em **"Manual Deploy"** → **"Deploy latest commit"**
   - O Render detectará o Procfile automaticamente

---

### Opção B: Configurar manualmente no Dashboard

Se o Procfile não funcionar, configure diretamente:

#### 1. Acesse as configurações do serviço

Dashboard → seu serviço → **Settings**

#### 2. Configure o Start Command

Procure por **"Start Command"** e coloque:
```bash
uvicorn api:app --host 0.0.0.0 --port $PORT
```

#### 3. Configure o Build Command (opcional, mas recomendado)

Procure por **"Build Command"** e coloque:
```bash
pip install --upgrade pip && pip install -r requirements.txt
```

#### 4. Salve e redeploy

- Clique em **"Save Changes"**
- Clique em **"Manual Deploy"** → **"Clear build cache & deploy"**

---

## 📋 Checklist de Configuração Completa

### Configurações Básicas

- [ ] **Name**: `ninebox-api`
- [ ] **Runtime**: `Python 3`
- [ ] **Branch**: `main` (ou sua branch principal)
- [ ] **Root Directory**: deixe vazio (usa a raiz do repo)
- [ ] **Build Command**: `pip install --upgrade pip && pip install -r requirements.txt`
- [ ] **Start Command**: `uvicorn api:app --host 0.0.0.0 --port $PORT`

### Variáveis de Ambiente (Environment)

Vá em **Environment** → **Add Environment Variable** e adicione:

| Key | Value | Notes |
|-----|-------|-------|
| `SUPABASE_URL` | `https://xxx.supabase.co` | Seu URL do Supabase |
| `SUPABASE_KEY` | `eyJhbG...` | API Key do Supabase |
| `ALLOWED_ORIGINS` | `*` | Ou sua URL do frontend |
| `PYTHON_VERSION` | `3.12.0` | Versão do Python |

**Como obter SUPABASE_URL e SUPABASE_KEY:**
1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_KEY`

### Health Check Path

- [ ] **Health Check Path**: `/api/health`

Isso permite que o Render verifique se sua API está funcionando.

---

## 🎯 Opção C: Recriar usando Blueprint (Recomendado)

Se você quiser usar o `render.yaml` corretamente:

### 1. Delete o serviço atual (opcional)

No Dashboard → seu serviço → **Settings** → **Delete Web Service**

⚠️ **Cuidado**: Isso apagará o serviço. Anote as variáveis de ambiente antes!

### 2. Crie usando Blueprint

1. Dashboard → **New +** → **Blueprint**
2. Conecte seu repositório Git
3. O Render detectará o `render.yaml` automaticamente
4. Configure as variáveis de ambiente quando solicitado
5. Clique em **"Apply"**

Isso criará:
- ✅ `ninebox-api` (Backend FastAPI)
- ✅ `ninebox-frontend` (Frontend estático)

---

## 🧪 Testar após Deploy

### 1. Verificar se a API está online

```bash
curl https://ninebox-api.onrender.com/
```

Resposta esperada:
```json
{
  "message": "NineBox API está funcionando!",
  "status": "online",
  "version": "1.0.0"
}
```

### 2. Testar o Health Check

```bash
curl https://ninebox-api.onrender.com/api/health
```

Resposta esperada:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### 3. Ver logs em tempo real

Dashboard → seu serviço → **Logs**

---

## 🐛 Troubleshooting

### Erro: "gunicorn: command not found"
**Causa**: Start Command não está configurado
**Solução**: Configure o Start Command conforme opção A ou B acima

### Erro: "ModuleNotFoundError: No module named 'api'"
**Causa**: O arquivo `api.py` não está na raiz ou Root Directory está errado
**Solução**: 
- Certifique-se que `api.py` está na raiz do repositório
- Em Settings → Root Directory, deixe vazio

### Erro: "Port already in use"
**Causa**: Não está usando `$PORT` do Render
**Solução**: Use `--port $PORT` no Start Command (já está correto acima)

### Erro: "SUPABASE_URL e SUPABASE_KEY devem estar definidos"
**Causa**: Variáveis de ambiente não configuradas
**Solução**: Adicione as variáveis conforme checklist acima

### API demora muito para responder (15-30 segundos)
**Causa**: Cold start no plano Free (normal)
**Solução**: 
- É esperado após 15min de inatividade
- Para produção, considere plano pago ($7/mês)

---

## 📝 Comandos Git para Aplicar as Mudanças

```bash
# Adicionar o Procfile
git add Procfile

# Commit
git commit -m "Add Procfile e configurações para Render"

# Push
git push origin main
```

O Render fará o redeploy automaticamente.

---

## 🎉 Próximos Passos

Após o deploy bem-sucedido:

1. **Anote a URL da API**: `https://ninebox-api.onrender.com`

2. **Atualize o `config.js`** no frontend:
   ```javascript
   API_BASE_URL_PROD: 'https://ninebox-api.onrender.com/api',
   ```

3. **Commit e push** o frontend:
   ```bash
   git add config.js
   git commit -m "Update API URL for production"
   git push origin main
   ```

4. **Configure CORS** (se necessário):
   - Adicione `ALLOWED_ORIGINS` com a URL do seu frontend
   - Exemplo: `https://ninebox-frontend.onrender.com`

5. **Teste tudo**:
   - Abra o frontend
   - Faça login
   - Verifique se os dados carregam

---

## 📞 Links Úteis

- [Render Docs - FastAPI](https://render.com/docs/deploy-fastapi)
- [Render Docs - Environment Variables](https://render.com/docs/environment-variables)
- [Troubleshooting Deploys](https://render.com/docs/troubleshooting-deploys)

---

**Última atualização**: Procfile criado. Faça push e o erro do gunicorn será resolvido! 🚀
