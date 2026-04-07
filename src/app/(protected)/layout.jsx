import Navbar from "../../components/navigation/Navbar";

export default function HomeLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />

      <main>{children}</main>
    </div>
  );
}