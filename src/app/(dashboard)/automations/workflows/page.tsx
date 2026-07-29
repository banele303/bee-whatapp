import { createClient } from "@/lib/supabase/server"
import { listWorkflows } from "@/features/workflows/data"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Zap, ArrowRight } from "lucide-react"

export default async function WorkflowsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let orgId = "demo-org"
  if (user) {
    const { data: accountUser } = await supabase
      .from('account_users')
      .select('account_id')
      .eq('user_id', user.id)
      .maybeSingle()

    orgId = accountUser?.account_id || user.id
  }

  const workflows = await listWorkflows(orgId)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Visual Automations</h1>
          <p className="text-muted-foreground text-sm">Build powerful scraping and sourcing automations visually.</p>
        </div>
        <form action={async () => {
          "use server"
          const { createWorkflowAction } = await import("@/features/workflows/actions")
          await createWorkflowAction("New Workflow")
        }}>
          <Button type="submit">
            <Plus className="h-4 w-4 mr-2" /> New Workflow
          </Button>
        </form>
      </div>

      {workflows && workflows.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map(wf => (
            <Link key={wf.id} href={`/automations/workflows/${wf.id}`}>
              <div className="group border rounded-xl p-4 flex flex-col justify-between h-32 hover:border-primary transition-colors bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <Zap className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{wf.name}</h3>
                </div>
                <div className="flex items-center justify-end text-sm text-muted-foreground group-hover:text-primary transition-colors">
                  Open Builder <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="border border-dashed rounded-xl p-12 text-center flex flex-col items-center">
          <div className="p-4 bg-muted rounded-full mb-4">
            <Zap className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No workflows yet</h2>
          <p className="text-muted-foreground text-sm max-w-sm mt-1 mb-4">Create your first visual workflow to automate sourcing, scraping, and lead qualification.</p>
          <form action={async () => {
            "use server"
            const { createWorkflowAction } = await import("@/features/workflows/actions")
            await createWorkflowAction("New Workflow")
          }}>
            <Button type="submit">
              <Plus className="h-4 w-4 mr-2" /> New Workflow
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
