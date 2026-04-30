import { redirect } from "next/navigation";

import Navbar from "../../components/navigation/Navbar";
import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";
import { createAvatarUrlForPath } from "@/db-backend/profile/avatar-service";
import { getProfileSnapshot } from "@/db-backend/profile/profile-service";

export default async function HomeLayout({ children }) {
  const currentUser = await getCurrentAppUser();

  if (!currentUser) {
    redirect("/auth/login");
  }

  if (!currentUser.profile?.username) {
    redirect("/auth/register/step2");
  }

  const profile = await getProfileSnapshot(currentUser.id);

  // Die App-Shell lädt nur die nötigsten Profildaten einmal serverseitig vor.
  const navbarProfile = {
    email: currentUser.email,
    username: profile.username,
    avatarUrl: profile.avatarPath
      ? await createAvatarUrlForPath(profile.avatarPath)
      : null,
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar initialProfile={navbarProfile} />

      <main>{children}</main>
    </div>
  );
}
