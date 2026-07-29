"use server"

import * as Sentry from "@sentry/nextjs"
import { runs, tasks } from "@trigger.dev/sdk"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from '@/lib/supabase/server'
import { liveblocks } from "@/lib/liveblocks"
import { createWorkflow, deleteWorkflow, saveWorkflowGraph } from "@/features/workflows/data"

async function getAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No active user")
  const { data: accountUser } = await supabase
    .from('account_users')
    .select('account_id')
    .eq('user_id', user.id)
    .single()
  return { orgId: accountUser?.account_id }
}

export async function createWorkflowAction(name: string) {
  const { orgId } = await getAuth()

  if (!orgId) {
    throw new Error("No active organization")
  }

  Sentry.getIsolationScope().setAttributes({ action: "createWorkflowAction", orgId })

  const workflow = await createWorkflow(orgId, name)

  Sentry.logger.info("Workflow created", { workflowId: workflow.id, orgId })

  revalidatePath("/automations", "layout")
  redirect(`/automations/workflows/${workflow.id}`)
}

export async function deleteWorkflowAction(id: string) {
  const { orgId } = await getAuth()

  if (!orgId) {
    throw new Error("No active organization")
  }

  Sentry.getIsolationScope().setAttributes({
    action: "deleteWorkflowAction",
    orgId,
    workflowId: id,
  })

  await deleteWorkflow(orgId, id)

  // The workflow id doubles as its Liveblocks room id — clean it up too.
  if (liveblocks) {
    try {
      await liveblocks.deleteRoom(id)
    } catch(e) {
      console.error(e)
    }
  }

  Sentry.logger.info("Workflow deleted", { workflowId: id, orgId })

  revalidatePath("/automations", "layout")
  redirect("/automations")
}

export async function runWorkflowAction({
  id,
  graph,
}: {
  id: string
  graph: any
}) {
  const { orgId } = await getAuth()

  if (!orgId) {
    throw new Error("No active organization")
  }

  Sentry.getIsolationScope().setAttributes({
    action: "runWorkflowAction",
    orgId,
    workflowId: id,
  })

  try {
    await saveWorkflowGraph({ orgId, id, graph })
  } catch (error) {
    Sentry.logger.warn("Workflow run blocked — graph validation failed", {
      workflowId: id,
      orgId,
    })
    throw error
  }

  const handle = await tasks.trigger(
    "run-workflow",
    { workflowId: id, orgId },
    { tags: [`workflow:${id}`] }
  )

  Sentry.logger.info("Workflow run triggered", {
    workflowId: id,
    orgId,
    runId: handle.id,
    nodeCount: graph.nodes.length,
  })

  return handle
}

export async function cancelWorkflowRunAction(runId: string) {
  const { orgId } = await getAuth()
  if (!orgId) throw new Error("No active organization")

  Sentry.getIsolationScope().setAttributes({
    action: "cancelWorkflowRunAction",
    orgId,
    runId,
  })

  await runs.cancel(runId)

  Sentry.logger.info("Workflow run cancelled", { runId, orgId })
}