"""
Teste rápido da API com a nova chave
"""
import requests
import json

print("=" * 70)
print("TESTE DE CONEXÃO COM A API")
print("=" * 70)
print()

base_url = "http://localhost:8000"

# Teste 1: Health Check
print("1. Testando /api/health...")
try:
    response = requests.get(f"{base_url}/api/health", timeout=10)
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ SUCCESS: {data.get('message')}")
        print(f"   Status: {data.get('status')}")
        print(f"   Supabase: {data.get('supabase')}")
    else:
        print(f"   ❌ ERRO: Status {response.status_code}")
        print(f"   Response: {response.text}")
except Exception as e:
    print(f"   ❌ ERRO: {e}")

print()

# Teste 2: Avaliações
print("2. Testando /api/avaliacoes...")
try:
    response = requests.get(f"{base_url}/api/avaliacoes", timeout=10)
    if response.status_code == 200:
        data = response.json()
        count = data.get('count', 0)
        print(f"   ✅ SUCCESS: {count} avaliações encontradas")
        if count > 0:
            print(f"   Primeira avaliação: {list(data['data'][0].keys())[:5]}...")
    else:
        print(f"   ❌ ERRO: Status {response.status_code}")
        print(f"   Response: {response.text[:200]}")
except Exception as e:
    print(f"   ❌ ERRO: {e}")

print()

# Teste 3: Funcionários
print("3. Testando /api/funcionarios...")
try:
    response = requests.get(f"{base_url}/api/funcionarios", timeout=10)
    if response.status_code == 200:
        data = response.json()
        count = data.get('count', 0)
        print(f"   ✅ SUCCESS: {count} funcionários encontrados")
        if count > 0:
            print(f"   Primeira funcionário: {list(data['data'][0].keys())[:5]}...")
    else:
        print(f"   ❌ ERRO: Status {response.status_code}")
except Exception as e:
    print(f"   ❌ ERRO: {e}")

print()

# Teste 4: Notas por Avaliação
print("4. Testando /api/notas-avaliacao...")
try:
    response = requests.get(f"{base_url}/api/notas-avaliacao", timeout=10)
    if response.status_code == 200:
        data = response.json()
        count = data.get('count', 0)
        print(f"   ✅ SUCCESS: {count} notas encontradas")
    else:
        print(f"   ❌ ERRO: Status {response.status_code}")
except Exception as e:
    print(f"   ❌ ERRO: {e}")

print()

# Teste 5: Movimentações
print("5. Testando /api/movimentacoes...")
try:
    response = requests.get(f"{base_url}/api/movimentacoes", timeout=10)
    if response.status_code == 200:
        data = response.json()
        count = data.get('count', 0)
        print(f"   ✅ SUCCESS: {count} movimentações encontradas")
    else:
        print(f"   ❌ ERRO: Status {response.status_code}")
except Exception as e:
    print(f"   ❌ ERRO: {e}")

print()
print("=" * 70)
print("TESTE CONCLUÍDO!")
print("=" * 70)
print()
print("Se todos os testes passaram, abra o index.html no navegador!")
print("Os dados devem carregar automaticamente.")
