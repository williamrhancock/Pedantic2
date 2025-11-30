'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { X, AlertTriangle, Plus, Trash2 } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { useTheme } from '@/contexts/ThemeContext'

const HTTP_METHODS = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'PATCH', value: 'PATCH' },
  { label: 'DELETE', value: 'DELETE' },
]

export interface HttpConfig {
  method?: string
  url?: string
  headers?: Record<string, string>
  params?: Record<string, string>
  body?: any
  timeout?: number
}

function normalizeHttpConfig(raw?: HttpConfig): HttpConfig {
  return {
    method: raw?.method || 'GET',
    url: raw?.url || '',
    headers: raw?.headers || {},
    params: raw?.params || {},
    body: raw?.body || {},
    timeout: raw?.timeout || 30,
  }
}

type TabId = 'form' | 'json'

interface HttpNodeDialogProps {
  isOpen: boolean
  isLocked?: boolean
  nodeId: string
  nodeTitle: string
  rawConfig?: any
  onClose: () => void
  onSave: (config: HttpConfig) => void
}

interface KeyValuePair {
  key: string
  value: string
}

export function HttpNodeDialog({
  isOpen,
  isLocked = false,
  nodeId,
  nodeTitle,
  rawConfig,
  onClose,
  onSave,
}: HttpNodeDialogProps) {
  const { isDark } = useTheme()
  const initialConfig = useMemo(
    () => normalizeHttpConfig(rawConfig as HttpConfig | undefined),
    [rawConfig]
  )

  const [config, setConfig] = useState<HttpConfig>(initialConfig)
  const [tab, setTab] = useState<TabId>('form')
  const [jsonText, setJsonText] = useState<string>(JSON.stringify(initialConfig, null, 2))
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Key-value pair states
  const [headers, setHeaders] = useState<KeyValuePair[]>([])
  const [params, setParams] = useState<KeyValuePair[]>([])

  useEffect(() => {
    if (isOpen) {
      const normalized = normalizeHttpConfig(rawConfig as HttpConfig | undefined)
      setConfig(normalized)
      setJsonText(JSON.stringify(normalized, null, 2))
      setJsonError(null)
      setFormError(null)
      setTab('form')
      
      // Convert headers and params to key-value pairs
      setHeaders(
        Object.entries(normalized.headers || {}).map(([key, value]) => ({
          key,
          value: String(value),
        }))
      )
      setParams(
        Object.entries(normalized.params || {}).map(([key, value]) => ({
          key,
          value: String(value),
        }))
      )
    }
  }, [isOpen, rawConfig])

  if (!isOpen) return null

  const updateConfigFromKeyValuePairs = (
    headersPairs: KeyValuePair[],
    paramsPairs: KeyValuePair[]
  ) => {
    const newHeaders: Record<string, string> = {}
    const newParams: Record<string, string> = {}
    
    headersPairs.forEach(({ key, value }) => {
      if (key.trim()) {
        newHeaders[key.trim()] = value
      }
    })
    
    paramsPairs.forEach(({ key, value }) => {
      if (key.trim()) {
        newParams[key.trim()] = value
      }
    })

    const updated = {
      ...config,
      headers: newHeaders,
      params: newParams,
    }
    setConfig(updated)
    setJsonText(JSON.stringify(updated, null, 2))
  }

  const handleFieldChange = (partial: Partial<HttpConfig>) => {
    const next = { ...config, ...partial }
    setConfig(next)
    setJsonText(JSON.stringify(next, null, 2))
    setFormError(null)
  }

  const handleHeadersChange = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...headers]
    updated[index] = { ...updated[index], [field]: value }
    setHeaders(updated)
    updateConfigFromKeyValuePairs(updated, params)
  }

  const handleParamsChange = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...params]
    updated[index] = { ...updated[index], [field]: value }
    setParams(updated)
    updateConfigFromKeyValuePairs(headers, updated)
  }

  const addHeader = () => {
    const updated = [...headers, { key: '', value: '' }]
    setHeaders(updated)
  }

  const removeHeader = (index: number) => {
    const updated = headers.filter((_, i) => i !== index)
    setHeaders(updated)
    updateConfigFromKeyValuePairs(updated, params)
  }

  const addParam = () => {
    const updated = [...params, { key: '', value: '' }]
    setParams(updated)
  }

  const removeParam = (index: number) => {
    const updated = params.filter((_, i) => i !== index)
    setParams(updated)
    updateConfigFromKeyValuePairs(headers, updated)
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
    // Validate body JSON if method requires it
    if (config.method === 'POST' || config.method === 'PUT' || config.method === 'PATCH') {
      try {
        // Ensure body is valid JSON object
        if (config.body && typeof config.body === 'object') {
          JSON.stringify(config.body) // This will throw if circular or invalid
        }
      } catch (e) {
        setFormError('Request body must be valid JSON.')
        return
      }
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
      const normalized = normalizeHttpConfig(parsed)
      setConfig(normalized)
      
      // Update key-value pairs
      setHeaders(
        Object.entries(normalized.headers || {}).map(([key, value]) => ({
          key,
          value: String(value),
        }))
      )
      setParams(
        Object.entries(normalized.params || {}).map(([key, value]) => ({
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
              Configure HTTP – {nodeTitle}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {nodeId} • http
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
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              {/* Method and URL */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1 block">
                    Method
                  </label>
                  <select
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={config.method || 'GET'}
                    disabled={isLocked}
                    onChange={(e) =>
                      handleFieldChange({ method: e.target.value })
                    }
                  >
                    {HTTP_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-foreground mb-1 block">
                    URL <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="https://api.example.com/endpoint"
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
              </div>

              {/* Timeout */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1 block">
                  Timeout (seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={config.timeout || 30}
                  disabled={isLocked}
                  onChange={(e) =>
                    handleFieldChange({ timeout: Number(e.target.value) })
                  }
                />
              </div>

              {/* Headers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-foreground">
                    Headers
                  </label>
                  {!isLocked && (
                    <button
                      onClick={addHeader}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add Header
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {headers.map((header, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Header name (e.g., Authorization)"
                        value={header.key}
                        disabled={isLocked}
                        onChange={(e) =>
                          handleHeadersChange(index, 'key', e.target.value)
                        }
                      />
                      <input
                        type="text"
                        className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Header value"
                        value={header.value}
                        disabled={isLocked}
                        onChange={(e) =>
                          handleHeadersChange(index, 'value', e.target.value)
                        }
                      />
                      {!isLocked && (
                        <button
                          onClick={() => removeHeader(index)}
                          className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>
                  ))}
                  {headers.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No headers. Click &quot;Add Header&quot; to add one.
                    </p>
                  )}
                </div>
              </div>

              {/* Query Parameters */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-foreground">
                    Query Parameters
                  </label>
                  {!isLocked && (
                    <button
                      onClick={addParam}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add Parameter
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {params.map((param, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Parameter name"
                        value={param.key}
                        disabled={isLocked}
                        onChange={(e) =>
                          handleParamsChange(index, 'key', e.target.value)
                        }
                      />
                      <input
                        type="text"
                        className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Parameter value"
                        value={param.value}
                        disabled={isLocked}
                        onChange={(e) =>
                          handleParamsChange(index, 'value', e.target.value)
                        }
                      />
                      {!isLocked && (
                        <button
                          onClick={() => removeParam(index)}
                          className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>
                  ))}
                  {params.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No query parameters. Click &quot;Add Parameter&quot; to add one.
                    </p>
                  )}
                </div>
              </div>

              {/* Request Body */}
              {(config.method === 'POST' || config.method === 'PUT' || config.method === 'PATCH') && (
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1 block">
                    Request Body (JSON)
                  </label>
                  <div className="rounded-lg overflow-hidden border border-white/10" style={{ height: '200px' }}>
                    <Editor
                      language="json"
                      value={JSON.stringify(config.body || {}, null, 2)}
                      onChange={(value) => {
                        if (!value || !value.trim()) {
                          handleFieldChange({ body: {} })
                          return
                        }
                        try {
                          const parsed = JSON.parse(value)
                          handleFieldChange({ body: parsed })
                        } catch (e) {
                          // Invalid JSON, but allow editing
                          // Will be caught on save - store as string for now
                          // User can fix in JSON tab
                        }
                      }}
                      theme={isDark ? 'vs-dark' : 'vs-light'}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 12,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        readOnly: isLocked,
                      }}
                      height="100%"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Use {'{'}key{'}'} placeholders to inject values from upstream nodes
                  </p>
                </div>
              )}

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
            className={`px-6 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium shadow-lg transition-all ${
              saveDisabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:scale-105 active:scale-95'
            }`}
          >
            Save HTTP Config
          </button>
        </div>
      </div>
    </>
  )
}

