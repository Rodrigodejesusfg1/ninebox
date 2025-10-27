# 🌐 Deploy do Frontend no Render

## ✅ Status da API

A API já está rodando e funcionando:
- **URL**: https://avaliacaodedesempenhoreframax.onrender.com
- **Health Check**: ✅ Conectado ao Supabase
- **Status**: Online

---

## 🚀 Opções para Deploy do Frontend

### Opção A: Usar Render Static Site (Grátis)

#### 1. Criar o Static Site no Render

1. Acesse [Render Dashboard](https://dashboard.render.com/)
2. Clique em **"New +"** → **"Static Site"**
3. Conecte seu repositório Git
4. Configure:
   - **Name**: `ninebox-frontend` (ou outro nome)
   - **Branch**: `main`
   - **Root Directory**: deixe vazio
   - **Build Command**: `echo "Static site - no build needed"`
   - **Publish Directory**: `.` (ponto para indicar raiz)

5. Clique em **"Create Static Site"**

#### 2. Configurar Redirects (para SPA)

Após criar o site, adicione um arquivo `_redirects` na raiz:

```
/*  /index.html  200
```

Isso garante que todas as rotas (como `/ninebox.html`) funcionem corretamente.

#### 3. Commit e Push

```bash
# Criar arquivo _redirects
echo "/*  /index.html  200" > _redirects

# Adicionar ao Git
git add _redirects config.js
git commit -m "Deploy frontend no Render"
git push origin main
```

O Render fará o deploy automaticamente.

---

### Opção B: Usar GitHub Pages (Também Grátis)

#### 1. Ativar GitHub Pages

1. Vá no seu repositório no GitHub
2. **Settings** → **Pages**
3. Em **Source**, selecione:
   - Branch: `main`
   - Folder: `/ (root)`
4. Clique em **"Save"**

#### 2. A URL será:
```
https://seu-usuario.github.io/seu-repositorio/
```

#### 3. Atualizar CORS na API

No Render Dashboard, adicione a variável:
```
ALLOWED_ORIGINS=https://seu-usuario.github.io
```

---

### Opção C: Usar Vercel (Mais Rápido)

#### 1. Instalar Vercel CLI

```bash
npm install -g vercel
```

#### 2. Deploy

```bash
cd "c:\Users\rodrigo.goncalves\REFRAMAX\DEP-RH - Documentos\AVALIAÇÃO DE DESEMPENHO\2025\Relatórios\ninebox-app"
vercel
```

Siga as instruções no terminal.

---

## ⚙️ Configuração de CORS (Importante!)

Após fazer deploy do frontend, você precisa atualizar o CORS na API.

### 1. No Render Dashboard da API

1. Vá em **Environment**
2. Adicione ou edite a variável `ALLOWED_ORIGINS`:

```
ALLOWED_ORIGINS=https://seu-frontend.onrender.com,https://avaliacaodedesempenhoreframax.onrender.com
```

Ou se for GitHub Pages:
```
ALLOWED_ORIGINS=https://seu-usuario.github.io
```

### 2. Salvar e Redeploy

- Clique em **"Save Changes"**
- A API será reiniciada automaticamente

---

## 🧪 Testar o Frontend

Após o deploy:

1. **Abra a URL do frontend** (ex: `https://ninebox-frontend.onrender.com`)

2. **Verifique se abre a página de login**
   - Se mostrar um erro 404, verifique o arquivo `_redirects`

3. **Teste o login**
   - Use as credenciais cadastradas no Supabase
   - Veja no DevTools (F12) → Console se há erros de CORS

4. **Se funcionar**:
   - ✅ Login deve redirecionar para `ninebox.html`
   - ✅ Dados devem carregar do Supabase
   - ✅ Filtros devem funcionar

---

## 🐛 Problemas Comuns

### Erro: "CORS policy: No 'Access-Control-Allow-Origin'"

**Solução**: Configure `ALLOWED_ORIGINS` na API conforme acima.

### Erro: "Failed to fetch"

**Causas possíveis**:
- API está offline (cold start de ~30s no primeiro acesso)
- URL da API incorreta no `config.js`
- CORS não configurado

**Debug**:
```javascript
// Abra o DevTools (F12) no frontend
console.log('API URL:', window.ENV_CONFIG.getApiUrl());
```

### Frontend carrega, mas não mostra dados

**Verifique**:
1. `config.js` tem a URL correta: `https://avaliacaodedesempenhoreframax.onrender.com/api`
2. Abra Network tab (F12) e veja se as requisições estão sendo feitas
3. Verifique se há erro de autenticação (localStorage.auth_user)

### Página em branco ou 404

**Solução**: Crie o arquivo `_redirects`:
```
/*  /index.html  200
```

---

## 📝 Checklist Final

- [ ] API rodando: https://avaliacaodedesempenhoreframax.onrender.com ✅
- [ ] `config.js` atualizado com URL da API ✅
- [ ] Frontend deployado (escolha uma opção acima)
- [ ] `ALLOWED_ORIGINS` configurado na API
- [ ] Arquivo `_redirects` criado (se usar Render Static)
- [ ] Testado login e carregamento de dados
- [ ] HTTPS funcionando (certificado automático no Render)

---

## 🎯 Próximos Passos Recomendados

### 1. Deploy do Frontend Agora

Execute estes comandos:

```bash
cd "c:\Users\rodrigo.goncalves\REFRAMAX\DEP-RH - Documentos\AVALIAÇÃO DE DESEMPENHO\2025\Relatórios\ninebox-app"

# Criar arquivo _redirects
echo "/*  /index.html  200" > _redirects

# Commit
git add _redirects config.js
git commit -m "Configurar frontend para produção"
git push origin main
```

### 2. Criar Static Site no Render

Siga a **Opção A** acima para criar o frontend.

### 3. Testar Tudo

Após o deploy, teste:
- Login
- Navegação entre páginas
- Carregamento de dados
- Filtros

---

## 🔐 Segurança para Produção

Antes de usar em produção real:

- [ ] Implementar hash de senhas (bcrypt) em vez de plaintext
- [ ] Adicionar rate limiting na API
- [ ] Configurar `ALLOWED_ORIGINS` com domínios específicos (não `*`)
- [ ] Adicionar autenticação JWT
- [ ] Configurar variáveis como "secret" no Render
- [ ] Adicionar HTTPS redirect (já incluído no Render)
- [ ] Implementar logs e monitoramento

---

**Sua API está pronta! Agora é só fazer deploy do frontend seguindo uma das opções acima.** 🚀
