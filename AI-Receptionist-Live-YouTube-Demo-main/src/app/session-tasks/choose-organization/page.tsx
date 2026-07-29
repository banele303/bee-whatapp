import { TaskChooseOrganization } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";

export default function ChooseOrganizationPage() {
  return (
    <AuthShell eyebrow="One last step" title="Choose where you’re working">
      <TaskChooseOrganization
        redirectUrlComplete="/app"
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
