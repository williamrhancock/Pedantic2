'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { useTheme } from '@/contexts/ThemeContext'
import { normalizeLlmConfig, type LlmConfig, createDefaultLlmConfig } from '@/lib/llm'

const COMMON_PROVIDERS = [
  { label: 'OpenRouter (multi-provider router)', value: 'openrouter' },
  { label: 'OpenAI', value: 'openai' },
  { label: 'Groq', value: 'groq' },
  { label: 'Together AI', value: 'together' },
  { label: 'Fireworks AI', value: 'fireworks' },
  { label: 'DeepInfra', value: 'deepinfra' },
  { label: 'Perplexity AI', value: 'perplexity' },
  { label: 'Mistral AI', value: 'mistral' },
]

const PROVIDER_MODEL_ENDPOINTS: Record<string, string> = {
  openrouter: 'https://openrouter.ai/api/v1/models',
  openai: 'https://api.openai.com/v1/models',
  groq: 'https://api.groq.com/openai/v1/models',
  together: 'https://api.together.xyz/v1/models',
  fireworks: 'https://api.fireworks.ai/inference/v1/models',
  deepinfra: 'https://api.deepinfra.com/v1/openai/models',
  perplexity: 'https://api.perplexity.ai/openai/v1/models',
  mistral: 'https://api.mistral.ai/v1/models',
}

// Optional client-side public env keys that can be used for model fetching
// without revealing the value in the UI. These must be defined as
// NEXT_PUBLIC_* vars in the Next.js runtime to be available here.
const PROVIDER_PUBLIC_ENV_KEYS: Record<string, string> = {
  openrouter: 'NEXT_PUBLIC_OPENROUTER_API_KEY',
  openai: 'NEXT_PUBLIC_OPENAI_API_KEY',
  groq: 'NEXT_PUBLIC_GROQ_API_KEY',
  together: 'NEXT_PUBLIC_TOGETHER_API_KEY',
  fireworks: 'NEXT_PUBLIC_FIREWORKS_API_KEY',
  deepinfra: 'NEXT_PUBLIC_DEEPINFRA_API_KEY',
  perplexity: 'NEXT_PUBLIC_PERPLEXITY_API_KEY',
  mistral: 'NEXT_PUBLIC_MISTRAL_API_KEY',
}

const COMMON_MODELS = [
  {
    label: 'OpenRouter – meta-llama/Meta-Llama-3.1-70B-Instruct',
    value: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
    provider: 'openrouter',
  },
  { label: 'OpenAI – gpt-4o', value: 'gpt-4o', provider: 'openai' },
  { label: 'OpenAI – gpt-4o-mini', value: 'gpt-4o-mini', provider: 'openai' },
  { label: 'Groq – llama-3.1-70b', value: 'llama-3.1-70b', provider: 'groq' },
  { label: 'Together – Llama-3.1-70B', value: 'together/llama-3.1-70b', provider: 'together' },
  { label: 'Fireworks – Mixtral-8x7B', value: 'accounts/fireworks/models/mixtral-8x7b-instruct', provider: 'fireworks' },
  { label: 'DeepInfra – meta-llama/Meta-Llama-3.1-70B-Instruct', value: 'meta-llama/Meta-Llama-3.1-70B-Instruct', provider: 'deepinfra' },
  { label: 'Perplexity – pplx-70b-online', value: 'pplx-70b-online', provider: 'perplexity' },
  { label: 'Mistral – mistral-large-latest', value: 'mistral-large-latest', provider: 'mistral' },
]

type TabId = 'form' | 'json'

interface LlmNodeDialogProps {
  isOpen: boolean
  isLocked?: boolean
  nodeId: string
  nodeTitle: string
  rawConfig?: any
  onClose: () => void
  onSave: (config: LlmConfig) => void
}

