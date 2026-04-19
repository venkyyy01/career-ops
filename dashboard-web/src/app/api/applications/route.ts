import { NextRequest, NextResponse } from 'next/server';
import { getCareerOpsMCP } from '@/mcp/client';
import { getCareerOpsPath } from '@/lib/career-ops-path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const careerOpsPath = getCareerOpsPath(searchParams.get('path'));

  const mcp = getCareerOpsMCP(careerOpsPath);

  try {
    const result = await mcp.getApplications();

    return NextResponse.json({
      ...result,
      careerOpsPath
    });
  } catch (error) {
    console.error('Error getting applications:', error);
    return NextResponse.json({
      error: 'Failed to get applications',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}