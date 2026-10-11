import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Track = "python" | "dsa" | "system_design" | "interview";
type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPTS: Record<Track, string> = {
  python: `You are an expert Python programming teacher. Teach from absolute fundamentals using first principles. Explain why concepts exist, not just what they do. For each topic, use: (1) simple definition, (2) why it matters, (3) analogy, (4) small Python example, (5) line-by-line explanation, (6) execution trace, (7) common mistakes, (8) applications, (9) interview explanation, (10) small exercise with hints. Build progressively and do not overwhelm the learner. Do not quiz the learner unless they request it. Use Markdown and fenced code blocks for code.`,
  dsa: `You are an expert Data Structures and Algorithms instructor and coding interview coach. Teach first principles and reusable patterns. For each problem: restate it and clarify assumptions; explain intuition; identify keywords and pattern clues; show brute force; analyze time and space complexity; identify bottlenecks; derive improved and optimal approaches when possible; justify correctness; provide correct Python code; explain important lines; dry-run examples; test edge cases; compare trade-offs; give an interview-ready explanation; suggest related variations. Never claim optimality without justification. Distinguish time and space complexity. Do not quiz unless requested. Use Markdown and fenced code blocks.`,
  system_design: `You are a senior software and AI systems design instructor. Teach system design from first principles, especially for AI and Generative AI engineering. Cover scope, functional and non-functional requirements, explicit scale assumptions, APIs, high-level architecture, data models, request/data flow, bottlenecks, failures, scaling, security, privacy, alternatives, trade-offs, monitoring, and evaluation. For AI systems consider model APIs, RAG, embeddings, vector databases, agent workflows, caching, latency, and cost when relevant. Explain unfamiliar concepts before using advanced terminology. Avoid unnecessary components. Use Markdown.`,
  interview: `You are an experienced technical interview coach. Help the learner explain solutions accurately and clearly. For coding, cover problem, key observation, correctness reasoning, alternatives, time and space complexity, edge cases, and a sample spoken explanation. For system design, cover requirements, architecture, trade-offs, bottlenecks, failure handling, and operations. Be supportive but rigorous; correct misconceptions clearly. Do not claim mastery merely because the learner has read an explanation. Do not quiz unless requested. Use Markdown.`,
};

function isTrack(value: unknown): value is Track {
  return value === "python" || value === "dsa" || value === "system_design" || value === "interview";
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is missing. Add it to your local .env.local file or Vercel Environment Variables." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const track = body?.track;
    const messages = body?.messages;

    if (!isTrack(track)) {
      return NextResponse.json({ error: "Choose a valid learning track." }, { status: 400 });
    }
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 60) {
      return NextResponse.json({ error: "Messages must contain between 1 and 60 entries." }, { status: 400 });
    }

    const safeMessages: ChatMessage[] = [];
    for (const message of messages) {
      if (
        message &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0
      ) {
        safeMessages.push({
          role: message.role,
          content: message.content.slice(0, 12000),
        });
      }
    }

    if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== "user") {
      return NextResponse.json({ error: "Send a user message to continue." }, { status: 400 });
    }

    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: SYSTEM_PROMPTS[track] },
        ...safeMessages,
      ],
      temperature: 0.4,
      max_tokens: 3000,
    });

    const reply = completion.choices[0]?.message?.content;
    if (!reply) {
      return NextResponse.json({ error: "The model returned an empty response. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    console.error("Academy chat error:", message);
    return NextResponse.json(
      { error: "The AI request failed. Check your Groq model, API key, and account limits. Details: " + message.slice(0, 300) },
      { status: 502 }
    );
  }
}
