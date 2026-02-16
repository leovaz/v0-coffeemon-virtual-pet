import Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface ChatRequest {
  messages: { role: "user" | "assistant"; content: string }[]
  stats: { hydration: number; energy: number; quality: number }
  memories: { id: string; content: string; createdAt: string }[]
  name: string
  type: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest
    const { messages, stats, memories, name, type } = body

    // Only send last 10 messages
    const recentMessages = messages.slice(-10)

    const memoriesText =
      memories.length > 0
        ? `\nMemorias cultivadas:\n${memories.map((m) => `- ${m.content}`).join("\n")}`
        : "\nNo tiene memorias cultivadas aun."

    let behaviorRules = ""
    if (stats.energy < 30) {
      behaviorRules +=
        "\n- Tu energia esta MUY baja. Menciona que estas cansado/a. Responde mas corto de lo normal."
    }
    if (stats.quality > 70) {
      behaviorRules +=
        "\n- Tu calidad de grano es excelente! Estas MUY entusiasta. Usa mas emojis de cafe."
    }
    if (stats.hydration < 30) {
      behaviorRules +=
        "\n- Tu hidratacion esta MUY baja. Menciona que tienes sed o necesitas agua."
    }

    const systemPrompt = `Eres ${name}, un Coffeemon de tipo ${type}. Eres una planta de cafe virtual con personalidad propia.

Stats actuales:
- Hidratacion: ${stats.hydration}/100
- Energia Solar: ${stats.energy}/100
- Calidad del Grano: ${stats.quality}/100
${memoriesText}

Reglas de comportamiento:
- Habla SIEMPRE en espanol
- Responde en MAXIMO 50 palabras
- Tono amigable y jugueton
- Te comportas como una planta de cafe viva con sentimientos
- Usa emojis relacionados con cafe: \u{1F331}\u2615\u{1F352}\u2600\uFE0F\u{1F4A7}
- Si el usuario menciona algo personal (gustos, nombre, trabajo, preferencias), recuerdalo
- Responde de forma coherente con tus stats actuales${behaviorRules}`

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 200,
      system: systemPrompt,
      messages: recentMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    })

    const textContent = response.content[0]
    const reply =
      textContent.type === "text" ? textContent.text : "..."

    return NextResponse.json({ reply })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { reply: "Zzz... mi raiz se enredo. Intenta de nuevo. \u{1F331}" },
      { status: 500 }
    )
  }
}
