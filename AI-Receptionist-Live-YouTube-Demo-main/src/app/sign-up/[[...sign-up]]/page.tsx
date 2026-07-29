import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";

export default function SignUpPage() {
  return (
    <AuthShell eyebrow="Start with the essentials" title="Create your workspace">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/app"
        appearance={{
          elements: {
            rootBox: "w-full",
            cardBox: "w-full shadow-none",
            card: "w-full border-0 bg-transparent p-0 shadow-none",
            header: "hidden",
            footer: "bg-transparent",
          },
        }}
      />
    </AuthShell>
  );
}
