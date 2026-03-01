import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import InboxPanel from "../../components/Profile/InboxPanel";

const ProfileInbox = () => {
  const [searchParams] = useSearchParams();
  
  const conversationId = useMemo(() => {
    const fromParam =
      searchParams.get("conversation") || searchParams.get("conversationId");
    if (fromParam) return fromParam;

    if (typeof window === "undefined") return null;
    const rawQuery = window.location.search?.replace("?", "") || "";
    if (!rawQuery) return null;
    if (!rawQuery.includes("=")) return rawQuery;
    const [firstKey, firstValue] = rawQuery.split("&")[0].split("=");
    return firstValue || firstKey || null;
  }, [searchParams]);

  const cardClass = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8";
  return (
    <section className={cardClass}>
      <header className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Inbox</h2>
        <p className="text-sm text-slate-500">
          Collaborate with sellers and support in one place.
        </p>
      </header>
      <InboxPanel initialConversationId={conversationId} />
    </section>
  );
};

export default ProfileInbox;

