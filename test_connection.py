"""
Script de teste para verificar conexão com Supabase
"""
from dotenv import load_dotenv
import os
import ssl
import warnings

# Desabilitar avisos de SSL (apenas para desenvolvimento/teste)
warnings.filterwarnings('ignore')
os.environ['PYTHONHTTPSVERIFY'] = '0'

# Carregar variáveis de ambiente
load_dotenv()

print("=" * 60)
print("TESTE DE CONEXÃO COM SUPABASE")
print("=" * 60)
print()

# Verificar variáveis de ambiente
print("1. Verificando variáveis de ambiente...")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if SUPABASE_URL:
    print(f"   ✅ SUPABASE_URL: {SUPABASE_URL}")
else:
    print("   ❌ SUPABASE_URL não encontrada!")
    
if SUPABASE_KEY:
    print(f"   ✅ SUPABASE_KEY: {SUPABASE_KEY[:20]}...")
else:
    print("   ❌ SUPABASE_KEY não encontrada!")

print()

# Tentar importar supabase
print("2. Verificando instalação do supabase...")
try:
    from supabase import create_client, Client
    print("   ✅ Biblioteca supabase instalada")
except ImportError as e:
    print(f"   ❌ Erro ao importar supabase: {e}")
    exit(1)

print()

# Tentar conectar
print("3. Tentando conectar ao Supabase...")
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("   ✅ Cliente Supabase criado com sucesso")
except Exception as e:
    print(f"   ❌ Erro ao criar cliente: {e}")
    exit(1)

print()

# Testar consulta em cada tabela
print("4. Testando consultas nas tabelas...")

tabelas = [
    "nota_final_colaborador",
    "relacao_ativos",
    "nota_por_avaliacao",
    "movimentacao_salario",
    "colaborador_area_responsavel",
    "idiomas",
    "interesse_mudanca_area",
    "nota_avd_2024"
]

resultados = {}

for tabela in tabelas:
    try:
        response = supabase.table(tabela).select("*").limit(1).execute()
        count = len(response.data)
        resultados[tabela] = {
            "status": "✅",
            "registros": count,
            "erro": None
        }
        print(f"   ✅ {tabela}: OK")
    except Exception as e:
        resultados[tabela] = {
            "status": "❌",
            "registros": 0,
            "erro": str(e)
        }
        print(f"   ❌ {tabela}: ERRO - {str(e)[:50]}...")

print()

# Contar registros totais
print("5. Contando registros nas tabelas principais...")

tabelas_principais = {
    "nota_final_colaborador": "Avaliações",
    "relacao_ativos": "Funcionários",
    "nota_por_avaliacao": "Notas por Avaliação",
    "movimentacao_salario": "Movimentações"
}

for tabela, nome in tabelas_principais.items():
    try:
        response = supabase.table(tabela).select("*", count="exact").execute()
        total = response.count if hasattr(response, 'count') else len(response.data)
        print(f"   📊 {nome}: {total} registros")
    except Exception as e:
        print(f"   ❌ {nome}: Erro ao contar - {str(e)[:50]}...")

print()
print("=" * 60)
print("TESTE CONCLUÍDO")
print("=" * 60)
print()

# Resumo
total_ok = sum(1 for r in resultados.values() if r["status"] == "✅")
total_erro = sum(1 for r in resultados.values() if r["status"] == "❌")

print(f"Tabelas OK: {total_ok}/{len(tabelas)}")
print(f"Tabelas com erro: {total_erro}/{len(tabelas)}")
print()

if total_erro == 0:
    print("🎉 SUCESSO! Todas as conexões funcionando corretamente!")
    print("✅ Você pode iniciar a aplicação com: python api.py")
else:
    print("⚠️ ATENÇÃO! Algumas tabelas apresentaram erros.")
    print("Verifique as permissões e a estrutura das tabelas no Supabase.")
