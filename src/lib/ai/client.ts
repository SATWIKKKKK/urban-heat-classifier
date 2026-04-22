/**
 * Lightweight AI client wrapper.
 *
 * Preferences:
 *  - Prefer `AICREDITS_API_KEY` or `OPENAI_API_KEY` (OpenAI-compatible endpoint)
 *  - Fallback to `OPENROUTER_API_KEY` + OpenRouter endpoint
 *
 * Explicit provider/model ids such as `anthropic/claude-3.5-sonnet` are preserved.
 * This helper still caps unprefixed OpenAI `gpt-4o` requests to `gpt-4o-mini`.
 */

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface AiChatOptions {
  messages: ChatMessage[];
  model?: string; // optional requested model
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

function splitModelId(model: string): { explicit: string; bare: string } {
  const explicit = model.trim();
  const bare = explicit.includes('/') ? explicit.split('/').slice(1).join('/') : explicit;
  return { explicit, bare };
}

/**
 * Normalise model name for the target endpoint.
 * Preserve explicit provider/model ids for multi-provider routes.
 * Only cap OpenAI `gpt-4o` requests when the caller uses an OpenAI-style model.
 */
function chooseModel(requested?: string): string {
  const allowGpt4o = process.env.AI_ALLOW_GPT4O === 'true';
  const envModel = process.env.AI_PREFERRED_MODEL ?? 'gpt-4o-mini';

  const model = requested ?? envModel;
  const { explicit, bare } = splitModelId(model);

  // Cap: never use a model heavier than gpt-4o-mini for OpenAI models
  if (bare.includes('gpt-4o') && !bare.includes('mini')) {
    return explicit.includes('/') ? explicit.replace(bare, 'gpt-4o-mini') : 'gpt-4o-mini';
  }

  // If gpt-4o-mini is requested but not explicitly allowed, fall back
  if (bare === 'gpt-4o-mini' && !allowGpt4o) {
    return explicit.includes('/') ? explicit.replace(bare, 'gpt-3.5-turbo') : 'gpt-3.5-turbo';
  }

  return explicit;
}

export async function aiChat(opts: AiChatOptions): Promise<string> {
  const { messages, temperature = 0.7, maxTokens = 1024, timeoutMs = 25000 } = opts;
  const model = chooseModel(opts.model);
  const { bare } = splitModelId(model);

  // Keep explicit provider ids for OpenRouter; default bare ids to OpenAI namespace.
  const orModel = model.includes('/') ? model : `openai/${model}`;
  // AICredits docs recommend explicit provider/model ids when available.
  const aicredModel = model;
  // OpenAI direct API cannot accept provider prefixes like anthropic/...
  const openaiModel = bare;

  const aicredKey = process.env.AICREDITS_API_KEY ?? '';
  const openaiKey = process.env.OPENAI_API_KEY ?? '';
  const openrouterKey = process.env.OPENROUTER_API_KEY ?? '';

  // AICredits / OpenAI — preferred path for all models
  if (aicredKey || openaiKey) {
    const key = aicredKey || openaiKey;
    const usingAicredits = Boolean(aicredKey);
    const url = usingAicredits
      ? (process.env.AICREDITS_API_URL ?? 'https://api.aicredits.in/v1/chat/completions')
      : 'https://api.openai.com/v1/chat/completions';
    const requestModel = usingAicredits ? aicredModel : openaiModel;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: requestModel, messages, temperature, max_tokens: maxTokens }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.error('[aiChat] OpenAI error', res.status, txt.slice(0, 400));

        const shouldTryOpenRouter = Boolean(
          openrouterKey && usingAicredits && /no endpoints found/i.test(txt),
        );
        if (!shouldTryOpenRouter) return '';
      } else {
        const data = await res.json().catch(() => ({} as any));
        return (data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? '') as string;
      }
    } catch (err) {
      console.error('[aiChat] OpenAI fetch error', err);
      if (!openrouterKey) return '';
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
