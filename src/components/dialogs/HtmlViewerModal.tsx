'use client'

import React, { useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'

interface HtmlViewerModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  html: string
  onLinkClick?: (href: string) => void
}

export function HtmlViewerModal({
  isOpen,
  onClose,
  title,
  html,
  onLinkClick,
}: HtmlViewerModalProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  const handleLinkClick = useCallback((e: React.MouseEvent<HTMLAnchorElement> | MouseEvent, href: string) => {
    if (typeof window === 'undefined') return
    if (!href || !onLinkClick) return
    
    try {
      // Check if it's an anchor link (starts with #)
      if (href.startsWith('#')) {
        if ('preventDefault' in e) {
          e.preventDefault()
          e.stopPropagation()
        }
        // Scroll to anchor in current document
        const element = contentRef.current?.querySelector(href)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
        return
      }
      
      // Check if it's a link with both file path and anchor (e.g., "docs/file.md#section")
      const [filePath, anchor] = href.split('#')
      let pathToUse: string | null = null
      
      // Check if it's an absolute URL pointing to localhost (same origin)
      try {
        const url = new URL(filePath, window.location.origin)
        // If it's the same origin, extract the pathname
        if (url.origin === window.location.origin) {
          pathToUse = url.pathname
        }
      } catch {
        // Not a valid URL, treat as relative path
      }
      
      // Check if it's a relative link (starts with / or ./)
      if (!pathToUse && (filePath.startsWith('/') || filePath.startsWith('./'))) {
        pathToUse = filePath.startsWith('./') ? filePath.slice(2) : filePath
      }
      
      // Check if it's a relative path without leading slash (e.g., "docs/file.md")
      // Only handle if it ends with .md or .html to avoid intercepting all relative links
      if (!pathToUse && (filePath.endsWith('.md') || filePath.endsWith('.html')) && !filePath.includes('://')) {
        pathToUse = filePath
      }
      
      // If we have a path to use, handle it as a file link
      if (pathToUse) {
        if ('preventDefault' in e) {
          e.preventDefault()
          e.stopPropagation()
        }
        // Remove leading slash if present for consistency
        const normalizedPath = pathToUse.startsWith('/') ? pathToUse.slice(1) : pathToUse
        // If there's an anchor, pass it along
        const pathWithAnchor = anchor ? `${normalizedPath}#${anchor}` : normalizedPath
        onLinkClick(pathWithAnchor)
        return
      }
      // External links will open normally
    } catch (error) {
      console.error('Error handling link click:', error)
      // Allow default behavior on error
    }
  }, [onLinkClick])

  // Scroll to anchor when content changes or modal opens
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isOpen && contentRef.current) {
      // Check if there's a hash in the URL or if we need to scroll to an anchor
      const hash = window.location.hash
      if (hash) {
        // Small delay to ensure content is rendered
        setTimeout(() => {
          const element = contentRef.current?.querySelector(hash)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 100)
      }
    }
  }, [isOpen, html])

  // Handle clicks on links within the rendered HTML
  useEffect(() => {
    if (!isOpen || !contentRef.current) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')
      if (anchor && anchor.href) {
        handleLinkClick(e as any, anchor.href)
      }
    }

    const currentRef = contentRef.current
    currentRef.addEventListener('click', handleClick)
    return () => {
      currentRef.removeEventListener('click', handleClick)
    }
  }, [isOpen, html, handleLinkClick])

  // Early return if modal is not open (after hooks)
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
        <div className="flex-1 overflow-auto custom-scrollbar" ref={contentRef}>
          <div
            className="max-w-none bg-white text-gray-900"
            dangerouslySetInnerHTML={{ __html: html }}
            style={{
              padding: '1rem',
            }}
          />
        </div>
      </div>
    </>
  )
}

