from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from typing import List, Dict, Any
import logging
import ssl
import warnings
import traceback

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Carregar variáveis de ambiente ANTES de qualquer coisa
load_dotenv()

# Detectar ambiente (local vs produção)
is_local_env = os.getenv("RENDER") is None  # Render define essa variável em produção

# ===== SOLUÇÃO PARA PROXY CORPORATIVO EM AMBIENTE LOCAL =====
if is_local_env:
    logger.warning("⚠️ Ambiente LOCAL detectado - Aplicando patch SSL para proxy corporativo")
    
    # Importar httpcore ANTES de supabase
    import httpcore._backends.sync
    
    # Salvar função original
    _original_start_tls = httpcore._backends.sync.SyncStream.start_tls
    
    # Criar função patcheada que não verifica SSL
    def _patched_start_tls(self, *args, **kwargs):
        # Forçar SSL context sem verificação (apenas em ambiente local!)
        kwargs['ssl_context'] = ssl._create_unverified_context()
        return _original_start_tls(self, *args, **kwargs)
    
    # Aplicar o patch
    httpcore._backends.sync.SyncStream.start_tls = _patched_start_tls
    
    # Suprimir warnings de SSL
    warnings.filterwarnings('ignore', message='Unverified HTTPS request')
    try:
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    except:
        pass
    
    logger.info("✅ Patch SSL aplicado com sucesso (ambiente local)")
else:
    logger.info("🚀 Ambiente de PRODUÇÃO detectado - SSL verificação ativada")

# Agora importar supabase (após patch se necessário)
from supabase import create_client, Client

# Inicializar FastAPI
app = FastAPI(title="NineBox API", version="1.0.0")

# Configurar CORS - Em produção, especifique os domínios permitidos
# Observação importante: quando allow_credentials=True, NÃO podemos usar "*" em allow_origins.
_env_allowed = os.getenv("ALLOWED_ORIGINS", "*").split(",")
_env_allowed = [o.strip() for o in _env_allowed if o.strip()]

