import { useState, useEffect } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, Package, Plus, Settings, PlusCircle, DollarSign, Box, Eye, EyeOff } from 'lucide-react';
import ProductsList from './ProductsList';
import { sellerApi } from '@/api/sellerApi';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image_url: string;
  aesthetic: string;
  createdAt: string;
  updatedAt?: string;
}

interface AnalyticsData {
  totalProducts: number;
  totalRevenue: number;
  monthlySales: Array<{ month: string; sales: number }>;
}

interface SellerDashboardProps {
  children?: (props: { fetchData: () => Promise<void> }) => React.ReactNode;
}

const SellerDashboard: React.FC<SellerDashboardProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);


  // Calculate analytics from products
  const calculateAnalytics = (products: Product[]): AnalyticsData => {
    const now = new Date();
    const last12Months: { [key: string]: number } = {};
    
    // Initialize last 12 months with 0 sales
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthYear = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      last12Months[monthYear] = 0;
    }
    
    // Calculate total revenue (this is a placeholder - you'll need to implement actual order logic)
    const totalRevenue = products.reduce((sum, product) => {
      // This is a simplified calculation - in a real app, you'd sum actual order amounts
      return sum + (product.price * 0.3); // Assuming 30% of products are sold
    }, 0);
    
    // Process monthly sales (this is mock data - replace with actual order data)
    const monthlySales = Object.entries(last12Months).map(([month]) => ({
      month,
      sales: Math.floor(Math.random() * 1000) + 500, // Random sales data
    }));
    
    return {
      totalProducts: products.length,
      totalRevenue,
      monthlySales,
    };
  };

  // Fetch seller's data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Check for authentication token
      const token = localStorage.getItem('sellerToken');
      if (!token) {
        console.warn('No seller token found, redirecting to login');
        navigate('/seller/login');
        return;
      }
      
      try {
        // 1. Fetch seller profile first
        console.log('Fetching seller profile...');
        const profile = await sellerApi.getProfile();
        
        if (!profile) {
          throw new Error('Failed to load seller profile');
        }
        
        console.log('Retrieved profile:', { 
          id: profile.id, 
          email: profile.email,
          fullName: profile.fullName 
        });
        
        // Ensure we have a valid profile ID
        if (!profile.id) {
          console.error('Invalid profile data received - missing ID:', profile);
          throw new Error('Invalid profile data received from server');
        }
        
        // 2. Fetch seller's products
        console.log('Fetching seller products...');
        const sellerProducts = await sellerApi.getProducts();
        
        // 3. Ensure we have valid products data
        if (!Array.isArray(sellerProducts)) {
          console.error('Invalid products data received:', sellerProducts);
          throw new Error('Invalid products data received from server');
        }
        
        console.log(`Retrieved ${sellerProducts.length} products`);
        
        // 4. Update state with the fetched data
        setProducts(sellerProducts);
        setAnalytics(calculateAnalytics(sellerProducts));
        
      } catch (profileError: any) {
        console.error('Error in profile or products fetch:', {
          error: profileError.message,
          response: profileError.response?.data,
          status: profileError.response?.status
        });
        
        // If there's an auth error, clear token and redirect to login
        if (profileError?.response?.status === 401 || 
            profileError?.status === 401 || 
            profileError?.message?.includes('401') ||
            profileError?.message?.includes('Unauthorized')) {
          localStorage.removeItem('sellerToken');
          toast({
            title: 'Session expired',
            description: 'Please log in again',
            variant: 'destructive',
          });
          navigate('/seller/login');
          return;
        }
        
        // Show error to user
        toast({
          title: 'Error loading dashboard',
          description: profileError.message || 'Failed to load dashboard data',
          variant: 'destructive',
        });
        
        // Re-throw with more context
        const errorWithContext = new Error(profileError.message || 'Failed to load dashboard data');
        (errorWithContext as any).response = profileError.response;
        (errorWithContext as any).status = profileError.status;
        throw errorWithContext;
      }
      
    } catch (err) {
      console.error('Error in fetchData:', {
        error: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      toast({
        title: 'Unable to load dashboard data',
        description: err.response?.data?.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [navigate, toast]);

  // Handle product deletion
  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await sellerApi.deleteProduct(productId);
        // Refresh the products list
        await fetchData();
        toast({
          title: 'Success',
          description: 'Product deleted successfully',
        });
      } catch (error) {
        console.error('Failed to delete product:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete product',
          variant: 'destructive',
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Unable to load dashboard data. Please try again later.</p>
      </div>
    );
  }

  // Create context value to pass to child routes
  const outletContext = {
    products,
    onDeleteProduct: handleDeleteProduct,
    fetchData,
  };

  // If children are provided, render them with the fetchData function
  if (children) {
    return (
      <div className="space-y-6">
        {children({ fetchData })}
      </div>
    );
  }

  // Render the dashboard
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 hover:bg-transparent"
          >
            <Home className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <div className="w-24"></div> {/* For balance */}
        </div>

        <div className="mt-6">
          <Outlet context={outletContext} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalProducts}</div>
              <p className="text-xs text-muted-foreground">Total products in your store</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Products</CardTitle>
            <CardDescription>Your most recently added products</CardDescription>
          </CardHeader>
          <CardContent>
            {products.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {products.slice(0, 3).map((product) => (
                  <div key={product.id} className="border rounded-lg p-4">
                    <div className="aspect-square bg-gray-100 rounded-md overflow-hidden mb-3">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-500">{product.aesthetic}</p>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(product.price)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No products found. Add your first product to get started.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SellerDashboard;
