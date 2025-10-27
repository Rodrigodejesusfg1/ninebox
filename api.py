from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from dotenv import load_dotenv
import os
from typing import List, Dict, Any
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Carregar variáveis de ambiente
load_dotenv()

# Inicializar FastAPI
app = FastAPI(title="NineBox API", version="1.0.0")

# Configurar CORS - Em produção, especifique os domínios permitidos
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar cliente Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL e SUPABASE_KEY devem estar definidos no arquivo .env")

try:
    # Criar cliente Supabase
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    logger.info("Cliente Supabase inicializado com sucesso")
except Exception as e:
    logger.error(f"Erro ao inicializar Supabase: {e}")
    supabase = None


# ===== Utilitários =====
class LoginRequest(BaseModel):
    nome: str
    senha: str


def validate_supabase():
    if supabase is None:
        raise HTTPException(status_code=500, detail="Supabase não inicializado.")


def validate_user_credentials(nome: str, senha: str) -> bool:
    """Valida usuário na tabela 'usuarios' por igualdade exata de nome e senha."""
    try:
        validate_supabase()
        resp = (
            supabase
            .table("usuarios")
            .select("nome, senha")
            .eq("nome", nome)
            .eq("senha", senha)
            .limit(1)
            .execute()
        )
        ok = bool(resp.data and len(resp.data) > 0)
        logger.info(f"Login tentativa para '{nome}': {'SUCESSO' if ok else 'FALHA'}")
        return ok
    except Exception as e:
        logger.error(f"Erro ao validar credenciais: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao validar credenciais: {str(e)}")

@app.get("/")
async def root():
    """Endpoint raiz para verificar se a API está funcionando"""
    return {
        "message": "NineBox API está funcionando!",
        "status": "online",
        "version": "1.0.0"
    }

@app.get("/api/health")
async def health_check():
    """Verificar saúde da API e conexão com Supabase"""
    try:
        # Tentar uma consulta simples para verificar conexão
        response = supabase.table("nota_final_colaborador").select("*").limit(1).execute()
        return {
            "status": "healthy",
            "supabase": "connected",
            "message": "Conexão com Supabase OK"
        }
    except Exception as e:
        logger.error(f"Erro na verificação de saúde: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao conectar com Supabase: {str(e)}")


@app.post("/api/login")
async def post_login(payload: LoginRequest):
    """Valida credenciais contra a tabela 'usuarios'. Retorna sempre 200 com authenticated=True/False."""
    try:
        nome = (payload.nome or "").strip()
        senha = (payload.senha or "").strip()
        if not nome or not senha:
            return {"authenticated": False, "reason": "missing-fields"}

        authenticated = validate_user_credentials(nome, senha)
        return {"authenticated": authenticated}
    except HTTPException:
        # propagar erros controlados
        raise
    except Exception as e:
        logger.error(f"Erro no login: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro no login: {str(e)}")


@app.get("/api/usuarios")
async def get_usuarios(
    nome: str | None = Query(None, description="Filtro exato por nome"),
    limit: int = Query(1000, ge=1, le=10000),
    offset: int = Query(0, ge=0),
):
    """Lista usuarios (nome, senha). Em produção, evite retornar senha; aqui é para ambiente controlado."""
    try:
        validate_supabase()
        logger.info("Buscando usuarios no Supabase...")
        q = supabase.table("usuarios").select("nome, senha")
        if nome:
            q = q.eq("nome", nome)
        else:
            start = offset
            end = offset + limit - 1
            q = q.range(start, end)
        resp = q.execute()
        data = resp.data or []
        return {"data": data, "count": len(data)}
    except Exception as e:
        logger.error(f"Erro ao buscar usuarios: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar usuarios: {str(e)}")

