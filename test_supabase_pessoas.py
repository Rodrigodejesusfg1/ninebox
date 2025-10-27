"""
Teste direto de conexão com tabela pessoas_avaliadas no Supabase
"""
import os
import sys
import ssl
import httpcore

# Aplicar patch SSL ANTES de importar supabase
print("🔧 Aplicando patch SSL...")
original_start_tls = httpcore._backends.sync.SyncStream.start_tls

def patched_start_tls(self, *args, **kwargs):
    kwargs['ssl_context'] = ssl._create_unverified_context()
    return original_start_tls(self, *args, **kwargs)

httpcore._backends.sync.SyncStream.start_tls = patched_start_tls
print("✅ Patch SSL aplicado")

# Agora importar supabase
from supabase import create_client

# Configuração
SUPABASE_URL = "https://ygqjccyhfujjfemqywsy.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncWpjY3loZnVqamZlbXF5d3N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk3ODA0NzgsImV4cCI6MjA0NTM1NjQ3OH0.JrY2TuBwF_dv58eESjFiEO8T0iG4lTFVD4w9TQYvT-E"

print("\n🔌 Conectando ao Supabase...")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
print("✅ Conexão estabelecida")

# Tentar diferentes variações do nome da tabela
nomes_tabela = [
    "pessoas_avaliadas",
    "pessoas avaliadas",
    "Pessoas Avaliadas",
    "Pessoas_Avaliadas",
    "PESSOAS_AVALIADAS",
    "PESSOAS AVALIADAS"
]

print("\n🔍 Testando diferentes variações do nome da tabela...\n")

for nome in nomes_tabela:
    try:
        print(f"📋 Tentando: '{nome}'")
        response = supabase.table(nome).select("*").limit(3).execute()
        
        if response.data and len(response.data) > 0:
            print(f"   ✅ SUCESSO! Tabela encontrada: '{nome}'")
            print(f"   📊 Registros retornados: {len(response.data)}")
            print(f"   🔑 Chaves disponíveis: {list(response.data[0].keys())}")
            
            # Verificar campo GESTOR especificamente
            primeiro = response.data[0]
            print(f"\n   📋 Primeiro registro completo:")
            for key, value in primeiro.items():
                tipo_valor = type(value).__name__
                valor_str = str(value)[:50] if value else "None"
                print(f"      {key} ({tipo_valor}): {valor_str}")
            
            # Contar gestores únicos
            gestores = set()
            for item in response.data:
                for key in item.keys():
                    if 'GESTOR' in key.upper() or 'gestor' in key.lower():
                        valor = item.get(key)
                        if valor:
                            gestores.add(f"{key}={valor}")
            
            if gestores:
                print(f"\n   👥 Campos com 'GESTOR' encontrados:")
                for g in sorted(gestores):
                    print(f"      {g}")
            else:
                print(f"\n   ⚠️ Nenhum campo com 'GESTOR' encontrado")
            
            print("\n" + "="*60 + "\n")
            break
        else:
            print(f"   ⚠️ Tabela existe mas sem dados")
            
    except Exception as e:
        erro_str = str(e)
        if "does not exist" in erro_str or "not found" in erro_str:
            print(f"   ❌ Tabela não encontrada")
        else:
            print(f"   ❌ Erro: {erro_str[:100]}")
    
    print()

print("\n✅ Teste concluído!")
