// Script para testar conexão com Supabase
import { getSupabase } from './app/supabase.js';

const supabase = getSupabase();

async function testConnection() {
  if (!supabase) {
    console.error('Supabase não está configurado');
    return;
  }

  console.log('Testando conexão com Supabase...');

  try {
    // Teste básico de conexão
    const { data, error } = await supabase.from('profiles').select('count').limit(1);

    if (error) {
      console.error('Erro na consulta:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    } else {
      console.log('Conexão bem-sucedida! Dados:', data);
    }
  } catch (err) {
    console.error('Erro inesperado:', err);
  }
}

testConnection();