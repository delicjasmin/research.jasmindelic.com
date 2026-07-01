import { redirect } from "next/navigation";
import { fetchConversations } from "@/lib/api";

export default async function DocumentRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conversations = await fetchConversations(id).catch(() => []);

  if (conversations[0]) {
    redirect(`/c/${conversations[0].id}`);
  }

  redirect("/");
}
