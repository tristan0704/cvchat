// DATEIUEBERSICHT: Tailwind-Konfiguration mit Content-Pfaden und aktivierten Plugins.
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
    ],
    plugins: [require("@tailwindcss/typography")],
}
