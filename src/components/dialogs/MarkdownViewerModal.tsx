'use client'

import React, { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { X } from 'lucide-react'

interface MarkdownViewerModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  markdown: string
  onLinkClick?: (href: string) => void
}

// Helper function to extract text from React children (with depth limit to prevent infinite loops)
const extractTextFromChildren = (children: React.ReactNode, depth = 0): string => {
  if (depth > 10) return '' // Prevent infinite recursion
  
  try {
    if (typeof children === 'string') {
      return children
    }
    if (typeof children === 'number') {
      return String(children)
    }
    if (Array.isArray(children)) {
      return children.map(child => extractTextFromChildren(child, depth + 1)).filter(Boolean).join('')
    }
    if (children && typeof children === 'object') {
      if ('props' in children && children.props && (children as any).props.children) {
        return extractTextFromChildren((children as any).props.children, depth + 1)
      }
    }
  } catch (error) {
    // Silently handle errors to prevent breaking the app
    return ''
  }
  return ''
}

// Helper function to generate ID from heading text
const generateHeadingId = (children: React.ReactNode): string => {
  try {
    const text = extractTextFromChildren(children)
    if (!text || text.trim() === '') return `heading-${Math.random().toString(36).substr(2, 9)}`
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim() || `heading-${Math.random().toString(36).substr(2, 9)}`
  } catch (error) {
    console.error('Error generating heading ID:', error)
    return `heading-${Math.random().toString(36).substr(2, 9)}`
  }
}

export function MarkdownViewerModal({
  isOpen,
  onClose,
  title,
  markdown,
  onLinkClick,
}: MarkdownViewerModalProps) {
  const contentRef = useRef<HTMLDivElement>(null)

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
  }, [isOpen, markdown])

  // Early return if modal is not open (after hooks)
  if (!isOpen) return null

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (typeof window === 'undefined') return
    if (!href || !onLinkClick) return
    
    try {
      // Check if it's an anchor link (starts with #)
      if (href.startsWith('#')) {
        e.preventDefault()
        e.stopPropagation()
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
      // Only handle if it ends with .md to avoid intercepting all relative links
      if (!pathToUse && filePath.endsWith('.md') && !filePath.includes('://')) {
        pathToUse = filePath
      }
      
      // If we have a path to use, handle it as a markdown file link
      if (pathToUse) {
        e.preventDefault()
        e.stopPropagation()
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
          <div className={`
            max-w-none
            text-foreground
            leading-relaxed
            bg-white text-gray-900
            [&_h1]:text-gray-900 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:pb-2 [&_h1]:border-b [&_h1]:border-gray-300
            [&_h2]:text-gray-900 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:pb-1 [&_h2]:border-b [&_h2]:border-gray-200
            [&_h3]:text-gray-900 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2
            [&_h4]:text-gray-900 [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:mt-4 [&_h4]:mb-2
            [&_h5]:text-gray-900 [&_h5]:text-base [&_h5]:font-semibold [&_h5]:mt-3 [&_h5]:mb-2
            [&_h6]:text-gray-900 [&_h6]:text-sm [&_h6]:font-semibold [&_h6]:mt-3 [&_h6]:mb-2
            [&_p]:text-gray-800 [&_p]:text-base [&_p]:mb-4 [&_p]:leading-7
            [&_a]:text-purple-600 [&_a:hover]:text-purple-700 [&_a]:underline [&_a]:underline-offset-2 [&_a]:transition-colors
            [&_code]:bg-gray-100 [&_code]:text-purple-700 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_code]:before:content-[''] [&_code]:after:content-['']
            [&_pre]:bg-gray-900 [&_pre]:border [&_pre]:border-gray-700 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-4 [&_pre]:shadow-lg
            [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-gray-100
            [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4 [&_ul]:space-y-2
            [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4 [&_ol]:space-y-2
            [&_li]:text-gray-800 [&_li]:leading-7 [&_li]:pl-1
            [&_li_p]:mb-2
            [&_blockquote]:border-l-4 [&_blockquote]:border-purple-500 [&_blockquote]:pl-4 [&_blockquote]:pr-4 [&_blockquote]:py-2 [&_blockquote]:my-4 [&_blockquote]:italic [&_blockquote]:bg-gray-50 [&_blockquote]:rounded-r [&_blockquote]:text-gray-700
            [&_hr]:border-gray-300 [&_hr]:my-8
            [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:shadow-md [&_table]:rounded-lg [&_table]:overflow-hidden
            [&_th]:border [&_th]:border-gray-300 [&_th]:px-4 [&_th]:py-3 [&_th]:bg-gray-100 [&_th]:text-left [&_th]:font-semibold [&_th]:text-gray-900
            [&_td]:border [&_td]:border-gray-300 [&_td]:px-4 [&_td]:py-2.5 [&_td]:text-gray-800
            [&_tr:nth-child(even)]:bg-gray-50
            [&_img]:rounded-lg [&_img]:my-4 [&_img]:shadow-md
            [&_strong]:font-semibold [&_strong]:text-gray-900
            [&_em]:italic [&_em]:text-gray-800
          `}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, children, ...props }: any) => {
                  try {
                    const id = generateHeadingId(children)
                    return (
                      <h1 id={id} {...props} className="scroll-mt-4">
                        {children}
                      </h1>
                    )
                  } catch (error) {
                    console.error('Error rendering h1:', error)
                    return <h1 {...props}>{children}</h1>
                  }
                },
                h2: ({ node, children, ...props }: any) => {
                  try {
                    const id = generateHeadingId(children)
                    return (
                      <h2 id={id} {...props} className="scroll-mt-4">
                        {children}
                      </h2>
                    )
                  } catch (error) {
                    console.error('Error rendering h2:', error)
                    return <h2 {...props}>{children}</h2>
                  }
                },
                h3: ({ node, children, ...props }: any) => {
                  try {
                    const id = generateHeadingId(children)
                    return (
                      <h3 id={id} {...props} className="scroll-mt-4">
                        {children}
                      </h3>
                    )
                  } catch (error) {
                    console.error('Error rendering h3:', error)
                    return <h3 {...props}>{children}</h3>
                  }
                },
                h4: ({ node, children, ...props }: any) => {
                  try {
                    const id = generateHeadingId(children)
                    return (
                      <h4 id={id} {...props} className="scroll-mt-4">
                        {children}
                      </h4>
                    )
                  } catch (error) {
                    console.error('Error rendering h4:', error)
                    return <h4 {...props}>{children}</h4>
                  }
                },
                h5: ({ node, children, ...props }: any) => {
                  try {
                    const id = generateHeadingId(children)
                    return (
                      <h5 id={id} {...props} className="scroll-mt-4">
                        {children}
                      </h5>
                    )
                  } catch (error) {
                    console.error('Error rendering h5:', error)
                    return <h5 {...props}>{children}</h5>
                  }
                },
                h6: ({ node, children, ...props }: any) => {
                  try {
                    const id = generateHeadingId(children)
                    return (
                      <h6 id={id} {...props} className="scroll-mt-4">
                        {children}
                      </h6>
                    )
                  } catch (error) {
                    console.error('Error rendering h6:', error)
                    return <h6 {...props}>{children}</h6>
                  }
                },
                a: ({ node, href, children, ...props }: any) => (
                  <a
                    {...props}
                    href={href}
                    onClick={(e) => href && handleLinkClick(e, href)}
                    className="text-purple-600 hover:text-purple-700 underline"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {markdown}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </>
  )
}

