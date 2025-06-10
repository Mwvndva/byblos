
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Instagram } from 'lucide-react';

const Header = () => {
  return (
    <header className="border-b border-gray-100 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between w-full">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <h1 className="font-serif text-2xl font-bold text-noir">
              Byblos Experience
            </h1>
          </Link>

          {/* Seller Action and Social */}
          <div className="flex items-center space-x-2">
            <a 
              href="https://www.instagram.com/byblos.exp" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 text-gray-600 hover:text-black transition-colors"
              aria-label="Visit our Instagram"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <Link to="/seller">
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center justify-center hover:bg-black hover:text-white transition-colors"
              >
                <span className="text-sm font-medium">Become a Seller</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
