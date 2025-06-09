import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, User, Package, Plus, Settings, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface SellerLayoutProps {
  children: React.ReactNode;
}

export function SellerLayout({ children }: SellerLayoutProps) {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('sellerToken');
    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out.',
    });
    navigate('/seller/login');
  };

  const navigation = [
    {
      name: 'Dashboard',
      href: '/seller/dashboard',
      icon: Home,
      current: location.pathname === '/seller/dashboard',
    },
    {
      name: 'Products',
      href: '/seller/dashboard/products',
      icon: Package,
      current: location.pathname.startsWith('/seller/dashboard/products'),
    },
    {
      name: 'Add Product',
      href: '/seller/dashboard/add-product',
      icon: Plus,
      current: location.pathname === '/seller/dashboard/add-product',
    },
    {
      name: 'Settings',
      href: '/seller/dashboard/settings',
      icon: Settings,
      current: location.pathname === '/seller/dashboard/settings',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple header */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900">Seller Dashboard</h1>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
