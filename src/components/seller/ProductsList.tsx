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
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <Card key={product.id} className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{product.name}</CardTitle>
            <Badge
              variant={
                product.status === 'active' ? 'default' :
                product.status === 'out-of-stock' ? 'destructive' :
                'secondary'
              }
            >
              {product.status?.toUpperCase() || 'ACTIVE'}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="aspect-square bg-gray-100 rounded-md overflow-hidden relative">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <EyeOff className="h-12 w-12 text-gray-400" />
                  <AlertDialog
                    open={statusUpdateState.productId === product.id && statusUpdateState.isDialogOpen}
                    onOpenChange={(open) => {
                      if (!open) {
                        setStatusUpdateState((prev) => ({
                          ...prev,
                          isDialogOpen: false,
                          isUpdating: false,
                        }));
                      }
                    }}
                  >
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {statusUpdateState.willBeSold
                            ? 'Mark Product as Sold'
                            : 'Make Product Available'}
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
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this product?')) {
                        onDelete(product.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-col space-y-1">
                <p className="text-sm text-gray-500">Aesthetic: {product.aesthetic}</p>
                <p className="text-sm text-gray-500">Price: {formatCurrency(product.price)}</p>
                <Badge
                  variant={product.isSold ? 'destructive' : 'default'}
                  className={cn(
                    'text-sm font-medium',
                    product.isSold ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  )}
                >
                  {product.isSold ? 'Sold' : 'Available'}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block rounded-lg border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/3">Product</TableHead>
              <TableHead className="w-1/4">Aesthetic</TableHead>
              <TableHead className="w-1/4">Price</TableHead>
              <TableHead className="w-1/4">Status</TableHead>
              <TableHead className="w-1/4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.aesthetic}</TableCell>
                <TableCell>{formatCurrency(product.price)}</TableCell>
                <TableCell>
                  <Badge
                    variant={product.isSold ? 'destructive' : 'default'}
                    className={cn(
                      'text-sm font-medium',
                      product.isSold ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    )}
                  >
                    {product.isSold ? 'Sold' : 'Available'}
                  </Badge>
                </TableCell>
                <TableCell className="space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onEdit(product.id)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => confirmStatusUpdate(product.id, product.isSold)}
                  >
                    {product.isSold ? (
                      <Undo2 className="h-4 w-4" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                  </Button>
                  <AlertDialog
                    open={statusUpdateState.productId === product.id && statusUpdateState.isDialogOpen}
                    onOpenChange={(open) => {
                      if (!open) {
                        setStatusUpdateState((prev) => ({
                          ...prev,
                          isDialogOpen: false,
                          isUpdating: false,
                        }));
                      }
                    }}
                  >
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {statusUpdateState.willBeSold
                            ? 'Mark Product as Sold'
                            : 'Make Product Available'}
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
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this product?')) {
                        onDelete(product.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default ProductsList;
