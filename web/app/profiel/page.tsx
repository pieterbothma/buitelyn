import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { Footer } from "@/components/footer";
import { ProfielVorm } from "@/components/profiel-vorm";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My profiel — Buitelyn",
};

export default async function ProfielBlad() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/markte");

  const { data: profiel } = await sb
    .from("profiele")
    .select("naam, avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <>
      <TopBar />
      <main className="flex-1">
        <section className="mx-auto max-w-[1440px] px-6 py-10 md:px-14">
          <div className="border-y-2 border-ink">
            <div className="my-1 border-y border-ink py-3">
              <h1 className="text-3xl font-extrabold tracking-[-0.02em] md:text-4xl">My profiel</h1>
            </div>
          </div>
          <div className="mx-auto mt-10 max-w-md">
            <ProfielVorm
              epos={user.email ?? ""}
              naam={profiel?.naam ?? ""}
              avatarUrl={profiel?.avatar_url ?? null}
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
