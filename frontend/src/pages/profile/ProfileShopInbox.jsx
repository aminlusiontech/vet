import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import InboxPanel from "../../components/Profile/InboxPanel";

const ProfileShopInbox = () => {
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

  return <InboxPanel initialConversationId={conversationId} />;
};

export default ProfileShopInbox;

