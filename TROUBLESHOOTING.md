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

---

## Acessibilidade do Modal de Colaborador

- Pressione Esc para fechar o modal rapidamente.
- O foco do teclado é preso dentro do modal enquanto ele estiver aberto (Tab/Shift+Tab circula entre os campos do modal).
- O botão Fechar no canto superior direito é focável e tem indicação de foco visível.
- Clique fora do conteúdo do modal para fechá-lo também.

Se o modal não fechar com Esc, verifique no console se há erros de JavaScript no arquivo `app.js` relacionados a eventos de teclado.

---

## 🏠 Rodando a API Localmente com Proxy Corporativo

### Problema: SSL Certificate Error em Ambiente Local

**Sintoma**: Ao rodar `python api.py` localmente, a API falha ao conectar com Supabase:
```
SSL: CERTIFICATE_VERIFY_FAILED - self-signed certificate in certificate chain
```

**Causa**: Proxy corporativo (Zscaler, Fortinet, etc.) intercepta conexões HTTPS e injeta certificados próprios.

### ✅ Solução Implementada

A API agora **detecta automaticamente** se está rodando localmente ou em produção:

- **Local** (sem variável `RENDER`): Desabilita verificação SSL automaticamente
- **Produção** (Render): Usa SSL verificado normalmente

#### Como Usar

1. **Testar conexão primeiro** (opcional):
   ```powershell
   python test_supabase_local.py
   ```

2. **Iniciar a API**:
   ```powershell
   python api.py
   ```
   
   Ou use o batch:
   ```powershell
   .\start_server.bat
   ```

3. **Verificar logs**:
   ```
   WARNING:__main__:⚠️ Ambiente LOCAL detectado - Aplicando patch SSL
   INFO:__main__:✅ Patch SSL aplicado com sucesso (ambiente local)
   INFO:__main__:✅ Cliente Supabase inicializado (LOCAL - SSL bypass ativado)
   INFO:     Uvicorn running on http://0.0.0.0:8000
   ```

#### Testar Endpoints

```powershell
# Health check
curl http://localhost:8000/api/health

# Listar avaliações
curl http://localhost:8000/api/avaliacoes?limit=5

# Acessar frontend
# Abra no navegador: http://localhost:8000/
```

### Detalhes Técnicos

A API usa um "monkey patch" no módulo `httpcore` para desabilitar verificação SSL **apenas em ambiente local**:

```python
import httpcore._backends.sync

# Patch aplicado automaticamente quando RENDER não está definido
def _patched_start_tls(self, *args, **kwargs):
    kwargs['ssl_context'] = ssl._create_unverified_context()
    return _original_start_tls(self, *args, **kwargs)
```

### Segurança

- ⚠️ **Bypass SSL só acontece em ambiente local** (desenvolvimento)
- ✅ **Produção usa SSL verificado** e seguro
- 🔐 A detecção de ambiente é automática via variável `RENDER`

### Documentação Completa

Veja `LOCAL_SETUP.md` para instruções detalhadas de setup local.

---
