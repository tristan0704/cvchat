// DATEIUEBERSICHT: Startseite, die initial auf den passenden Bereich weiterleitet.
import { redirect } from "next/navigation"

export default function RootPage() {
  redirect("/home")
}

