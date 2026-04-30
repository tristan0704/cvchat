import { redirect } from "next/navigation";

import SettingsPageContent from "@/components/settings/SettingsPageContent";
import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";
import { getProfileSnapshot } from "@/db-backend/profile/profile-service";

export default async function SettingsPage() {
    const currentUser = await getCurrentAppUser();

    if (!currentUser) {
        redirect("/auth/login");
    }

    const profile = await getProfileSnapshot(currentUser.id);

    // Die Einstellungen kommen direkt vom Server, damit die Seite
    // ohne zusätzlichen Initial-Request benutzbar ist.
    const initialSettings = {
        language: profile.language,
        emailNotifications: profile.emailNotifications,
    };

    return <SettingsPageContent initialSettings={initialSettings} />;
}