@app.get("/api/avaliacoes")
async def get_avaliacoes(limit: int = Query(1000, ge=1, le=10000), offset: int = Query(0, ge=0)):
    """
    Obter todas as avaliações (nota_final_colaborador)
    Equivalente ao arquivo_consolidado.csv
    """
    try:
        logger.info("Buscando avaliações no Supabase...")
        start = offset
        end = offset + limit - 1
        response = supabase.table("nota_final_colaborador").select("*").range(start, end).execute()
        
        if not response.data:
            return {"data": [], "count": 0}
        
        logger.info(f"Avaliações encontradas nesta página: {len(response.data)} (offset={offset}, limit={limit})")
        return {
            "data": response.data,
            "count": len(response.data)
        }
    except Exception as e:
        logger.error(f"Erro ao buscar avaliações: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar avaliações: {str(e)}")

@app.get("/api/funcionarios")
async def get_funcionarios(limit: int = Query(1000, ge=1, le=10000), offset: int = Query(0, ge=0)):
    """
    Obter todos os funcionários ativos (relacao_ativos)
    Equivalente ao 2025_09_30_relação_ativos.csv
    """
    try:
        logger.info("Buscando funcionários ativos no Supabase...")
        start = offset
        end = offset + limit - 1
        response = supabase.table("relacao_ativos").select("*").range(start, end).execute()
        
        if not response.data:
            return {"data": [], "count": 0}
        
        logger.info(f"Funcionários encontrados nesta página: {len(response.data)} (offset={offset}, limit={limit})")
        return {
            "data": response.data,
            "count": len(response.data)
        }
    except Exception as e:
        logger.error(f"Erro ao buscar funcionários: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar funcionários: {str(e)}")

@app.get("/api/notas-avaliacao")
async def get_notas_avaliacao(limit: int = Query(1000, ge=1, le=10000), offset: int = Query(0, ge=0)):
    """
    Obter notas por avaliação (nota_por_avaliacao)
    Equivalente ao nota-final-por-avaliacao-csv.csv
    """
    try:
        logger.info("Buscando notas por avaliação no Supabase...")
        start = offset
        end = offset + limit - 1
        response = supabase.table("nota_por_avaliacao").select("*").range(start, end).execute()
        
        if not response.data:
            return {"data": [], "count": 0}
        
        logger.info(f"Notas por avaliação nesta página: {len(response.data)} (offset={offset}, limit={limit})")
        return {
            "data": response.data,
            "count": len(response.data)
        }
    except Exception as e:
        logger.error(f"Erro ao buscar notas por avaliação: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar notas por avaliação: {str(e)}")

@app.get("/api/movimentacoes")
async def get_movimentacoes(limit: int = Query(1000, ge=1, le=10000), offset: int = Query(0, ge=0)):
    """
    Obter histórico de movimentações (movimentacao_salario)
    Equivalente ao Historico de movimentações.csv
    """
    try:
        logger.info("Buscando histórico de movimentações no Supabase...")
        start = offset
        end = offset + limit - 1
        response = supabase.table("movimentacao_salario").select("*").range(start, end).execute()
        
        if not response.data:
            return {"data": [], "count": 0}
        
        logger.info(f"Movimentações encontradas nesta página: {len(response.data)} (offset={offset}, limit={limit})")
        return {
            "data": response.data,
            "count": len(response.data)
        }
    except Exception as e:
        logger.error(f"Erro ao buscar movimentações: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar movimentações: {str(e)}")

@app.get("/api/areas-responsaveis")
async def get_areas_responsaveis(limit: int = Query(1000, ge=1, le=10000), offset: int = Query(0, ge=0)):
    """
    Obter colaboradores e áreas responsáveis
    """
    try:
        logger.info("Buscando áreas responsáveis no Supabase...")
        start = offset
        end = offset + limit - 1
        response = supabase.table("colaborador_area_responsavel").select("*").range(start, end).execute()
        
        if not response.data:
            return {"data": [], "count": 0}
        
        logger.info(f"Áreas responsáveis nesta página: {len(response.data)} (offset={offset}, limit={limit})")
        return {
            "data": response.data,
            "count": len(response.data)
        }
    except Exception as e:
        logger.error(f"Erro ao buscar áreas responsáveis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar áreas responsáveis: {str(e)}")

