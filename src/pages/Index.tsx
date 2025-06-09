import { useState, useRef } from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import AestheticCategories from '@/components/AestheticCategories';
import ProductGrid from '@/components/ProductGrid';
import { Aesthetic } from '@/types';

type AestheticWithNone = Aesthetic | '';

const Index = () => {
  const [selectedAesthetic, setSelectedAesthetic] = useState<AestheticWithNone>('');
  const aestheticSectionRef = useRef<HTMLDivElement>(null);

  const handleExploreClick = () => {
    aestheticSectionRef.current?.scrollIntoView({ 
      behavior: 'smooth' 
    });
  };

  const handleAestheticChange = (aesthetic: Aesthetic) => {
    // Only update if the aesthetic is different from the current selection
    if (selectedAesthetic !== aesthetic) {
      setSelectedAesthetic(aesthetic);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main>
        <HeroSection onExploreClick={handleExploreClick} />
        
        <div ref={aestheticSectionRef}>
          <AestheticCategories 
            selectedAesthetic={selectedAesthetic}
            onAestheticChange={handleAestheticChange}
          />
        </div>
        
        <ProductGrid selectedAesthetic={selectedAesthetic} />
      </main>

      {/* Footer */}
      <footer className="bg-black text-white py-8">
        <div className="container mx-auto px-4 text-center space-y-2">
          <p className="text-gray-400 text-sm">&copy; {new Date().getFullYear()} Byblos Atelier. All rights reserved.</p>
          <p className="text-gray-600 text-xs">Powered by Evolve</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