export function LlmNodeDialog({
  isOpen,
  isLocked = false,
  nodeId,
  nodeTitle,
  rawConfig,
  onClose,
  onSave,
}: LlmNodeDialogProps) {
  const { isDark } = useTheme()
  const initialConfig = useMemo(
    () => normalizeLlmConfig(rawConfig as LlmConfig | undefined),
    [rawConfig]
  )

  const [config, setConfig] = useState<LlmConfig>(initialConfig)
  const [tab, setTab] = useState<TabId>('form')
  const [jsonText, setJsonText] = useState<string>(JSON.stringify({ ...initialConfig, api_key: undefined }, null, 2))
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [models, setModels] = useState<{ label: string; value: string }[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      const normalized = normalizeLlmConfig(rawConfig as LlmConfig | undefined)
      setConfig(normalized)
      // Do not expose api_key in the Advanced JSON view
      const { api_key: _ignored, ...jsonSafe } = normalized
      setJsonText(JSON.stringify(jsonSafe, null, 2))
      setJsonError(null)
      setFormError(null)
      setTab('form')
    }
  }, [isOpen, rawConfig])

  if (!isOpen) return null

  const handleFieldChange = (partial: Partial<LlmConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial }
      // Keep api_key out of the JSON tab; it is edited only via the masked field.
      const { api_key: _ignored, ...jsonSafe } = next
      setJsonText(JSON.stringify(jsonSafe, null, 2))
      return next
    })
    setFormError(null)
    setModelsError(null)
  }

  const handleSave = () => {
    if (isLocked) return
    if (!config.model || !config.model.trim()) {
      setFormError('Model is required.')
      return
    }
    if (!Number.isFinite(config.max_tokens) || config.max_tokens <= 0) {
      setFormError('max_tokens must be a positive number.')
      return
    }
    onSave(config)
    onClose()
  }

  const handleJsonChange = (value: string | undefined) => {
    const text = value ?? ''
    setJsonText(text)
    if (!text.trim()) {
      setJsonError('Configuration JSON cannot be empty.')
      return
    }
    try {
      const parsed = JSON.parse(text)
      const normalized = normalizeLlmConfig(parsed)
      // Preserve any existing api_key already held in state; JSON edits never touch it.
      setConfig((prev) => ({
        ...normalized,
        api_key: prev.api_key,
      }))
      setJsonError(null)
      setFormError(null)
    } catch (e) {
      setJsonError(
        e instanceof Error ? e.message : 'Invalid JSON. Please check the syntax.'
      )
    }
  }

  const saveDisabled = isLocked || !!jsonError
  const currentProvider = config.provider || 'openrouter'

  const getGlobalApiKeyForProvider = (provider: string): string | undefined => {
    const envKeyName = PROVIDER_PUBLIC_ENV_KEYS[provider]
    if (!envKeyName) return undefined
    // process.env is replaced at build time for NEXT_PUBLIC_* vars
    return (process.env as Record<string, string | undefined>)[envKeyName]
  }

  const providerModels =
    models.length > 0
      ? models
      : COMMON_MODELS.filter((m) => m.provider === currentProvider)

  const currentModelInList = providerModels.some((m) => m.value === config.model)
  const selectModelValue = currentModelInList ? config.model : 'custom'

  const loadModelsForProvider = async (provider: string) => {
    setModelsError(null)
    setModels([])

    const overrideKey = config.api_key && config.api_key.trim()
    const globalKey = getGlobalApiKeyForProvider(provider)?.trim()
    const effectiveKey = overrideKey || globalKey

    // Require either an override key or a public env key before attempting dynamic fetch.
    if (!effectiveKey) {
      setModelsError(
        'Enter an API key override or configure a NEXT_PUBLIC_* key for this provider before fetching models.'
      )
      return
    }

    const endpoint = PROVIDER_MODEL_ENDPOINTS[provider]
    if (!endpoint) {
      setModelsError(
        'Dynamic model listing is not yet configured for this provider. You can still type a custom model name.'
      )
      return
    }

    try {
      setModelsLoading(true)
      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${effectiveKey}`,
        },
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data: any = await res.json()
      const rawList = (data && (data.data || data.models)) || data
      const asArray = Array.isArray(rawList) ? rawList : []
      const fetched: { label: string; value: string }[] = asArray.map((m: any) => ({
        label: m.name || m.id || m.slug || 'model',
        value: m.id || m.name || m.slug,
      }))
      if (fetched.length === 0) {
        setModelsError('No models were returned for this provider.')
      } else {
        setModels(fetched)
      }
    } catch (e) {
      console.error('Failed to fetch models:', e)
      setModelsError(
        'Failed to fetch models from provider. Check your API key and network, or type a custom model name.'
      )
    } finally {
      setModelsLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 backdrop-blur-md bg-black/50"
      />

      {/* Modal */}
      <div
        className="fixed inset-4 z-50 glass-card p-6 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              Configure LLM – {nodeTitle}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {nodeId} • llm
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors hover:scale-110 active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
          <button
            onClick={() => setTab('form')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === 'form'
                ? 'bg-white/10 text-foreground'
                : 'text-muted-foreground hover:bg-white/5'
            }`}
          >
            Form
          </button>
          <button
            onClick={() => setTab('json')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === 'json'
                ? 'bg-white/10 text-foreground'
                : 'text-muted-foreground hover:bg-white/5'
            }`}
          >
            Advanced JSON
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex gap-4 min-h-0">
          {tab === 'form' ? (
            <>
              {/* Left column: core fields */}
              <div className="flex-1 flex flex-col gap-4 min-w-0">
                {/* Top row: Model + Temperature/max_tokens */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1 block">
                      Model
                    </label>
                    <select
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={selectModelValue}
                      disabled={isLocked}
                      onClick={async () => {
                        const overrideKey = config.api_key && config.api_key.trim()
                        const globalKey = getGlobalApiKeyForProvider(currentProvider)?.trim()
                        const effectiveKey = overrideKey || globalKey

                        if (!effectiveKey) {
                          setModelsError(
                            'Enter an API key override or configure a NEXT_PUBLIC_* key for this provider before choosing a model.'
                          )
                          return
                        }
                        if (!modelsLoading && models.length === 0) {
                          await loadModelsForProvider(currentProvider)
                        }
                      }}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === 'custom') {
                          handleFieldChange({ model: config.model || '' })
                        } else {
                          handleFieldChange({ model: value })
                        }
                      }}
                    >
                      {providerModels.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                      <option value="custom">Custom…</option>
                    </select>
                    {!currentModelInList && (
                      <input
                        type="text"
                        className="mt-2 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Custom model name (e.g. meta-llama/... )"
                        value={config.model}
                        disabled={isLocked}
                        onChange={(e) =>
                          handleFieldChange({ model: e.target.value })
                        }
                      />
                    )}
                    {modelsLoading && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Loading models from provider…
                      </p>
                    )}
                    {modelsError && (
                      <p className="text-[11px] text-red-400 mt-1">
                        {modelsError}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-1 block">
                        Temperature
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="2"
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                        value={config.temperature}
                        disabled={isLocked}
                        onChange={(e) =>
                          handleFieldChange({
                            temperature: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-1 block">
                        max_tokens
                      </label>
                      <input
                        type="number"
                        min="1"
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                        value={config.max_tokens}
                        disabled={isLocked}
                        onChange={(e) =>
                          handleFieldChange({
                            max_tokens: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Second row: API key + Provider */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1 block">
                      API key
                    </label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={config.api_key ?? ''}
                      disabled={isLocked}
                      onChange={(e) =>
                        handleFieldChange({
                          api_key: e.target.value || undefined,
                        })
                      }
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Required to call this provider for this node. This value is
                      stored in the workflow but never shown in the Advanced JSON
                      view or exports.
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1 block">
                      Provider / router
                    </label>
                    <select
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2"
                      value={currentProvider}
                      disabled={isLocked}
                      onChange={async (e) => {
                        const value = e.target.value
                        handleFieldChange({ provider: value as any })
                        if (config.api_key && config.api_key.trim()) {
                          await loadModelsForProvider(value)
                        }
                      }}
                    >
                      {COMMON_PROVIDERS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Choose the upstream provider or router you are using.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1 block">
                      System message
                    </label>
                    <textarea
                      className="w-full min-h-[120px] px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y custom-scrollbar"
                      placeholder="You are a helpful assistant..."
                      value={config.system}
                      disabled={isLocked}
                      onChange={(e) =>
                        handleFieldChange({ system: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1 block">
                      User message
                    </label>
                    <textarea
                      className="w-full min-h-[160px] px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y custom-scrollbar"
                      placeholder="High-level instructions. The upstream node's output will be appended to the end of this message."
                      value={config.user}
                      disabled={isLocked}
                      onChange={(e) =>
                        handleFieldChange({ user: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Right column: explanation & preview */}
              <div className="w-80 glass-card p-4 flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Prompt construction
                </h3>
                <p className="text-xs text-muted-foreground">
                  At runtime, the LLM node sends a standard OpenAI-style request:
                </p>
                <pre className="text-[11px] text-muted-foreground bg-black/20 rounded-lg p-2 overflow-auto custom-scrollbar">
{`{
  "model": "${config.model}",
  "temperature": ${config.temperature},
  "max_tokens": ${config.max_tokens},
  "messages": [
    { "role": "system", "content": "<system>" },
    { "role": "user", "content": "<user>\\n<upstream input>" }
  ]
}`}
                </pre>
                <p className="text-[11px] text-muted-foreground">
                  The <span className="font-semibold">upstream node output</span>{' '}
                  (if any) is appended as JSON to the end of the user message.
                  If there is no upstream input, you are responsible for writing
                  the full request in the user box.
                </p>
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-1">
                    Example messages
                  </h4>
                  <pre className="text-[11px] text-muted-foreground bg-black/20 rounded-lg p-2 overflow-auto custom-scrollbar">
                    {JSON.stringify(
                      [
                        {
                          role: 'system',
                          content: config.system || '(empty — optional)',
                        },
                        {
                          role: 'user',
                          content:
                            (config.user || createDefaultLlmConfig().user) +
                            '\\n{ /* upstream node output (JSON) */ }',
                        },
                      ],
                      null,
                      2
                    )}
                  </pre>
                </div>
                {(formError || jsonError) && (
                  <div className="mt-1 text-xs text-red-400 flex items-start gap-1">
                    <AlertTriangle className="w-3 h-3 mt-0.5" />
                    <span>{formError || jsonError}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              <p className="text-xs text-muted-foreground">
                Advanced configuration. Editing this JSON will update the form
                fields, and vice versa.
              </p>
              <div className="flex-1 rounded-lg overflow-hidden border border-white/10">
                <Editor
                  language="json"
                  value={jsonText}
                  onChange={handleJsonChange}
                  theme={isDark ? 'vs-dark' : 'vs-light'}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                  }}
                  height="100%"
                />
              </div>
              {jsonError && (
                <div className="mt-1 text-xs text-red-400 flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 mt-0.5" />
                  <span>{jsonError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={saveDisabled}
            className={`px-6 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium shadow-lg transition-all ${
              saveDisabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:scale-105 active:scale-95'
            }`}
          >
            Save LLM Config
          </button>
        </div>
      </div>
    </>
  )
}


