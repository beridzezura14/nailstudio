"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isAllowedAdminEmail } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import { showToast } from "@/lib/toast";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;

      if (session && isAllowedAdminEmail(session.user.email)) {
        router.replace("/admin");
        return;
      }

      setChecking(false);
    });
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      showToast("შესვლა ვერ მოხერხდა: " + error.message, "error");
      return;
    }

    if (!isAllowedAdminEmail(data.user.email)) {
      await supabase.auth.signOut();
      showToast("ამ მომხმარებელს ადმინ პანელზე წვდომა არ აქვს.", "error");
      return;
    }

    showToast("ადმინ პანელში შეხვედით.", "success");
    router.replace("/admin");
  };

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f8f5] px-4 text-[#151716]">
        <p className="text-sm font-black">სესია მოწმდება...</p>
      </div>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f8f5] px-4 py-10 text-[#151716]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md border border-[#dfe6d8] bg-white p-5 shadow-[0_24px_70px_rgba(21,23,22,0.12)] sm:p-7"
      >
        <div className="mb-7 border-b border-[#dfe6d8] pb-5">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.32em] text-[#7b8a67]">
            ადმინი
          </p>
          <h1 className="text-3xl font-black uppercase tracking-normal">
            შესვლა
          </h1>
        </div>

        <div className="space-y-5">
          <label className="block border-b border-[#c9d2c3] pb-2 focus-within:border-[#151716]">
            <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.3em] text-[#7b8a67]">
              ელფოსტა
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full bg-transparent text-sm font-bold tracking-wide outline-none"
              autoComplete="email"
            />
          </label>

          <label className="block border-b border-[#c9d2c3] pb-2 focus-within:border-[#151716]">
            <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.3em] text-[#7b8a67]">
              პაროლი
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full bg-transparent text-sm font-bold tracking-wide outline-none"
              autoComplete="current-password"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-7 w-full bg-[#151716] py-3.5 text-[10px] font-black uppercase tracking-[0.24em] text-white transition-colors hover:bg-[#2f3430] disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          {loading ? "შესვლა..." : "შესვლა"}
        </button>

        <Link
          href="/"
          className="mt-5 block text-center text-[10px] font-black uppercase tracking-[0.2em] text-[#586256] hover:text-[#151716]"
        >
          მთავარზე დაბრუნება
        </Link>
      </form>
    </main>
  );
}
