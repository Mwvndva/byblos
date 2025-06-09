import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Plus, CheckCircle, XCircle, Loader2, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { aestheticCategories } from '../AestheticCategories';
import { sellerApi } from '@/api/sellerApi';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// No need to extend Product interface as it already has all required fields
type ExtendedProduct = Product;

interface ProductsListProps {
  products: ExtendedProduct[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onStatusUpdate?: (productId: string, status: 'available' | 'sold', soldAt: string | null) => void;
  onRefresh?: () => void;
}

function ProductsList({ products, onDelete, onEdit, onStatusUpdate, onRefresh }: ProductsListProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [statusUpdateState, setStatusUpdateState] = useState<{
    productId: string | null;
    isUpdating: boolean;
    isDialogOpen: boolean;
    willBeSold: boolean; // New status that will be set
    currentStatus: boolean; // Current status before change
    previousState: {
      isSold: boolean;
      soldAt: string | null;
    } | null;
  }>({
    productId: null,
    isUpdating: false,
    isDialogOpen: false,
    willBeSold: false,
    currentStatus: false,
    previousState: null,
  });



  // Handle status update with optimistic UI
  const handleStatusUpdate = useCallback(async () => {
    const { productId, willBeSold, previousState } = statusUpdateState;
    
    if (!productId || !previousState) {
      console.error('Missing required data for status update');
      return;
    }

    // Optimistically update the UI immediately
    const newStatus = willBeSold ? 'sold' : 'available';
    const soldAt = willBeSold ? new Date().toISOString() : null;
    
    // Close the dialog immediately
    setStatusUpdateState(prev => ({
      ...prev,
      isDialogOpen: false,
      isUpdating: true
    }));
    
    // Update the local state optimistically after dialog is closed
    onStatusUpdate?.(productId, newStatus, soldAt);

    // Force a refresh of the products list after a short delay
    setTimeout(() => {
      onRefresh?.();
    }, 500);

    try {
      // Make the API call
      await sellerApi.updateProduct(productId, {
        status: newStatus,
        soldAt
      });
      
      // Show success message
      const product = products.find(p => p.id === productId);
      if (product) {
        toast({
          title: `Product ${willBeSold ? 'Marked as Sold' : 'Marked as Available'}`,
          description: `"${product.name}" has been ${willBeSold ? 'marked as sold' : 'made available'}.`,
          action: (
            <Button 
              variant="outline"
              size="sm"
              onClick={async () => {
                // Revert the status if undo is clicked
                try {
                  await sellerApi.updateProduct(productId, {
                    status: previousState.isSold ? 'sold' : 'available',
                    soldAt: previousState.soldAt
                  });
                  onStatusUpdate?.(productId, previousState.isSold ? 'sold' : 'available', previousState.soldAt);
                } catch (error) {
                  console.error('Failed to undo status update:', error);
                  toast({
                    title: 'Error',
                    description: 'Failed to undo status update',
                    variant: 'destructive',
                  });
                }
              }}
            >
              <Undo2 className="h-4 w-4 mr-1" /> Undo
            </Button>
          ),
        });
      }
    } catch (error) {
      console.error('Failed to update product status:', error);
      
      // Revert the optimistic update on error
      onStatusUpdate?.(productId, previousState.isSold ? 'sold' : 'available', previousState.soldAt);
      
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update product status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setStatusUpdateState(prev => ({
        ...prev,
        isUpdating: false,
        isDialogOpen: false,
        productId: null,
        willBeSold: false,
        currentStatus: false,
        previousState: null,
      }));
    }
  }, [statusUpdateState, toast, products, onStatusUpdate]);

  // Open confirmation dialog
  const confirmStatusUpdate = (productId: string, isCurrentlySold: boolean) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // The action we're about to take is to mark as sold if not sold, or available if sold
    const willBeSold = !isCurrentlySold;
    
    setStatusUpdateState({
      productId,
      isUpdating: false,
      isDialogOpen: true,
      willBeSold,
      currentStatus: isCurrentlySold,
      previousState: {
        isSold: isCurrentlySold,
        soldAt: product.soldAt
      }
    });
  };

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Plus className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No products yet</h3>
        <p className="text-gray-500 mb-6">Get started by adding your first product</p>
        <Button onClick={() => navigate('/seller/add-product')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>
    );
  }



  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Your Products</h2>
        <Button onClick={() => navigate('/seller/add-product')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Aesthetic</TableHead>
            <TableHead>Price</TableHead>

            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow 
              key={product.id}
              className={cn(
                'relative',
                product.isSold && 'bg-gray-50 opacity-80 hover:bg-gray-50',
                statusUpdateState.isUpdating && statusUpdateState.productId === product.id && 'opacity-60'
              )}
            >
              <TableCell className="font-medium">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border relative">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className={cn(
                        'h-10 w-10 rounded object-cover',
                        product.isSold && 'opacity-70'
                      )}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWltYWdlIj48cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHg9IjMiIHk9IjMiIHJ4PSIyIiByeT0iMiIvPjxjaXJjbGUgY3g9IjguNSIgY3k9IjguNSIgcj0iMS41Ii8+PHBvbHlsaW5lIHBvaW50cz0iMjEgMTUgMTYgMTAgNSAyMSIvPjwvc3ZnPg==';
                        target.className = 'h-10 w-10 bg-gray-100 p-1 rounded';
                      }}
                    />
                    {product.isSold && (
                      <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                        <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                          SOLD
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <div className={cn("font-medium", product.isSold && 'text-gray-500')}>
                      {product.name}
                    </div>
                    <div className="text-sm text-gray-500 line-clamp-1">
                      {product.description}
                    </div>
                    {product.isSold && product.soldAt && (
                      <div className="text-xs text-gray-400 mt-1">
                        Sold on {new Date(product.soldAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {(() => {
                  const category = aestheticCategories.find(cat => cat.id === product.aesthetic);
                  return (
                    <Badge 
                      variant="outline" 
                      className={`${category?.color || 'bg-gray-100 text-gray-800'} border ${category?.accent || 'border-gray-300'}`}
                    >
                      {category?.title || product.aesthetic}
                    </Badge>
                  );
                })()}
              </TableCell>
              <TableCell className="relative">
                <div className="flex items-center">
                  <span className={cn(
                    product.isSold ? 'text-gray-400 line-through' : 'text-gray-900'
                  )}>
                    {formatCurrency(product.price)}
                  </span>
                  {product.isSold && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                      Sold
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  <Button
                    variant={product.isSold ? 'outline' : 'default'}
                    size="sm"
                    className={cn(
                      'min-w-[140px] transition-colors',
                      product.isSold 
                        ? 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200' 
                        : 'bg-amber-600 hover:bg-amber-700 text-white',
                      statusUpdateState.isUpdating && statusUpdateState.productId === product.id ? 'opacity-70' : ''
                    )}
                    onClick={() => confirmStatusUpdate(product.id, product.isSold)}
                    disabled={statusUpdateState.isUpdating && statusUpdateState.productId === product.id}
                  >
                    {statusUpdateState.isUpdating && statusUpdateState.productId === product.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        {product.isSold ? (
                          <CheckCircle className="h-4 w-4 mr-1.5" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-1.5" />
                        )}
                        {product.isSold ? 'Mark as Available' : 'Mark as Sold'}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/seller/products/${product.id}/edit`)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => onDelete(product.id)}
                    disabled={statusUpdateState.isUpdating && statusUpdateState.productId === product.id}
                  >
                    {statusUpdateState.isUpdating && statusUpdateState.productId === product.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
      </div>
      
      {/* Status Update Confirmation Dialog */}
      <AlertDialog
        open={statusUpdateState.isDialogOpen}
        onOpenChange={(open) => setStatusUpdateState(prev => ({ ...prev, isDialogOpen: open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {statusUpdateState.currentStatus ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-amber-500" />
              )}
              {statusUpdateState.currentStatus ? 'Mark as Available' : 'Mark as Sold'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="pt-2 space-y-2">
                <div>
                  Are you sure you want to mark this product as{' '}
                  <span className="font-semibold">
                    {statusUpdateState.willBeSold ? 'sold' : 'available'}
                  </span>?
                </div>
                {statusUpdateState.willBeSold ? (
                  <div className="text-muted-foreground text-sm">
                    This will mark the product as sold and it will no longer be available for purchase.
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    This will make the product available for purchase again.
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusUpdateState.isUpdating}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleStatusUpdate}
              disabled={statusUpdateState.isUpdating}
              className={statusUpdateState.willBeSold ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {statusUpdateState.isUpdating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : statusUpdateState.willBeSold ? (
                <XCircle className="h-4 w-4 mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ProductsList;
