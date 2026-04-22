import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '../../../lib/supabase';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildPrompt(
  text: string,
  type: string,
  audience: string,
  goal: string,
  mode: string,
  rewriteStyle?: string
): string {
  const audienceCtx = audience ? `La audiencia objetivo son: ${audience}.` : '';
  const goalCtx = `El objetivo del contenido es: ${goal}.`;

  if (mode === 'rewrite' && rewriteStyle) {
    return `Eres un experto en contenido viral. Reescribe el siguiente texto siendo ${rewriteStyle}. ${audienceCtx} ${goalCtx} Devuelve SOLO el texto reescrito, sin explicaciones ni preámbulos.\n\n${text}`;
  }

  if (mode === 'hooks') {
    return `Genera 5 ganchos (hooks) irresistibles para empezar un post de ${type}. ${audienceCtx} ${goalCtx} Tema: ${text}. Devuelve solo los 5 hooks numerados, sin explicaciones.`;
  }

  const prompts: Record<string, string> = {
    twitter: `Eres un experto en Twitter/X. Crea un hilo viral de 5-7 tweets. ${audienceCtx} ${goalCtx}
REGLAS:
- Numera cada tweet (1/7, 2/7...)
- Máximo 280 caracteres por tweet
- Separa cada tweet con exactamente "---"
- El primero debe ser un hook que enganche
- Usa emojis estratégicos
- El último tweet tiene un CTA claro
CONTENIDO: ${text}`,

    linkedin: `Eres un experto en LinkedIn. Crea un post profesional y viral. ${audienceCtx} ${goalCtx}
REGLAS:
- Primera línea que obligue a pulsar "ver más"
- 150-300 palabras
- Saltos de línea frecuentes para móvil
- 3-5 puntos clave
- Pregunta al final para comentarios
- 4-6 hashtags relevantes al final
CONTENIDO: ${text}`,

    tiktok: `Eres un experto en TikTok. Crea un guion para video de 60-90 segundos. ${audienceCtx} ${goalCtx}
ESTRUCTURA:
[GANCHO 0-3s]: frase que para el scroll
[CONTEXTO 3-15s]: el problema o situación
[DESARROLLO 15-50s]: contenido principal con valor
[TWIST 50-70s]: revelación o giro inesperado
[CTA 70-90s]: llamada a la acción clara
Incluye indicaciones [TEXTO EN PANTALLA] y sugerencia de música.
CONTENIDO: ${text}`,
  };

  return prompts[type] ?? `Crea contenido viral para ${type} sobre: ${text}. ${audienceCtx} ${goalCtx}`;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { text, type, audience = '', goal = 'engagement', mode = 'full', rewriteStyle } = body;

    if (!text) {
      return NextResponse.json({ error: 'No hay texto' }, { status: 400 });
    }

    const month = new Date().toISOString().slice(0, 7);

    // ── ¿Es Pro? ──────────────────────────────────────────────────────────────
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();

    const isPro =
      subscription?.status === 'pro' &&
      subscription?.current_period_end &&
      new Date(subscription.current_period_end) > new Date();

    // ── Límite free ───────────────────────────────────────────────────────────
    if (!isPro) {
      const { data: usageRow } = await supabase
        .from('usage')
        .select('generations')
        .eq('user_id', userId)
        .eq('month', month)
        .maybeSingle();

      if ((usageRow?.generations ?? 0) >= 30) {
        return NextResponse.json(
          { error: 'LIMIT_REACHED', message: 'Has alcanzado el límite de 30 generaciones gratuitas este mes.' },
          { status: 403 }
        );
      }
    }

    // ── OpenAI ────────────────────────────────────────────────────────────────
    const prompt = buildPrompt(text, type, audience, goal, mode, rewriteStyle);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.85,
      max_tokens: 1200,
    });

    const result = completion.choices[0].message.content ?? '';

    // ── Actualizar contador ───────────────────────────────────────────────────
    const { data: row } = await supabase
      .from('usage')
      .select('id, generations')
      .eq('user_id', userId)
      .eq('month', month)
      .maybeSingle();

    if (row) {
      await supabase
        .from('usage')
        .update({ generations: row.generations + 1 })
        .eq('id', row.id);
    } else {
      await supabase
        .from('usage')
        .insert({ user_id: userId, month, generations: 1 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('[generate]', error);
    return NextResponse.json({ error: 'Error en la API' }, { status: 500 });
  }
}