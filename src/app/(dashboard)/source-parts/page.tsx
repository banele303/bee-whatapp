"use client"

import { useState } from "react"
import { Search, Globe, Package, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

export default function SourcePartsPage() {
  const [partName, setPartName] = useState("")
  const [make, setMake] = useState("")
  const [model, setModel] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<any[]>([])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!partName) {
      toast.error("Please enter a part name")
      return
    }

    setIsSearching(true)
    try {
      // We will call an API route to trigger the Stagehand scraper
      const res = await fetch("/api/source-parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partName, make, model })
      })
      const data = await res.json()
      if (res.ok) {
        setResults(data.results || [])
        toast.success("Sourcing complete!")
      } else {
        toast.error(data.error || "Failed to source parts")
      }
    } catch (err) {
      toast.error("An error occurred during sourcing")
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Globe className="h-6 w-6 text-amber-500" />
          Auto-Sourcing Agent
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use the AI Scraping Agent to find parts from external suppliers when they are out of stock locally.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Part Name (Required)</label>
              <input
                type="text"
                placeholder="e.g. Brake Pads"
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Make (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Toyota"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Model (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Corolla"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isSearching}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 w-full md:w-auto"
          >
            {isSearching ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching Web...</>
            ) : (
              <><Search className="mr-2 h-4 w-4" /> Source Part</>
            )}
          </button>
        </form>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            Found {results.length} Matches
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {results.map((item, idx) => (
              <div key={idx} className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium text-sm truncate">{item.name}</h4>
                  <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-500/10 text-green-500 border-green-500/20">
                    {item.price}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto pt-2">
                  <Package className="h-4 w-4" />
                  {item.inStock ? "In Stock" : "Check Availability"}
                  <a href={item.link} target="_blank" rel="noreferrer" className="ml-auto text-primary hover:underline">
                    View Provider &rarr;
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
