'use client'

/**
 * Normalized configuration for LLM nodes.
 *
 * This shape is stored under node.config for type === 'llm' and can be
 * serialized into workflows and custom nodes.
 */
export interface LlmConfig {
  provider?: string
  model: string
  temperature: number
  max_tokens: number
  system: string
  user: string
  /**
   * Optional per-node API key override. If omitted, the backend should fall
   * back to environment/global configuration.
   */
  api_key?: string
  /**
   * Optional legacy env var name (e.g. OPENROUTER_API_KEY). Kept for
   * backwards compatibility with existing configs.
   */
  api_key_name?: string
}

export const DEFAULT_LLM_MODEL = 'gpt-4o-mini'

export function createDefaultLlmConfig(): LlmConfig {
  return {
    provider: 'openrouter',
    model: DEFAULT_LLM_MODEL,
    temperature: 0.7,
    max_tokens: 1000,
    system: '',
    user: 'You are a helpful assistant. Process this data.',
    api_key: undefined,
    api_key_name: 'OPENROUTER_API_KEY',
  }
}

/**
 * Normalize any existing llm config (old or new) into LlmConfig.
 * This provides backwards compatibility for workflows saved before
 * the LLM dialog rewrite.
 */
export function normalizeLlmConfig(raw: any | undefined | null): LlmConfig {
  if (!raw || typeof raw !== 'object') {
    return createDefaultLlmConfig()
  }

  const base = createDefaultLlmConfig()

  const provider = typeof raw.provider === 'string' ? raw.provider : base.provider
  const model =
    typeof raw.model === 'string' && raw.model.trim()
      ? raw.model
      : base.model

  const temperature =
    typeof raw.temperature === 'number' ? raw.temperature : base.temperature

  const max_tokens =
    typeof raw.max_tokens === 'number' ? raw.max_tokens : base.max_tokens

  const system =
    typeof raw.system === 'string'
      ? raw.system
      : ''

  // Old configs used `prompt` as the main user text; prefer new `user` field
  const user =
    typeof raw.user === 'string'
      ? raw.user
      : typeof raw.prompt === 'string'
        ? raw.prompt
        : base.user

  const api_key =
    typeof raw.api_key === 'string' && raw.api_key.trim()
      ? raw.api_key
      : undefined

  const api_key_name =
    typeof raw.api_key_name === 'string' && raw.api_key_name.trim()
      ? raw.api_key_name
      : base.api_key_name

  return {
    provider,
    model,
    temperature,
    max_tokens,
    system,
    user,
    api_key,
    api_key_name,
  }
}