# Adicionar domínio(s) do frontend automaticamente
frontend_domains = [
    "https://avaliacaodedesempenhoreframax-6fvh.onrender.com",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

# Se o .env estiver com "*" (ou vazio), use os domínios conhecidos ao invés de wildcard
if not _env_allowed or _env_allowed == ["*"]:
    allowed_origins_list = frontend_domains
else:
    allowed_origins_list = sorted(set(_env_allowed + frontend_domains))

# Opcional: aceitar qualquer sufixo gerado pelo Render para este app estático
allowed_origin_regex = r"^https://avaliacaodedesempenhoreframax-[a-z0-9]+\.onrender\.com$"

logger.info(f"CORS allow_origins: {allowed_origins_list}; allow_origin_regex: {allowed_origin_regex}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins_list,
    allow_origin_regex=allowed_origin_regex,
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
    
    if is_local_env:
        logger.info("✅ Cliente Supabase inicializado (LOCAL - SSL bypass ativado)")
    else:
        logger.info("✅ Cliente Supabase inicializado (PRODUÇÃO - SSL verificado)")
        
except Exception as e:
    logger.error(f"❌ Erro ao inicializar Supabase: {e}")
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

# ===== Servir arquivos estáticos =====
# Montar diretório de imagens se existir
if os.path.exists("image"):
    app.mount("/image", StaticFiles(directory="image"), name="image")

# Rota raiz serve o index.html (página de login)
@app.get("/")
async def serve_root():
    """Servir a página inicial (login)"""
    return FileResponse("index.html")

# Rotas para páginas HTML
@app.get("/ninebox.html")
async def serve_ninebox():
    return FileResponse("ninebox.html")

@app.get("/config.html")
async def serve_config():
    return FileResponse("config.html")

@app.get("/dashboard.html")
async def serve_dashboard():
    return FileResponse("dashboard.html")

# Servir arquivos JavaScript
@app.get("/app.js")
async def serve_app_js():
    return FileResponse("app.js")

@app.get("/config.js")
async def serve_config_js():
    return FileResponse("config.js")

# Servir arquivos CSS
@app.get("/styles.css")
async def serve_styles_css():
    return FileResponse("styles.css")

@app.get("/login.css")
async def serve_login_css():
    return FileResponse("login.css")

# Servir arquivos de imagem/logo na raiz
@app.get("/logo-reframax.svg")
async def serve_logo_svg():
    return FileResponse("logo-reframax.svg")

@app.get("/REFRAMAX_.jpeg")
async def serve_logo_jpeg():
    return FileResponse("REFRAMAX_.jpeg")

# ===== Endpoints da API =====
@app.get("/api")
async def api_root():
    """Endpoint raiz da API"""
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


@app.get("/api/_cors_debug")
async def cors_debug(request: Request):
    """Endpoint de diagnóstico para verificar CORS em produção.
    Retorna o Origin do request e as configurações ativas do servidor.
    """
    try:
        origin = request.headers.get("origin")
        return {
            "origin": origin,
            "allowed_origins": allowed_origins_list,
            "allowed_origin_regex": allowed_origin_regex,
            "credentials": True,
        }
    except Exception as e:
        logger.error(f"Erro no _cors_debug: {e}")
        return {"error": str(e)}


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

class CalibracaoPayload(BaseModel):
    nota_calibrada_desempenho: float | None = None
    nota_calibrada_potencial: float | None = None
    comentarios: str | None = None

def _classificacao_por_nota(nota: float | None) -> str | None:
    """Mapeia a nota para classificação segundo as faixas solicitadas.
    - 0 a 2,49 => 'Atende parcialmente'
    - 2,5 a 3,29 => 'Atende dentro da expectativa'
    - 3,3 a 4 => 'Supera a expectativa'
    Retorna None se nota inválida.
    """
    try:
        if nota is None:
            return None
        # Garantir intervalo válido
        n = float(nota)
        if n < 0:
            n = 0.0
        if n <= 2.49:
            return 'Atende parcialmente'
        if n <= 3.29:
            return 'Atende dentro da expectativa'
        return 'Supera a expectativa'
    except Exception:
        return None

@app.patch("/api/avaliacoes/{avaliacao_id}/calibracao")
async def patch_calibracao(avaliacao_id: int, payload: CalibracaoPayload):
    """Atualiza notas calibradas de desempenho e/ou potencial na tabela nota_final_colaborador.
    Também grava as classificações calibradas correspondentes.
    """
    try:
        validate_supabase()

        # Buscar existência do registro
        existing = (
            supabase
            .table("nota_final_colaborador")
            .select("id")
            .eq("id", avaliacao_id)
            .limit(1)
            .execute()
        )
        if not existing.data:
            raise HTTPException(status_code=404, detail="Avaliação não encontrada")

        # Validar justificativa obrigatória
        comentarios = (payload.comentarios or "").strip()
        if not comentarios:
            raise HTTPException(status_code=400, detail="Campo 'comentarios' é obrigatório para salvar a calibração.")

        # Preparar dados para update (colunas são do tipo text para notas calibradas nesta base)
        d: Dict[str, Any] = {}
        if payload.nota_calibrada_desempenho is not None:
            # Armazenar com 2 casas decimais como texto
            d["nota_calibrada_desempenho"] = f"{float(payload.nota_calibrada_desempenho):.2f}"
            d["classificação_calibrada_desempenho"] = _classificacao_por_nota(payload.nota_calibrada_desempenho)
        if payload.nota_calibrada_potencial is not None:
            d["nota_calibrada_potencial"] = f"{float(payload.nota_calibrada_potencial):.2f}"
            d["classificação_calibrada_potencial"] = _classificacao_por_nota(payload.nota_calibrada_potencial)

        # Sempre incluir comentários (obrigatório)
        d["comentarios"] = comentarios

        if not d.get("nota_calibrada_desempenho") and not d.get("nota_calibrada_potencial"):
            return {"success": False, "reason": "no-fields"}

        resp = (
            supabase
            .table("nota_final_colaborador")
            .update(d)
            .eq("id", avaliacao_id)
            .execute()
        )
        return {"success": True, "data": resp.data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar calibração: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar calibração: {str(e)}")

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

@app.get("/api/experiencias-profissionais")
async def get_experiencias_profissionais(limit: int = Query(1000, ge=1, le=10000), offset: int = Query(0, ge=0)):
    """
    Obter experiências profissionais (experiencias_profissionais)
    Campos principais: USER_LOGIN, Nome, Email, Localidade, Data_Inicio, Data_Fim, Area_Conhecimento, Descricao, Meses_Experiencia
    """
    try:
        logger.info("Buscando experiencias_profissionais no Supabase...")
        start = offset
        end = offset + limit - 1
        response = supabase.table("experiencias_profissionais").select("*").range(start, end).execute()

        data = response.data or []
        logger.info(f"Experiências nesta página: {len(data)} (offset={offset}, limit={limit})")
        return {"data": data, "count": len(data)}
    except Exception as e:
        logger.error(f"Erro ao buscar experiencias_profissionais: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar experiencias_profissionais: {str(e)}")

@app.get("/api/notas-por-competencia")
async def get_notas_por_competencia(limit: int = Query(1000, ge=1, le=10000), offset: int = Query(0, ge=0)):
    """
    Obter notas das avaliações por competência (notas_por_competencia)
    Campos típicos: Área, Formulário, NOME, Avaliador, Tipo de Avaliador, Competência, Fator de Avaliação, Nota, Comentário
    """
    try:
        logger.info("Buscando notas_por_competencia no Supabase...")
        start = offset
        end = offset + limit - 1
        response = supabase.table("notas_por_competencia").select("*").range(start, end).execute()

        data = response.data or []
        logger.info(f"Notas por competência nesta página: {len(data)} (offset={offset}, limit={limit})")
        return {"data": data, "count": len(data)}
    except Exception as e:
        logger.error(f"Erro ao buscar notas_por_competencia: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar notas_por_competencia: {str(e)}")

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

@app.get("/api/desenvolvimento/{nome}")
async def get_desenvolvimento_por_nome(nome: str):
    """
    Buscar dados de desenvolvimento para um colaborador pelo nome.
    Retorna o registro mais recente se houver mais de um.
    """
    try:
        validate_supabase()
        # Primeiro por nome do colaborador
        resp = (
            supabase
            .table("desenvolvimento_colaborador")
            .select("*")
            .eq("colaborador", nome)
            .order("atualizado_em", desc=True)
            .limit(1)
            .execute()
        )
        data = resp.data or []

        if not data:
            # Tentar localizar por CPF, se conseguirmos inferir do nome via relacao_ativos
            try:
                emp = (
                    supabase
                    .table("relacao_ativos")
                    .select("cpf, nome")
                    .ilike("nome", nome)
                    .limit(1)
                    .execute()
                )
                if emp.data and emp.data[0].get("cpf"):
                    cpf = str(emp.data[0]["cpf"]) or ""
                    if cpf:
                        resp2 = (
                            supabase
                            .table("desenvolvimento_colaborador")
                            .select("*")
                            .eq("cpf", cpf)
                            .order("atualizado_em", desc=True)
                            .limit(1)
                            .execute()
                        )
                        data = resp2.data or []
            except Exception:
                pass

        if data:
            return {"found": True, "data": data[0]}
        return {"found": False, "data": None}
    except Exception as e:
        logger.error(f"Erro ao buscar desenvolvimento: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar desenvolvimento: {str(e)}")

class DesenvolvimentoPayload(BaseModel):
    colaborador: str
    cpf: str | None = None
    # Sucessores e prontidões
    sucessao_pessoa1: str | None = None
    prontidao_pessoa1: str | None = None
    prontidao_pessoa1_outros: str | None = None
    indicador_pessoa1: str | None = None
    sucessao_pessoa2: str | None = None
    prontidao_pessoa2: str | None = None
    prontidao_pessoa2_outros: str | None = None
    indicador_pessoa2: str | None = None
    sucessao_pessoa3: str | None = None
    prontidao_pessoa3: str | None = None
    prontidao_pessoa3_outros: str | None = None
    indicador_pessoa3: str | None = None
    # Demais campos
    aptidao_carreira: str | None = None
    risco_saida: str | None = None
    impacto_saida: str | None = None
    pessoa_chave_tecnica: str | None = None
    comentarios: str | None = None
    criado_por: str | None = None
    atualizado_por: str | None = None

@app.post("/api/desenvolvimento")
async def upsert_desenvolvimento(payload: DesenvolvimentoPayload):
    """
    Insere ou atualiza o desenvolvimento do colaborador.
    Critério: se existir registro para 'colaborador' (ou 'cpf' quando fornecido), faz update; senão, insert.
    """
    try:
        validate_supabase()

        # Sanitizar valores vazios para None, para evitar conflitos com CHECKs
        data = {k: (v if (v is not None and str(v).strip() != "") else None) for k, v in payload.dict().items()}

        # Ajustar campos de prontidão dos sucessores: se 'Outros', gravar NULL e usar campo *_outros
        for key in ("prontidao_pessoa1", "prontidao_pessoa2", "prontidao_pessoa3"):
            if data.get(key) and str(data[key]).strip().lower() == "outros":
                data[key] = None

        # Tentar localizar registro existente por colaborador
        existing = (
            supabase
            .table("desenvolvimento_colaborador")
            .select("id")
            .eq("colaborador", data.get("colaborador"))
            .limit(1)
            .execute()
        )
        row = (existing.data or [None])[0]

        # Se não encontrou e houver CPF, procurar por CPF
        if not row and data.get("cpf"):
            existing2 = (
                supabase
                .table("desenvolvimento_colaborador")
                .select("id")
                .eq("cpf", str(data.get("cpf")))
                .limit(1)
                .execute()
            )
            row = (existing2.data or [None])[0]

        if row and row.get("id"):
            # Update
            data["atualizado_em"] = None  # deixar o default/trigger do banco cuidar
            resp = (
                supabase
                .table("desenvolvimento_colaborador")
                .update(data)
                .eq("id", row["id"])
                .execute()
            )
            return {"success": True, "action": "updated", "data": resp.data}
        else:
            # Insert
            resp = (
                supabase
                .table("desenvolvimento_colaborador")
                .insert(data)
                .execute()
            )
            return {"success": True, "action": "inserted", "data": resp.data}
    except Exception as e:
        logger.error(f"Erro ao salvar desenvolvimento: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao salvar desenvolvimento: {str(e)}")

@app.get("/api/pessoas-avaliadas")
async def get_pessoas_avaliadas(
    gestor: str | None = Query(None, description="Filtro por gestor"),
    limit: int = Query(1000, ge=1, le=10000), 
    offset: int = Query(0, ge=0)
):
    """
    Obter pessoas avaliadas e seus gestores
    Campos: NOME (nome do candidato), GESTOR (responsável pela pessoa)
    """
    try:
        logger.info("Buscando pessoas avaliadas no Supabase...")
        start = offset
        end = offset + limit - 1
        
        # Construir query - nome da tabela com underscore
        query = supabase.table("pessoas_avaliadas").select("*")
        
        # Aplicar filtro de gestor se fornecido - campo GESTOR em maiúscula
        if gestor:
            query = query.eq("GESTOR", gestor)
            logger.info(f"Filtrando por gestor: {gestor}")
        
        # Aplicar paginação
        response = query.range(start, end).execute()
        
        if not response.data:
            logger.warning("Nenhuma pessoa avaliada encontrada")
            return {"data": [], "count": 0}
        
        logger.info(f"Pessoas avaliadas nesta página: {len(response.data)} (offset={offset}, limit={limit})")
        if len(response.data) > 0:
            logger.info(f"Exemplo de registro: {response.data[0]}")
            logger.info(f"Chaves disponíveis: {list(response.data[0].keys())}")
        
        return {
            "data": response.data,
            "count": len(response.data)
        }
    except Exception as e:
        logger.error(f"Erro ao buscar pessoas avaliadas: {str(e)}")
        logger.error(f"Stack trace: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar pessoas avaliadas: {str(e)}")

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
