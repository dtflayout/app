import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  Loader2,
  Plus,
  Package,
  ExternalLink,
  Pencil,
  Trash2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getPrinter,
  getProducts,
  deleteProduct,
  ProductWithVariants,
} from "@/services/printerService";
import { ProductGridSkeleton } from "@/components/Skeletons";

let _productsLoaded = false;

const Products = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(!_productsLoaded);
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [printerId, setPrinterId] = useState<string | null>(null);
  const [hasStore, setHasStore] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductWithVariants | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load products
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      if (!_productsLoaded) setIsLoading(true);
      try {
        // First get printer to check if store is set up
        const printerResult = await getPrinter(user.id);
        if (!printerResult.success || !printerResult.data) {
          setHasStore(false);
          setIsLoading(false);
          return;
        }

        setHasStore(true);
        setPrinterId(printerResult.data.id);

        // Then get products
        const productsResult = await getProducts(printerResult.data.id);
        if (productsResult.success && productsResult.data) {
          setProducts(productsResult.data);
        }
      } catch (error) {
        console.error("Error loading products:", error);
        if (!_productsLoaded) toast.error("Failed to load products");
      } finally {
        _productsLoaded = true;
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handleAddProduct = () => {
    navigate("/app/website-integration/products/new");
  };

  const handleEditProduct = (productId: string) => {
    navigate(`/app/website-integration/products/${productId}`);
  };

  const handleDeleteClick = (product: ProductWithVariants) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteProduct(productToDelete.id);
      if (result.success) {
        setProducts(products.filter((p) => p.id !== productToDelete.id));
        toast.success("Product deleted successfully");
      } else {
        toast.error(result.error || "Failed to delete product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const truncateUrl = (url: string, maxLength: number = 50) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + "...";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return <ProductGridSkeleton count={4} />;
  }

  // Show message if store is not set up
  if (!hasStore) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
            <h3 className="font-heading text-lg font-bold text-gray-900 mb-2">
              Store Setup Required
            </h3>
            <p className="text-gray-600 mb-4">
              Please complete your store setup before adding products.
            </p>
            <Button onClick={() => navigate("/app/website-integration/store-setup")}>
              Go to Store Setup
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show empty state
  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="font-heading text-lg font-bold text-gray-900 mb-2">
              No Products Configured
            </h3>
            <p className="text-gray-600 mb-4">
              Add your first product to let customers design on your website.
            </p>
            <Button onClick={handleAddProduct}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-bold text-gray-900">Your Products</h2>
          <p className="text-sm text-gray-600">
            {products.length} product{products.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <Button onClick={handleAddProduct}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Products List */}
      <div className="grid gap-4">
        {products.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="rounded-lg bg-indigo-100 p-2.5 flex-shrink-0">
                    <Package className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {product.product_name || "Unnamed Product"}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                      <a
                        href={product.shopify_product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-indigo-600 truncate max-w-[300px]"
                      >
                        {truncateUrl(product.shopify_product_url)}
                      </a>
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium">
                        {product.variants?.length || 0} variants
                      </span>
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize">
                        {product.size_unit}
                      </span>
                      {product.product_slug && (
                        <span className="inline-flex items-center rounded-full bg-indigo-100 text-indigo-700 px-2.5 py-0.5 text-xs font-medium font-mono">
                          /{product.product_slug}
                        </span>
                      )}
                      <span className="text-gray-400">
                        Added {formatDate(product.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditProduct(product.id)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(product)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{productToDelete?.product_name || "this product"}"?
              This will also delete all {productToDelete?.variants?.length || 0} variant configurations.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Products;
