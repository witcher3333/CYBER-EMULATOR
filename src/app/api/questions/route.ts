import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { QuestionService } from '@/services/QuestionService';
import { MongoQuestionRepository } from '@/repositories/MongoQuestionRepository';

const questionRepository = new MongoQuestionRepository();
const questionService = new QuestionService(questionRepository);

export const dynamic = 'force-dynamic';

// GET /api/questions - Fetch questions with optional filters
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const difficulty = searchParams.get('difficulty');
    const limit = searchParams.get('limit');
    const random = searchParams.get('random');
    const exclude = searchParams.get('exclude');

    const questions = await questionService.getQuestions(category, difficulty, limit, random, exclude);

    return NextResponse.json({ success: true, data: questions });
  } catch (error: any) {
    console.error('[API] GET /api/questions error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
