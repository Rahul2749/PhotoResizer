import type { Metadata } from "next";
import AdminPanel from "../../components/admin-panel";

export const metadata: Metadata = {
  title: "Owner dashboard — PhotoResizeKaro",
  robots: { index: false, follow: false },
  alternates: { canonical: "/admin-photoresize-mgrrntech" }
};
export default function AdminPage() { return <AdminPanel/>; }
