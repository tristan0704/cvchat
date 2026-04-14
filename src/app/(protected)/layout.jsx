import { redirect } from "next/navigation";

import Navbar from "../../components/navigation/Navbar";
import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";

export default async function HomeLayout({ children }) {
  const currentUser = await getCurrentAppUser();

  if (!currentUser) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />

      <main>{children}</main>
    </div>
  );
}
