// DATEIUEBERSICHT: Startseite, die initial auf den passenden Bereich weiterleitet.
import { redirect } from "next/navigation"

export default function RootPage() {
  // Root route bleibt schlank und leitet immer auf die eigentliche Startseite.
  redirect("/home")
}

