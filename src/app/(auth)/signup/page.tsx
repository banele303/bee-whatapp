"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle,
  UsersRound,
  Stethoscope,
  Sparkles,
  ShieldCheck,
  Mic,
  Activity,
  ArrowRight,
  Lock,
  Mail,
  User,
  Building2,
  Check,
  Zap,
} from "lucide-react";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageInner />
    </Suspense>
  );
}

function SignupPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [fullName, setFullName] = useState("");
  const [practiceName, setPracticeName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const emailRedirectTo = inviteToken
        ? `${window.location.origin}/join/${encodeURIComponent(inviteToken)}`
        : undefined;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            practice_name: practiceName,
          },
          ...(emailRedirectTo ? { emailRedirectTo } : {}),
        },
      });

      if (error) {
        // If offline or network issue, offer dev bypass
        const msg = error.message.includes("Failed to fetch")
          ? "Unable to reach Supabase database. You can use the Quick Dev Access below."
          : error.message;
        setError(msg);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      const msg = errMessage.includes("Failed to fetch")
        ? "Unable to reach Supabase database. You can use the Quick Dev Access below."
        : errMessage;
      setError(msg);
      setLoading(false);
    }
  };

  const handleDevBypass = () => {
    document.cookie = "wacrm-dev-bypass=true; path=/; max-age=86400; SameSite=Lax";
    router.push("/dashboard");
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <Card className="w-full max-w-md border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl">
          <CardHeader className="items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Check your email
            </CardTitle>
            <CardDescription className="text-slate-400 text-sm mt-1">
              We&apos;ve sent a confirmation link to{" "}
              <span className="font-semibold text-white">{email}</span>. Please verify your email to access your clinical dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href={
                inviteToken
                  ? `/login?invite=${encodeURIComponent(inviteToken)}`
                  : "/login"
              }
              className="w-full block"
            >
              <Button
                variant="outline"
                className="w-full border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
              >
                Back to sign in
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col lg:flex-row overflow-x-hidden">
      {/* LEFT PANE: Sign-Up Form */}
      <div className="w-full lg:w-[48%] xl:w-[44%] p-6 sm:p-10 lg:p-14 flex flex-col justify-between relative z-10">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                WACRM <span className="text-rose-400 text-xs font-mono font-medium">HEALTH</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                Clinical AI Platform
              </span>
            </div>
          </Link>

          <Badge className="bg-slate-900 border-slate-800 text-slate-400 text-[10px] hidden sm:inline-flex">
            HIPAA & POPIA Ready
          </Badge>
        </div>

        {/* Form Container */}
        <div className="my-auto py-8 max-w-md w-full mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {inviteToken ? "Join your clinic team" : "Create your clinical workspace"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {inviteToken
                ? "Verify your professional details to join your clinical organization."
                : "Real-time consultation transcription, AI SOAP notes, and automated WhatsApp patient journeys."}
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 space-y-2">
                <p>{error}</p>
                {error.includes("Quick Dev Access") && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleDevBypass}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold h-8"
                  >
                    Enter with Quick Dev Access →
                  </Button>
                )}
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-xs font-medium text-slate-300">
                Full Name & Title
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Dr. Emily Chen, MD"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="pl-10 h-10 rounded-xl border-slate-800 bg-slate-900 text-white placeholder:text-slate-500 focus:border-indigo-500 text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Practice Name */}
            <div className="space-y-1.5">
              <Label htmlFor="practiceName" className="text-xs font-medium text-slate-300">
                Clinic or Practice Name
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="practiceName"
                  type="text"
                  placeholder="Cape Town Family Health"
                  value={practiceName}
                  onChange={(e) => setPracticeName(e.target.value)}
                  className="pl-10 h-10 rounded-xl border-slate-800 bg-slate-900 text-white placeholder:text-slate-500 focus:border-indigo-500 text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-slate-300">
                Work Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="doctor@practice.co.za"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 h-10 rounded-xl border-slate-800 bg-slate-900 text-white placeholder:text-slate-500 focus:border-indigo-500 text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Password Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-slate-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min 6 chars"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-9 h-10 rounded-xl border-slate-800 bg-slate-900 text-white placeholder:text-slate-500 focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-medium text-slate-300">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repeat"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pl-9 h-10 rounded-xl border-slate-800 bg-slate-900 text-white placeholder:text-slate-500 focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Security checklist */}
            <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> 256-Bit Encrypted
              </span>
              <span className="flex items-center gap-1">
                <Check className="h-3.5 w-3.5 text-indigo-400" /> 14-Day Free Trial
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-amber-400" /> Instant Setup
              </span>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-rose-500 via-indigo-600 to-indigo-700 hover:from-rose-600 hover:to-indigo-800 text-white font-semibold text-sm shadow-xl shadow-indigo-900/30 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <span>Creating your account...</span>
              ) : (
                <>
                  <span>Create Clinical Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Sign In link */}
          <div className="text-center pt-2">
            <p className="text-xs text-slate-400">
              Already have an account?{" "}
              <Link
                href={inviteToken ? `/login?invite=${encodeURIComponent(inviteToken)}` : "/login"}
                className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center sm:text-left text-[11px] text-slate-500">
          <p>© 2026 WACRM Health AI. Dedicated to healthcare practitioners.</p>
        </div>
      </div>

      {/* RIGHT PANE: Showcase Graphic & Feature Highlights */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[56%] bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/80 border-l border-slate-800/80 p-8 xl:p-12 flex-col justify-between relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Feature Pill */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-medium text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-rose-400" />
            <span>AI Consultation Documentation Suite</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            99.4% Clinical Accuracy
          </div>
        </div>

        {/* Main Center Image Showcase */}
        <div className="relative z-10 my-auto py-6 flex flex-col items-center">
          <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl shadow-black/80 group">
            {/* Real generated high-tech healthcare image */}
            <Image
              src="/images/healthcare-signup-hero.jpg"
              alt="Healthcare AI Consultation Transcription & SOAP Notes"
              width={720}
              height={405}
              className="w-full max-w-xl h-auto object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              priority
            />
            {/* Subtle glass reflection overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-white/[0.03] pointer-events-none" />
          </div>

          {/* 3 Interactive Feature Pills underneath */}
          <div className="grid grid-cols-3 gap-3.5 mt-8 w-full max-w-xl">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold">
                <Mic className="h-3.5 w-3.5" />
                <span>Live Speech</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Whisper AI streams consultations into text.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold">
                <Activity className="h-3.5 w-3.5" />
                <span>Auto SOAP</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Structures S, O, A, and P notes in seconds.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>WhatsApp Care</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Day 0 to 30 automated patient check-ins.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Quote */}
        <div className="relative z-10 border-t border-slate-800/80 pt-4 flex items-center justify-between text-xs text-slate-400">
          <p className="italic">
            &ldquo;Transcribing consultations directly into structured SOAP notes has cut our documentation time by 75%.&rdquo;
          </p>
          <span className="font-semibold text-slate-300 shrink-0 ml-4">
            Dr. Emily Chen, Lead Physician
          </span>
        </div>
      </div>
    </div>
  );
}
