import { SimpleWorkflowBuilder } from '@/components/simple-workflow-builder'

export default function Home() {
  return (
    <main className="h-screen w-screen relative overflow-hidden">
      {/* Theme background */}
      <div className="theme-background" />
      {/* Grain overlay */}
      <div className="grain-overlay" />
      {/* Content */}
      <div className="relative z-10 h-full">
        <SimpleWorkflowBuilder />
      </div>
    </main>
  )
}