// Gemini 임베딩 + 답변 생성 (REST)
const KEY = () => process.env.GEMINI_API_KEY || '';
const GEN = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const EMB = () => process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';

// 텍스트 → 의미 좌표(임베딩 벡터)
export async function embed(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMB()}:embedContent?key=${KEY()}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: { parts: [{ text }] } }),
  });
  if (!res.ok) throw new Error(`embed ${res.status}: ${(await res.text()).slice(0, 150)}`);
  const d: any = await res.json();
  return d?.embedding?.values ?? [];
}

// 자료(context)만 근거로 답 생성
export async function generate(question: string, context: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEN()}:generateContent?key=${KEY()}`;
  const prompt = `아래 [자료]에 있는 내용만 근거로 한국어로 답하세요.
자료에 없으면 반드시 "자료에 없습니다"라고만 답하고 절대 지어내지 마세요.

[자료]
${context}

[질문]
${question}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });
  if (!res.ok) throw new Error(`generate ${res.status}: ${(await res.text()).slice(0, 150)}`);
  const d: any = await res.json();
  return (d?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
}

// 코사인 유사도
export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}
