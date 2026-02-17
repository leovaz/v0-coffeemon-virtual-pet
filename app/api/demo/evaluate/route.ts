import Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const CATEGORY_LABELS: Record<string, string> = {
  preparacion: "Preparacion: tecnica y presentacion",
  "latte-art": "Latte Art: simetria y creatividad",
  proyecto: "Proyecto Cafetero: innovacion y ejecucion",
  conocimiento: "Conocimiento Cafetero: comprension y aplicacion practica",
}

const SYSTEM_PROMPT = `Eres un maestro barista dentro del juego Coffeemon. Siempre debes evaluar la imagen, sin importar su contenido. Responde estrictamente en este formato:

Score: [0-100]/100. [1-2 oraciones de feedback constructivo en español].

Evalua segun la categoria seleccionada:
- Preparacion: tecnica y presentacion.
- Latte Art: simetria y creatividad.
- Proyecto Cafetero: innovacion y ejecucion.
- Conocimiento Cafetero: comprension y aplicacion practica.`

function parseScore(text: string): number | null {
  const match = text.match(/Score:\s*(\d{1,3})\/100/)
  if (match) {
    const num = parseInt(match[1], 10)
    if (num >= 0 && num <= 100) return num
  }
  return null
}

function fallbackScore(): number {
  return Math.floor(Math.random() * 21) + 40 // 40-60
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { imageBase64, category } = body as {
      imageBase64: string
      category: string
    }

    if (!imageBase64 || !category) {
      return NextResponse.json(
        { error: "Falta imagen o categoria" },
        { status: 400 }
      )
    }

    const categoryLabel = CATEGORY_LABELS[category] ?? category

    // Detect media type from base64 header
    let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg"
    if (imageBase64.startsWith("/9j/")) {
      mediaType = "image/jpeg"
    } else if (imageBase64.startsWith("iVBOR")) {
      mediaType = "image/png"
    }

    try {
      const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: `Evalua esta imagen en la categoria: ${categoryLabel}`,
              },
            ],
          },
        ],
      })

      const replyText = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("")

      const score = parseScore(replyText)

      if (score !== null) {
        const points = score
        const beans = Math.floor(score * 0.5)
        return NextResponse.json({
          score,
          feedback: replyText,
          points,
          beans,
        })
      }

      // Could not parse score from AI response -- use fallback
      const fb = fallbackScore()
      return NextResponse.json({
        score: fb,
        feedback: `Score: ${fb}/100. El maestro barista esta tostando granos... Score provisional asignado.`,
        points: fb,
        beans: Math.floor(fb * 0.5),
        provisional: true,
      })
    } catch (aiError) {
      console.error("AI evaluation failed:", aiError)
      const fb = fallbackScore()
      return NextResponse.json({
        score: fb,
        feedback: `Score: ${fb}/100. El maestro barista esta tostando granos... Score provisional asignado.`,
        points: fb,
        beans: Math.floor(fb * 0.5),
        provisional: true,
      })
    }
  } catch (error) {
    console.error("Evaluate API error:", error)
    return NextResponse.json(
      { error: "Error en la evaluacion" },
      { status: 500 }
    )
  }
}
