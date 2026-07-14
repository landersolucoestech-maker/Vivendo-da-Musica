-- Permitir acesso público às tabelas principais (sem autenticação)

-- Remover políticas antigas que exigem autenticação
DROP POLICY IF EXISTS "Authenticated users can view lessons" ON public.aulas;
DROP POLICY IF EXISTS "Authenticated users can view modules" ON public.modulos;
DROP POLICY IF EXISTS "Authenticated users can view lesson files" ON public.lesson_files;

-- Criar novas políticas para acesso público
CREATE POLICY "Public can view lessons" 
ON public.aulas 
FOR SELECT 
USING (true);

CREATE POLICY "Public can view modules" 
ON public.modulos 
FOR SELECT 
USING (true);

CREATE POLICY "Public can view lesson files" 
ON public.lesson_files 
FOR SELECT 
USING (true);