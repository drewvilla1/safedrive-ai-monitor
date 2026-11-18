export const dynamic = 'force-dynamic';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { score, factors, missingData, sensor, telematics } = body ?? {};

    // Stream LLM rationale
    const prompt = `You are a safety AI analyst for a Samsung distracted-driving monitoring pilot. Given the following risk assessment, provide a brief (2-3 sentence) rationale explaining why this risk score was assigned. Be calm, factual, and professional.

Risk Score: ${score ?? 0}/100
Sensor Event: ${sensor?.eventType ?? 'unknown'} (confidence: ${((sensor?.confidence ?? 0) * 100).toFixed(0)}%, duration: ${sensor?.duration ?? 0}s)
Vehicle Status: ${telematics?.isMoving ? 'Moving' : 'Stopped'} at ${telematics?.speed ?? 'unknown'} mph
Passenger Present: ${telematics?.passengerPresent ? 'Yes' : 'No'}
Contributing Factors: ${(factors ?? []).map((f: any) => f?.factor ?? '').join(', ')}
Missing Data: ${(missingData ?? []).length > 0 ? (missingData ?? []).join(', ') : 'None'}

Provide the rationale only, no headers or labels.`;

    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        max_tokens: 200,
      }),
    });

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        try {
          while (true) {
            const { done, value } = await (reader?.read() ?? { done: true, value: undefined });
            if (done) break;
            const chunk = decoder.decode(value);
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (error: any) {
          console.error('Stream error:', error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('Risk score API error:', err);
    return NextResponse.json({ error: 'Failed to generate rationale' }, { status: 500 });
  }
}