@app.get("/api/idiomas")
async def get_idiomas(limit: int = Query(1000, ge=1, le=10000), offset: int = Query(0, ge=0)):
    """
    Obter idiomas dos colaboradores
    """
    try:
        logger.info("Buscando idiomas no Supabase...")
        start = offset
        end = offset + limit - 1
        response = supabase.table("idiomas").select("*").range(start, end).execute()
        
        if not response.data:
            return {"data": [], "count": 0}
        
        logger.info(f"Registros de idiomas nesta página: {len(response.data)} (offset={offset}, limit={limit})")
        return {
            "data": response.data,
            "count": len(response.data)
        }
    except Exception as e:
        logger.error(f"Erro ao buscar idiomas: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar idiomas: {str(e)}")

@app.get("/api/interesse-mudanca")
async def get_interesse_mudanca(limit: int = Query(1000, ge=1, le=10000), offset: int = Query(0, ge=0)):
    """
    Obter interesse de mudança de área
    """
    try:
        logger.info("Buscando interesse de mudança no Supabase...")
        start = offset
        end = offset + limit - 1
        response = supabase.table("interesse_mudanca_area").select("*").range(start, end).execute()
        
        if not response.data:
            return {"data": [], "count": 0}
        
        logger.info(f"Registros de interesse nesta página: {len(response.data)} (offset={offset}, limit={limit})")
        return {
            "data": response.data,
            "count": len(response.data)
        }
    except Exception as e:
        logger.error(f"Erro ao buscar interesse de mudança: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar interesse de mudança: {str(e)}")

@app.get("/api/nota-avd-2024")
async def get_nota_avd_2024(limit: int = Query(1000, ge=1, le=10000), offset: int = Query(0, ge=0)):
    """
    Obter notas AVD de 2024
    """
    try:
        logger.info("Buscando notas AVD 2024 no Supabase...")
        start = offset
        end = offset + limit - 1
        response = supabase.table("nota_avd_2024").select("*").range(start, end).execute()
        
        if not response.data:
            return {"data": [], "count": 0}
        
        logger.info(f"Notas AVD 2024 nesta página: {len(response.data)} (offset={offset}, limit={limit})")
        return {
            "data": response.data,
            "count": len(response.data)
        }
    except Exception as e:
        logger.error(f"Erro ao buscar notas AVD 2024: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar notas AVD 2024: {str(e)}")

@app.get("/api/mesa-calibracao")
async def get_mesa_calibracao(limit: int = Query(1000, ge=1, le=10000), offset: int = Query(0, ge=0)):
    """
    Obter dados da mesa de calibração
    Campos: NOME, CARGO, Líder, Localidade, DIRETORIA, Calibração?, Mesa, BP, Apoio GP, GP, Pai, Avô
    """
    try:
        logger.info("Buscando mesa de calibração no Supabase...")
        start = offset
        end = offset + limit - 1
        response = supabase.table("mesa_calibracao").select("*").range(start, end).execute()
        
        if not response.data:
            return {"data": [], "count": 0}
        
        logger.info(f"Registros de mesa de calibração nesta página: {len(response.data)} (offset={offset}, limit={limit})")
        return {
            "data": response.data,
            "count": len(response.data)
        }
    except Exception as e:
        logger.error(f"Erro ao buscar mesa de calibração: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar mesa de calibração: {str(e)}")

@app.get("/api/filtros")
async def get_filtros():
    """
    Obter todos os valores únicos para filtros
    """
    try:
        logger.info("Buscando valores para filtros...")
        
        # Buscar dados de avaliações
        avaliacoes = supabase.table("nota_final_colaborador").select("área, formulário").execute()
        funcionarios = supabase.table("relacao_ativos").select("diretoria, gerencia, cargo").execute()
        
        # Extrair valores únicos
        areas = list(set([a.get("área") for a in avaliacoes.data if a.get("área")]))
        formularios = list(set([a.get("formulário") for a in avaliacoes.data if a.get("formulário")]))
        diretorias = list(set([f.get("diretoria") for f in funcionarios.data if f.get("diretoria")]))
        gerencias = list(set([f.get("gerencia") for f in funcionarios.data if f.get("gerencia")]))
        cargos = list(set([f.get("cargo") for f in funcionarios.data if f.get("cargo")]))
        
        # Ordenar listas
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

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("api:app", host="0.0.0.0", port=port, reload=True)
