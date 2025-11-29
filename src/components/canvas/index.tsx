'use client'

import dynamic from 'next/dynamic'

// Dynamically import WorkflowCanvas with SSR disabled
// This is necessary because reactflow uses browser APIs
export const WorkflowCanvas = dynamic(
  () => import('./WorkflowCanvas').then((mod) => mod.WorkflowCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading canvas...</div>
      </div>
    ),
  }
)

export type { WorkflowNodeType } from './WorkflowCanvas'


