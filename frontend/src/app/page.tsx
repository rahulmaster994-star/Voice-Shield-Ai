import SiteNavbar from "@/components/site-navbar";
import HeroSection from "@/components/hero-section";
import InteractiveThreatPlayground from "@/components/interactive-threat-playground";
import ModuleSuite from "@/components/module-suite";
import FeatureGrid from "@/components/feature-grid";
import ProblemSection from "@/components/problem-section";
import PipelineVisual from "@/components/pipeline-visual";
import ComparisonSection from "@/components/comparison-section";
import LanguagesSection from "@/components/languages-section";
import FinalCta from "@/components/final-cta";
import Footer from "@/components/footer";
import GalaxyBackground from "@/components/GalaxyBackground";

export const metadata = {
  title: "VAANISHIELD — Autonomous Voice Impersonation Defense & Prevention",
  description:
    "Smart India Hackathon 2026 (SIH26104). Real-time multi-layer AI defense against generative voice clones, acoustic replay attacks, and social engineering wire fraud.",
};

export default function Home() {
  return (
    <div className="relative min-h-screen bg-vn-navy text-vn-text selection:bg-vn-cyan/30 selection:text-white overflow-x-hidden">
      <GalaxyBackground />
      <SiteNavbar />
      <main id="main-content">
        <HeroSection />
        <InteractiveThreatPlayground />
        <ModuleSuite />
        <FeatureGrid />
        <ProblemSection />
        <PipelineVisual />
        <ComparisonSection />
        <LanguagesSection />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}