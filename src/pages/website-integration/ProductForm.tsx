import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShoppingBag, X, ArrowLeft, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import {
  getPrinter,
  getProductById,
  saveProduct,
  saveVariants,
  fetchShopifyVariants,
  Printer,
  ProductWithVariants,
} from "@/services/printerService";
import { formatPrice } from "@/types/publicBuilder";
import { FormSkeleton } from "@/components/Skeletons";

interface Variant {
  id?: string;
  shopify_variant_id: string;
  variant_name: string;
  size_value: number;
  price: number | null;
  cart_url?: string;
}

const ProductForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const isEditMode = productId && productId !== "new";

  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingVariants, setIsFetchingVariants] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [printer, setPrinter] = useState<Printer | null>(null);
  const [existingProduct, setExistingProduct] = useState<ProductWithVariants | null>(null);
  const [copied, setCopied] = useState(false);

  // Form State
  const [shopifyProductUrl, setShopifyProductUrl] = useState("");
  const [productName, setProductName] = useState("");
  const [productSlug, setProductSlug] = useState("");
  const [sizeUnit, setSizeUnit] = useState<"mm" | "cm" | "inch" | "feet" | "meter">("inch");
  const [sheetWidthInches, setSheetWidthInches] = useState<number>(22);
  const [variants, setVariants] = useState<Variant[]>([]);

  // Computed builder URL
  const builderUrl = printer?.slug && productSlug
    ? `builder.dtflayout.com/${printer.slug}/${productSlug}`
    : printer?.slug
    ? `builder.dtflayout.com/${printer.slug}/your-product-slug`
    : "builder.dtflayout.com/your-store/your-product-slug";

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Load printer
        const printerResult = await getPrinter(user.id);
        if (!printerResult.success || !printerResult.data) {
          toast.error("Please set up your store first");
          navigate("/app/website-integration/store-setup");
          return;
        }
        setPrinter(printerResult.data);

        // If editing, load existing product
        if (isEditMode && productId) {
          const productResult = await getProductById(productId);
          if (productResult.success && productResult.data) {
            const product = productResult.data;
            setExistingProduct(product);
            setShopifyProductUrl(product.shopify_product_url || "");
            setProductName(product.product_name || "");
            setProductSlug(product.product_slug || "");
            setSizeUnit((product.size_unit as "mm" | "cm" | "inch" | "feet" | "meter") || "inch");
            setSheetWidthInches(product.sheet_width_inches || 22);
            
            // Map variants
            const mappedVariants: Variant[] = product.variants.map((v) => ({
              id: v.id,
              shopify_variant_id: v.shopify_variant_id,
              variant_name: v.variant_name || "",
              size_value: v.size_value,
              price: v.price,
              cart_url: v.cart_url || undefined,
            }));
            setVariants(mappedVariants);
          } else {
            toast.error("Product not found");
            navigate("/app/website-integration/products");
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, productId, isEditMode, navigate]);

  // Auto-generate slug from product name
  useEffect(() => {
    if (!isEditMode && productName && !existingProduct) {
      const generatedSlug = productName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphen
        .replace(/-+/g, "-") // Replace multiple hyphens with single
        .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
        .substring(0, 50); // Max 50 characters
      setProductSlug(generatedSlug);
    }
  }, [productName, isEditMode, existingProduct]);

  const handleFetchVariants = async () => {
    if (!shopifyProductUrl.trim()) {
      toast.error("Please enter a Shopify product URL");
      return;
    }

    if (!shopifyProductUrl.includes("/products/")) {
      toast.error("Invalid Shopify product URL. Must contain /products/");
      return;
    }

    setIsFetchingVariants(true);
    try {
      const result = await fetchShopifyVariants(shopifyProductUrl.trim());

      if (result.success && result.variants) {
        // Preserve existing size mappings when refreshing
        const existingMappings = new Map(
          variants.map((v) => [v.shopify_variant_id, v.size_value])
        );

        const mappedVariants: Variant[] = result.variants.map((v) => ({
          shopify_variant_id: v.id,
          variant_name: v.title,
          size_value: existingMappings.get(v.id) || 0,
          price: parseFloat(v.price) || null,
        }));

        setVariants(mappedVariants);
        if (result.productName) {
          setProductName(result.productName);
        }
        toast.success(`Fetched ${mappedVariants.length} variant(s) successfully!`);
      } else {
        toast.error(result.error || "Failed to fetch variants");
      }
    } catch (error) {
      toast.error("Failed to fetch variants");
      console.error("Error fetching variants:", error);
    } finally {
      setIsFetchingVariants(false);
    }
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleSizeValueChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const updatedVariants = [...variants];
    updatedVariants[index].size_value = numValue;
    setVariants(updatedVariants);
  };

  const handleSave = async () => {
    if (!printer?.id) {
      toast.error("Printer not found");
      return;
    }

    if (!shopifyProductUrl.trim()) {
      toast.error("Please enter a Shopify product URL");
      return;
    }

    if (!productSlug.trim()) {
      toast.error("Please enter a product slug");
      return;
    }

    // Validate slug format
    const cleanedSlug = productSlug.trim().replace(/^-+|-+$/g, "");
    if (cleanedSlug !== productSlug) {
      setProductSlug(cleanedSlug);
      toast.error("Product slug cannot start or end with hyphens");
      return;
    }

    if (productSlug.length < 2) {
      toast.error("Product slug must be at least 2 characters");
      return;
    }

    if (variants.length === 0) {
      toast.error("Please fetch variants first");
      return;
    }

    // Check if all variants have size values
    const missingValues = variants.filter((v) => !v.size_value || v.size_value <= 0);
    if (missingValues.length > 0) {
      toast.error(`Please enter size values for all variants (${missingValues.length} missing)`);
      return;
    }

    setIsSaving(true);
    try {
      // Save product
      const productResult = await saveProduct(printer.id, {
        shopifyProductUrl: shopifyProductUrl.trim(),
        productName: productName.trim(),
        productSlug: productSlug.trim(),
        sizeUnit,
        sheetWidthInches,
      }, existingProduct?.id);

      if (!productResult.success || !productResult.data) {
        toast.error(productResult.error || "Failed to save product");
        return;
      }

      // Save variants
      const variantsData = variants.map((v) => ({
        shopifyVariantId: v.shopify_variant_id,
        variantName: v.variant_name,
        sizeValue: v.size_value,
        price: v.price || undefined,
        cartUrl: v.cart_url,
      }));

      const variantsResult = await saveVariants(productResult.data.id, variantsData);

      if (variantsResult.success) {
        toast.success(isEditMode ? "Product updated successfully!" : "Product saved successfully!");
        navigate("/app/website-integration/products");
      } else {
        toast.error(variantsResult.error || "Failed to save variants");
      }
    } catch (error) {
      toast.error("Failed to save product");
      console.error("Error saving product:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(`https://${builderUrl}`);
      setCopied(true);
      toast.success("Builder URL copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy URL");
    }
  };

  if (isLoading) {
    return <FormSkeleton fields={6} />;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/app/website-integration/products">Products</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {isEditMode ? existingProduct?.product_name || "Edit Product" : "Add Product"}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-lg">
                {isEditMode ? "Edit Product" : "Add New Product"}
              </CardTitle>
            </div>
            <CardDescription>
              Connect your Shopify product and configure size variants for the builder
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Shopify Product URL */}
            <div className="space-y-2">
              <Label htmlFor="shopify-url">Shopify Product URL</Label>
              <div className="flex gap-2">
                <Input
                  id="shopify-url"
                  type="url"
                  placeholder="https://yourstore.com/products/custom-dtf-print"
                  value={shopifyProductUrl}
                  onChange={(e) => setShopifyProductUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleFetchVariants}
                  disabled={isFetchingVariants}
                  variant="outline"
                >
                  {isFetchingVariants ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Fetch Variants"
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste the full URL of your Shopify product page
              </p>
            </div>

            {/* Product Name & Slug */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-name">Product Name</Label>
                <Input
                  id="product-name"
                  placeholder="e.g., Premium DTF Gang Sheet"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-slug">Product Slug</Label>
                <Input
                  id="product-slug"
                  placeholder="e.g., premium-dtf"
                  value={productSlug}
                  onChange={(e) => {
                    // Only allow lowercase letters, numbers, and hyphens
                    // Remove any invalid characters and prevent consecutive hyphens
                    const cleaned = e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "")
                      .replace(/-+/g, "-") // Replace multiple hyphens with single
                      .replace(/^-/, ""); // Remove leading hyphen
                    setProductSlug(cleaned);
                  }}
                  onBlur={(e) => {
                    // Remove trailing hyphen on blur
                    setProductSlug(e.target.value.replace(/-$/, ""));
                  }}
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">
                  Only lowercase letters (a-z), numbers (0-9), and hyphens (-) allowed. Max 50 characters.
                </p>
              </div>
            </div>

            {/* Builder URL Preview */}
            <div className="rounded-lg border bg-gray-50 p-4 space-y-2">
              <Label className="text-sm font-medium">Builder URL for this Product</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-white border px-3 py-2 text-sm font-mono text-indigo-600 truncate">
                  https://{builderUrl}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyUrl}
                  disabled={!productSlug || !printer?.slug}
                  title="Copy URL"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-indigo-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Size Unit */}
            <div className="space-y-2">
              <Label htmlFor="size-unit">Size Unit</Label>
              <Select
                value={sizeUnit}
                onValueChange={(value: "mm" | "cm" | "inch" | "feet" | "meter") =>
                  setSizeUnit(value)
                }
              >
                <SelectTrigger id="size-unit" className="w-48">
                  <SelectValue placeholder="Select size unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mm">Millimeters (mm)</SelectItem>
                  <SelectItem value="cm">Centimeters (cm)</SelectItem>
                  <SelectItem value="inch">Inches (inch)</SelectItem>
                  <SelectItem value="feet">Feet (feet)</SelectItem>
                  <SelectItem value="meter">Meters (meter)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This unit applies to all size values below
              </p>
            </div>

            {/* Sheet Width */}
            <div className="space-y-2">
              <Label htmlFor="sheet-width">Sheet Width</Label>
              <Select
                value={sheetWidthInches.toString()}
                onValueChange={(value) => setSheetWidthInches(parseFloat(value))}
              >
                <SelectTrigger id="sheet-width" className="w-48">
                  <SelectValue placeholder="Select sheet width" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10.5">10.5 inches</SelectItem>
                  <SelectItem value="11">11 inches</SelectItem>
                  <SelectItem value="11.5">11.5 inches</SelectItem>
                  <SelectItem value="22">22 inches</SelectItem>
                  <SelectItem value="22.5">22.5 inches</SelectItem>
                  <SelectItem value="23">23 inches</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The fixed sheet width for this product in the public builder
              </p>
            </div>

            {/* Variants Table */}
            <div className="space-y-2">
              <Label>Product Variants</Label>
              {variants.length === 0 ? (
                <div className="border rounded-lg p-8 text-center bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    No variants fetched yet. Paste your Shopify product URL and click "Fetch Variants".
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left py-3 px-4 font-medium">Variant Name</th>
                          <th className="text-left py-3 px-4 font-medium">
                            Size Value ({sizeUnit})
                          </th>
                          <th className="text-right py-3 px-4 font-medium">Price</th>
                          <th className="text-right py-3 px-4 font-medium w-16">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {variants.map((variant, index) => (
                          <tr key={variant.shopify_variant_id || index}>
                            <td className="py-3 px-4">
                              <span className="font-medium">{variant.variant_name || "-"}</span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={variant.size_value || ""}
                                  onChange={(e) => handleSizeValueChange(index, e.target.value)}
                                  placeholder="Enter size"
                                  className="w-24"
                                />
                                <span className="text-muted-foreground text-xs">{sizeUnit}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {variant.price !== null 
                                ? formatPrice(variant.price, printer?.currency || "USD")
                                : "-"}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveVariant(index)}
                                className="text-destructive hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button onClick={handleSave} disabled={isSaving || variants.length === 0}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isEditMode ? (
                  "Update Product"
                ) : (
                  "Save Product"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/app/website-integration/products")}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProductForm;
