"""
API alternativa usando requests direto para contornar problemas de SSL
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from typing import List, Dict, Any
import logging
import requests
import urllib3

# Desabilitar avisos de SSL
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Carregar variáveis de ambiente
load_dotenv()

# Inicializar FastAPI
app = FastAPI(title="NineBox API", version="1.0.0")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuração Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL e SUPABASE_KEY devem estar definidos no arquivo .env")

# Função auxiliar para fazer requisições ao Supabase com paginação automática
def query_supabase(table: str, select="*", limit_per_page=1000):
    """
    Busca todos os registros de uma tabela, fazendo paginação automática se necessário.
    O Supabase limita a 1000 registros por padrão, então fazemos múltiplas requisições.
    """
    all_data = []
    offset = 0
    
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table}"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
            "Range": f"{offset}-{offset + limit_per_page - 1}"  # Range-based pagination
        }
        
        # Parâmetros da query
        params = {}
        if select != "*":
            params["select"] = select
        
        try:
            logger.info(f"Consultando {table} (offset: {offset}, limit: {limit_per_page})")
            response = requests.get(url, headers=headers, params=params, verify=False, timeout=30)
            
            # Log detalhado do erro
            if response.status_code not in [200, 206]:  # 206 = Partial Content (paginação)
                logger.error(f"Status: {response.status_code}")
                logger.error(f"Response: {response.text}")
                logger.error(f"Headers usados: {headers}")
                response.raise_for_status()
            
            data = response.json()
            
            # Se não retornou dados, terminamos
            if not data or len(data) == 0:
                break
            
            all_data.extend(data)
            
            # Se retornou menos que o limite, é a última página
            if len(data) < limit_per_page:
                break
            
            # Próxima página
            offset += limit_per_page
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro ao consultar {table}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Erro ao consultar {table}: {str(e)}")
    
    logger.info(f"Total de registros encontrados em {table}: {len(all_data)}")
    return all_data

@app.get("/")
async def root():
    return {
        "message": "NineBox API está funcionando!",
        "status": "online",
        "version": "2.0.0 (Direct REST)"
    }

@app.get("/api/health")
async def health_check():
    try:
        # Tentar uma consulta simples
        data = query_supabase("nota_final_colaborador", "count")
        return {
            "status": "healthy",
            "supabase": "connected",
            "message": "Conexão com Supabase OK",
            "method": "Direct REST API"
        }
    except Exception as e:
        logger.error(f"Erro na verificação de saúde: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao conectar com Supabase: {str(e)}")

@app.get("/api/avaliacoes")
async def get_avaliacoes():
    try:
        logger.info("Buscando avaliações no Supabase...")
        data = query_supabase("nota_final_colaborador")
        logger.info(f"Avaliações encontradas: {len(data)}")
        return {"data": data, "count": len(data)}
    except Exception as e:
        logger.error(f"Erro ao buscar avaliações: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar avaliações: {str(e)}")

@app.get("/api/funcionarios")
async def get_funcionarios():
    try:
        logger.info("Buscando funcionários ativos no Supabase...")
        data = query_supabase("relacao_ativos")
        logger.info(f"Funcionários encontrados: {len(data)}")
        return {"data": data, "count": len(data)}
    except Exception as e:
        logger.error(f"Erro ao buscar funcionários: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar funcionários: {str(e)}")

@app.get("/api/notas-avaliacao")
async def get_notas_avaliacao():
    try:
        logger.info("Buscando notas por avaliação no Supabase...")
        data = query_supabase("nota_por_avaliacao")
        logger.info(f"Notas por avaliação encontradas: {len(data)}")
        return {"data": data, "count": len(data)}
    except Exception as e:
        logger.error(f"Erro ao buscar notas por avaliação: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar notas por avaliação: {str(e)}")

@app.get("/api/movimentacoes")
async def get_movimentacoes():
    try:
        logger.info("Buscando histórico de movimentações no Supabase...")
        data = query_supabase("movimentacao_salario")
        logger.info(f"Movimentações encontradas: {len(data)}")
        return {"data": data, "count": len(data)}
    except Exception as e:
        logger.error(f"Erro ao buscar movimentações: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar movimentações: {str(e)}")

@app.get("/api/areas-responsaveis")
async def get_areas_responsaveis():
    try:
        logger.info("Buscando áreas responsáveis no Supabase...")
        data = query_supabase("colaborador_area_responsavel")
        logger.info(f"Áreas responsáveis encontradas: {len(data)}")
        return {"data": data, "count": len(data)}
    except Exception as e:
        logger.error(f"Erro ao buscar áreas responsáveis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar áreas responsáveis: {str(e)}")

@app.get("/api/idiomas")
async def get_idiomas():
    try:
        logger.info("Buscando idiomas no Supabase...")
        data = query_supabase("idiomas")
        logger.info(f"Registros de idiomas encontrados: {len(data)}")
        return {"data": data, "count": len(data)}
    except Exception as e:
        logger.error(f"Erro ao buscar idiomas: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar idiomas: {str(e)}")

@app.get("/api/interesse-mudanca")
async def get_interesse_mudanca():
    try:
        logger.info("Buscando interesse de mudança no Supabase...")
        data = query_supabase("interesse_mudanca_area")
        logger.info(f"Registros de interesse encontrados: {len(data)}")
        return {"data": data, "count": len(data)}
    except Exception as e:
        logger.error(f"Erro ao buscar interesse de mudança: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar interesse de mudança: {str(e)}")

@app.get("/api/nota-avd-2024")
async def get_nota_avd_2024():
    try:
        logger.info("Buscando notas AVD 2024 no Supabase...")
        data = query_supabase("nota_avd_2024")
        logger.info(f"Notas AVD 2024 encontradas: {len(data)}")
        return {"data": data, "count": len(data)}
    except Exception as e:
        logger.error(f"Erro ao buscar notas AVD 2024: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar notas AVD 2024: {str(e)}")

@app.get("/api/filtros")
async def get_filtros():
    try:
        logger.info("Buscando valores para filtros...")
        
        avaliacoes = query_supabase("nota_final_colaborador", "área,formulário")
        funcionarios = query_supabase("relacao_ativos", "diretoria,gerencia,cargo")
        
        areas = list(set([a.get("área") for a in avaliacoes if a.get("área")]))
        formularios = list(set([a.get("formulário") for a in avaliacoes if a.get("formulário")]))
        diretorias = list(set([f.get("diretoria") for f in funcionarios if f.get("diretoria")]))
        gerencias = list(set([f.get("gerencia") for f in funcionarios if f.get("gerencia")]))
        cargos = list(set([f.get("cargo") for f in funcionarios if f.get("cargo")]))
        
        areas.sort()
        formularios.sort()
        diretorias.sort()
        gerencias.sort()
        cargos.sort()
        
        return {
            "areas": areas,
            "formularios": formularios,
            "diretorias": diretorias,
            "gerencias": gerencias,
            "cargos": cargos
        }
    except Exception as e:
        logger.error(f"Erro ao buscar filtros: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar filtros: {str(e)}")

# ====== DESENVOLVIMENTO DE COLABORADORES ======

@app.get("/api/desenvolvimento/{colaborador}")
async def get_desenvolvimento(colaborador: str):
    """Buscar dados de desenvolvimento de um colaborador específico"""
    try:
        logger.info(f"Buscando desenvolvimento para: {colaborador}")
        # Buscar por nome do colaborador
        data = query_supabase("desenvolvimento_colaborador")
        result = [d for d in data if d.get("colaborador", "").upper() == colaborador.upper()]
        
        if result:
            logger.info(f"Desenvolvimento encontrado para {colaborador}")
            return {"data": result[0], "found": True}
        else:
            logger.info(f"Nenhum desenvolvimento encontrado para {colaborador}")
            return {"data": None, "found": False}
    except Exception as e:
        logger.error(f"Erro ao buscar desenvolvimento: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar desenvolvimento: {str(e)}")

@app.post("/api/desenvolvimento")
async def save_desenvolvimento(data: dict):
    """Salvar ou atualizar dados de desenvolvimento de um colaborador"""
    try:
        logger.info(f"Salvando desenvolvimento para: {data.get('colaborador')}")
        
        # Montar URL para insert/upsert
        url = f"{SUPABASE_URL}/rest/v1/desenvolvimento_colaborador"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=representation"
        }
        
        # Fazer upsert (insert ou update)
        response = requests.post(url, json=data, headers=headers, verify=False, timeout=30)
        
        if response.status_code not in [200, 201]:
            logger.error(f"Erro ao salvar: {response.status_code} - {response.text}")
            raise HTTPException(status_code=response.status_code, detail=response.text)
        
        result = response.json()
        logger.info(f"Desenvolvimento salvo com sucesso para {data.get('colaborador')}")
        return {"success": True, "data": result}
        
    except Exception as e:
        logger.error(f"Erro ao salvar desenvolvimento: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao salvar desenvolvimento: {str(e)}")

@app.put("/api/desenvolvimento/{colaborador}")
async def update_desenvolvimento(colaborador: str, data: dict):
    """Atualizar dados de desenvolvimento de um colaborador"""
    try:
        logger.info(f"Atualizando desenvolvimento para: {colaborador}")
        
        # Adicionar colaborador aos dados
        data["colaborador"] = colaborador
        data["atualizado_em"] = "NOW()"
        
        # Buscar ID do registro existente
        existing = query_supabase("desenvolvimento_colaborador")
        existing_record = next((d for d in existing if d.get("colaborador", "").upper() == colaborador.upper()), None)
        
        if not existing_record:
            # Se não existe, criar novo
            return await save_desenvolvimento(data)
        
        # Se existe, fazer update
        record_id = existing_record.get("id")
        url = f"{SUPABASE_URL}/rest/v1/desenvolvimento_colaborador?id=eq.{record_id}"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        response = requests.patch(url, json=data, headers=headers, verify=False, timeout=30)
        
        if response.status_code not in [200, 204]:
            logger.error(f"Erro ao atualizar: {response.status_code} - {response.text}")
            raise HTTPException(status_code=response.status_code, detail=response.text)
        
        logger.info(f"Desenvolvimento atualizado com sucesso para {colaborador}")
        return {"success": True, "message": "Atualizado com sucesso"}
        
    except Exception as e:
        logger.error(f"Erro ao atualizar desenvolvimento: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar desenvolvimento: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Iniciando servidor na porta {port}...")
    uvicorn.run("api_requests:app", host="0.0.0.0", port=port, reload=True)
