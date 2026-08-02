
-- Criar tabela de módulos
CREATE TABLE public.modulos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de aulas
CREATE TABLE public.aulas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  video TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  modulo_id UUID REFERENCES public.modulos(id) ON DELETE CASCADE,
  duracao INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de progresso do usuário por aula
CREATE TABLE public.progresso_aulas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  aula_id UUID REFERENCES public.aulas(id) ON DELETE CASCADE,
  completada BOOLEAN DEFAULT FALSE,
  progresso_percentual INTEGER DEFAULT 0,
  tempo_assistido INTEGER DEFAULT 0,
  ultima_visualizacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, aula_id)
);

ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progresso_aulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Módulos são visíveis para todos" ON public.modulos FOR SELECT USING (true);
CREATE POLICY "Aulas são visíveis para todos" ON public.aulas FOR SELECT USING (true);
CREATE POLICY "Usuários podem ver seu próprio progresso" ON public.progresso_aulas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem inserir seu próprio progresso" ON public.progresso_aulas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seu próprio progresso" ON public.progresso_aulas FOR UPDATE USING (auth.uid() = user_id);

INSERT INTO public.modulos (titulo, descricao, ordem) VALUES
('Fundamentos da Produção Musical', 'Aprenda os conceitos básicos da produção musical', 1),
('Criação de Beats e Samples', 'Domine a arte de criar beats únicos', 2),
('Mixagem e Masterização', 'Finalize suas produções com qualidade profissional', 3);

INSERT INTO public.aulas (titulo, descricao, video, ordem, modulo_id, duracao)
SELECT 'Introdução ao Curso', 'Bem-vindo ao curso de produção de funk!', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1, id, 15 FROM public.modulos WHERE titulo = 'Fundamentos da Produção Musical'
UNION ALL
SELECT 'Configurando seu Home Studio', 'Aprenda a configurar seu estúdio em casa', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 2, id, 25 FROM public.modulos WHERE titulo = 'Fundamentos da Produção Musical'
UNION ALL
SELECT 'Conhecendo o FL Studio', 'Uma introdução completa ao FL Studio', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 3, id, 30 FROM public.modulos WHERE titulo = 'Fundamentos da Produção Musical'
UNION ALL
SELECT 'Drum Patterns Essenciais', 'Domine os padrões rítmicos fundamentais do funk carioca', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1, id, 25 FROM public.modulos WHERE titulo = 'Criação de Beats e Samples'
UNION ALL
SELECT 'Estrutura de um Beat', 'Entenda como estruturar um beat profissional', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 2, id, 35 FROM public.modulos WHERE titulo = 'Criação de Beats e Samples'
UNION ALL
SELECT 'Samples e Loops', 'Aprenda a usar samples e criar loops únicos', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 3, id, 28 FROM public.modulos WHERE titulo = 'Criação de Beats e Samples'
UNION ALL
SELECT 'Fundamentos da Mixagem', 'Aprenda os conceitos fundamentais da mixagem', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1, id, 40 FROM public.modulos WHERE titulo = 'Mixagem e Masterização'
UNION ALL
SELECT 'EQ e Compressão', 'Domine o uso de equalizadores e compressores', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 2, id, 32 FROM public.modulos WHERE titulo = 'Mixagem e Masterização';
