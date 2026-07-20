/** Afrikaans prose writing via Gemini — the house rule: GPT-5.4 reasons and
    orchestrates tools; Gemini writes any reader-facing Afrikaans copy. */
export async function skryfAfrikaans(opdrag: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: opdrag }] }],
          generationConfig: { temperature: 0.4 },
        }),
      }
    );
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
}
