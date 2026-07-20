const API = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export type InlineKnop = { text: string; callback_data: string };

export async function stuurBoodskap(
  chatId: number,
  teks: string,
  knoppies?: InlineKnop[][]
) {
  await fetch(`${API()}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: teks,
      parse_mode: "Markdown",
      reply_markup: knoppies ? { inline_keyboard: knoppies } : undefined,
    }),
  });
}

export async function antwoordCallback(id: string, teks?: string) {
  await fetch(`${API()}/answerCallbackQuery`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ callback_query_id: id, text: teks }),
  });
}

export async function kryLêerUrl(fileId: string): Promise<string | null> {
  const res = await fetch(`${API()}/getFile?file_id=${fileId}`);
  const data = await res.json();
  if (!data.ok) return null;
  return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${data.result.file_path}`;
}

/** Transcribe an Afrikaans voicenote with Gemini. */
export async function transkribeer(oggBuffer: Buffer): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Transkribeer hierdie Afrikaanse stemnota woordeliks. Gee net die transkripsie, niks anders nie.",
              },
              { inline_data: { mime_type: "audio/ogg", data: oggBuffer.toString("base64") } },
            ],
          },
        ],
      }),
    }
  );
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}
