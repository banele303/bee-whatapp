import { useCallback } from "react"
import { useRouter } from "next/navigation"

export type ProPlan = {
  isLoaded: boolean
  isPro: boolean
  goToUpgrade: () => void
}

export function useProPlan(): ProPlan {
  const router = useRouter()

  const goToUpgrade = useCallback(() => {
    router.push("/settings")
  }, [router])

  return { isLoaded: true, isPro: true, goToUpgrade }
}
