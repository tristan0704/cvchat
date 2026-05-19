import Hero from "../components/landing/Hero";
import Features from "../components/landing/Features";
import CTA from "../components/landing/CTA";
import Footer from "../components/landing/Footer";
import LandingPageNavbar from "../components/navigation/LandingPageNavBar";

export default function Page() {
  return (
    <>

      <LandingPageNavbar />
      <Hero />
      <Features />
      <CTA />
      <Footer />

      
    </>

    
  );
}
