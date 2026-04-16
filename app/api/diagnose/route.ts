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

    // Testar se as tabelas existem
    const tables = ['profiles', 'logs', 'medical_certificates', 'custom_shifts', 'settings', 'requests', 'tickets'];
    const tableResults = {};

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count', { count: 'exact', head: true });

        tableResults[table] = {
          exists: !error,
          count: data || 0,
          error: error?.message || null
        };
      } catch (err) {
        tableResults[table] = {
          exists: false,
          count: 0,
          error: err instanceof Error ? err.message : String(err)
        };
      }
    }

    // Verificar RLS
    let rlsStatus = null;
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('profiles', 'logs', 'medical_certificates', 'custom_shifts', 'settings', 'requests', 'tickets')"
      });
      rlsStatus = data;
    } catch (err) {
      rlsStatus = { error: 'Não foi possível verificar RLS' };
    }

    return NextResponse.json({
      success: true,
      message: 'Diagnóstico do banco de dados',
      tables: tableResults,
      rls: rlsStatus,
      allTablesExist: Object.values(tableResults).every((result: any) => result.exists)
    });

  } catch (err) {
    return NextResponse.json({
      error: 'Erro inesperado',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}