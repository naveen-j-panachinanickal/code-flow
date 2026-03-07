import { NextRequest, NextResponse } from 'next/server';
import { parseAndExplainCode } from '@/lib/tree-sitter-parser';

export async function POST(req: NextRequest) {
  try {
    const { code, language } = await req.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Code is required and must be a string' },
        { status: 400 }
      );
    }

    const lang = language || 'javascript';
    const result = await parseAndExplainCode(code, lang);

    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('Error in /api/explain:', error);
    
    return NextResponse.json(
      { error: 'Failed to process code explanation locally' },
      { status: 500 }
    );
  }
}
