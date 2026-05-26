"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { isAllowedAdminEmail } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import { showToast } from "@/lib/toast";

interface AdminAuthGateProps {
  children: React.ReactNode;
}

export default function AdminAuthGate({ children }: AdminAuthGateProps) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const validateSession = async (nextSession: Session | null) => {
      if (!nextSession) {
        router.replace("/admin/login");
        if (isMounted) setChecking(false);
        return;
      }

      if (!isAllowedAdminEmail(nextSession.user.email)) {
        await supabase.auth.signOut();
        showToast("ამ მომხმარებელს ადმინ პანელზე წვდომა არ აქვს.", "error");
        router.replace("/admin/login");
        if (isMounted) setChecking(false);
        return;
      }

      if (isMounted) {
        setSession(nextSession);
        setChecking(false);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      validateSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      validateSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (checking || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f8f5] px-4 text-[#151716]">
        <div className="border border-[#dfe6d8] bg-white px-6 py-5 text-center shadow-[0_18px_55px_rgba(21,23,22,0.08)]">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#7b8a67]">
            შემოწმება
          </p>
          <p className="mt-2 text-sm font-black">ადმინ წვდომა მოწმდება...</p>
        </div>
      </div>
    );
  }

  return children;
}
