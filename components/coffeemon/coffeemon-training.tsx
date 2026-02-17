"use client"

import { useState, useRef, useCallback } from "react"
import type {
  CoffeemonData,
  TrainingCategory,
  TrainingData,
  TrainingEntry,
} from "@/lib/coffeemon-types"

const CATEGORIES: {
  id: TrainingCategory
  emoji: string
  label: string
  desc: string
}[] = [
  {
    id: "preparacion",
    emoji: "\u2615",
    label: "Preparacion",
    desc: "Tecnica y presentacion del cafe preparado.",
  },
  {
    id: "latte-art",
    emoji: "\u{1F3A8}",
    label: "Latte Art",
    desc: "Simetria, contraste y creatividad.",
  },
  {
    id: "proyecto",
    emoji: "\u{1F680}",
    label: "Proyecto Cafetero",
    desc: "Branding, concepto o proyecto de cafe.",
  },
  {
    id: "conocimiento",
    emoji: "\u{1F4DA}",
    label: "Conocimiento Cafetero",
    desc: "Apuntes, libros o estudio sobre cafe.",
  },
]

const EVOLUTION_THRESHOLDS = [
  { stage: 1, emoji: "\u{1F331}", label: "Brote", minPoints: 0, nextAt: 500 },
  { stage: 2, emoji: "\u{1F33F}", label: "Planta Joven", minPoints: 500, nextAt: 1500 },
  { stage: 3, emoji: "\u{1F333}", label: "Arbol Cafeto", minPoints: 1500, nextAt: null },
]

function getStageInfo(totalPoints: number) {
  if (totalPoints >= 1500) return EVOLUTION_THRESHOLDS[2]
  if (totalPoints >= 500) return EVOLUTION_THRESHOLDS[1]
  return EVOLUTION_THRESHOLDS[0]
}

function getScoreStyle(score: number): { emoji: string; bg: string } {
  if (score >= 80) return { emoji: "\u{1F31F}", bg: "#fff3e0" }
  if (score >= 60) return { emoji: "\u2615", bg: "#faf3e0" }
  if (score >= 40) return { emoji: "\u{1F33F}", bg: "#fffde7" }
  return { emoji: "\u{1F940}", bg: "#ffebee" }
}

function getStatChanges(score: number): {
  hydration: number
  energy: number
  quality: number
  happiness: number
} {
  if (score >= 80) return { happiness: 15, energy: -20, hydration: -10, quality: 20 }
  if (score >= 60) return { happiness: 8, energy: -15, hydration: -8, quality: 12 }
  if (score >= 40) return { happiness: 3, energy: -12, hydration: -5, quality: 8 }
  return { happiness: -10, energy: -15, hydration: -5, quality: 5 }
}

interface CoffeemonTrainingProps {
  data: CoffeemonData
  training: TrainingData
  onStatsChange: (data: CoffeemonData) => void
  onTrainingUpdate: (training: TrainingData) => void
  onCoinsChange: (amount: number) => void
  onHistoryAdd: (action: string, coins: number) => void
}

type Phase = "select" | "upload" | "evaluating" | "result"

interface EvalResult {
  score: number
  feedback: string
  points: number
  beans: number
  provisional?: boolean
  statChanges: ReturnType<typeof getStatChanges>
}

