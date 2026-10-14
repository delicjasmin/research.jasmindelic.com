import { SubmitForm } from "@/components/submit-form";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-3 py-12">
      <div className="w-full max-w-lg space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="font-serif text-4xl leading-snug tracking-normal">
            Research Assistant
          </h1>
          <p className="text-muted-foreground font-sans text-base">
            Paste a PDF link to analyse it with AI, then feel free to ask
            anything about it.
          </p>
        </div>
        <SubmitForm />
      </div>
    </div>
  );
}
