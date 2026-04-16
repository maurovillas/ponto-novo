import { getSupabase } from '../../supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = getSupabase();

    if (!supabase) {
      return NextResponse.json({
        error: 'Supabase não está configurado'
      }, { status: 500 });
    }

    const results = {
      create: null,
      read: null,
      update: null,
      delete: null
    };

    // 1. Test CREATE
    try {
      const testUser = {
        id: crypto.randomUUID(),
        name: 'Usuário Teste',
        email: 'teste@example.com',
        role: 'Colaborador',
        company: 'Chronos Tech',
        department: 'Desenvolvimento',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
        registration_number: '',
        cpf: '',
        matricula: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: createData, error: createError } = await supabase
        .from('profiles')
        .insert([testUser])
        .select();

      results.create = createError ? {
        success: false,
        error: createError.message,
        code: createError.code
      } : {
        success: true,
        data: createData
      };

      // Se criou com sucesso, guarda o ID para os próximos testes
      const createdUserId = createData?.[0]?.id;

      // 2. Test READ
      const { data: readData, error: readError } = await supabase
        .from('profiles')
        .select('*');

      results.read = readError ? {
        success: false,
        error: readError.message,
        code: readError.code
      } : {
        success: true,
        count: readData?.length || 0
      };

      // 3. Test UPDATE (se conseguiu criar)
      if (createdUserId && results.create.success) {
        const { data: updateData, error: updateError } = await supabase
          .from('profiles')
          .update({ name: 'Usuário Atualizado' })
          .eq('id', createdUserId)
          .select();

        results.update = updateError ? {
          success: false,
          error: updateError.message,
          code: updateError.code
        } : {
          success: true,
          data: updateData
        };
      }

      // 4. Test DELETE (se conseguiu criar)
      if (createdUserId && results.create.success) {
        const { error: deleteError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', createdUserId);

        results.delete = deleteError ? {
          success: false,
          error: deleteError.message,
          code: deleteError.code
        } : {
          success: true
        };
      }

    } catch (err) {
      results.create = {
        success: false,
        error: 'Erro inesperado: ' + err.message
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Teste completo de operações CRUD',
      results: results,
      auth: {
        uid: 'Não disponível (sem sessão)',
        session: 'Não disponível (sem sessão)'
      }
    });

  } catch (err) {
    return NextResponse.json({
      error: 'Erro inesperado',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}