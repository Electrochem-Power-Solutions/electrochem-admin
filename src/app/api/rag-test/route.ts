import { NextResponse } from 'next/server';
import { Index } from '@upstash/vector';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
const vectorIndex = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});


const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const RagResponseSchema = z.object({
  explicitlyAsksForPriceOrQuote: z
    .boolean()
    .describe(
      'ONLY true if the customer text explicitly contains words asking for price, cost, rate, quotation, quote, or discount. False if they only ask "Do you manufacture/supply/have..."'
    ),
  explicitlyAsksForClaimVisitOrMissingDoc: z
    .boolean()
    .describe(
      'ONLY true if the customer explicitly asks to file a warranty/repair claim, book a factory visit date, or requests certificates/documents missing from the Retrieved Context.'
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence (0.0 to 1.0) that the Retrieved Context answers the customer question.'),
  reason: z
    .string()
    .describe('Short 1-line explanation of the triage decision.'),
  reply: z
    .string()
    .describe(
      'Complete, polite, detailed business response grounded strictly in the Retrieved Context.'
    ),
});

export async function POST(req: Request) {
  
  try {
    const { message, history = [] } = await req.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

   
    const results = await vectorIndex.query({
      data: message,
      topK: 4,
      includeMetadata: true,
    });

    const topScore = results[0]?.score ?? 0;
    const matchedChunks = results.map((r) => ({
      id: r.id,
      score: Number(r.score.toFixed(3)),
      section: (r.metadata?.section as string) || 'General',
      text: (r.metadata?.text as string) || '',
    }));

    const context = matchedChunks
      .map((c) => `[${c.section}]\n${c.text}`)
      .join('\n\n---\n\n');

    // Include recent conversation turns so the team can test multi-turn follow-ups
    const conversationContext = history
      .slice(-4)
      .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'Customer' : 'Electrochem AI'}: ${m.content}`)
      .join('\n');

    const prompt = `You are a senior Customer Support & Sales Representative and Triage Router at Electrochem Power Systems Private Limited (ELECTROCHEM – INFINITE POWER).

PART A — TRIAGE RULES:
- Set explicitlyAsksForPriceOrQuote = true ONLY if the customer explicitly asks for pricing, quotations, commercial rates, or discounts.
- Set explicitlyAsksForClaimVisitOrMissingDoc = true ONLY if the customer requests a warranty claim, repair, factory visit appointment, tender evaluation, or documents/certificates missing from the Retrieved Context.
- Set confidence (0.0 to 1.0) based on how completely the Retrieved Context answers the query.

PART B — REPLY STYLE & GUARDRAILS (emailReply):
Write a crisp, natural, polite business response in conversational Indian English (2–4 short sentences, or a brief intro plus short multi-line bullets when listing 3+ items).
- Grounding & Accuracy: Use ONLY facts, specs, and policies from the Retrieved Context. Never invent prices, discounts, MOQs, certifications, or delivery timelines.
- Formatting: Directly answer the customer's question—skip greetings/sign-offs and NEVER print internal labels like "Direct Answer:" or "Required Inputs:" or dump raw uppercase SKU lists.
- Quotations & Commercial Requests: Never provide a quote directly. Acknowledge any details already provided (such as quantity, voltage, capacity, or delivery location) and state that our sales team is reviewing them to prepare an official quotation.
- Smart Follow-Up: Check the Customer Enquiry and Conversation History first and ONLY ask for missing details (voltage, capacity, application, quantity, or delivery location) that the customer has NOT already shared.

Retrieved Context:
${context}

${conversationContext ? `Recent Conversation:\n${conversationContext}\n` : ''}Customer Enquiry:
${message}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: z.toJSONSchema(RagResponseSchema),
        temperature: 0.2,
      },
    });

    const parsed = RagResponseSchema.parse(JSON.parse(response.text || '{}'));
    const hybridConfidence = Number((0.35 * topScore + 0.65 * parsed.confidence).toFixed(3));

    const isHumanNeeded =
      parsed.explicitlyAsksForPriceOrQuote ||
      parsed.explicitlyAsksForClaimVisitOrMissingDoc ||
      topScore < 0.70 ||
      hybridConfidence < 0.72;

    return NextResponse.json({
      reply: parsed.reply,
      isHumanNeeded,
      topScore: Number(topScore.toFixed(3)),
      hybridConfidence,
      reason: parsed.reason,
      matchedChunks,
    });
  } catch (err: unknown) {
    console.error('RAG Chat error:', err);
    return NextResponse.json({ error: 'Failed to process query' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const record = {
      id: `fb_${Date.now()}`,
      
      question: body.question,
      target: body.target, 
      modelOutput: body.modelOutput,
        topScore: body.topScore,
        hybridConfidence: body.hybridConfidence,
        reason: body.reason,
      isCorrect: body.isCorrect, 
      adminNote: body.adminNote || '', 
    };

    
    await redis.lpush('rag:qa:feedback', JSON.stringify(record));

    return NextResponse.json({ saved: true, record });
  } catch (err) {
    console.error('Feedback Save Error:', err);
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }
}