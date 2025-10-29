-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.colaborador_area_responsavel (
  USER_LOGIN text,
  Nome text,
  Email text,
  Responsavel_Area text,
  Status text
);
CREATE TABLE public.desenvolvimento_colaborador (
  id bigint NOT NULL DEFAULT nextval('desenvolvimento_colaborador_id_seq'::regclass),
  colaborador text NOT NULL,
  cpf text,
  sucessao text CHECK (sucessao = ANY (ARRAY['Sim'::text, 'Não'::text, 'Até 12m'::text, '2-3 anos'::text, 'Outros'::text])),
  sucessao_outros text,
  prontidao text CHECK (prontidao = ANY (ARRAY['Sim'::text, 'Não'::text, 'Até 12m'::text, '2-3 anos'::text])),
  aptidao_carreira text CHECK (aptidao_carreira = ANY (ARRAY['Liderança'::text, 'Gestão'::text, 'Técnico'::text])),
  risco_saida text CHECK (risco_saida = ANY (ARRAY['Alto'::text, 'Médio'::text, 'Baixo'::text])),
  impacto_saida text CHECK (impacto_saida = ANY (ARRAY['Alto'::text, 'Médio'::text, 'Baixo'::text])),
  pessoa_chave_tecnica text CHECK (pessoa_chave_tecnica = ANY (ARRAY['Sim'::text, 'Não'::text])),
  comentarios text,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now(),
  criado_por text,
  atualizado_por text,
  sucessao_pessoa1 text,
  sucessao_pessoa2 text,
  sucessao_pessoa3 text,
  prontidao_pessoa1 text CHECK (prontidao_pessoa1 = ANY (ARRAY['Imediata'::text, 'Até 12m'::text, '2-3 anos'::text])),
  prontidao_pessoa2 text CHECK (prontidao_pessoa2 = ANY (ARRAY['Imediata'::text, 'Até 12m'::text, '2-3 anos'::text])),
  prontidao_pessoa3 text CHECK (prontidao_pessoa3 = ANY (ARRAY['Imediata'::text, 'Até 12m'::text, '2-3 anos'::text])),
  indicador_pessoa1 text,
  indicador_pessoa2 text,
  indicador_pessoa3 text,
  prontidao_pessoa1_outros text,
  prontidao_pessoa2_outros text,
  prontidao_pessoa3_outros text,
  CONSTRAINT desenvolvimento_colaborador_pkey PRIMARY KEY (id)
);
CREATE TABLE public.idiomas (
  USER_LOGIN text,
  Nome text,
  Email text,
  Nome_Idioma text,
  Nivel_Proficiencia text,
  Observações text
);
CREATE TABLE public.interesse_mudanca_area (
  Área text,
  Formulário text,
  Usuário Avaliado text,
  Avaliado text,
  Documento de Identificação bigint,
  Login do Avaliado text,
  Avaliadores text,
  Ciclo de Avaliação text,
  Área de interesse em mudança text,
  País text,
  Estado text,
  Cidade text,
  Disponibilidade de mudança pode ser editada text
);
CREATE TABLE public.mesa_calibracao (
  NOME text,
  CARGO text,
  Líder text,
  Localidade text,
  DIRETORIA text,
  Calibração? text,
  Mesa text,
  BP text,
  Apoio GP text,
  GP text,
  Pai text,
  Avô text,
  Outros text,
  Data text,
  Horário text,
  Duração text
);
CREATE TABLE public.movimentacao_salario (
  NOME text,
  DATAADMISSAO text,
  DATADEMISSAO text,
  DTMUDANCA_FUNCAO text,
  FUNCAO text,
  DTMUDANCA_SECAO text,
  SECAO text,
  DTMUDANCA_SALARIO text,
  MOTIVO_MUDANCA_SALARIO text
);
CREATE TABLE public.nota_avd_2024 (
  Área text,
  DIRETORIA text,
  Formulário text,
  Avaliado text,
  Nota Calculada double precision,
  Classificação Calculada text,
  NotaConsensada double precision,
  Classificação Consensada text,
  Avaliador text
);
CREATE TABLE public.nota_final_colaborador (
  área text,
  formulário text,
  usuário_avaliado text,
  documento_de_identificação text,
  login_do_avaliado text,
  nota_calculada_desempenho double precision,
  classificação_calculada_desempenho text,
  nota_calculada_potencial double precision,
  classificação_calculada_potencial text,
  nota_calibrada_desempenho text,
  classificação_calibrada_desempenho text,
  nota_calibrada_potencial text,
  classificação_calibrada_potencial text,
  nota_final_desempenho double precision,
  classificação_final_desempenho text,
  nota_final_potencial double precision,
  classificação_final_potencial text,
  login_do_avaliador text,
  avaliador text,
  id bigint NOT NULL DEFAULT nextval('nota_final_colaborador_id_seq'::regclass),
  CONSTRAINT nota_final_colaborador_pkey PRIMARY KEY (id)
);
CREATE TABLE public.nota_por_avaliacao (
  NOME text,
  Avaliador text,
  Tipo de Avaliador text,
  Nota double precision,
  Classificação text
);
CREATE TABLE public.pessoas_avaliadas (
  Usuário Avaliado text,
  Login text,
  NOME text,
  Área text,
  Código do Formulário text,
  º Formulário text,
  Formulário text,
  GESTOR Login text,
  GESTOR text,
  Status do Avaliado text,
  Avaliações Recebidas text
);
CREATE TABLE public.relacao_ativos (
  registro text,
  diretoria text,
  gerencia text,
  localidade text,
  c. custo character varying,
  chapa character varying,
  codsecao text,
  unidade text,
  empresa text,
  codcoligada bigint,
  nome text,
  cargo text,
  admissao text,
  cpf character varying,
  corraca text,
  sexo text,
  naturalidade text,
  dtnascimento text,
  idade text,
  escolaridade text
);
CREATE TABLE public.usuarios (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nome text NOT NULL,
  senha text,
  acesso text,
  CONSTRAINT usuarios_pkey PRIMARY KEY (id)
);
