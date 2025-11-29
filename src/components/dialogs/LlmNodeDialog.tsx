'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { useTheme } from '@/contexts/ThemeContext'
import { normalizeLlmConfig, type LlmConfig, createDefaultLlmConfig } from '@/lib/llm'

const COMMON_MODELS = [
  { label: 'OpenAI – gpt-4o', value: 'gpt-4o' },
  { label: 'OpenAI – gpt-4o-mini', value: 'gpt-4o-mini' },
  { label: 'Anthropic – Claude 3.5 Sonnet', value: 'anthropic/claude-3.5-sonnet' },
  { label: 'Gemini – 1.5 Pro', value: 'google/gemini-1.5-pro' },
  { label: 'Groq – llama-3.1-70b', value: 'groq/llama-3.1-70b' },
  { label: 'OpenRouter – meta-llama/Meta-Llama-3.1-70B-Instruct', value: 'meta-llama/Meta-Llama-3.1-70B-Instruct' },
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

  const currentModelInList = COMMON_MODELS.some(m => m.value === config.model)
  const selectModelValue = currentModelInList ? config.model : 'custom'

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
                      Model
                    </label>
                    <select
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={selectModelValue}
                      disabled={isLocked}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === 'custom') {
                          handleFieldChange({ model: config.model || '' })
                        } else {
                          handleFieldChange({ model: value })
                        }
                      }}
                    >
                      {COMMON_MODELS.map((m) => (
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


