import { getSupabase } from './app/supabase';

async function testSupabaseConnection() {
  console.log('Testando conexão com Supabase...');

  const supabase = getSupabase();
  if (!supabase) {
    console.error('Supabase não está configurado');
    return;
  }

  try {
    // Teste básico de conexão
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.error('Erro na query:', error);
      return;
    }
    console.log('Conexão bem-sucedida! Dados:', data);
  } catch (err) {
    console.error('Erro inesperado:', err);
  }
}

testSupabaseConnection();