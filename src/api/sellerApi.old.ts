import axios from 'axios';
import { api as publicApi } from './api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

interface Seller {
  id: number;
  fullName: string;
  full_name?: string;  // For backward compatibility with API responses
  email: string;
  phone: string;
  createdAt: string;
  created_at?: string; // For API response compatibility
  updatedAt?: string;
  updated_at?: string; // For API response compatibility
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image_url: string;
  aesthetic: string;
  sellerId: string;
  isSold: boolean;
  status: 'available' | 'sold';
  soldAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface SellerAnalytics {
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  totalRevenue: number;
  monthlySales: Array<{ month: string; sales: number }>;
}

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  productId: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: OrderItem[];
  total: number;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  createdAt: string;
  updatedAt?: string;
}

// Create a separate instance for seller API with auth
const sellerApiInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token in requests for seller API
sellerApiInstance.interceptors.request.use(
  (config) => {
    // Only add auth header for seller-specific endpoints
    if (config.url?.startsWith('/sellers/') || 
        config.url?.startsWith('/products/') || 
        config.url === '/products') {
      const token = localStorage.getItem('sellerToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else if (!config.url.endsWith('/login') && !config.url.endsWith('/register')) {
        // Redirect to login if trying to access protected route without token
        window.location.href = '/seller/login';
        return Promise.reject(new Error('Authentication required'));
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle token expiration for seller API
sellerApiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized errors (e.g., token expired)
      localStorage.removeItem('sellerToken');
      if (!window.location.pathname.includes('login')) {
        window.location.href = '/seller/login';
      }
    }
    return Promise.reject(error);
  }
);

// Export seller API instance
export const sellerApi = {
  // Seller authentication
  login: async (credentials: {
    email: string;
    password: string;
  }): Promise<{ seller: Seller; token: string }> => {
    try {
      const response = await sellerApiInstance.post('/sellers/login', credentials);
      const { seller, token } = response.data;
      
      // Store the token in localStorage
      localStorage.setItem('sellerToken', token);
      
      // Set the default authorization header
      sellerApiInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Ensure consistent property names
      return {
        seller: {
          ...seller,
          fullName: seller.full_name || seller.fullName,
          createdAt: seller.created_at || seller.createdAt,
          updatedAt: seller.updated_at || seller.updatedAt
        },
        token
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Seller registration
  register: async (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<{ seller: Seller; token: string }> => {
    try {
      const response = await sellerApiInstance.post('/sellers/register', data);
      const { seller, token } = response.data;
      
      // Store the token in localStorage
      localStorage.setItem('sellerToken', token);
      
      // Set the default authorization header
      sellerApiInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Ensure consistent property names
      return {
        seller: {
          ...seller,
          fullName: seller.full_name || seller.fullName,
          createdAt: seller.created_at || seller.createdAt,
          updatedAt: seller.updated_at || seller.updatedAt
        },
        token
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  // Product management
  createProduct: async (product: {
    name: string;
    price: number;
    description: string;
    image_url: string;
    aesthetic: string;
  }): Promise<Product> => {
    try {
      const response = await sellerApiInstance.post('/products', product);
      if (response.data.status === 'error') {
        throw new Error(response.data.message || 'Failed to create product');
      }
      
      // Get the created product from the response
      const createdProduct = response.data.data?.product || response.data.data || response.data;
      const createdProduct = response.data.data?.product || response.data;
      
      // Transform the response to match our Product interface
      return {
        id: String(createdProduct.id),
        name: String(createdProduct.name || ''),
        description: String(createdProduct.description || ''),
        price: Number(createdProduct.price) || 0,
        image_url: createdProduct.image_url || createdProduct.image || '',
        sellerId: String(createdProduct.sellerId || createdProduct.seller_id || ''),
        isSold: Boolean(createdProduct.isSold || createdProduct.soldAt || false),
        status: createdProduct.status || (createdProduct.soldAt ? 'sold' : 'available'),
        soldAt: createdProduct.soldAt || null,
        createdAt: createdProduct.createdAt || createdProduct.created_at || new Date().toISOString(),
        updatedAt: createdProduct.updatedAt || createdProduct.updated_at || new Date().toISOString(),
        aesthetic: createdProduct.aesthetic || 'noir'
      };
    } catch (error) {
      console.error('Error creating product:', error);
      // If it's an axios error, try to get a better error message
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const message = error.response.data?.message || 'Failed to create product';
        throw new Error(`${message} (${error.response.status})`);
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error('No response from server. Please check your connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        throw new Error(error.message || 'Failed to create product');
      }
    }
  },

  getProducts: async (sellerId: string): Promise<Product[]> => {
    try {
      const response = await sellerApiInstance.get(`/sellers/${sellerId}/products`);
      // Transform the response to match our Product interface
      return (response.data.products || []).map((product: any) => ({
        ...product,
        image_url: product.image_url || product.imageUrl,
        sellerId: product.sellerId || product.seller_id,
        createdAt: product.createdAt || product.created_at,
        updatedAt: product.updatedAt || product.updated_at,
        isSold: product.isSold || product.is_sold || product.status === 'sold',
        status: product.status || (product.isSold || product.is_sold ? 'sold' : 'available')
      }));
      
      // Handle different response structures
      let productsData: any[] = [];
      
      // Handle the actual response structure from the backend
      if (response.data && 
          response.data.status === 'success' && 
          response.data.data && 
          response.data.data.products && 
          Array.isArray(response.data.data.products)) {
        // Handle: { status: 'success', data: { products: [...] } }
        productsData = response.data.data.products;
        console.log(`Found ${productsData.length} products in response.data.data.products`);
      } else if (response.data && 
                response.data.status === 'success' && 
                response.data.data && 
                Array.isArray(response.data.data)) {
        // Handle: { status: 'success', data: [...] }
        productsData = response.data.data;
        console.log(`Found ${productsData.length} products in response.data.data`);
      } else if (response.data && Array.isArray(response.data)) {
        // Handle: [...]
        productsData = response.data;
        console.log(`Found ${productsData.length} products in response.data`);
      } else if (response.data && 
                response.data.data && 
                Array.isArray(response.data.data)) {
        // Handle: { data: [...] }
        productsData = response.data.data;
        console.log(`Found ${productsData.length} products in response.data.data`);
      } else if (response.data && 
                response.data.products && 
                Array.isArray(response.data.products)) {
        // Handle: { products: [...] }
        productsData = response.data.products;
        console.log(`Found ${productsData.length} products in response.data.products`);
      } else {
        console.error('Unexpected API response structure:', response.data);
        if (response.data) {
          console.log('Response data structure:', {
            keys: Object.keys(response.data),
            hasData: 'data' in response.data,
            dataType: typeof response.data.data,
            dataKeys: response.data.data ? Object.keys(response.data.data) : 'no data.data',
            hasProducts: response.data.data && 'products' in response.data.data,
            productsType: response.data.data && typeof response.data.data.products,
            productsIsArray: response.data.data && Array.isArray(response.data.data.products)
          });
        }
        // Try to extract products even if the structure is unexpected
        if (response.data && response.data.data) {
          const data = response.data.data;
          if (Array.isArray(data)) {
            productsData = data;
            console.log('Extracted products from unexpected array structure');
          } else if (data.products && Array.isArray(data.products)) {
            productsData = data.products;
            console.log('Extracted products from unexpected products array');
          } else if (Array.isArray(data.data)) {
            productsData = data.data;
            console.log('Extracted products from data.data array');
          }
        }
        
        if (productsData.length === 0) {
          throw new Error('Could not extract products from response');
        }
      }
      
      // Process each product to ensure it matches our Product interface
      const products = productsData.map((product: any) => {
        try {
          // Log the raw product data for debugging
          console.log('Processing product:', {
            id: product.id,
            name: product.name,
            hasImage: !!product.image_url,
            sellerId: product.seller_id || product.sellerId
          });
          
          // Transform the product data to match Product interface
          const transformed: Product = {
            id: String(product.id),
            name: String(product.name || 'Unnamed Product'),
            description: String(product.description || ''),
            price: Number(product.price) || 0,
            image_url: product.image_url || product.image || '', // Handle both image_url and image
            sellerId: String(product.seller_id || product.sellerId || sellerId || 'unknown'),
            isSold: Boolean(product.isSold || product.soldAt || false),
            status: product.status || (product.soldAt ? 'sold' : 'available'),
            soldAt: product.soldAt || null,
            createdAt: product.created_at || product.createdAt || new Date().toISOString(),
            updatedAt: product.updated_at || product.updatedAt || new Date().toISOString(),
            aesthetic: product.aesthetic || 'noir'
          };
          
          return transformed;
        } catch (error: any) {
          console.error('Error processing product:', {
            product,
            error: error.message
          });
          
          // Return a minimal valid product to prevent breaking the UI
          const errorProduct: Product = {
            id: String(product?.id || 'error-' + Math.random().toString(36).substr(2, 9)),
            name: 'Error loading product',
            description: 'There was an error loading this product',
            price: 0,
            image_url: '',
            status: 'available',
            sellerId: String(sellerId || 'unknown'),
            isSold: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            aesthetic: 'noir'
          };
          return errorProduct;
        }
      });
      
      console.log(`Successfully processed ${products.length} products`);
      return products;
    } catch (error) {
      console.error('Error in getProducts:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
  },

  getProduct: async (id: string): Promise<Product> => {
    const response = await api.get(`/sellers/products/${id}`);
    const productData = response.data?.data?.product || response.data?.data || response.data;
    
    if (!productData) {
      throw new Error('No product data received from server');
    }
    
    return {
      id: String(productData.id),
      name: String(productData.name || ''),
      description: String(productData.description || ''),
      price: Number(productData.price) || 0,
      image_url: productData.image_url || productData.image || '',
      aesthetic: productData.aesthetic || 'noir',
      sellerId: String(productData.sellerId || productData.seller_id || ''),
      isSold: Boolean(productData.isSold || productData.soldAt || false),
      status: productData.status || (productData.soldAt ? 'sold' : 'available'),
      soldAt: productData.soldAt || null,
      createdAt: productData.createdAt || productData.created_at || new Date().toISOString(),
      updatedAt: productData.updatedAt || productData.updated_at || new Date().toISOString()
    };
  },

  updateProduct: async (id: string, updates: Partial<Product>): Promise<Product> => {
    try {
      const response = await api.patch(`/sellers/products/${id}`, updates);
      const productData = response.data?.data?.product || response.data?.data || response.data;
      
      if (!productData) {
        throw new Error('No product data received from server');
      }
      
      return {
        id: productData.id,
        name: productData.name,
        description: productData.description,
        price: productData.price,
        image_url: productData.image_url,
        aesthetic: productData.aesthetic,
        sellerId: productData.sellerId || productData.seller_id,
        isSold: Boolean(productData.isSold || productData.soldAt),
        status: productData.status || (productData.soldAt ? 'sold' : 'available'),
        soldAt: productData.soldAt || null,
        createdAt: productData.createdAt || productData.created_at,
        updatedAt: productData.updatedAt || productData.updated_at
      };
    } catch (error) {
      console.error('Error updating product:', {
        productId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
        response: error.response?.data || 'No response data',
        url: error.config?.url || 'No URL'
      });
      throw error;
    }
  },

  deleteProduct: async (id: string): Promise<void> => {
    await api.delete(`/sellers/products/${id}`);
  },

  // Get seller profile
  getProfile: async (): Promise<Seller> => {
    try {
      console.log('Fetching seller profile...');
      const response = await api.get('/sellers/profile');
      
      console.log('Profile API Response:', {
        status: response.status,
        hasData: !!response.data,
        dataStructure: response.data ? Object.keys(response.data) : 'no data'
      });
      
      // Handle different response structures
      let sellerData;
      
      // Handle the actual response structure we're seeing: { status: 'success', data: { seller: {...} } }
      if (response.data && response.data.data && response.data.data.seller) {
        sellerData = response.data.data.seller;
      } else {
        // Fallback to direct response data if structure is different
        sellerData = response.data;
      }
      
      // Ensure required fields are present
      if (!sellerData || !sellerData.id || !sellerData.email) {
        console.error('Incomplete seller data:', sellerData);
        throw new Error('Incomplete seller data received from server');
      }
      
      // Transform to match Seller interface
      const seller: Seller = {
      };
    } catch (error) {
      console.error('Error fetching seller profile:', error);
      throw error;
    }
  },

  // Update order status
  updateOrderStatus: async (orderId: string, data: { status: string }): Promise<Order> => {
    try {
      const response = await sellerApiInstance.patch(`/orders/${orderId}/status`, data);
      return response.data;
    } catch (error) {
      console.error(`Error updating order ${orderId} status:`, error);
      throw error;
    }
  },

  // Get all orders for the logged-in seller
  getOrders: async (): Promise<Order[]> => {
    try {
      const response = await sellerApiInstance.get('/sellers/orders');
      return response.data.orders || [];
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  },

  // Get seller by ID
  getSellerById: async (id: string | number): Promise<Seller> => {
    try {
      const response = await sellerApiInstance.get(`/sellers/${id}`);
      const seller = response.data.data?.seller || response.data.data || response.data;
      
      // Ensure consistent property names
      return {
        ...seller,
        fullName: seller.full_name || seller.fullName,
        createdAt: seller.created_at || seller.createdAt,
        updatedAt: seller.updated_at || seller.updatedAt
      };
          phone: profile.phone || '',
          createdAt: profile.createdAt || profile.created_at || new Date().toISOString(),
          updatedAt: profile.updatedAt || profile.updated_at || new Date().toISOString()
        };
      }
      
      // Use the profile endpoint for the current user's ID
      if (id === 'profile' || id === 'me' || id === 'current') {
        const profile = await sellerApi.getProfile();
        return {
          id: profile.id,
          fullName: profile.fullName || profile.full_name || `Seller ${profile.id}`,
          email: profile.email || '',
          phone: profile.phone || '',
          createdAt: profile.createdAt || profile.created_at || new Date().toISOString(),
          updatedAt: profile.updatedAt || profile.updated_at || new Date().toISOString()
        };
      }
      
      // For numeric IDs, try to get the seller by ID
      if (typeof id === 'number' || !isNaN(Number(id))) {
        try {
          const response = await api.get(`/sellers/${id}`);
          console.log('Seller API response:', response);
          
          // The backend might return the seller in different formats
          const sellerData = response.data?.data || response.data;
          
          if (!sellerData) {
            console.warn('No seller data received from server, using fallback');
            throw new Error('No seller data received from server');
          }
          
          console.log('Processed seller data:', sellerData);
          
          return {
            id: sellerData.id,
            fullName: sellerData.fullName || sellerData.full_name || `Seller ${id}`,
            email: sellerData.email || '',
            phone: sellerData.phone || '',
            createdAt: sellerData.createdAt || sellerData.created_at || new Date().toISOString(),
            updatedAt: sellerData.updatedAt || sellerData.updated_at || new Date().toISOString()
          };
        } catch (apiError) {
          console.warn('Failed to fetch seller by ID, falling back to profile', {
            id,
            error: apiError.message
          });
          // Fall through to profile endpoint
        }
      }
      
      // If we get here, try to get the current profile as a fallback
      try {
        const profile = await sellerApi.getProfile();
        return {
          id: profile.id,
          fullName: profile.fullName || profile.full_name || `Seller ${profile.id}`,
          email: profile.email || '',
          phone: profile.phone || '',
          createdAt: profile.createdAt || profile.created_at || new Date().toISOString(),
          updatedAt: profile.updatedAt || profile.updated_at || new Date().toISOString()
        };
      } catch (profileError) {
        console.error('Failed to fetch seller profile:', profileError);
        throw new Error('Failed to fetch seller information');
      }
    } catch (error) {
      console.error('Error in getSellerById:', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
        response: error.response?.data || 'No response data',
        url: error.config?.url || 'No URL'
      });
      
      // Return a default seller object instead of throwing to prevent UI errors
      return {
        id: Number(id) || 0,
        fullName: `Seller ${id || 'Unknown'}`,
        email: '',
        phone: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  },
  

};
