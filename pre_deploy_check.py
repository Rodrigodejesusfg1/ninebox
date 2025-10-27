#!/usr/bin/env python3
"""
Script de verificação pré-deploy
Verifica se todos os arquivos necessários estão presentes e configurados
"""

import os
import sys
from pathlib import Path

def check_file_exists(filename, required=True):
    """Verifica se um arquivo existe"""
    exists = Path(filename).exists()
    status = "✅" if exists else ("❌" if required else "⚠️")
    print(f"{status} {filename}")
    return exists

def check_env_vars():
    """Verifica variáveis de ambiente"""
    print("\n🔍 Verificando variáveis de ambiente:")
    
    required_vars = ["SUPABASE_URL", "SUPABASE_KEY"]
    all_set = True
    
    for var in required_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var} está configurada")
        else:
            print(f"❌ {var} NÃO está configurada")
            all_set = False
    
    return all_set

def main():
    print("🚀 Verificação Pré-Deploy - NineBox")
    print("=" * 50)
    
    print("\n📁 Verificando arquivos necessários:")
    
    required_files = [
        "api.py",
        "app.js",
        "config.js",
        "index.html",
        "ninebox.html",
        "requirements.txt",
        "runtime.txt",
        "render.yaml",
        ".gitignore",
    ]
    
    optional_files = [
        "DEPLOY.md",
        ".renderignore",
        "README.md",
    ]
    
    all_required_present = True
    for file in required_files:
        if not check_file_exists(file, required=True):
            all_required_present = False
    
    for file in optional_files:
        check_file_exists(file, required=False)
    
    # Verificar conteúdo do requirements.txt
    print("\n📦 Verificando dependências:")
    try:
        with open("requirements.txt", "r") as f:
            deps = f.read()
            required_deps = ["fastapi", "uvicorn", "supabase", "python-dotenv"]
            for dep in required_deps:
                if dep in deps.lower():
                    print(f"✅ {dep}")
                else:
                    print(f"❌ {dep} faltando em requirements.txt")
    except FileNotFoundError:
        print("❌ requirements.txt não encontrado")
    
    # Verificar render.yaml
    print("\n⚙️ Verificando render.yaml:")
    try:
        with open("render.yaml", "r") as f:
            content = f.read()
            if "ninebox-api" in content:
                print("✅ Serviço API configurado")
            else:
                print("⚠️ Serviço API pode não estar configurado")
            
            if "ninebox-frontend" in content:
                print("✅ Serviço Frontend configurado")
            else:
                print("⚠️ Serviço Frontend pode não estar configurado")
    except FileNotFoundError:
        print("❌ render.yaml não encontrado")
    
    # Verificar variáveis de ambiente (apenas para teste local)
    if Path(".env").exists():
        from dotenv import load_dotenv
        load_dotenv()
        check_env_vars()
    else:
        print("\n⚠️ Arquivo .env não encontrado (ok para produção no Render)")
        print("   Certifique-se de configurar as variáveis no Dashboard do Render")
    
    # Resultado final
    print("\n" + "=" * 50)
    if all_required_present:
        print("✅ PRONTO PARA DEPLOY!")
        print("\n📝 Próximos passos:")
        print("1. Commitar todas as mudanças: git add . && git commit -m 'Deploy setup'")
        print("2. Fazer push: git push origin main")
        print("3. Criar serviço no Render usando o render.yaml")
        print("4. Configurar variáveis de ambiente no Render Dashboard")
        print("5. Atualizar config.js com a URL da API após o deploy")
        return 0
    else:
        print("❌ ALGUNS ARQUIVOS NECESSÁRIOS ESTÃO FALTANDO")
        print("   Verifique os itens marcados com ❌ acima")
        return 1

if __name__ == "__main__":
    sys.exit(main())
