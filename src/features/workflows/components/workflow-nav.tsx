"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export interface WorkflowItem {
  id: string
  name: string
}

interface WorkflowNavProps {
  workflows?: WorkflowItem[]
  onCreateWorkflow?: (name: string) => Promise<void>
}

export function WorkflowNav({ workflows = [], onCreateWorkflow }: WorkflowNavProps) {
  const pathname = usePathname()

  return (
    <div className="space-y-1">
      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Workflows</div>
      {workflows.map((w) => (
        <Link
          key={w.id}
          href={`/automations/workflows/${w.id}`}
          className="block px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-muted"
        >
          {w.name}
        </Link>
      ))}
    </div>
  )
}
