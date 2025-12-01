'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { X, AlertTriangle, Plus, Trash2 } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { useTheme } from '@/contexts/ThemeContext'

export interface BrowserConfig {
  url?: string
  headless?: boolean
  stealth_mode?: boolean
  wait_for?: 'none' | 'selector' | 'network_idle' | 'both'
  wait_selector?: string
  wait_timeout?: number
  output_formats?: ('html' | 'screenshot' | 'pdf' | 'json')[]
  json_extraction?: {
    method?: 'css' | 'ai'
    selectors?: Record<string, string>
    ai_prompt?: string
  }
  session_id?: string
  viewport?: {
    width?: number
    height?: number
  }
  user_agent?: 'default' | 'custom'
  custom_user_agent?: string
  timeout?: number
}

function normalizeBrowserConfig(raw?: BrowserConfig): BrowserConfig {
  return {
    url: raw?.url || '',
    headless: raw?.headless !== undefined ? raw.headless : true,
    stealth_mode: raw?.stealth_mode !== undefined ? raw.stealth_mode : false,
    wait_for: raw?.wait_for || 'none',
    wait_selector: raw?.wait_selector || '',
    wait_timeout: raw?.wait_timeout || 30000,
    output_formats: raw?.output_formats || ['html'],
    json_extraction: raw?.json_extraction || {
      method: 'css',
      selectors: {},
      ai_prompt: '',
    },
    session_id: raw?.session_id || 'default',
    viewport: {
      width: raw?.viewport?.width || 1920,
      height: raw?.viewport?.height || 1080,
    },
    user_agent: raw?.user_agent || 'default',
    custom_user_agent: raw?.custom_user_agent || '',
    timeout: raw?.timeout || 60000,
  }
}

type TabId = 'form' | 'json'

interface BrowserNodeDialogProps {
  isOpen: boolean
  isLocked?: boolean
  nodeId: string
  nodeTitle: string
  rawConfig?: any
  onClose: () => void
  onSave: (config: BrowserConfig) => void
}

interface KeyValuePair {
  key: string
  value: string
}

