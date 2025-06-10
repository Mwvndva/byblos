import { createBrowserRouter, Navigate, Outlet, useOutletContext, useNavigate } from 'react-router-dom';
import { SellerLayout } from '../components/layout/SellerLayout';
import SellerDashboard from '../components/seller/SellerDashboard';
import SellerRegistration from '../components/seller/SellerRegistration';
import { SellerLogin } from '../components/seller/SellerLogin';
import ProductsList from '../components/seller/ProductsList';
import AddProductForm from '../components/seller/AddProductForm';
import { EditProductForm } from '../components/seller/EditProductForm';
import SellerSettings from '../components/seller/SellerSettings';
import { Button } from '../components/ui/button';
import SellerOrdersPage from '../pages/seller/SellerOrdersPage';

// Products route component that will be rendered within the dashboard
function ProductsListWrapper() {
  // This component will be rendered within SellerDashboard which provides the context
  const { products, onDeleteProduct } = useOutletContext<{
    products: any[];
    onDeleteProduct: (id: string) => Promise<void>;
  }>();
  
  const navigate = useNavigate();
  
  const handleEdit = (id: string) => {
    navigate(`/seller/products/${id}/edit`);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">My Products</h2>
      <ProductsList 
        products={products || []}
        onDelete={onDeleteProduct}
        onEdit={handleEdit}
      />
    </div>
  );
}

// Protected route component
const ProtectedRoute = () => {
  const token = localStorage.getItem('sellerToken');
  return token ? <Outlet /> : <Navigate to="/seller/login" replace />;
};

// Routes accessible only to unauthenticated users
const GuestRoute = () => {
  const token = localStorage.getItem('sellerToken');
  return !token ? <Outlet /> : <Navigate to="/seller/dashboard" replace />;
};

// Create the seller routes
const sellerRoutes = [
  {
    path: '/seller',
    element: <SellerLayout><Outlet /></SellerLayout>,
    children: [
      // Public routes
      {
        element: <GuestRoute />,
        children: [
          {
            path: 'register',
            element: <SellerRegistration />,
          },
          {
            path: 'login',
            element: <SellerLogin />,
          },
        ],
      },
      
      // Protected routes
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'dashboard',
            element: <SellerDashboard />,
            children: [
              {
                index: true,
                element: (
                  <div className="p-6">
                    <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {/* Overview content will be rendered by SellerDashboard */}
                    </div>
                  </div>
                ),
              },
            ],
          },
          {
            path: 'products',
            element: <SellerDashboard />,
            children: [
              {
                index: true,
                element: <ProductsListWrapper />
              },
              {
                path: ':id/edit',
                element: (
                  <SellerDashboard>
                    {({ fetchData }) => (
                      <EditProductForm onSuccess={fetchData} />
                    )}
                  </SellerDashboard>
                ),
              },
            ],
          },
          {
            path: 'add-product',
            element: <SellerDashboard />,
            children: [
              {
                index: true,
                element: (
                  <SellerDashboard>
                    {({ fetchData }) => (
                      <AddProductForm onSuccess={fetchData} />
                    )}
                  </SellerDashboard>
                ),
              },
            ],
          },
          {
            path: 'settings',
            element: <SellerDashboard />,
            children: [
              {
                index: true,
                element: <SellerSettings />,
              },
            ],
          },
          {
            path: 'orders',
            element: <SellerDashboard />,
            children: [
              {
                index: true,
                element: <SellerOrdersPage />,
              },
            ],
          },
        ],
      },
      
      // Redirects
      {
        path: '',
        element: <Navigate to="dashboard" replace />,
      },
      {
        path: '*',
        element: <Navigate to="dashboard" replace />,
      },
    ],
  },
];

// Export the routes array for use in the main router
export { sellerRoutes };

// Create and export the browser router with basename
export const sellerRouter = createBrowserRouter(sellerRoutes, {
  basename: import.meta.env.BASE_URL || '/',
});
