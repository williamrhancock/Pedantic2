'use client'

import React from 'react'
import { X } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { useTheme } from '@/contexts/ThemeContext'

interface JsonViewerModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  json: string
}

export function JsonViewerModal({
  isOpen,
  onClose,
  title,
  json,
}: JsonViewerModalProps) {
  const { isDark } = useTheme()

  // Early return if modal is not open
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
        className="fixed inset-4 z-50 bg-white rounded-lg shadow-2xl p-6 flex flex-col border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors hover:scale-110 active:scale-90 text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden rounded-lg border border-gray-300">
          <Editor
            language="json"
            value={json}
            theme={isDark ? 'vs-dark' : 'vs-light'}
            options={{
              minimap: { enabled: true },
              fontSize: 13,
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

