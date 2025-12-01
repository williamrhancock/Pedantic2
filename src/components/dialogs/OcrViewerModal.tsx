'use client'

import React from 'react'
import { X, Copy, Download } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { useTheme } from '@/contexts/ThemeContext'

interface OcrViewerModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  text: string
  confidence?: number
  language?: string
  wordCount?: number
}

export function OcrViewerModal({
  isOpen,
  onClose,
  title,
  text,
  confidence,
  language,
  wordCount,
}: OcrViewerModalProps) {
  const { isDark } = useTheme()

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
  }

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ocr-extracted-text.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 backdrop-blur-md bg-black/50"
      />

      {/* Modal */}
      <div
        className={`
          fixed inset-4 z-50 rounded-lg shadow-2xl p-6 flex flex-col
          ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}
          border
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </h2>
            {(confidence !== undefined || language || wordCount !== undefined) && (
              <div className={`flex items-center gap-4 mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {confidence !== undefined && (
                  <span>Confidence: {confidence.toFixed(1)}%</span>
                )}
                {language && (
                  <span>Language: {language}</span>
                )}
                {wordCount !== undefined && (
                  <span>Words: {wordCount}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`
                p-2 rounded-lg transition-colors hover:scale-110 active:scale-90
                ${isDark
                  ? 'hover:bg-gray-800 text-gray-300'
                  : 'hover:bg-gray-100 text-gray-700'
                }
              `}
              title="Copy to Clipboard"
            >
              <Copy className="w-5 h-5" />
            </button>
            <button
              onClick={handleDownload}
              className={`
                p-2 rounded-lg transition-colors hover:scale-110 active:scale-90
                ${isDark
                  ? 'hover:bg-gray-800 text-gray-300'
                  : 'hover:bg-gray-100 text-gray-700'
                }
              `}
              title="Download as Text File"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className={`
                p-2 rounded-lg transition-colors hover:scale-110 active:scale-90
                ${isDark
                  ? 'hover:bg-gray-800 text-gray-300'
                  : 'hover:bg-gray-100 text-gray-700'
                }
              `}
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden rounded-lg border border-white/10">
          <Editor
            language="plaintext"
            value={text || 'No text extracted.'}
            theme={isDark ? 'vs-dark' : 'vs-light'}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              readOnly: true,
              automaticLayout: true,
            }}
            height="100%"
          />
        </div>
      </div>
    </>
  )
}

