'use client'

// Shared types and helpers for custom node templates

// Node types that can be represented as custom nodes.
// We technically support start/end in the type union, but the UI will
// restrict creation of custom nodes to non-start/end node types.
export type CustomNodeType =
  | 'start'
  | 'end'
  | 'python'
  | 'typescript'
  | 'http'
  | 'file'
  | 'condition'
  | 'database'
  | 'llm'
  | 'embedding'
  | 'foreach'
  | 'endloop'
  | 'markdown'
  | 'html'
  | 'json'
  | 'image'
  | 'ocr'
  | 'browser'

// Data payload we store for a custom node in the database.
// This mirrors the shape of a workflow node's core data.
export interface CustomNodeData {
  type: CustomNodeType
  title: string
  code?: string
  config?: any
}

// Template as returned from the backend.
export interface CustomNodeTemplate {
  id: number
  name: string
  description?: string
  type: CustomNodeType
  data: CustomNodeData
}

// Build a CustomNodeData payload from a workflow node-like object.
export function workflowNodeToCustomData(node: {
  type: CustomNodeType
  title: string
  code?: string
  config?: any
}): CustomNodeData {
  return {
    type: node.type,
    title: node.title,
    code: node.code,
    config: node.config,
  }
}

// Build a node-like data object from a CustomNodeTemplate.
// The caller is responsible for assigning id/position fields.
export function customTemplateToNodeData(template: CustomNodeTemplate): CustomNodeData {
  return {
    type: template.type,
    title: template.data?.title || template.name,
    code: template.data?.code,
    config: template.data?.config,
  }
}


