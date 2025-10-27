"""
Teste do endpoint /api/pessoas-avaliadas
"""
import requests
import json

try:
    # Testar endpoint
    print("🔍 Testando endpoint /api/pessoas-avaliadas...")
    response = requests.get("http://localhost:8000/api/pessoas-avaliadas", params={"limit": 3})
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Sucesso! Status: {response.status_code}")
        print(f"📊 Total de registros retornados: {data.get('count', 0)}")
        
        if data.get('data') and len(data['data']) > 0:
            print("\n📋 Estrutura do primeiro registro:")
            primeiro = data['data'][0]
            print(json.dumps(primeiro, indent=2, ensure_ascii=False))
            
            print("\n🔑 Chaves disponíveis:")
            for key in primeiro.keys():
                print(f"  - {key}: {type(primeiro[key]).__name__}")
            
            # Verificar se tem GESTOR e NOME
            if 'GESTOR' in primeiro:
                print(f"\n✅ Campo GESTOR encontrado: '{primeiro['GESTOR']}'")
            else:
                print("\n❌ Campo GESTOR NÃO encontrado!")
                
            if 'NOME' in primeiro:
                print(f"✅ Campo NOME encontrado: '{primeiro['NOME']}'")
            else:
                print("❌ Campo NOME NÃO encontrado!")
                
            # Mostrar todos os gestores únicos
            print("\n👥 Gestores únicos nos dados:")
            gestores = set()
            for item in data['data']:
                gestor = item.get('GESTOR', '')
                if gestor:
                    gestores.add(gestor)
            
            for gestor in sorted(gestores):
                print(f"  - {gestor}")
                
        else:
            print("⚠️ Nenhum dado retornado")
    else:
        print(f"❌ Erro! Status: {response.status_code}")
        print(f"Resposta: {response.text}")
        
except Exception as e:
    print(f"❌ Erro ao testar: {e}")
