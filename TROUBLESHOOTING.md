# 🔧 Troubleshooting - Deploy no Render

## Erro: "pydantic-core" falha ao compilar

### Causa
O Render tentou compilar `pydantic-core` do código fonte (requer Rust), mas o ambiente free tier não tem suporte completo.

### Solução Aplicada ✅

1. **Atualizadas as versões no `requirements.txt`** para usar ranges flexíveis:
   ```
   fastapi>=0.109.0,<0.111.0
   uvicorn[standard]>=0.27.0,<0.28.0
   supabase>=2.3.0,<3.0.0
   python-dotenv>=1.0.0,<2.0.0
   ```

2. **Atualizado `runtime.txt`** para Python 3.12.0 (melhor suporte a wheels pré-compilados)

3. **Melhorado `render.yaml`** com flags de otimização:
   - `pip install --upgrade pip` antes de instalar dependências
   - `PIP_NO_CACHE_DIR=1` para economizar espaço

### Como Aplicar a Correção

1. **Commitar as mudanças**:
```bash
git add requirements.txt runtime.txt render.yaml
git commit -m "Fix: Resolver erro de build do pydantic-core no Render"
git push origin main
```

2. **No Dashboard do Render**:
   - O deploy será automaticamente retriggered
   - Ou clique em "Manual Deploy" → "Clear build cache & deploy"

### Se o erro persistir

#### Opção A: Usar versões ainda mais estáveis (Testado em produção)
Edite `requirements.txt`:
```txt
fastapi==0.104.1
uvicorn==0.24.0.post1
supabase==1.2.0
python-dotenv==1.0.0
```

E `runtime.txt`:
```txt
python-3.11.5
```

#### Opção B: Forçar instalação de wheels binários
Adicione no início do `requirements.txt`:
```txt
--only-binary=:all:
```

Isso força o pip a usar apenas pacotes binários pré-compilados.

#### Opção C: Build alternativo no render.yaml
```yaml
buildCommand: |
  pip install --upgrade pip setuptools wheel
  pip install --prefer-binary -r requirements.txt
```

### Verificação Rápida de Outras Dependências

Execute localmente para testar:
```bash
pip install -r requirements.txt --dry-run
```

## Outros Problemas Comuns

### 1. "uvicorn: command not found"
**Causa**: uvicorn não foi instalado corretamente

**Solução**:
- Verifique se está em `requirements.txt`
- Use `uvicorn[standard]` para incluir todas as dependências

### 2. "ModuleNotFoundError: No module named 'dotenv'"
**Causa**: Variável de ambiente tentando carregar .env mas pacote não instalado

**Solução**:
- Adicione `python-dotenv` ao `requirements.txt`
- No Render, use variáveis de ambiente nativas (não precisa de .env)

### 3. "Port already in use"
**Causa**: Render define a porta via variável `$PORT`

**Solução**:
Certifique-se que o startCommand usa `--port $PORT`:
```yaml
startCommand: uvicorn api:app --host 0.0.0.0 --port $PORT
```

### 4. Erro 502 Bad Gateway
**Possíveis causas**:
- API não inicializou corretamente
- Porta incorreta
- Health check falhando

**Debug**:
1. Veja os logs: Dashboard → seu serviço → Logs
2. Teste o health check: `curl https://seu-app.onrender.com/api/health`
3. Verifique se `SUPABASE_URL` e `SUPABASE_KEY` estão configuradas

### 5. CORS Error no frontend
**Causa**: API não permite origem do frontend

**Solução**:
Configure no Render Dashboard (variáveis de ambiente):
```
ALLOWED_ORIGINS=https://seu-frontend.onrender.com
```

Se múltiplos domínios:
```
ALLOWED_ORIGINS=https://frontend1.onrender.com,https://frontend2.com
```

## Logs Úteis para Debug

### Ver logs em tempo real:
```bash
# No Dashboard do Render
Dashboard → seu serviço → Logs (aba superior)
```

### Verificar build logs:
```bash
Dashboard → seu serviço → Events → clique no deploy
```

### Teste local antes de fazer deploy:
```bash
# Instalar dependências
pip install -r requirements.txt

# Rodar API localmente
uvicorn api:app --reload --port 8000

# Testar health check
curl http://localhost:8000/api/health
```

## Comandos Úteis no Render

### Limpar cache de build:
Dashboard → Settings → "Clear build cache & deploy"

### Forçar redeploy:
Dashboard → Manual Deploy → "Deploy latest commit"

### Ver variáveis de ambiente:
Dashboard → Environment → Environment Variables

## Suporte Adicional

- [Render Docs - Python](https://render.com/docs/deploy-fastapi)
- [Render Community](https://community.render.com/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/docker/)

## Checklist Final ✅

Antes de fazer deploy, confirme:

- [ ] `requirements.txt` tem versões compatíveis
- [ ] `runtime.txt` especifica Python 3.11+ ou 3.12
- [ ] `render.yaml` está configurado corretamente
- [ ] Variáveis `SUPABASE_URL` e `SUPABASE_KEY` configuradas no Render
- [ ] `config.js` tem URL correta da API (após primeiro deploy)
- [ ] `.env` está no `.gitignore` (não commitar credenciais!)
- [ ] Testou localmente com `uvicorn api:app --reload`

---

**Última atualização**: As correções foram aplicadas. Faça push e o Render deverá fazer o build com sucesso! 🚀