export function BrowserNodeDialog({
  isOpen,
  isLocked = false,
  nodeId,
  nodeTitle,
  rawConfig,
  onClose,
  onSave,
}: BrowserNodeDialogProps) {
  const { isDark } = useTheme()
  const initialConfig = useMemo(
    () => normalizeBrowserConfig(rawConfig as BrowserConfig | undefined),
    [rawConfig]
  )

  const [config, setConfig] = useState<BrowserConfig>(initialConfig)
  const [tab, setTab] = useState<TabId>('form')
  const [jsonText, setJsonText] = useState<string>(JSON.stringify(initialConfig, null, 2))
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // CSS selector key-value pairs
  const [cssSelectors, setCssSelectors] = useState<KeyValuePair[]>([])

  useEffect(() => {
    if (isOpen) {
      const normalized = normalizeBrowserConfig(rawConfig as BrowserConfig | undefined)
      setConfig(normalized)
      setJsonText(JSON.stringify(normalized, null, 2))
      setJsonError(null)
      setFormError(null)
      setTab('form')
      
      // Convert CSS selectors to key-value pairs
      setCssSelectors(
        Object.entries(normalized.json_extraction?.selectors || {}).map(([key, value]) => ({
          key,
          value: String(value),
        }))
      )
    }
  }, [isOpen, rawConfig])

  if (!isOpen) return null

  const updateConfigFromCssSelectors = (selectorsPairs: KeyValuePair[]) => {
    const newSelectors: Record<string, string> = {}
    
    selectorsPairs.forEach(({ key, value }) => {
      if (key.trim()) {
        newSelectors[key.trim()] = value.trim()
      }
    })

    const updated = {
      ...config,
      json_extraction: {
        ...config.json_extraction,
        selectors: newSelectors,
      },
    }
    setConfig(updated)
    setJsonText(JSON.stringify(updated, null, 2))
  }

  const handleFieldChange = (partial: Partial<BrowserConfig>) => {
    const next = { ...config, ...partial }
    setConfig(next)
    setJsonText(JSON.stringify(next, null, 2))
    setFormError(null)
  }

  const handleCssSelectorChange = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...cssSelectors]
    updated[index] = { ...updated[index], [field]: value }
    setCssSelectors(updated)
    updateConfigFromCssSelectors(updated)
  }

  const addCssSelector = () => {
    const updated = [...cssSelectors, { key: '', value: '' }]
    setCssSelectors(updated)
  }

  const removeCssSelector = (index: number) => {
    const updated = cssSelectors.filter((_, i) => i !== index)
    setCssSelectors(updated)
    updateConfigFromCssSelectors(updated)
  }

  const handleOutputFormatToggle = (format: 'html' | 'screenshot' | 'pdf' | 'json') => {
    const current = config.output_formats || []
    const updated = current.includes(format)
      ? current.filter((f) => f !== format)
      : [...current, format]
    handleFieldChange({ output_formats: updated })
  }

  const handleSave = () => {
    if (isLocked) return
    if (!config.url || !config.url.trim()) {
      setFormError('URL is required.')
      return
    }
    if (!Number.isFinite(config.timeout) || config.timeout! <= 0) {
      setFormError('Timeout must be a positive number.')
      return
    }
    if (!Number.isFinite(config.viewport?.width) || config.viewport!.width! <= 0) {
      setFormError('Viewport width must be a positive number.')
      return
    }
    if (!Number.isFinite(config.viewport?.height) || config.viewport!.height! <= 0) {
      setFormError('Viewport height must be a positive number.')
      return
    }
    if (config.wait_for === 'selector' && !config.wait_selector?.trim()) {
      setFormError('Wait selector is required when wait condition is "Selector" or "Both".')
      return
    }
    if (config.user_agent === 'custom' && !config.custom_user_agent?.trim()) {
      setFormError('Custom user agent is required when user agent type is "Custom".')
      return
    }
    if (config.json_extraction?.method === 'ai' && !config.json_extraction?.ai_prompt?.trim()) {
      setFormError('AI prompt is required when JSON extraction method is "AI-Assisted".')
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
      const normalized = normalizeBrowserConfig(parsed)
      setConfig(normalized)
      
      // Update CSS selectors
      setCssSelectors(
        Object.entries(normalized.json_extraction?.selectors || {}).map(([key, value]) => ({
          key,
          value: String(value),
        }))
      )
      
      setJsonError(null)
      setFormError(null)
    } catch (e) {
      setJsonError(
        e instanceof Error ? e.message : 'Invalid JSON. Please check the syntax.'
      )
    }
  }

  const saveDisabled = isLocked || !!jsonError

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
              Configure Browser – {nodeTitle}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {nodeId} • browser
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
        <div className="flex-1 flex gap-4 min-h-0 overflow-auto">
          {tab === 'form' ? (
            <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-y-auto">
              {/* URL */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1 block">
                  URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://example.com"
                  value={config.url || ''}
                  disabled={isLocked}
                  onChange={(e) =>
                    handleFieldChange({ url: e.target.value })
                  }
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Use {'{'}key{'}'} placeholders to inject values from upstream nodes
                </p>
              </div>

              {/* Headless and Stealth Mode */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="headless"
                    checked={config.headless}
                    disabled={isLocked}
                    onChange={(e) =>
                      handleFieldChange({ headless: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500"
                  />
                  <label htmlFor="headless" className="text-sm text-foreground cursor-pointer">
                    Headless Mode
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="stealth_mode"
                    checked={config.stealth_mode}
                    disabled={isLocked}
                    onChange={(e) =>
                      handleFieldChange({ stealth_mode: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500"
                  />
                  <label htmlFor="stealth_mode" className="text-sm text-foreground cursor-pointer">
                    Stealth Mode
                  </label>
                </div>
              </div>

              {/* Wait Conditions */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1 block">
                  Wait Condition
                </label>
                <select
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={config.wait_for || 'none'}
                  disabled={isLocked}
                  onChange={(e) =>
                    handleFieldChange({ wait_for: e.target.value as BrowserConfig['wait_for'] })
                  }
                >
                  <option value="none">None</option>
                  <option value="selector">Selector</option>
                  <option value="network_idle">Network Idle</option>
                  <option value="both">Both</option>
                </select>
              </div>

              {/* Wait Selector (shown when selector or both is selected) */}
              {(config.wait_for === 'selector' || config.wait_for === 'both') && (
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1 block">
                    Wait Selector <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder=".content-loaded or #main-content"
                    value={config.wait_selector || ''}
                    disabled={isLocked}
                    onChange={(e) =>
                      handleFieldChange({ wait_selector: e.target.value })
                    }
                  />
                </div>
              )}

              {/* Wait Timeout */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1 block">
                  Wait Timeout (ms)
                </label>
                <input
                  type="number"
                  min="1000"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={config.wait_timeout || 30000}
                  disabled={isLocked}
                  onChange={(e) =>
                    handleFieldChange({ wait_timeout: Number(e.target.value) })
                  }
                />
              </div>

              {/* Output Formats */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Output Formats
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['html', 'screenshot', 'pdf', 'json'] as const).map((format) => (
                    <div key={format} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`output_${format}`}
                        checked={config.output_formats?.includes(format) || false}
                        disabled={isLocked}
                        onChange={() => handleOutputFormatToggle(format)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500"
                      />
                      <label htmlFor={`output_${format}`} className="text-sm text-foreground cursor-pointer capitalize">
                        {format}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* JSON Extraction (shown when json output format is selected) */}
              {config.output_formats?.includes('json') && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1 block">
                      JSON Extraction Method
                    </label>
                    <select
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={config.json_extraction?.method || 'css'}
                      disabled={isLocked}
                      onChange={(e) =>
                        handleFieldChange({
                          json_extraction: {
                            ...config.json_extraction,
                            method: e.target.value as 'css' | 'ai',
                          },
                        })
                      }
                    >
                      <option value="css">CSS Selectors</option>
                      <option value="ai">AI-Assisted</option>
                    </select>
                  </div>

                  {/* CSS Selectors */}
                  {config.json_extraction?.method === 'css' && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-foreground">
                          CSS Selectors
                        </label>
                        {!isLocked && (
                          <button
                            onClick={addCssSelector}
                            className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            Add Selector
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {cssSelectors.map((selector, index) => (
                          <div key={index} className="flex gap-2 items-center">
                            <input
                              type="text"
                              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="Key (e.g., title)"
                              value={selector.key}
                              disabled={isLocked}
                              onChange={(e) =>
                                handleCssSelectorChange(index, 'key', e.target.value)
                              }
                            />
                            <input
                              type="text"
                              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="CSS Selector (e.g., h1)"
                              value={selector.value}
                              disabled={isLocked}
                              onChange={(e) =>
                                handleCssSelectorChange(index, 'value', e.target.value)
                              }
                            />
                            {!isLocked && (
                              <button
                                onClick={() => removeCssSelector(index)}
                                className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            )}
                          </div>
                        ))}
                        {cssSelectors.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            No selectors. Click &quot;Add Selector&quot; to add one.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AI Prompt */}
                  {config.json_extraction?.method === 'ai' && (
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-1 block">
                        AI Extraction Prompt <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                        rows={4}
                        placeholder="Describe what data to extract from the page. You can use {llm_output} to reference upstream LLM node output."
                        value={config.json_extraction?.ai_prompt || ''}
                        disabled={isLocked}
                        onChange={(e) =>
                          handleFieldChange({
                            json_extraction: {
                              ...config.json_extraction,
                              ai_prompt: e.target.value,
                            },
                          })
                        }
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Connect an LLM node before this browser node to use its output in the prompt.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Session ID */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1 block">
                  Session ID
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="default"
                  value={config.session_id || 'default'}
                  disabled={isLocked}
                  onChange={(e) =>
                    handleFieldChange({ session_id: e.target.value })
                  }
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Cookies will be saved and loaded for this session ID
                </p>
              </div>

              {/* Viewport */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1 block">
                    Viewport Width <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="100"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={config.viewport?.width || 1920}
                    disabled={isLocked}
                    onChange={(e) =>
                      handleFieldChange({
                        viewport: {
                          ...config.viewport,
                          width: Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1 block">
                    Viewport Height <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="100"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={config.viewport?.height || 1080}
                    disabled={isLocked}
                    onChange={(e) =>
                      handleFieldChange({
                        viewport: {
                          ...config.viewport,
                          height: Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>

              {/* User Agent */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1 block">
                  User Agent
                </label>
                <select
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={config.user_agent || 'default'}
                  disabled={isLocked}
                  onChange={(e) =>
                    handleFieldChange({ user_agent: e.target.value as 'default' | 'custom' })
                  }
                >
                  <option value="default">Default</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Custom User Agent (shown when custom is selected) */}
              {config.user_agent === 'custom' && (
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1 block">
                    Custom User Agent <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Mozilla/5.0..."
                    value={config.custom_user_agent || ''}
                    disabled={isLocked}
                    onChange={(e) =>
                      handleFieldChange({ custom_user_agent: e.target.value })
                    }
                  />
                </div>
              )}

              {/* Timeout */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1 block">
                  Timeout (ms) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="1000"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={config.timeout || 60000}
                  disabled={isLocked}
                  onChange={(e) =>
                    handleFieldChange({ timeout: Number(e.target.value) })
                  }
                />
              </div>

              {(formError || jsonError) && (
                <div className="text-xs text-red-400 flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 mt-0.5" />
                  <span>{formError || jsonError}</span>
                </div>
              )}
            </div>
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
                    readOnly: isLocked,
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
            className={`px-6 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium shadow-lg transition-all ${
              saveDisabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:scale-105 active:scale-95'
            }`}
          >
            Save Browser Config
          </button>
        </div>
      </div>
    </>
  )
}

