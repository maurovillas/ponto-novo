-- Para desenvolvimento: desabilitar RLS temporariamente na tabela profiles
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Ou criar política permissiva para desenvolvimento
-- DROP POLICY IF EXISTS "Allow all operations for development" ON public.profiles;
-- CREATE POLICY "Allow all operations for development" ON public.profiles
--   FOR ALL USING (true) WITH CHECK (true);
