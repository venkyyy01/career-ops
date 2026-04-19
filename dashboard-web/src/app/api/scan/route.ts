import { NextRequest, NextResponse } from 'next/server';
import { getCareerOpsMCP } from '@/mcp/client';
import { getCareerOpsPath } from '@/lib/career-ops-path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const careerOpsPath = getCareerOpsPath(searchParams.get('path'));

  const mcp = getCareerOpsMCP(careerOpsPath);

  try {
    const result = await mcp.scanPortals('quick');

    return NextResponse.json({
      ...result,
      careerOpsPath
    });
  } catch (error) {
    console.error('Error scanning portals:', error);
    return NextResponse.json({
      error: 'Failed to scan portals',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode = 'quick', careerOpsPath: inputPath } = body;

    const careerOpsPath = getCareerOpsPath(inputPath);
    const mcp = getCareerOpsMCP(careerOpsPath);

    try {
      const result = await mcp.scanPortals(mode);

      return NextResponse.json({
        success: true,
        ...result,
        careerOpsPath
      });
    } catch (error) {
      console.error('MCP scan error:', error);
      return NextResponse.json({
        error: 'Scan failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      error: 'Failed to scan portals',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}