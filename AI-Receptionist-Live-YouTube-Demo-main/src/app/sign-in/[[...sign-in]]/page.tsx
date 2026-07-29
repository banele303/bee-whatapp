import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";

export default function SignInPage() {
  return (
    <AuthShell eyebrow="Welcome back" title="Open your workspace">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
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
