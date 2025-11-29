'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { useTheme } from '@/contexts/ThemeContext'
import { normalizeLlmConfig, type LlmConfig, createDefaultLlmConfig } from '@/lib/llm'

const COMMON_PROVIDERS = [
  { label: 'OpenRouter (multi-provider router)', value: 'openrouter' },
  { label: 'OpenAI', value: 'openai' },
  { label: 'Anthropic', value: 'anthropic' },
  { label: 'Google Gemini', value: 'gemini' },
  { label: 'Groq', value: 'groq' },
]

const COMMON_MODELS = [
  { label: 'OpenRouter – meta-llama/Meta-Llama-3.1-70B-Instruct', value: 'meta-llama/Meta-Llama-3.1-70B-Instruct', provider: 'openrouter' },
  { label: 'OpenAI – gpt-4o', value: 'gpt-4o', provider: 'openai' },
  { label: 'OpenAI – gpt-4o-mini', value: 'gpt-4o-mini', provider: 'openai' },
  { label: 'Anthropic – Claude 3.5 Sonnet', value: 'claude-3.5-sonnet', provider: 'anthropic' },
  { label: 'Gemini – 1.5 Pro', value: 'gemini-1.5-pro', provider: 'gemini' },
  { label: 'Groq – llama-3.1-70b', value: 'llama-3.1-70b', provider: 'groq' },
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
  const [jsonText, setJsonText] = useState<string>(JSON.stringify(initialConfig, null, 2))
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [models, setModels] = useState<{ label: string; value: string }[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      const normalized = normalizeLlmConfig(rawConfig as LlmConfig | undefined)
      setConfig(normalized)
      setJsonText(JSON.stringify(normalized, null, 2))
      setJsonError(null)
      setFormError(null)
      setTab('form')
    }
  }, [isOpen, rawConfig])

  if (!isOpen) return null

  const handleFieldChange = (partial: Partial<LlmConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial }
      setJsonText(JSON.stringify(next, null, 2))
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
      setConfig(normalized)
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

  const providerModels =
    models.length > 0
      ? models
      : COMMON_MODELS.filter((m) => m.provider === currentProvider)

  const currentModelInList = providerModels.some((m) => m.value === config.model)
  const selectModelValue = currentModelInList ? config.model : 'custom'

  const loadModelsForProvider = async (provider: string) => {
    setModelsError(null)
    setModels([])

    // Require an API key override before attempting dynamic fetch.
    if (!config.api_key || !config.api_key.trim()) {
      setModelsError(
        'Enter an API key override for this node before fetching models. The backend can still use env/global keys for execution.'
      )
      return
    }

    // For now we implement dynamic listing only for OpenRouter; others fall back to static presets.
    if (provider !== 'openrouter') {
      setModelsError(
        'Dynamic model listing is currently implemented for OpenRouter only. You can still type a custom model name.'
      )
      return
    }

    try {
      setModelsLoading(true)
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          Authorization: `Bearer ${config.api_key}`,
        },
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data: any = await res.json()
      const fetched: { label: string; value: string }[] =
        Array.isArray(data?.data) || Array.isArray(data?.models)
          ? (data.data || data.models).map((m: any) => ({
              label: m.name || m.id,
              value: m.id || m.name,
            }))
          : []
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1 block">
                      API key override (optional)
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
                      If empty, the backend uses environment-based configuration
                      (e.g. OPENROUTER_API_KEY). This field overrides it for
                      this node only.
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
                        await loadModelsForProvider(value)
                      }}
                    >
                      {COMMON_PROVIDERS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <label className="text-sm font-semibold text-foreground mb-1 block">
                      API key env var name (legacy)
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={config.api_key_name ?? ''}
                      disabled={isLocked}
                      onChange={(e) =>
                        handleFieldChange({
                          api_key_name: e.target.value || undefined,
                        })
                      }
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Used by some providers/routers (e.g. OPENROUTER_API_KEY).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1 block">
                      Model
                    </label>
                    <select
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={selectModelValue}
                      disabled={isLocked}
                      onClick={(e) => {
                        if (!config.api_key || !config.api_key.trim()) {
                          // Soft gate: remind user they should configure a key before
                          // attempting dynamic model loads.
                          setModelsError(
                            'Enter an API key override to fetch provider models, or choose a custom model name.'
                          )
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


