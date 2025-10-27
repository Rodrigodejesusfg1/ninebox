"""
Script para verificar qual tipo de chave API você está usando
"""
import base64
import json
from dotenv import load_dotenv
import os

load_dotenv()

SUPABASE_KEY = os.getenv("SUPABASE_KEY")

print("=" * 70)
print("VERIFICAÇÃO DE CHAVE API DO SUPABASE")
print("=" * 70)
print()

if not SUPABASE_KEY:
    print("❌ SUPABASE_KEY não encontrada no arquivo .env")
    exit(1)

print(f"✅ Chave encontrada: {SUPABASE_KEY[:30]}...")
print()

# Decodificar JWT
try:
    # JWT tem 3 partes separadas por '.'
    parts = SUPABASE_KEY.split('.')
    
    if len(parts) != 3:
        print("❌ Formato de JWT inválido")
        exit(1)
    
    # Decodificar a parte do payload (segunda parte)
    payload = parts[1]
    
    # Adicionar padding se necessário
    padding = len(payload) % 4
    if padding:
        payload += '=' * (4 - padding)
    
    # Decodificar base64
    decoded = base64.b64decode(payload)
    payload_data = json.loads(decoded)
    
    print("📋 Informações da Chave:")
    print("-" * 70)
    print(f"Emissor (iss): {payload_data.get('iss', 'N/A')}")
    print(f"Projeto (ref): {payload_data.get('ref', 'N/A')}")
    print(f"Role: {payload_data.get('role', 'N/A')}")
    print(f"Emitido em: {payload_data.get('iat', 'N/A')}")
    print(f"Expira em: {payload_data.get('exp', 'N/A')}")
    print()
    
    role = payload_data.get('role', '').lower()
    
    if role == 'anon':
        print("⚠️  ATENÇÃO: Você está usando a chave ANON (pública)")
        print()
        print("Esta chave tem permissões limitadas e pode não funcionar")
        print("para acessar todas as tabelas.")
        print()
        print("🔧 SOLUÇÃO:")
        print("1. Acesse https://supabase.com/dashboard")
        print("2. Vá em Settings > API")
        print("3. Copie a 'service_role key' (não a 'anon key')")
        print("4. Atualize o arquivo .env com a service_role key")
        print("5. Reinicie o servidor")
        print()
        print("📖 Veja o arquivo OBTER_SERVICE_KEY.md para instruções detalhadas")
        
    elif role == 'service_role':
        print("✅ PERFEITO! Você está usando a SERVICE_ROLE key")
        print()
        print("Esta chave tem permissões administrativas completas")
        print("e deve funcionar para todas as operações.")
        print()
        print("Se ainda houver erros, pode ser:")
        print("- Problema de rede/firewall")
        print("- Tabelas não existem no Supabase")
        print("- URL do Supabase incorreta")
    else:
        print(f"❓ Tipo de chave desconhecido: {role}")
        print()
        print("Você deveria estar usando a 'service_role' key")
        
except Exception as e:
    print(f"❌ Erro ao decodificar chave: {e}")
    print()
    print("Verifique se a SUPABASE_KEY no arquivo .env está correta")

print()
print("=" * 70)
