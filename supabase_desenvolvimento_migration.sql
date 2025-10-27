-- ============================================================
-- MIGRAÇÃO DA TABELA desenvolvimento_colaborador
-- Use este arquivo SE a tabela JÁ EXISTIR e você quiser atualizar
-- ============================================================

-- OPÇÃO 1: Adicionar novas colunas (preserva dados existentes)
-- Execute SOMENTE se a tabela já existe com a estrutura antiga

-- Adicionar colunas de sucessão
ALTER TABLE public.desenvolvimento_colaborador 
ADD COLUMN IF NOT EXISTS sucessao_pessoa1 TEXT;

ALTER TABLE public.desenvolvimento_colaborador 
ADD COLUMN IF NOT EXISTS sucessao_pessoa2 TEXT;

ALTER TABLE public.desenvolvimento_colaborador 
ADD COLUMN IF NOT EXISTS sucessao_pessoa3 TEXT;

-- Adicionar colunas de prontidão (uma para cada sucessor)
ALTER TABLE public.desenvolvimento_colaborador 
ADD COLUMN IF NOT EXISTS prontidao_pessoa1 TEXT CHECK (prontidao_pessoa1 IN ('Imediata', 'Até 12m', '2-3 anos', 'Outros'));

ALTER TABLE public.desenvolvimento_colaborador 
ADD COLUMN IF NOT EXISTS prontidao_pessoa1_outros TEXT;

ALTER TABLE public.desenvolvimento_colaborador 
ADD COLUMN IF NOT EXISTS prontidao_pessoa2 TEXT CHECK (prontidao_pessoa2 IN ('Imediata', 'Até 12m', '2-3 anos', 'Outros'));

ALTER TABLE public.desenvolvimento_colaborador 
ADD COLUMN IF NOT EXISTS prontidao_pessoa2_outros TEXT;

ALTER TABLE public.desenvolvimento_colaborador 
ADD COLUMN IF NOT EXISTS prontidao_pessoa3 TEXT CHECK (prontidao_pessoa3 IN ('Imediata', 'Até 12m', '2-3 anos', 'Outros'));

ALTER TABLE public.desenvolvimento_colaborador 
ADD COLUMN IF NOT EXISTS prontidao_pessoa3_outros TEXT;

-- Adicionar colunas "Quem indicou"
ALTER TABLE public.desenvolvimento_colaborador 
ADD COLUMN IF NOT EXISTS indicador_pessoa1 TEXT;

ALTER TABLE public.desenvolvimento_colaborador 
ADD COLUMN IF NOT EXISTS indicador_pessoa2 TEXT;

ALTER TABLE public.desenvolvimento_colaborador 
ADD COLUMN IF NOT EXISTS indicador_pessoa3 TEXT;

-- Copiar dados antigos para o novo formato (se aplicável)
-- Se você tinha o campo "sucessao", pode mover para "sucessao_pessoa1"
UPDATE public.desenvolvimento_colaborador
SET sucessao_pessoa1 = sucessao
WHERE sucessao IS NOT NULL AND sucessao != '';

-- Se você tinha o campo "prontidao" genérico, pode copiar para prontidao_pessoa1
UPDATE public.desenvolvimento_colaborador
SET prontidao_pessoa1 = prontidao
WHERE prontidao IS NOT NULL AND prontidao != '' AND sucessao_pessoa1 IS NOT NULL;

-- Remover colunas antigas (OPCIONAL - CUIDADO!)
-- Descomente apenas se tiver certeza que não precisa mais dos dados
-- ALTER TABLE public.desenvolvimento_colaborador DROP COLUMN IF EXISTS sucessao;
-- ALTER TABLE public.desenvolvimento_colaborador DROP COLUMN IF EXISTS sucessao_outros;
-- ALTER TABLE public.desenvolvimento_colaborador DROP COLUMN IF EXISTS prontidao;

-- Atualizar comentários das novas colunas
COMMENT ON COLUMN public.desenvolvimento_colaborador.sucessao_pessoa1 IS 'Primeira pessoa indicada para sucessão (nome completo)';
COMMENT ON COLUMN public.desenvolvimento_colaborador.prontidao_pessoa1 IS 'Prontidão da pessoa 1: Imediata, Até 12m, 2-3 anos, Outros';
COMMENT ON COLUMN public.desenvolvimento_colaborador.prontidao_pessoa1_outros IS 'Descrição livre quando prontidao_pessoa1 = Outros';
COMMENT ON COLUMN public.desenvolvimento_colaborador.indicador_pessoa1 IS 'Nome de quem indicou a pessoa 1';

COMMENT ON COLUMN public.desenvolvimento_colaborador.sucessao_pessoa2 IS 'Segunda pessoa indicada para sucessão (nome completo)';
COMMENT ON COLUMN public.desenvolvimento_colaborador.prontidao_pessoa2 IS 'Prontidão da pessoa 2: Imediata, Até 12m, 2-3 anos, Outros';
COMMENT ON COLUMN public.desenvolvimento_colaborador.prontidao_pessoa2_outros IS 'Descrição livre quando prontidao_pessoa2 = Outros';
COMMENT ON COLUMN public.desenvolvimento_colaborador.indicador_pessoa2 IS 'Nome de quem indicou a pessoa 2';

COMMENT ON COLUMN public.desenvolvimento_colaborador.sucessao_pessoa3 IS 'Terceira pessoa indicada para sucessão (nome completo)';
COMMENT ON COLUMN public.desenvolvimento_colaborador.prontidao_pessoa3 IS 'Prontidão da pessoa 3: Imediata, Até 12m, 2-3 anos, Outros';
COMMENT ON COLUMN public.desenvolvimento_colaborador.prontidao_pessoa3_outros IS 'Descrição livre quando prontidao_pessoa3 = Outros';
COMMENT ON COLUMN public.desenvolvimento_colaborador.indicador_pessoa3 IS 'Nome de quem indicou a pessoa 3';

-- Mensagem de sucesso
SELECT 'Migração concluída! Novas colunas de sucessão, prontidão e indicadores adicionadas.' as resultado;

-- ============================================================
-- OPÇÃO 2: Recriar tabela do zero (APAGA TODOS OS DADOS!)
-- Use APENAS se quiser começar do zero
-- Descomente as linhas abaixo com MUITO CUIDADO
-- ============================================================

-- DROP TABLE IF EXISTS public.desenvolvimento_colaborador CASCADE;
-- 
-- Depois execute o arquivo supabase_desenvolvimento.sql completo
