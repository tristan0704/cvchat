import Image from "next/image";
import { redirect } from "next/navigation";

import RegisterStep2Form from "@/components/auth/RegisterStep2Form";
import { getCurrentAppUser } from "@/db-backend/auth/current-app-user";

export default async function RegisterStep2() {
    const currentUser = await getCurrentAppUser();

    if (!currentUser) {
        redirect("/auth/login");
    }

    if (currentUser.profile?.username) {
        redirect("/home");
    }

    return (
        <div className="flex min-h-screen flex-col justify-center bg-gray-900 px-6 py-12 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <Image
                    src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
                    width={40}
                    height={40}
                    className="mx-auto h-10 w-auto"
                    alt="Logo"
                />

                <h2 className="mt-10 text-center text-2xl font-bold tracking-tight text-white">
                    Profil vervollstaendigen
                </h2>

                <p className="mt-2 text-center text-sm text-gray-400">
                    Benutzername waehlen und optional Lebenslauf hochladen
                </p>
            </div>

            <RegisterStep2Form />
        </div>
    );
}
