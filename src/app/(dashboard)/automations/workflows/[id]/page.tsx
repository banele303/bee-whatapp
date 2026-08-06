import { notFound } from "next/navigation"
import { ReactFlowProvider } from "@xyflow/react"
import { auth as triggerAuth } from "@trigger.dev/sdk/v3"

import { liveblocks } from "@/lib/liveblocks"
import { getWorkflow } from "@/features/workflows/data"
import * as queries from "@/lib/automations/queries"
import { Room } from "@/features/workflows/components/room"
import { WorkflowShell } from "@/features/workflows/components/workflow-shell"
import { WorkflowRunsProvider } from "@/features/workflows/components/workflow-runs-provider"
import { createClient } from "@/lib/supabase/server"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', user.id)
    .maybeSingle()

  let orgId = profile?.account_id

  if (!orgId) {
    const { data: accountUser } = await supabase
      .from('account_users')
      .select('account_id')
      .eq('user_id', user.id)
      .maybeSingle()
    orgId = accountUser?.account_id
  }

  if (!orgId) {
    const { data: firstAcct } = await supabase.from('accounts').select('id').limit(1).maybeSingle()
    orgId = firstAcct?.id || user.id
  }

  let workflow: any = null
  try {
    workflow = await getWorkflow(orgId, id)
  } catch {
    workflow = null
  }

  if (!workflow) {
    const formattedName = id.replace(/^wf-/, '').replace(/-/g, ' ').toUpperCase() + ' Workflow'
    try {
      workflow = await queries.createWorkflowWithId(supabase, orgId, id, formattedName)
    } catch {
      workflow = { id, name: formattedName, graph: { nodes: [], edges: [] } }
    }
  }

  if (liveblocks) {
    try {
      await liveblocks.getOrCreateRoom(id, {
        defaultAccesses: [],
        groupsAccesses: {
          [orgId]: ["room:write"],
        },
        metadata: {
          title: workflow.name,
        },
      })
    } catch (e) {
      console.warn("Liveblocks room creation failed, continuing offline", e)
    }
  }

  // A read-only token scoped to this workflow's run tag, so the client can
  // subscribe to its runs in realtime. Good for ~an hour of an open canvas.
  // We use process.env.TRIGGER_SECRET_KEY fallback to avoid hard crashing.
  let runsToken = ""
  try {
    runsToken = await triggerAuth.createPublicToken({
      scopes: {
        read: {
          tags: [`workflow:${id}`],
        },
      },
      expirationTime: "1hr",
    })
  } catch (e) {
    console.warn("Trigger auth failed", e)
  }

  // The canvas and the sidebar's node palette live in separate components, so a
  // single ReactFlowProvider wraps both to give them one shared React Flow store.
  return (
    <Room roomId={id}>
      <ReactFlowProvider>
        <WorkflowRunsProvider workflowId={id} accessToken={runsToken}>
          <WorkflowShell workflowId={id} />
        </WorkflowRunsProvider>
      </ReactFlowProvider>
    </Room>
  )
}
