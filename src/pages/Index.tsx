import ArticlesTeaserSection from '@/shared/components/ArticlesTeaserSection';
import ExploreAreasSection from '@/shared/components/ExploreAreasSection';
import FeaturedCoursesSection from '@/shared/components/FeaturedCoursesSection';
import Footer from '@/shared/components/Footer';
import HeroSection from '@/shared/components/HeroSection';
import InstructorsSection from '@/shared/components/InstructorsSection';
import Navigation from '@/shared/components/Navigation';
import StatsBar from '@/shared/components/StatsBar';
import TestimonialsSection from '@/shared/components/TestimonialsSection';

const Index = () => (
  <div className="vdm-page min-h-screen overflow-x-hidden">
    <Navigation />
    <HeroSection />
    <StatsBar />
    <ExploreAreasSection />
    <FeaturedCoursesSection />
    <InstructorsSection />
    <TestimonialsSection />
    <ArticlesTeaserSection />
    <Footer />
  </div>
);

export default Index;
