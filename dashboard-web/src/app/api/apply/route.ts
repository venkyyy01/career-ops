import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getCareerOpsPath } from '@/lib/career-ops-path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const careerOpsPath = getCareerOpsPath(searchParams.get('path'));

  const cvPath = path.join(careerOpsPath, 'cv.md');
  let cvContent = '';

  try {
    cvContent = await fs.readFile(cvPath, 'utf-8');
  } catch { /* No CV */ }

  const reportsDir = path.join(careerOpsPath, 'reports');
  let recentReports: any[] = [];

  try {
    const files = await fs.readdir(reportsDir);
    recentReports = files
      .filter(f => f.endsWith('.md'))
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 10)
      .map(f => ({
        name: f,
        path: path.join(reportsDir, f)
      }));
  } catch { /* No reports */ }

  return NextResponse.json({
    hasCV: cvContent.length > 0,
    cvLength: cvContent.length,
    recentReports,
    status: 'ready'
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data, careerOpsPath: inputPath } = body;

    const careerOpsPath = getCareerOpsPath(inputPath);

    if (action === 'analyze-form') {
      const formHtml = data.formHtml || data.formUrl || '';
      const result = await analyzeFormFields(formHtml, careerOpsPath);
      return NextResponse.json(result);
    }

    if (action === 'generate-answers') {
      const result = await generateFormAnswers(data.formFields, data.jobInfo, careerOpsPath);
      return NextResponse.json(result);
    }

    if (action === 'update-status') {
      const result = await updateApplicationStatus(data, careerOpsPath);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Apply assistant error:', error);
    return NextResponse.json({
      error: 'Failed to process apply request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function analyzeFormFields(formHtml: string, careerOpsPath: string): Promise<any> {
  const fields: any[] = [];

  const inputRegex = /<input[^>]*name=["']([^"']*)["'][^>]*>/gi;
  const textareaRegex = /<textarea[^>]*name=["']([^"']*)["'][^>]*>/gi;
  const selectRegex = /<select[^>]*name=["']([^"']*)["'][^>]*>/gi;

  let match;

  while ((match = inputRegex.exec(formHtml)) !== null) {
    const typeMatch = formHtml.slice(match.index - 100, match.index + match[0].length).match(/type=["']([^"']*)["']/i);
    const placeholderMatch = formHtml.slice(match.index, match.index + match[0].length).match(/placeholder=["']([^"']*)["']/i);

    fields.push({
      name: match[1],
      type: typeMatch ? typeMatch[1].toLowerCase() : 'text',
      placeholder: placeholderMatch ? placeholderMatch[1] : '',
      element: 'input'
    });
  }

  while ((match = textareaRegex.exec(formHtml)) !== null) {
    fields.push({
      name: match[1],
      type: 'textarea',
      element: 'textarea'
    });
  }

  while ((match = selectRegex.exec(formHtml)) !== null) {
    const options: string[] = [];
    const optionRegex = new RegExp(`<option[^>]*value=["']([^"']*)["'][^>]*>`, 'gi');
    let optMatch;
    while ((optMatch = optionRegex.exec(formHtml)) !== null) {
      options.push(optMatch[1]);
    }

    fields.push({
      name: match[1],
      type: 'select',
      options,
      element: 'select'
    });
  }

  const categorized = categorizeFields(fields);

  return {
    success: true,
    fields,
    summary: {
      total: fields.length,
      text: fields.filter((f: any) => f.type === 'text' || f.type === 'email' || f.type === 'tel' || f.type === 'url').length,
      textarea: fields.filter((f: any) => f.type === 'textarea').length,
      select: fields.filter((f: any) => f.type === 'select').length,
      file: fields.filter((f: any) => f.type === 'file').length
    },
    categorized
  };
}

function categorizeFields(fields: any[]): any {
  const categories: any = {
    personal: [],
    professional: [],
    documents: [],
    questions: [],
    other: []
  };

  const personalKeywords = ['name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'country', 'dob', 'birth'];
  const professionalKeywords = ['title', 'company', 'employer', 'education', 'school', 'degree', 'major', 'skills', 'linkedin', 'portfolio', 'website', 'github'];
  const documentKeywords = ['resume', 'cv', 'cover', 'upload', 'file', 'attachment', 'document'];
  const questionKeywords = ['why', 'how', 'describe', 'explain', 'tell', 'experience', 'goal', 'salary', 'notice', 'start', 'available', 'reference'];

  for (const field of fields) {
    const nameLower = field.name.toLowerCase();

    if (personalKeywords.some(k => nameLower.includes(k))) {
      categories.personal.push(field);
    } else if (documentKeywords.some(k => nameLower.includes(k))) {
      categories.documents.push(field);
    } else if (questionKeywords.some(k => nameLower.includes(k))) {
      categories.questions.push(field);
    } else if (professionalKeywords.some(k => nameLower.includes(k))) {
      categories.professional.push(field);
    } else {
      categories.other.push(field);
    }
  }

  return categories;
}

async function generateFormAnswers(formFields: any[], jobInfo: any, careerOpsPath: string): Promise<any> {
  const cvPath = path.join(careerOpsPath, 'cv.md');
  let cvContent = '';

  try {
    cvContent = await fs.readFile(cvPath, 'utf-8');
  } catch { /* No CV */ }

  const answers: any[] = [];

  for (const field of formFields) {
    let answer = '';

    if (field.placeholder) {
      answer = generateGenericAnswer(field.placeholder, field.type, cvContent);
    } else {
      answer = generateGenericAnswer(field.name, field.type, cvContent);
    }

    if (field.type === 'select' && field.options && field.options.length > 0) {
      answer = field.options[0];
    }

    answers.push({
      name: field.name,
      value: answer,
      type: field.type
    });
  }

  return {
    success: true,
    answers,
    jobInfo
  };
}

function generateGenericAnswer(fieldName: string, fieldType: string, _cvContent?: string): string {
  const nameLower = fieldName.toLowerCase();

  if (nameLower.includes('first') && nameLower.includes('name')) return '[Your First Name]';
  if (nameLower.includes('last') && nameLower.includes('name')) return '[Your Last Name]';
  if (nameLower.includes('email')) return '[your.email@example.com]';
  if (nameLower.includes('phone')) return '[+1 234 567 8900]';
  if (nameLower.includes('linkedin')) return '[linkedin.com/in/yourprofile]';
  if (nameLower.includes('github')) return '[github.com/yourusername]';
  if (nameLower.includes('portfolio') || nameLower.includes('website')) return '[https://yourportfolio.com]';
  if (nameLower.includes('company') && nameLower.includes('current')) return '[Current Company]';
  if (nameLower.includes('title') && nameLower.includes('current')) return '[Current Job Title]';
  if (nameLower.includes('salary') || nameLower.includes('compensation')) return '[Target Salary]';
  if (nameLower.includes('notice') || nameLower.includes('available')) return '[2 weeks / Immediately]';
  if (nameLower.includes('start') || nameLower.includes('date')) return '[Earliest Start Date]';
  if (nameLower.includes('why')) return 'I am passionate about this role and believe my skills align perfectly with the requirements. I am excited about the opportunity to contribute to your team.';
  if (nameLower.includes('describe') || nameLower.includes('experience')) return 'Please refer to my resume for detailed experience. I have a strong background in this area.';
  if (nameLower.includes('goal')) return 'I aim to grow professionally while making meaningful contributions to the team and organization.';

  if (fieldType === 'textarea') {
    return '[Your detailed response here]';
  }

  return '[Response]';
}

async function updateApplicationStatus(data: any, careerOpsPath: string): Promise<any> {
  const { reportNumber, status, company, role } = data;

  const appsPath = path.join(careerOpsPath, 'applications.md');
  let content = '';

  try {
    content = await fs.readFile(appsPath, 'utf-8');
  } catch {
    const dataAppsPath = path.join(careerOpsPath, 'data', 'applications.md');
    content = await fs.readFile(dataAppsPath, 'utf-8');
  }

  if (reportNumber) {
    content = content.replace(
      new RegExp(`\\[${reportNumber}\\]\\([^)]+\\)`, 'g'),
      (match: string) => {
        return match.replace(/\|*\s*[^|]*$/, `| ${status}`);
      }
    );
  }

  try {
    await fs.writeFile(appsPath, content, 'utf-8');
  } catch {
    const dataAppsPath = path.join(careerOpsPath, 'data', 'applications.md');
    await fs.writeFile(dataAppsPath, content, 'utf-8');
  }

  return {
    success: true,
    updated: { reportNumber, status, company, role }
  };
}
