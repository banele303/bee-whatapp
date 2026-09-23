// @ts-nocheck
import { logger, task } from "@trigger.dev/sdk";
import { supabaseAdmin } from "@/lib/ai/admin-client";
import { buildSOAPSystemPrompt, parseSOAPResponse, quickScanRedFlags } from "@/lib/healthcare/soap-parser";
import { calculateRiskScore, calculateVisitFrequencyScore, buildRiskProfilePrompt } from "@/lib/healthcare/risk-scorer";
import { engineSendText } from "@/lib/flows/meta-send";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

/**
 * Trigger.dev Task: Analyze Consultation Note
 * Runs AI SOAP extraction, red flag detection, and action item generation
 * in the background when a consultation note is saved.
 */
export const analyzeConsultationTask = task({
  id: "analyze-consultation-note",
  run: async ({ noteId, accountId }: { noteId: string; accountId: string }) => {
    logger.info("Starting background consultation analysis", { noteId, accountId });

    const db = supabaseAdmin();
    const { data: note, error: noteErr } = await db
      .from("clinical_notes")
      .select("id, raw_transcript, note_type, account_id, contact_id")
      .eq("id", noteId)
      .eq("account_id", accountId)
      .maybeSingle();

    if (noteErr || !note?.raw_transcript) {
      logger.warn("No transcript found for note", { noteId });
      return { success: false, reason: "No transcript" };
    }

    const { data: aiConfig } = await db
      .from("ai_configs")
      .select("api_key, provider, model, is_active")
      .eq("account_id", accountId)
      .maybeSingle();

    if (!aiConfig?.is_active) {
      logger.warn("AI not configured for account", { accountId });
      return { success: false, reason: "AI not active" };
    }

    const { data: account } = await db
      .from("accounts")
      .select("vertical_type")
      .eq("id", accountId)
      .maybeSingle();

    const vertical =
      account?.vertical_type === "dentist" ? "dentist" :
      account?.vertical_type === "medspa" ? "medspa" : "general";

    const quickFlags = quickScanRedFlags(note.raw_transcript);
    const systemPrompt = buildSOAPSystemPrompt(vertical);

    let rawResponse = "";
    const prompt = `Analyze the following consultation transcript and return the structured JSON:\n\n---\n${note.raw_transcript}\n---`;

    if (aiConfig.provider === "openai") {
      const openai = createOpenAI({ apiKey: aiConfig.api_key });
      const res = await generateText({
        model: openai(aiConfig.model),
        system: systemPrompt,
        prompt,
        maxTokens: 2000,
      });
      rawResponse = res.text;
    } else if (aiConfig.provider === "anthropic") {
      const anthropic = createAnthropic({ apiKey: aiConfig.api_key });
      const res = await generateText({
        model: anthropic(aiConfig.model),
        system: systemPrompt,
        prompt,
        maxTokens: 2000,
      });
      rawResponse = res.text;
    } else {
      const deepseek = createOpenAI({
        apiKey: aiConfig.api_key,
        baseURL: "https://api.deepseek.com/v1",
      });
      const res = await generateText({
        model: deepseek(aiConfig.model || "deepseek-chat"),
        system: systemPrompt,
        prompt,
        maxTokens: 2000,
      });
      rawResponse = res.text;
    }

    const analysis = parseSOAPResponse(rawResponse);
    const existingFlagSymptoms = new Set(analysis.redFlags.map((f) => f.symptom));
    for (const flag of quickFlags) {
      if (!existingFlagSymptoms.has(flag.symptom)) {
        analysis.redFlags.push(flag);
      }
    }

    await db
      .from("clinical_notes")
      .update({
        soap_note: analysis.soapNote,
        ai_suggestions: analysis.aiSuggestions,
        action_items: analysis.actionItems,
        red_flags: analysis.redFlags,
        status: "in_progress",
      })
      .eq("id", noteId);

    logger.info("Consultation analysis complete", { noteId });

    // If note has a contact_id, trigger risk profile rebuild task
    if (note.contact_id) {
      await rebuildPatientRiskProfileTask.trigger({
        contactId: note.contact_id,
        accountId,
      });
    }

    return { success: true, analysis };
  },
});

/**
 * Trigger.dev Task: Rebuild Patient Risk Profile
 * Rebuilds the holistic AI risk profile for a patient contact
 * across all their saved consultation notes.
 */
