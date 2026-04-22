import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { prompt, content, type } = await req.json();

    if (!prompt || !content) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos" },
        { status: 400 }
      );
    }

    const systemPrompt = `Eres PostMagic, un experto en marketing de contenidos y copywriting para redes sociales.
Tu especialidad es transformar cualquier texto, idea o URL en contenido viral adaptado a cada plataforma.
Responde ÚNICAMENTE con el contenido generado, sin explicaciones previas ni comentarios adicionales.
El contenido debe estar en español, ser auténtico, dinámico y optimizado para engagement.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `${prompt}\n\nContenido a transformar:\n${content}`,
        },
      ],
    });

    const generatedContent = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("\n");

    return NextResponse.json({ content: generatedContent, type });
  } catch (error) {
    console.error("Error calling Anthropic API:", error);
    return NextResponse.json(
      { error: "Error al generar el contenido" },
      { status: 500 }
    );
  }
}
