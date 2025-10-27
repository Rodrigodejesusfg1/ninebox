-- ============================================================
-- TABELA DE DESENVOLVIMENTO E SUCESSÃO DE COLABORADORES
-- Execute este SQL no Supabase SQL Editor
-- ============================================================

-- Remover tabela antiga se existir (CUIDADO: apaga dados!)
-- DROP TABLE IF EXISTS public.desenvolvimento_colaborador CASCADE;

-- Tabela para armazenar informações de desenvolvimento e sucessão dos colaboradores
CREATE TABLE IF NOT EXISTS public.desenvolvimento_colaborador (
    id BIGSERIAL PRIMARY KEY,
    colaborador TEXT NOT NULL, -- Nome do colaborador
    cpf TEXT, -- CPF para identificação única
    
    -- Sucessão - Pessoa 1
    sucessao_pessoa1 TEXT, -- Nome da primeira pessoa indicada
    prontidao_pessoa1 TEXT CHECK (prontidao_pessoa1 IN ('Imediata', 'Até 12m', '2-3 anos', 'Outros')),
    prontidao_pessoa1_outros TEXT, -- Campo livre quando prontidao_pessoa1 = 'Outros'
    indicador_pessoa1 TEXT, -- Quem indicou a pessoa 1
    
    -- Sucessão - Pessoa 2
    sucessao_pessoa2 TEXT, -- Nome da segunda pessoa indicada
    prontidao_pessoa2 TEXT CHECK (prontidao_pessoa2 IN ('Imediata', 'Até 12m', '2-3 anos', 'Outros')),
    prontidao_pessoa2_outros TEXT, -- Campo livre quando prontidao_pessoa2 = 'Outros'
    indicador_pessoa2 TEXT, -- Quem indicou a pessoa 2
    
    -- Sucessão - Pessoa 3
    sucessao_pessoa3 TEXT, -- Nome da terceira pessoa indicada
    prontidao_pessoa3 TEXT CHECK (prontidao_pessoa3 IN ('Imediata', 'Até 12m', '2-3 anos', 'Outros')),
    prontidao_pessoa3_outros TEXT, -- Campo livre quando prontidao_pessoa3 = 'Outros'
    indicador_pessoa3 TEXT, -- Quem indicou a pessoa 3
    
    -- Aptidão de carreira (do colaborador avaliado)
    aptidao_carreira TEXT CHECK (aptidao_carreira IN ('Liderança', 'Gestão', 'Técnico')),
    
    -- Risco de saída (do colaborador avaliado)
    risco_saida TEXT CHECK (risco_saida IN ('Alto', 'Médio', 'Baixo')),
    
    -- Impacto de saída (do colaborador avaliado)
    impacto_saida TEXT CHECK (impacto_saida IN ('Alto', 'Médio', 'Baixo')),
    
    -- Pessoa chave/Técnica (do colaborador avaliado)
    pessoa_chave_tecnica TEXT CHECK (pessoa_chave_tecnica IN ('Sim', 'Não')),
    
    -- Comentários adicionais
    comentarios TEXT,
    
    -- Metadados
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    criado_por TEXT,
    atualizado_por TEXT,
    
    -- Índices para busca rápida
    CONSTRAINT desenvolvimento_colaborador_unico UNIQUE (colaborador, cpf)
);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_desenvolvimento_colaborador_nome ON public.desenvolvimento_colaborador(colaborador);
CREATE INDEX IF NOT EXISTS idx_desenvolvimento_colaborador_cpf ON public.desenvolvimento_colaborador(cpf);
CREATE INDEX IF NOT EXISTS idx_desenvolvimento_colaborador_atualizado ON public.desenvolvimento_colaborador(atualizado_em DESC);

-- Trigger para atualizar automaticamente o campo atualizado_em
CREATE OR REPLACE FUNCTION public.atualizar_timestamp_desenvolvimento()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_desenvolvimento
    BEFORE UPDATE ON public.desenvolvimento_colaborador
    FOR EACH ROW
    EXECUTE FUNCTION public.atualizar_timestamp_desenvolvimento();

-- Comentários na tabela e colunas para documentação
COMMENT ON TABLE public.desenvolvimento_colaborador IS 'Informações de desenvolvimento, sucessão e retenção de colaboradores';
COMMENT ON COLUMN public.desenvolvimento_colaborador.colaborador IS 'Nome completo do colaborador';
COMMENT ON COLUMN public.desenvolvimento_colaborador.cpf IS 'CPF do colaborador para identificação única';

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

COMMENT ON COLUMN public.desenvolvimento_colaborador.aptidao_carreira IS 'Direcionamento de carreira do colaborador: Liderança, Gestão, Técnico';
COMMENT ON COLUMN public.desenvolvimento_colaborador.risco_saida IS 'Risco de desligamento do colaborador: Alto, Médio, Baixo';
COMMENT ON COLUMN public.desenvolvimento_colaborador.impacto_saida IS 'Impacto caso o colaborador saia: Alto, Médio, Baixo';
COMMENT ON COLUMN public.desenvolvimento_colaborador.pessoa_chave_tecnica IS 'Se o colaborador é pessoa chave ou possui conhecimento técnico crítico';
COMMENT ON COLUMN public.desenvolvimento_colaborador.comentarios IS 'Observações e comentários adicionais sobre o colaborador';

-- Habilitar RLS (Row Level Security) - IMPORTANTE para segurança
ALTER TABLE public.desenvolvimento_colaborador ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura autenticada
CREATE POLICY "Permitir leitura autenticada desenvolvimento" 
ON public.desenvolvimento_colaborador
FOR SELECT
TO authenticated
USING (true);

-- Política para permitir inserção autenticada
CREATE POLICY "Permitir inserção autenticada desenvolvimento" 
ON public.desenvolvimento_colaborador
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política para permitir atualização autenticada
CREATE POLICY "Permitir atualização autenticada desenvolvimento" 
ON public.desenvolvimento_colaborador
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política para permitir exclusão autenticada
CREATE POLICY "Permitir exclusão autenticada desenvolvimento" 
ON public.desenvolvimento_colaborador
FOR DELETE
TO authenticated
USING (true);

-- Grant de permissões
GRANT ALL ON public.desenvolvimento_colaborador TO authenticated;
GRANT ALL ON public.desenvolvimento_colaborador TO service_role;
GRANT USAGE, SELECT ON SEQUENCE desenvolvimento_colaborador_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE desenvolvimento_colaborador_id_seq TO service_role;

-- Mensagem de sucesso
SELECT 'Tabela desenvolvimento_colaborador criada com sucesso!' as resultado;
