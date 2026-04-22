/**
 * Lightweight AI client wrapper.
 *
 * Preferences:
 *  - Prefer `AICREDITS_API_KEY` or `OPENAI_API_KEY` (OpenAI-compatible endpoint)
 *  - Fallback to `OPENROUTER_API_KEY` + OpenRouter endpoint
 *
 * This helper intentionally prefers lower-cost models by default (`gpt-3.5-turbo`) and
 * will only use `gpt-4o-mini` when explicitly allowed via `AI_ALLOW_GPT4O=true` or when
 * the caller requests it.
 */

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface AiChatOptions {
  messages: ChatMessage[];
  model?: string; // optional requested model
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

/**
 * Normalise model name for the target endpoint.
 * AICredits is fully OpenAI-compatible and accepts bare model names.
 * Strip any provider prefix (e.g. "openai/") before sending to AICredits.
 * OpenRouter fallback keeps the prefixed name.
 */
function chooseModel(requested?: string): string {
  const allowGpt4o = process.env.AI_ALLOW_GPT4O === 'true';
  const envModel = process.env.AI_PREFERRED_MODEL ?? 'gpt-4o-mini';

  let model = requested ?? envModel;

  // Strip provider prefix — AICredits accepts bare names (gpt-4o-mini, not openai/gpt-4o-mini)
  const bare = model.includes('/') ? model.split('/').slice(1).join('/') : model;

  // Cap: never use a model heavier than gpt-4o-mini for OpenAI models
  if (bare.includes('gpt-4o') && !bare.includes('mini')) return 'gpt-4o-mini';

  // If gpt-4o-mini is requested but not explicitly allowed, fall back
  if (bare === 'gpt-4o-mini' && !allowGpt4o) return 'gpt-3.5-turbo';

  return bare; // always return bare name for AICredits
}

export async function aiChat(opts: AiChatOptions): Promise<string> {
  const { messages, temperature = 0.7, maxTokens = 1024, timeoutMs = 25000 } = opts;
  const model = chooseModel(opts.model);

  // For OpenRouter fallback, add openai/ prefix
  const orModel = `openai/${model}`;

  const aicredKey = process.env.AICREDITS_API_KEY ?? '';
  const openaiKey = process.env.OPENAI_API_KEY ?? '';
  const openrouterKey = process.env.OPENROUTER_API_KEY ?? '';

  // AICredits / OpenAI — preferred path for all models
  if (aicredKey || openaiKey) {
    const key = aicredKey || openaiKey;
    const url = process.env.AICREDITS_API_URL ?? 'https://api.openai.com/v1/chat/completions';
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: model, messages, temperature, max_tokens: maxTokens }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.error('[aiChat] OpenAI error', res.status, txt.slice(0, 400));
        return '';
      }
      const data = await res.json().catch(() => ({} as any));
      return (data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? '') as string;
    } catch (err) {
      console.error('[aiChat] OpenAI fetch error', err);
      return '';
    }
  }

  // Fallback: OpenRouter
  if (openrouterKey) {
    const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openrouterKey}`,
          'HTTP-Referer': 'https://urban-heat-mitigator.vercel.app',
          'X-Title': 'Urban Heat Mitigator',
        },
        body: JSON.stringify({ model: orModel, messages, temperature, max_tokens: maxTokens }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.error('[aiChat] OpenRouter error', res.status, txt.slice(0, 400));
        return '';
      }
      const data = await res.json().catch(() => ({} as any));
      return (data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? '') as string;
    } catch (err) {
      console.error('[aiChat] OpenRouter fetch error', err);
      return '';
    }
  }

  console.warn('[aiChat] No AI API key configured (AICREDITS/OPENAI/OPENROUTER)');
  return '';
}

export default aiChat;
