import React, { useMemo, useState } from "react";
import Header from "../components/Layout/Header";
import Footer from "../components/Layout/Footer";
import ProfileSidebar from "../components/Profile/ProfileSidebar";
import styles from "../styles/styles";
import InboxPanel from "../components/Profile/InboxPanel";
import { useNavigate, useSearchParams } from "react-router-dom";

const UserInbox = () => {
  const [searchParams] = useSearchParams();
  const [active, setActive] = useState(4);
  const navigate = useNavigate();

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

  // Map tab IDs to routes
  const getRouteFromTabId = (tabId) => {
    const routeMap = {
      1: "/profile/overview",
      2: "/profile/orders",
      3: "/profile/disputes-refunds?tab=my-refunds",
      4: "/profile/inbox",
      5: "/profile/track-orders",
      6: "/profile/change-password",
      7: "/profile/addresses",
      8: "/profile/offers",
      20: "/profile/dashboard",
      21: "/profile/products",
      22: "/profile/create-product",
      23: "/profile/events",
      24: "/profile/create-event",
      25: "/profile/withdraw",
      26: "/profile/inbox",
      27: "/profile/orders?view=selling",
      28: "/profile/disputes-refunds?tab=review-refunds",
      29: "/profile/shop-settings",
      31: "/profile/bundles",
      32: "/profile/offers?view=selling",
    };
    return routeMap[tabId] || "/profile/overview";
  };

  const handleSidebarSelect = (value) => {
    if (value === 4) {
      setActive(4);
      return;
    }

    setActive(value);
    const route = getRouteFromTabId(value);
    navigate(route);
  };

  return (
    <div>
      <Header />
      <div className={`${styles.section} flex flex-col lg:flex-row py-10 gap-6`}>
        <div className="w-full lg:w-[330px] lg:sticky lg:top-32">
          <ProfileSidebar />
        </div>
        <div className="flex-1">
          <InboxPanel initialConversationId={conversationId} />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default UserInbox;
