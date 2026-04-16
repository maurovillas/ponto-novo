import { getSupabase } from '../../supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = getSupabase();

    if (!supabase) {
      return NextResponse.json({
        error: 'Supabase não está configurado',
        env: {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
          key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing'
        }
      }, { status: 500 });
    }

    // Apenas buscar dados existentes sem tentar inserir
    const { data, error } = await supabase
      .from('profiles')
      .select('*');

    if (error) {
      return NextResponse.json({
        error: 'Erro na query da tabela profiles',
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
      message: 'Query executada com sucesso',
      data: data,
      count: data?.length || 0,
      columns: data && data.length > 0 ? Object.keys(data[0]) : [],
      hasRLS: error?.code === '42501' || error?.message?.includes('row-level security')
    });

  } catch (err) {
    return NextResponse.json({
      error: 'Erro inesperado',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}