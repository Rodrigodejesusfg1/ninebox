"""
Script para testar conexão com Supabase em ambiente local com proxy corporativo
"""
import os
import ssl
import warnings
from dotenv import load_dotenv

# ===== SOLUÇÃO DEFINITIVA: Monkey patch no httpcore ANTES de importar supabase =====
print("🔧 Aplicando patch para SSL...")

# Importar httpcore antes de tudo
import httpcore._backends.sync

# Salvar a função original
_original_start_tls = httpcore._backends.sync.SyncStream.start_tls

# Criar função patcheada que não verifica SSL
def _patched_start_tls(self, *args, **kwargs):
    # Forçar SSL context sem verificação
    kwargs['ssl_context'] = ssl._create_unverified_context()
    return _original_start_tls(self, *args, **kwargs)

# Aplicar o patch
httpcore._backends.sync.SyncStream.start_tls = _patched_start_tls
print("✅ Patch aplicado com sucesso!")

# Agora importar supabase (que usa httpx/httpcore internamente)
from supabase import create_client

# Suprimir warnings de SSL
warnings.filterwarnings('ignore', message='Unverified HTTPS request')
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Carregar .env
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

print("=" * 60)
print("🔍 TESTE DE CONEXÃO SUPABASE - AMBIENTE LOCAL")
print("=" * 60)
print(f"URL: {SUPABASE_URL[:40]}..." if SUPABASE_URL else "URL: MISSING")
print(f"KEY: {SUPABASE_KEY[:40]}..." if SUPABASE_KEY else "KEY: MISSING")
print("=" * 60)

try:
    # Criar cliente Supabase
    print("\n🔌 Criando cliente Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✅ Cliente Supabase criado!")
    
    # Testar consulta
    print("\n🔎 Testando consulta na tabela 'nota_final_colaborador'...")
    response = supabase.table("nota_final_colaborador").select("*").limit(5).execute()
    
    print(f"✅ SUCESSO! Conexão estabelecida.")
    print(f"📊 Registros retornados: {len(response.data)}")
    
    if response.data:
        print(f"\n📋 Exemplo de registro:")
        first_record = response.data[0]
        print(f"   Campos disponíveis: {list(first_record.keys())[:10]}...")
        if 'usuário_avaliado' in first_record or 'avaliado' in first_record:
            print(f"   Exemplo: {first_record.get('usuário_avaliado') or first_record.get('avaliado')}")
    
    print("\n" + "=" * 60)
    print("✅ TESTE CONCLUÍDO COM SUCESSO!")
    print("   A API pode rodar localmente com Supabase.")
    print("=" * 60)
    
except Exception as e:
    print(f"\n❌ ERRO: {type(e).__name__}")
    print(f"   Mensagem: {str(e)}")
    print("\n" + "=" * 60)
    print("❌ TESTE FALHOU")
    print("=" * 60)
    import traceback
    traceback.print_exc()



