import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const result = await generateText({
      model: openai('gpt-3.5-turbo'),
      prompt: `You are a helpful medical appointment assistant. Respond to: ${message}`,
    });

    return NextResponse.json({
      success: true,
      response: result.text,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('AI Test Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process AI request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
