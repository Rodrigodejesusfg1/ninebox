# 🏠 Configuração Local - NineBox API com Supabase

## ✅ Problema Resolvido

A API agora funciona **tanto em ambiente local (com proxy corporativo)** quanto **em produção no Render** usando o Supabase.

### O que foi corrigido?

**Problema original**: Em ambiente local com proxy corporativo (Zscaler, Fortinet, etc.), as requisições HTTPS para o Supabase falhavam com erro de certificado SSL:
```
SSL: CERTIFICATE_VERIFY_FAILED - self-signed certificate in certificate chain
```

**Solução implementada**: A API detecta automaticamente o ambiente e:
- **Local**: Aplica um patch no `httpcore` para desabilitar verificação SSL
- **Produção (Render)**: Usa SSL normal e verificado

---

## 🚀 Como Rodar Localmente

### 1. Instalar dependências

```powershell
pip install -r requirements.txt
```

### 2. Configurar variáveis de ambiente

Certifique-se de que o arquivo `.env` existe com as credenciais do Supabase:

```env
SUPABASE_URL=https://zkhrvhumfxsucrwotxpt.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=8000
```

### 3. Testar conexão com Supabase (opcional)

Execute o script de teste para verificar se a conexão funciona:

```powershell
python test_supabase_local.py
```

**Saída esperada:**
```
🔧 Aplicando patch para SSL...
✅ Patch aplicado com sucesso!
============================================================
🔍 TESTE DE CONEXÃO SUPABASE - AMBIENTE LOCAL
============================================================
URL: https://zkhrvhumfxsucrwotxpt.supabase.co...
KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...
============================================================

🔌 Criando cliente Supabase...
✅ Cliente Supabase criado!

🔎 Testando consulta na tabela 'nota_final_colaborador'...
✅ SUCESSO! Conexão estabelecida.
📊 Registros retornados: 5

✅ TESTE CONCLUÍDO COM SUCESSO!
```

### 4. Iniciar a API

```powershell
python api.py
```

**Ou use o script batch:**
```powershell
.\start_server.bat
```

**Saída esperada:**
```
WARNING:__main__:⚠️ Ambiente LOCAL detectado - Aplicando patch SSL para proxy corporativo
INFO:__main__:✅ Patch SSL aplicado com sucesso (ambiente local)
INFO:__main__:✅ Cliente Supabase inicializado (LOCAL - SSL bypass ativado)
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### 5. Testar endpoints

Abra outro terminal e teste:

```powershell
# Health check
curl http://localhost:8000/api/health

# Listar avaliações (primeiros 10 registros)
curl "http://localhost:8000/api/avaliacoes?limit=10"

# Listar funcionários
curl "http://localhost:8000/api/funcionarios?limit=10"
```

### 6. Acessar frontend

Abra no navegador:
```
http://localhost:8000/
```

Ou diretamente:
```
http://localhost:8000/ninebox.html
```

---

## 🔧 Como Funciona Tecnicamente

### Detecção de Ambiente

A API detecta automaticamente o ambiente verificando se a variável `RENDER` existe:

```python
is_local_env = os.getenv("RENDER") is None
```

- **Local** (sem `RENDER`): Aplica patch SSL
- **Produção** (Render define `RENDER`): Usa SSL normal

### Patch SSL (apenas local)

O código aplica um "monkey patch" no `httpcore` (biblioteca usada pelo Supabase internamente):

```python
import httpcore._backends.sync

# Salvar função original
_original_start_tls = httpcore._backends.sync.SyncStream.start_tls

# Função patcheada
def _patched_start_tls(self, *args, **kwargs):
    kwargs['ssl_context'] = ssl._create_unverified_context()
    return _original_start_tls(self, *args, **kwargs)

# Aplicar patch
httpcore._backends.sync.SyncStream.start_tls = _patched_start_tls
```

Isso substitui temporariamente a função de SSL para não verificar certificados em ambiente local com proxy corporativo.

---

## 📦 Arquivos Modificados

### `api.py`
- ✅ Adicionada detecção automática de ambiente
- ✅ Patch SSL para ambiente local com proxy
- ✅ Logging melhorado indicando o ambiente detectado

### `requirements.txt`
- ✅ Adicionado `httpx>=0.24.0` (explicitamente)

### Novos arquivos

#### `test_supabase_local.py`
Script de teste para verificar conexão com Supabase antes de rodar a API.

#### `LOCAL_SETUP.md` (este arquivo)
Documentação completa de configuração local.

---

## ⚠️ Importante

### Segurança

- ⚠️ **O bypass de SSL só ocorre em ambiente LOCAL** (detectado pela ausência da variável `RENDER`)
- ✅ **Em produção**, o SSL é verificado normalmente e de forma segura
- 🔐 **NUNCA** desabilite verificação SSL em produção

### Limitações

- Este patch **só funciona em ambiente de desenvolvimento local**
- Se você rodar a API em outro servidor (não Render), adicione uma variável de ambiente para forçar produção:
  ```env
  RENDER=true
  ```

---

## 🐛 Troubleshooting

### Erro: "Module 'httpcore' has no attribute '_backends'"

**Causa**: Versão antiga do httpcore.

**Solução**:
```powershell
pip install --upgrade httpx httpcore
```

### Erro: "SUPABASE_URL e SUPABASE_KEY devem estar definidos"

**Causa**: Arquivo `.env` não encontrado ou incompleto.

**Solução**:
1. Verifique se o arquivo `.env` existe na raiz do projeto
2. Confirme que contém `SUPABASE_URL` e `SUPABASE_KEY`

### Erro: "Port 8000 already in use"

**Causa**: Outra instância da API está rodando.

**Solução**:
```powershell
# Matar processo usando a porta 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

---

## 🚀 Deploy em Produção (Render)

A API funciona automaticamente em produção **sem modificações**:

1. Faça push para o repositório Git:
   ```bash
   git add .
   git commit -m "fix: API funciona em local e produção com Supabase"
   git push origin main
   ```

2. O Render vai detectar as mudanças e fazer deploy automaticamente

3. As variáveis `SUPABASE_URL` e `SUPABASE_KEY` devem estar configuradas no dashboard do Render

---

## 📊 Endpoints Disponíveis

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api` | GET | Status da API |
| `/api/health` | GET | Health check + teste Supabase |
| `/api/login` | POST | Autenticação de usuário |
| `/api/usuarios` | GET | Listar usuários |
| `/api/avaliacoes` | GET | Avaliações de desempenho |
| `/api/funcionarios` | GET | Funcionários ativos |
| `/api/notas-avaliacao` | GET | Notas por avaliação |
| `/api/movimentacoes` | GET | Histórico de movimentações |
| `/api/areas-responsaveis` | GET | Áreas responsáveis |
| `/api/mesa-calibracao` | GET | Mesa de calibração |
| `/api/filtros` | GET | Valores únicos para filtros |

---

## ✅ Checklist Final

Antes de usar a API localmente:

- [ ] Arquivo `.env` existe e está configurado
- [ ] Dependências instaladas (`pip install -r requirements.txt`)
- [ ] Teste de conexão passou (`python test_supabase_local.py`)
- [ ] API iniciada (`python api.py`)
- [ ] Health check respondendo (`curl http://localhost:8000/api/health`)

---

**Última atualização**: Outubro 2025  
**Ambiente testado**: Windows 10/11 com Python 3.13 + Proxy Corporativo (Zscaler)
