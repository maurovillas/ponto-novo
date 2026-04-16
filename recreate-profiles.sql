-- Recriar tabela profiles com a estrutura correta
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  role VARCHAR(100),
  company VARCHAR(255),
  department VARCHAR(255),
  avatar VARCHAR(500),
  registration_number VARCHAR(50),
  cpf VARCHAR(20),
  matricula VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Para desenvolvimento, vamos desabilitar RLS temporariamente
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