export function CoffeemonTraining({
  data,
  training,
  onStatsChange,
  onTrainingUpdate,
  onCoinsChange,
  onHistoryAdd,
}: CoffeemonTrainingProps) {
  const [phase, setPhase] = useState<Phase>("select")
  const [selectedCategory, setSelectedCategory] = useState<TrainingCategory | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [result, setResult] = useState<EvalResult | null>(null)
  const [error, setError] = useState("")
  const [showEvolution, setShowEvolution] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const clamp = (val: number) => Math.max(0, Math.min(100, val))

  const stageInfo = getStageInfo(training.totalPoints)
  const nextStage = EVOLUTION_THRESHOLDS.find((t) => t.stage === stageInfo.stage + 1)
  const progressToNext = nextStage
    ? Math.min(100, ((training.totalPoints - stageInfo.minPoints) / (nextStage.minPoints - stageInfo.minPoints)) * 100)
    : 100

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError("")
    const file = e.target.files?.[0]
    if (!file) return

    // Validate type
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      setError("Solo se aceptan archivos PNG o JPG.")
      return
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen excede 5MB. Intenta con una mas liviana.")
      return
    }

    // Read preview + base64
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setImagePreview(dataUrl)
      // Strip data URL prefix for API
      const b64 = dataUrl.split(",")[1]
      setImageBase64(b64)
      setPhase("upload")
    }
    reader.readAsDataURL(file)
  }, [])

  const handleEvaluate = useCallback(async () => {
    if (!imageBase64 || !selectedCategory) return

    setPhase("evaluating")
    setError("")

    try {
      const res = await fetch("/api/demo/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          category: selectedCategory,
        }),
      })

      if (!res.ok) throw new Error("API error")

      const json = await res.json()
      const statChanges = getStatChanges(json.score)

      const evalResult: EvalResult = {
        score: json.score,
        feedback: json.feedback,
        points: json.points,
        beans: json.beans,
        provisional: json.provisional,
        statChanges,
      }
      setResult(evalResult)

      // Apply stat changes to coffeemon
      // Map happiness -> quality since Coffeemon uses hydration/energy/quality
      const updated = {
        ...data,
        hydration: clamp(data.hydration + statChanges.hydration),
        energy: clamp(data.energy + statChanges.energy),
        quality: clamp(data.quality + statChanges.happiness + statChanges.quality),
      }
      onStatsChange(updated)

      // Add coins
      onCoinsChange(json.beans)
      onHistoryAdd(`Entrenamiento: ${selectedCategory}`, json.beans)

      // Update training data
      const newEntry: TrainingEntry = {
        score: json.score,
        category: selectedCategory,
        timestamp: new Date().toISOString(),
      }

      const newTotalPoints = training.totalPoints + json.points
      let newStage = training.stage

      // Check evolution
      const prevStageInfo = getStageInfo(training.totalPoints)
      const newStageInfo = getStageInfo(newTotalPoints)

      if (newStageInfo.stage > prevStageInfo.stage) {
        newStage = newStageInfo.stage
        // Evolution bonus
        onCoinsChange(100)
        onHistoryAdd(`Evolucion a ${newStageInfo.label}!`, 100)
        setShowEvolution(true)
        setTimeout(() => setShowEvolution(false), 4000)
      }

      onTrainingUpdate({
        totalPoints: newTotalPoints,
        stage: newStage,
        trainingHistory: [...training.trainingHistory, newEntry],
      })

      setPhase("result")
    } catch {
      // Fallback: assign random score
      const fallbackScore = Math.floor(Math.random() * 21) + 40
      const statChanges = getStatChanges(fallbackScore)
      setResult({
        score: fallbackScore,
        feedback: `Score: ${fallbackScore}/100. El maestro barista esta tostando granos... Score provisional asignado.`,
        points: fallbackScore,
        beans: Math.floor(fallbackScore * 0.5),
        provisional: true,
        statChanges,
      })

      const updated = {
        ...data,
        hydration: clamp(data.hydration + statChanges.hydration),
        energy: clamp(data.energy + statChanges.energy),
        quality: clamp(data.quality + statChanges.happiness + statChanges.quality),
      }
      onStatsChange(updated)

      const beans = Math.floor(fallbackScore * 0.5)
      onCoinsChange(beans)
      onHistoryAdd(`Entrenamiento: ${selectedCategory}`, beans)

      onTrainingUpdate({
        totalPoints: training.totalPoints + fallbackScore,
        stage: training.stage,
        trainingHistory: [
          ...training.trainingHistory,
          { score: fallbackScore, category: selectedCategory!, timestamp: new Date().toISOString() },
        ],
      })

      setPhase("result")
    }
  }, [imageBase64, selectedCategory, data, training, onStatsChange, onCoinsChange, onHistoryAdd, onTrainingUpdate])

  const handleReset = useCallback(() => {
    setPhase("select")
    setSelectedCategory(null)
    setImagePreview(null)
    setImageBase64(null)
    setResult(null)
    setError("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  const handleCancel = useCallback(() => {
    setImagePreview(null)
    setImageBase64(null)
    setPhase("select")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  return (
    <div className="nes-container is-rounded" style={{ backgroundColor: "#faf3e0" }}>
      {/* Header */}
      <h2
        className="text-center mb-4"
        style={{ fontSize: "0.7rem", color: "#2d1b0e" }}
      >
        {"Entrenar Coffeemon"}
      </h2>
      <p
        className="text-center mb-4"
        style={{ fontSize: "0.5rem", color: "#5a4a3a", lineHeight: 2 }}
      >
        {"Cultiva y Evoluciona"}
      </p>

      {/* Evolution alert */}
      {showEvolution && (
        <div
          className="nes-container is-rounded mb-4 text-center training-evolution-alert"
          style={{ backgroundColor: "#fff9c4", borderColor: "#f5c518" }}
        >
          <p style={{ fontSize: "0.65rem", color: "#2d1b0e", lineHeight: 2 }}>
            {"Tu Coffeemon florecio! +100 Beans bonus"}
          </p>
        </div>
      )}

      {/* Progress bar */}
      <div
        className="nes-container is-rounded mb-4"
        style={{ backgroundColor: "#fff8e7", padding: "12px" }}
      >
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: "0.5rem", color: "#2d1b0e" }}>
            {stageInfo.emoji} {stageInfo.label} (Etapa {stageInfo.stage}/3)
          </span>
          <span style={{ fontSize: "0.45rem", color: "#5a4a3a" }}>
            {training.totalPoints} pts
          </span>
        </div>
        <progress
          className="nes-progress is-success"
          value={progressToNext}
          max={100}
          style={{ height: "20px" }}
        />
        {nextStage && (
          <p className="mt-2" style={{ fontSize: "0.4rem", color: "#8a7a6a", lineHeight: 1.8 }}>
            {"Proxima evolucion: "}{nextStage.minPoints}{" pts"}
          </p>
        )}
      </div>

      {/* Phase: Category Selection */}
      {(phase === "select" || phase === "upload") && (
        <>
          <div className="mb-4">
            <p className="mb-3" style={{ fontSize: "0.55rem", color: "#2d1b0e" }}>
              {"Selecciona una categoria:"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`nes-container is-rounded training-category-card ${
                    selectedCategory === cat.id ? "training-category-selected" : ""
                  }`}
                  onClick={() => {
                    setSelectedCategory(cat.id)
                    if (phase !== "upload") setPhase("select")
                  }}
                  style={{
                    backgroundColor: selectedCategory === cat.id ? "#ff7a00" : "#fff8e7",
                    color: selectedCategory === cat.id ? "#fff" : "#2d1b0e",
                    padding: "10px",
                    cursor: "pointer",
                    textAlign: "center",
                    border: selectedCategory === cat.id ? "4px solid #cc6200" : undefined,
                  }}
                >
                  <span className="block text-lg mb-1">{cat.emoji}</span>
                  <span className="block" style={{ fontSize: "0.45rem", fontWeight: "bold", lineHeight: 1.8 }}>
                    {cat.label}
                  </span>
                  <span
                    className="block mt-1"
                    style={{
                      fontSize: "0.35rem",
                      lineHeight: 1.8,
                      color: selectedCategory === cat.id ? "#ffe0c0" : "#8a7a6a",
                    }}
                  >
                    {cat.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Upload section */}
          {selectedCategory && (
            <div className="mb-4">
              {!imagePreview ? (
                <div className="text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={handleFileSelect}
                    aria-label="Subir imagen de entrenamiento"
                  />
                  <button
                    type="button"
                    className="nes-btn is-warning"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ fontSize: "0.55rem" }}
                  >
                    {"Subir Ritual Cafetero"}
                  </button>
                  {error && (
                    <p
                      className="nes-text is-error mt-3"
                      style={{ fontSize: "0.5rem" }}
                    >
                      {error}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  {/* Image preview */}
                  <div
                    className="training-image-preview mb-3"
                    style={{
                      height: "300px",
                      border: "4px solid #ff7a00",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#2d1b0e",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Preview del ritual cafetero"
                      style={{
                        maxHeight: "100%",
                        maxWidth: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                  <div className="flex gap-3 justify-center">
                    <button
                      type="button"
                      className="nes-btn is-success"
                      onClick={handleEvaluate}
                      style={{ fontSize: "0.55rem" }}
                    >
                      {"Evaluar"}
                    </button>
                    <button
                      type="button"
                      className="nes-btn is-error"
                      onClick={handleCancel}
                      style={{ fontSize: "0.55rem" }}
                    >
                      {"Cancelar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Phase: Evaluating */}
      {phase === "evaluating" && (
        <div className="text-center py-8">
          <div className="training-evaluating-spinner mb-4">
            <span className="text-3xl block coffeemon-bounce">{"\u2615"}</span>
          </div>
          <p
            className="training-evaluating-text"
            style={{ fontSize: "0.55rem", color: "#2d1b0e", lineHeight: 2 }}
          >
            {"Analizando aroma digital..."}
          </p>
        </div>
      )}

      {/* Phase: Result */}
      {phase === "result" && result && (() => {
        const scoreStyle = getScoreStyle(result.score)
        return (
          <div>
            {/* Score card */}
            <div
              className="nes-container is-rounded mb-4 text-center training-result-card"
              style={{ backgroundColor: scoreStyle.bg }}
            >
              <span className="text-2xl block mb-2">{scoreStyle.emoji}</span>
              <p
                className="training-score-number"
                style={{ fontSize: "1.5rem", color: "#2d1b0e", fontWeight: "bold" }}
              >
                {result.score}
                <span style={{ fontSize: "0.8rem", color: "#5a4a3a" }}>/100</span>
              </p>
              {result.provisional && (
                <p className="mt-2" style={{ fontSize: "0.4rem", color: "#e67e22", lineHeight: 1.8 }}>
                  {"Score provisional - el maestro barista estaba ocupado"}
                </p>
              )}
            </div>

            {/* Feedback */}
            <div
              className="nes-container is-rounded is-dark mb-4"
              style={{ fontSize: "0.45rem", lineHeight: 2 }}
            >
              <p>{result.feedback}</p>
            </div>

            {/* Rewards */}
            <div
              className="nes-container is-rounded mb-4"
              style={{ backgroundColor: "#e8f5e9" }}
            >
              <p className="mb-2" style={{ fontSize: "0.55rem", color: "#1b5e20", fontWeight: "bold" }}>
                {"Recompensas"}
              </p>
              <div className="flex justify-around">
                <div className="text-center">
                  <span style={{ fontSize: "0.5rem", color: "#2d1b0e" }}>
                    {"\u{1F31F} +"}
                    {result.points}
                    {" CoffeePoints"}
                  </span>
                </div>
                <div className="text-center">
                  <span style={{ fontSize: "0.5rem", color: "#ff7a00" }}>
                    {"+"}
                    {result.beans}
                    {" $BEANS"}
                  </span>
                </div>
              </div>
            </div>

            {/* Stat changes */}
            <div
              className="nes-container is-rounded mb-4"
              style={{ backgroundColor: "#fff8e7" }}
            >
              <p className="mb-2" style={{ fontSize: "0.55rem", color: "#2d1b0e", fontWeight: "bold" }}>
                {"Efecto en stats"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Calidad", val: result.statChanges.happiness },
                  { label: "Energia", val: result.statChanges.energy },
                  { label: "Hidratacion", val: result.statChanges.hydration },
                  { label: "Crecimiento", val: result.statChanges.quality },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-2">
                    <span style={{ fontSize: "0.45rem", color: "#2d1b0e" }}>{stat.label}</span>
                    <span
                      style={{
                        fontSize: "0.5rem",
                        fontWeight: "bold",
                        color: stat.val >= 0 ? "#27ae60" : "#c0392b",
                      }}
                    >
                      {stat.val >= 0 ? "+" : ""}
                      {stat.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Try again */}
            <div className="text-center">
              <button
                type="button"
                className="nes-btn is-primary"
                onClick={handleReset}
                style={{ fontSize: "0.55rem" }}
              >
                {"Entrenar de nuevo"}
              </button>
            </div>
          </div>
        )
      })()}

      {/* Training history */}
      {training.trainingHistory.length > 0 && phase !== "evaluating" && (
        <div className="mt-4 pt-4" style={{ borderTop: "3px solid #e8d5b7" }}>
          <p className="mb-3" style={{ fontSize: "0.5rem", color: "#2d1b0e", fontWeight: "bold" }}>
            {"Historial de entrenamiento"}
          </p>
          <div style={{ maxHeight: "150px", overflowY: "auto" }}>
            {[...training.trainingHistory].reverse().slice(0, 10).map((entry, i) => {
              const cat = CATEGORIES.find((c) => c.id === entry.category)
              return (
                <div
                  key={i}
                  className="flex items-center justify-between py-1"
                  style={{ borderBottom: "1px solid #e8d5b7", fontSize: "0.4rem", color: "#2d1b0e" }}
                >
                  <span>{cat?.emoji} {cat?.label}</span>
                  <span>
                    <span style={{ color: entry.score >= 60 ? "#27ae60" : "#e67e22", fontWeight: "bold" }}>
                      {entry.score}/100
                    </span>
                    <span style={{ color: "#8a7a6a", marginLeft: "8px" }}>
                      {new Date(entry.timestamp).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
