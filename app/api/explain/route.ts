import { NextRequest, NextResponse } from 'next/server';
import { parseAndExplainCode as parseJS } from '@/lib/ast-parser';
import { parseAndExplainCode as parsePython } from '@/lib/parsers/python-parser';
import { parseAndExplainCode as parseJava } from '@/lib/parsers/java-parser';

export async function POST(req: NextRequest) {
  try {
    const { code, language } = await req.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Code is required and must be a string' },
        { status: 400 }
      );
    }

    // Default to Javascript parser if none passed
    const lang = language || 'javascript';
    
    let result;
    
    switch (lang) {
       case 'python':
          result = parsePython(code);
          break;
       case 'java':
          result = parseJava(code);
          break;
       case 'javascript':
       case 'typescript':
       default:
          result = parseJS(code);
          break;
    }

    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('Error in /api/explain:', error);
    
    return NextResponse.json(
      { error: 'Failed to process code explanation locally' },
      { status: 500 }
    );
  }
}
