'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { X, ZoomIn, ZoomOut, RotateCw, Download, Maximize2, Minimize2 } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface ImageViewerModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  imageData: string | null // Can be data URI, URL, or file path
  imageType?: 'base64' | 'file' | 'url' | 'data_uri'
}

export function ImageViewerModal({
  isOpen,
  onClose,
  title,
  imageData,
  imageType,
}: ImageViewerModalProps) {
  const { isDark } = useTheme()
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Reset zoom and position when image changes
  useEffect(() => {
    if (imageData) {
      setScale(1)
      setPosition({ x: 0, y: 0 })
    }
  }, [imageData])

  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.25, 5))
  }, [])

  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.25, 0.25))
  }, [])

  // Handle reset zoom
  const handleResetZoom = useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  // Handle download
  const handleDownload = useCallback(async () => {
    if (!imageData) return
    
    try {
      let blob: Blob | null = null
      let filename = 'image.png'
      
      if (imageData.startsWith('data:')) {
        // Data URI
        const response = await fetch(imageData)
        blob = await response.blob()
        // Extract filename from data URI if possible
        const mimeMatch = imageData.match(/data:([^;]+);/)
        if (mimeMatch) {
          const mime = mimeMatch[1]
          const ext = mime.split('/')[1] || 'png'
          filename = `image.${ext}`
        }
      } else if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
        // URL - fetch and download
        const response = await fetch(imageData)
        blob = await response.blob()
        const urlObj = new URL(imageData)
        const pathParts = urlObj.pathname.split('/')
        filename = pathParts[pathParts.length - 1] || 'image.png'
      } else {
        // File path - can't download directly, but we can try
        return
      }
      
      if (blob) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to download image:', error)
    }
  }, [imageData])

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setScale((prev) => Math.max(0.25, Math.min(5, prev + delta)))
    }
  }, [])

  // Handle mouse down for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }, [scale, position])

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }, [isDragging, dragStart, scale])

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev)
  }, [])

  // Early return if modal is not open
  if (!isOpen || !imageData) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 backdrop-blur-md bg-black/50"
      />

      {/* Modal */}
      <div
        className={`fixed z-50 glass-card p-6 flex flex-col ${
          isFullscreen ? 'inset-0' : 'inset-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-foreground">
            {title}
          </h2>
          <div className="flex items-center gap-2">
            {/* Toolbar */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              <button
                onClick={handleZoomOut}
                disabled={scale <= 0.25}
                className="p-2 rounded hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4 text-foreground" />
              </button>
              <span className="text-xs text-muted-foreground px-2 min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={scale >= 5}
                className="p-2 rounded hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4 text-foreground" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Reset Zoom"
              >
                <RotateCw className="w-4 h-4 text-foreground" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Download Image"
              >
                <Download className="w-4 h-4 text-foreground" />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-foreground" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-foreground" />
                )}
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors hover:scale-110 active:scale-90"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Image Container */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden relative bg-black/20 rounded-lg"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        >
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `translate(${position.x}px, ${position.y}px)`,
            }}
          >
            <img
              ref={imageRef}
              src={imageData}
              alt={title}
              className="max-w-full max-h-full object-contain select-none"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
              }}
              draggable={false}
              onError={(e) => {
                console.error('Failed to load image:', imageData)
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+'
              }}
            />
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-4 text-xs text-muted-foreground flex items-center justify-between">
          <span>
            Type: {imageType || 'unknown'} • Scale: {Math.round(scale * 100)}%
          </span>
          <span className="text-[10px]">
            Use Ctrl/Cmd + Scroll to zoom • Drag to pan when zoomed
          </span>
        </div>
      </div>
    </>
  )
}

