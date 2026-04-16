import { getSupabase } from '../../supabase';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = getSupabase();

    if (!supabase) {
      return NextResponse.json({
        error: 'Supabase não está configurado'
      }, { status: 500 });
    }

    // Tentar criar um usuário de teste
    const testUser = {
      id: crypto.randomUUID(),
      name: 'Usuário Teste',
      email: 'teste@example.com',
      role: 'Colaborador',
      company: 'Chronos Tech',
      department: 'Desenvolvimento',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
      registration_number: '', // Corrigido para snake_case
      cpf: '',
      matricula: ''
    };

    console.log('Tentando criar usuário de teste:', testUser);

    const { data, error } = await supabase
      .from('profiles')
      .insert([testUser])
      .select();

    if (error) {
      console.error('Erro ao criar usuário:', error);
      return NextResponse.json({
        error: 'Erro ao criar usuário',
        details: {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        }
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Usuário criado com sucesso',
      data: data
    });

  } catch (err) {
    console.error('Erro inesperado:', err);
    return NextResponse.json({
      error: 'Erro inesperado',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}