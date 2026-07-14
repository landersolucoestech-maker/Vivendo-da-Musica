
import Navigation from "@/shared/components/Navigation";
import HeroSection from "@/shared/components/HeroSection";
import StatsBar from "@/shared/components/StatsBar";
import ExploreAreasSection from "@/shared/components/ExploreAreasSection";
import FeaturedCoursesSection from "@/shared/components/FeaturedCoursesSection";
import InstructorsSection from "@/shared/components/InstructorsSection";
import TestimonialsSection from "@/shared/components/TestimonialsSection";
import PlansTeaserSection from "@/shared/components/PlansTeaserSection";
import EventsTeaserSection from "@/shared/components/EventsTeaserSection";
import ArticlesTeaserSection from "@/shared/components/ArticlesTeaserSection";
import Footer from "@/shared/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navigation />
      <HeroSection />
      <StatsBar />
      <ExploreAreasSection />
      <FeaturedCoursesSection />
      <InstructorsSection />
      <TestimonialsSection />
      <PlansTeaserSection />
      <EventsTeaserSection />
      <ArticlesTeaserSection />
      <Footer />
    </div>
  );
};

export default Index;
