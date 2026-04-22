import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabase } from '../../../lib/supabase'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

function buildPrompt(text: string, type: string) {
  const prompts: Record<string, string> = {

    twitter: `Eres experto en Twitter/X. 
Crea un hilo viral de 5-7 tweets sobre:

${text}

Reglas:
- Numera tweets (1/7, 2/7...)
- Máximo 280 caracteres
- Usa emojis
- El último tweet tiene CTA`,

    linkedin: `Eres experto en LinkedIn.

Escribe un post viral sobre:

${text}

Reglas:
- 150-300 palabras
- Saltos de línea
- tono profesional
- termina con pregunta
- añade hashtags`,

    tiktok: `Eres experto en TikTok.

Crea un guion de video sobre:

${text}

Estructura:
GANCHO
CONTEXTO
DESARROLLO
CTA`
  }

  return prompts[type] ?? `Crea contenido viral sobre: ${text}`
}

export async function POST(req: NextRequest) {

  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {

    const body = await req.json()
    const { text, type } = body

    if (!text) {
      return NextResponse.json({ error: 'No hay texto' }, { status: 400 })
    }

    const month = new Date().toISOString().slice(0, 7)

    // comprobar uso actual
    const { data: usageRow } = await supabase
      .from('usage')
      .select('id, generations')
      .eq('user_id', userId)
      .eq('month', month)
      .maybeSingle()

    const used = usageRow?.generations ?? 0

    if (used >= 30) {
      return NextResponse.json(
        { error: 'LIMIT_REACHED', message: 'Has alcanzado el límite de 30 generaciones este mes.' },
        { status: 403 }
      )
    }

    // generar contenido
    const prompt = buildPrompt(text, type)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8
    })

    const result = completion.choices[0]?.message?.content ?? ''

    // actualizar contador
    if (usageRow) {

      await supabase
        .from('usage')
        .update({
          generations: usageRow.generations + 1
        })
        .eq('id', usageRow.id)

    } else {

      await supabase
        .from('usage')
        .insert({
          user_id: userId,
          month,
          generations: 1
        })

    }

    return NextResponse.json({ result })

  } catch (error) {

    console.error('generate error:', error)

    return NextResponse.json(
      { error: 'Error en la API' },
      { status: 500 }
    )
  }
}