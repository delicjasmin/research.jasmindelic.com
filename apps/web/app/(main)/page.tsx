import { SubmitForm } from "@/components/submit-form";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-3 py-12">
      <div className="w-full max-w-lg space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Research Assistant
          </h1>
          <p className="text-muted-foreground text-sm">
            Paste a PDF link to analyse it with AI, then feel free to ask
            anything about it.
          </p>
        </div>
        <SubmitForm />
      </div>
    </div>
  );
}
