"use client";

import { useEffect, useState } from "react";

type ContentType = "linkedin" | "twitter" | "tiktok";

interface GeneratedContent {
  type: ContentType;
  content: string;
}

const CONTENT_CONFIG: Record<ContentType, { prompt: string }> = {
  linkedin: { prompt: "Genera un post de LinkedIn" },
  twitter: { prompt: "Genera un hilo de X/Twitter" },
  tiktok: { prompt: "Genera un guion de TikTok" },
};

export default function PostMagicPage() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<GeneratedContent[]>([]);
  const [loading, setLoading] = useState<ContentType[]>([]);
  const [usage, setUsage] = useState({ used: 0, limit: 30, remaining: 30 });

  const fetchUsage = async () => {
    try {
      const res = await fetch("/api/usage");
      const data = await res.json();
      setUsage(data);
    } catch {
      setUsage({ used: 0, limit: 30, remaining: 30 });
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  const generate = async (type: ContentType) => {
    if (!input.trim()) return;

    setLoading((prev) => [...prev, type]);
    setResults((prev) => prev.filter((r) => r.type !== type));

    try {
      const config = CONTENT_CONFIG[type];

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input,
          prompt: config.prompt,
          type,
        }),
      });

      const data = await response.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      if (data.content) {
        setResults((prev) => [
          ...prev.filter((r) => r.type !== type),
          { type, content: data.content },
        ]);

        await fetchUsage();
      }
    } catch (error) {
      console.error("Error generating content:", error);
    } finally {
      setLoading((prev) => prev.filter((t) => t !== type));
    }
  };

  return (
    <main style={{ padding: "32px", maxWidth: "900px", margin: "0 auto" }}>
      <h1>PostMagic</h1>

      <div
        style={{
          marginBottom: "16px",
          padding: "12px 16px",
          border: "1px solid #333",
          borderRadius: "10px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>Plan Free</span>
        <span>
          {usage.used} / {usage.limit} usadas · {usage.remaining} restantes
        </span>
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Escribe tu idea..."
        rows={6}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "10px",
          marginBottom: "16px",
        }}
      />

      <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        <button
          onClick={() => generate("linkedin")}
          disabled={loading.includes("linkedin")}
        >
          {loading.includes("linkedin") ? "Generando..." : "LinkedIn"}
        </button>

        <button
          onClick={() => generate("twitter")}
          disabled={loading.includes("twitter")}
        >
          {loading.includes("twitter") ? "Generando..." : "Twitter"}
        </button>

        <button
          onClick={() => generate("tiktok")}
          disabled={loading.includes("tiktok")}
        >
          {loading.includes("tiktok") ? "Generando..." : "TikTok"}
        </button>
      </div>

      <div style={{ display: "grid", gap: "16px" }}>
        {results.map((result) => (
          <div
            key={result.type}
            style={{
              border: "1px solid #333",
              borderRadius: "10px",
              padding: "16px",
            }}
          >
            <h3 style={{ textTransform: "capitalize" }}>{result.type}</h3>
            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
              {result.content}
            </pre>
          </div>
        ))}
      </div>
    </main>
  );
}