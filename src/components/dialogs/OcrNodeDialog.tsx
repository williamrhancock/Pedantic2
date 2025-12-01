'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export interface OcrConfig {
  content_key?: string
  language?: string
  psm?: number
}

function normalizeOcrConfig(raw?: OcrConfig): OcrConfig {
  return {
    content_key: raw?.content_key || 'screenshot',
    language: raw?.language || 'eng',
    psm: raw?.psm || 6,
  }
}

type TabId = 'form' | 'json'

interface OcrNodeDialogProps {
  isOpen: boolean
  isLocked?: boolean
  nodeId: string
  nodeTitle: string
  rawConfig?: any
  onClose: () => void
  onSave: (config: OcrConfig) => void
}

export function OcrNodeDialog({
  isOpen,
  isLocked = false,
  nodeId,
  nodeTitle,
  rawConfig,
  onClose,
  onSave,
}: OcrNodeDialogProps) {
  const { isDark } = useTheme()
  const initialConfig = useMemo(
    () => normalizeOcrConfig(rawConfig as OcrConfig | undefined),
    [rawConfig]
  )

  const [config, setConfig] = useState<OcrConfig>(initialConfig)
  const [tab, setTab] = useState<TabId>('form')
  const [jsonText, setJsonText] = useState<string>(JSON.stringify(initialConfig, null, 2))
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      const normalized = normalizeOcrConfig(rawConfig as OcrConfig | undefined)
      setConfig(normalized)
      setJsonText(JSON.stringify(normalized, null, 2))
      setJsonError(null)
      setFormError(null)
    }
  }, [isOpen, rawConfig])

  const handleSave = () => {
    if (tab === 'json') {
      try {
        const parsed = JSON.parse(jsonText)
        const normalized = normalizeOcrConfig(parsed)
        onSave(normalized)
        onClose()
      } catch (e) {
        setJsonError(e instanceof Error ? e.message : 'Invalid JSON')
      }
    } else {
      // Validate form
      if (!config.content_key?.trim()) {
        setFormError('Content key is required')
        return
      }
      onSave(config)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`
          relative w-full max-w-2xl max-h-[90vh] overflow-hidden
          ${isDark ? 'bg-gray-900' : 'bg-white'}
          rounded-lg shadow-2xl
          flex flex-col
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`
          flex items-center justify-between p-4 border-b
          ${isDark ? 'border-gray-700' : 'border-gray-200'}
        `}>
          <h2 className="text-xl font-semibold text-foreground">OCR Node Configuration</h2>
          <button
            onClick={onClose}
            className={`
              p-1 rounded hover:bg-white/10 transition-colors
              text-muted-foreground hover:text-foreground
            `}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className={`
          flex border-b
          ${isDark ? 'border-gray-700' : 'border-gray-200'}
        `}>
          <button
            onClick={() => setTab('form')}
            className={`
              px-4 py-2 text-sm font-medium transition-colors
              ${tab === 'form'
                ? isDark
                  ? 'text-white border-b-2 border-white'
                  : 'text-gray-900 border-b-2 border-gray-900'
                : 'text-muted-foreground hover:text-foreground'
              }
            `}
          >
            Form
          </button>
          <button
            onClick={() => setTab('json')}
            className={`
              px-4 py-2 text-sm font-medium transition-colors
              ${tab === 'json'
                ? isDark
                  ? 'text-white border-b-2 border-white'
                  : 'text-gray-900 border-b-2 border-gray-900'
                : 'text-muted-foreground hover:text-foreground'
              }
            `}
          >
            JSON
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'form' ? (
            <div className="space-y-6">
              {formError && (
                <div className={`
                  flex items-center gap-2 p-3 rounded-lg
                  bg-red-500/10 border border-red-500/20 text-red-400
                `}>
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{formError}</span>
                </div>
              )}

              {/* Content Key */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Content Key
                </label>
                <input
                  type="text"
                  value={config.content_key || ''}
                  onChange={(e) => setConfig({ ...config, content_key: e.target.value })}
                  disabled={isLocked}
                  placeholder="screenshot"
                  className={`
                    w-full px-3 py-2 rounded-lg border
                    ${isDark
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                    }
                    focus:outline-none focus:ring-2 focus:ring-purple-500
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The key containing the image data (e.g., &quot;screenshot&quot;, &quot;image&quot;, &quot;image_data&quot;). 
                  Leave empty to auto-detect.
                </p>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Language
                </label>
                <select
                  value={config.language || 'eng'}
                  onChange={(e) => setConfig({ ...config, language: e.target.value })}
                  disabled={isLocked}
                  className={`
                    w-full px-3 py-2 rounded-lg border
                    ${isDark
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                    }
                    focus:outline-none focus:ring-2 focus:ring-purple-500
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <option value="eng">English (eng)</option>
                  <option value="spa">Spanish (spa)</option>
                  <option value="fra">French (fra)</option>
                  <option value="deu">German (deu)</option>
                  <option value="chi_sim">Chinese Simplified (chi_sim)</option>
                  <option value="jpn">Japanese (jpn)</option>
                  <option value="kor">Korean (kor)</option>
                  <option value="ara">Arabic (ara)</option>
                  <option value="rus">Russian (rus)</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Tesseract language code. Multiple languages can be specified with + (e.g., &quot;eng+spa&quot;).
                  Make sure the language pack is installed: tesseract --list-langs
                </p>
              </div>

              {/* PSM (Page Segmentation Mode) */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Page Segmentation Mode (PSM)
                </label>
                <select
                  value={config.psm || 6}
                  onChange={(e) => setConfig({ ...config, psm: parseInt(e.target.value) })}
                  disabled={isLocked}
                  className={`
                    w-full px-3 py-2 rounded-lg border
                    ${isDark
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                    }
                    focus:outline-none focus:ring-2 focus:ring-purple-500
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <option value="0">0 - Orientation and script detection (OSD) only</option>
                  <option value="1">1 - Automatic page segmentation with OSD</option>
                  <option value="2">2 - Automatic page segmentation, but no OSD, or OCR</option>
                  <option value="3">3 - Fully automatic page segmentation, but no OSD</option>
                  <option value="4">4 - Assume a single column of text of variable sizes</option>
                  <option value="5">5 - Assume a single uniform block of vertically aligned text</option>
                  <option value="6">6 - Assume a single uniform block of text (default)</option>
                  <option value="7">7 - Treat the image as a single text line</option>
                  <option value="8">8 - Treat the image as a single word</option>
                  <option value="9">9 - Treat the image as a single word in a circle</option>
                  <option value="10">10 - Treat the image as a single character</option>
                  <option value="11">11 - Sparse text. Find as much text as possible in no particular order</option>
                  <option value="12">12 - Sparse text with OSD</option>
                  <option value="13">13 - Raw line. Treat the image as a single text line</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  PSM 6 (default) works well for most screenshots. Use 7 for single-line text, 11 for sparse text.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {jsonError && (
                <div className={`
                  flex items-center gap-2 p-3 rounded-lg
                  bg-red-500/10 border border-red-500/20 text-red-400
                `}>
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{jsonError}</span>
                </div>
              )}
              <textarea
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value)
                  setJsonError(null)
                }}
                disabled={isLocked}
                className={`
                  w-full h-96 font-mono text-sm p-3 rounded-lg border
                  ${isDark
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                  }
                  focus:outline-none focus:ring-2 focus:ring-purple-500
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`
          flex items-center justify-end gap-3 p-4 border-t
          ${isDark ? 'border-gray-700' : 'border-gray-200'}
        `}>
          <button
            onClick={onClose}
            className={`
              px-4 py-2 rounded-lg transition-colors
              ${isDark
                ? 'bg-gray-800 hover:bg-gray-700 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
              }
            `}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLocked}
            className={`
              px-4 py-2 rounded-lg transition-colors
              bg-purple-600 hover:bg-purple-700 text-white
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