export const rebuildPatientRiskProfileTask = task({
  id: "rebuild-patient-risk-profile",
  run: async ({ contactId, accountId }: { contactId: string; accountId: string }) => {
    logger.info("Rebuilding patient risk profile", { contactId, accountId });

    const db = supabaseAdmin();
    const { data: notes } = await db
      .from("clinical_notes")
      .select("id, raw_transcript, soap_note, ai_suggestions, red_flags, action_items, created_at")
      .eq("contact_id", contactId)
      .eq("account_id", accountId)
      .in("status", ["in_progress", "complete"])
      .order("created_at", { ascending: true });

    if (!notes || notes.length === 0) {
      return { success: false, reason: "No notes found" };
    }

    const { data: aiConfig } = await db
      .from("ai_configs")
      .select("api_key, provider, model, is_active")
      .eq("account_id", accountId)
      .maybeSingle();

    if (!aiConfig?.is_active) {
      return { success: false, reason: "AI not active" };
    }

    const notesSummary = notes
      .map((n, i) => {
        const soap = n.soap_note as Record<string, string> | null;
        return [
          `=== Visit ${i + 1} (${new Date(n.created_at).toLocaleDateString("en-ZA")}) ===`,
          soap?.subjective ? `Subjective: ${soap.subjective}` : "",
          soap?.objective ? `Objective: ${soap.objective}` : "",
          soap?.assessment ? `Assessment: ${soap.assessment}` : "",
          soap?.plan ? `Plan: ${soap.plan}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n");

    const systemPrompt = buildRiskProfilePrompt();
    let rawResponse = "";

    if (aiConfig.provider === "openai") {
      const openai = createOpenAI({ apiKey: aiConfig.api_key });
      const res = await generateText({
        model: openai(aiConfig.model),
        system: systemPrompt,
        prompt: `Analyze these ${notes.length} records:\n\n${notesSummary}`,
        maxTokens: 1500,
      });
      rawResponse = res.text;
    } else {
      const deepseek = createOpenAI({
        apiKey: aiConfig.api_key,
        baseURL: "https://api.deepseek.com/v1",
      });
      const res = await generateText({
        model: deepseek(aiConfig.model || "deepseek-chat"),
        system: systemPrompt,
        prompt: `Analyze these ${notes.length} records:\n\n${notesSummary}`,
        maxTokens: 1500,
      });
      rawResponse = res.text;
    }

    let aiData = {
      chronicConditions: [],
      medicationHistory: [],
      allergyFlags: [],
      aiAlerts: [],
      aiSummary: "Patient profile analyzed.",
    };

    try {
      const cleaned = rawResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      aiData = JSON.parse(cleaned);
    } catch {
      // Fallback
    }

    const firstNoteDate = new Date(notes[0].created_at);
    const lastNoteDate = new Date(notes[notes.length - 1].created_at);
    const today = new Date();
    const daysSinceFirst = Math.floor((today.getTime() - firstNoteDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceLast = Math.floor((today.getTime() - lastNoteDate.getTime()) / (1000 * 60 * 60 * 24));

    const recentNote = notes[notes.length - 1];
    const recentRedFlags = (recentNote.red_flags ?? []) as Array<{ severity: string }>;
    const hasUrgentFlags = recentRedFlags.some((f) => f.severity === "critical" || f.severity === "high");

    const { score, level } = calculateRiskScore(
      aiData.chronicConditions,
      aiData.aiAlerts,
      notes.length,
      daysSinceLast,
      hasUrgentFlags
    );

    const visitFrequencyScore = calculateVisitFrequencyScore(score, notes.length, daysSinceFirst);

    await db.from("patient_risk_profiles").upsert(
      {
        account_id: accountId,
        contact_id: contactId,
        risk_level: level,
        risk_score: score,
        chronic_conditions: aiData.chronicConditions,
        medication_history: aiData.medicationHistory,
        allergy_flags: aiData.allergyFlags,
        ai_alerts: aiData.aiAlerts,
        ai_summary: aiData.aiSummary,
        visit_frequency_score: visitFrequencyScore,
        total_consultations: notes.length,
        last_analyzed_at: new Date().toISOString(),
      },
      { onConflict: "contact_id" }
    );

    logger.info("Patient risk profile updated", { contactId, riskLevel: level, score });
    return { success: true, score, level };
  },
});
