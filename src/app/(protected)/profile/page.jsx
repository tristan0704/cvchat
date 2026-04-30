import { redirect } from "next/navigation";

import ProfilePageContent from "@/components/profile/ProfilePageContent";
import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";
import { createAvatarUrlForPath } from "@/db-backend/profile/avatar-service";
import { getProfileSnapshot } from "@/db-backend/profile/profile-service";

export default async function ProfilePage() {
  const currentUser = await getCurrentAppUser();

  if (!currentUser) {
    redirect("/auth/login");
  }

  const profile = await getProfileSnapshot(currentUser.id);

  // Die erste Profilansicht wird direkt mit Daten gerendert
  // und spart so einen zusätzlichen API-Request im Browser.
  const initialProfile = {
    email: currentUser.email,
    username: profile.username,
    avatarUrl: profile.avatarPath
      ? await createAvatarUrlForPath(profile.avatarPath)
      : null,
    language: profile.language,
    emailNotifications: profile.emailNotifications,
    activeCv: profile.activeCv,
  };

  return <ProfilePageContent initialProfile={initialProfile} />;
}
