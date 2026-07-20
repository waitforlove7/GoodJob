import { useSyncExternalStore } from "react";
import { Analytics } from "@vercel/analytics/react";
import { ProfilePage } from "./ProfilePage.jsx";

function getPage() {
  return window.location.hash === "#profile" ? "profile" : "explore";
}

function subscribe(onChange) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function Root({ ExploreApp }) {
  const page = useSyncExternalStore(subscribe, getPage, () => "explore");

  return (
    <>
      {page === "profile" ? <ProfilePage /> : <ExploreApp />}
      <Analytics />
    </>
  );
}
