import Image from "next/image";

export default async function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col items-center justify-between bg-white px-16 py-32 sm:items-start dark:bg-black">
        <Image src="/logo.png" alt="Logo" width={100} height={100} />
      </main>
    </div>
  );
}
