import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
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
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Store, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import {
  getPrinter,
  savePrinter,
  getProduct,
  saveProduct,
  saveVariants,
  fetchShopifyVariants,
  Printer,
  ProductWithVariants,
} from "@/services/printerService";
import { FormSkeleton } from "@/components/Skeletons";

interface Variant {
  id?: string;
  shopify_variant_id: string;
  variant_name: string;
  size_value: number;
  price: number | null;
  cart_url?: string;
}

const WebsiteIntegration = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [isFetchingVariants, setIsFetchingVariants] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [printer, setPrinter] = useState<Printer | null>(null);
  const [product, setProduct] = useState<ProductWithVariants | null>(null);
  const [productName, setProductName] = useState<string>("");

  // Store Setup Form State
  const [storeName, setStoreName] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [isStoreSaved, setIsStoreSaved] = useState(false);

  // Product Setup Form State
  const [shopifyProductUrl, setShopifyProductUrl] = useState("");
  const [sizeUnit, setSizeUnit] = useState<"mm" | "cm" | "inch" | "feet" | "meter">("inch");
  const [variants, setVariants] = useState<Variant[]>([]);

  // Load existing data on page load
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
        if (printerResult.success && printerResult.data) {
          const printerData = printerResult.data;
          setPrinter(printerData);
          setStoreName(printerData.store_name || "");
          setStoreUrl(printerData.store_url || "");
          setSlug(printerData.slug || "");
          setIsStoreSaved(true);

          // Load product if printer exists
          const productResult = await getProduct(printerData.id);
          if (productResult.success && productResult.data) {
            const productData = productResult.data;
            setProduct(productData);
            setShopifyProductUrl(productData.shopify_product_url || "");
            setSizeUnit(
              (productData.size_unit as "mm" | "cm" | "inch" | "feet" | "meter") || "inch"
            );
            // Map variants to the format expected by the UI
            const mappedVariants: Variant[] = productData.variants.map((v) => ({
              id: v.id,
              shopify_variant_id: v.shopify_variant_id,
              variant_name: v.variant_name || "",
              size_value: v.size_value,
              price: v.price,
              cart_url: v.cart_url || undefined,
            }));
            setVariants(mappedVariants);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load existing data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handleSaveStore = async () => {
    if (!user?.id) {
      toast.error("Please log in to save store setup");
      return;
    }

    if (!storeName.trim() || !storeUrl.trim() || !slug.trim()) {
      toast.error("Please fill in all store fields");
      return;
    }

    setIsSavingStore(true);
    try {
      const result = await savePrinter(user.id, {
        storeName: storeName.trim(),
        storeUrl: storeUrl.trim(),
        slug: slug.trim(),
      });

      if (result.success && result.data) {
        setPrinter(result.data);
        setIsStoreSaved(true);
        toast.success("Store setup saved successfully!");

        // Load product if it exists
        const productResult = await getProduct(result.data.id);
        if (productResult.success && productResult.data) {
          const productData = productResult.data;
          setProduct(productData);
          setShopifyProductUrl(productData.shopify_product_url || "");
          setSizeUnit(
            (productData.size_unit as "mm" | "cm" | "inch" | "feet" | "meter") || "inch"
          );
          const mappedVariants: Variant[] = productData.variants.map((v) => ({
            id: v.id,
            shopify_variant_id: v.shopify_variant_id,
            variant_name: v.variant_name || "",
            size_value: v.size_value,
            price: v.price,
            cart_url: v.cart_url || undefined,
          }));
          setVariants(mappedVariants);
        }
      } else {
        toast.error(result.error || "Failed to save store setup");
      }
    } catch (error) {
      toast.error("Failed to save store setup");
      console.error("Error saving store:", error);
    } finally {
      setIsSavingStore(false);
    }
  };

  const handleFetchVariants = async () => {
    if (!shopifyProductUrl.trim()) {
      toast.error("Please enter a Shopify product URL");
      return;
    }

    // Validate URL contains /products/
    if (!shopifyProductUrl.includes("/products/")) {
      toast.error("Invalid Shopify product URL. Must contain /products/");
      return;
    }

    setIsFetchingVariants(true);
    try {
      const result = await fetchShopifyVariants(shopifyProductUrl.trim());

      if (result.success && result.variants) {
        // Map fetched variants to our format
        const mappedVariants: Variant[] = result.variants.map((v) => ({
          shopify_variant_id: v.id,
          variant_name: v.title,
          size_value: 0, // User will enter this
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

  const handleSaveProduct = async () => {
    if (!printer?.id) {
      toast.error("Please save your store setup first");
      return;
    }

    if (!shopifyProductUrl.trim()) {
      toast.error("Please enter a Shopify product URL");
      return;
    }

    if (variants.length === 0) {
      toast.error("Please fetch variants first");
      return;
    }

    // Validate all variants have size values
    const invalidVariants = variants.filter((v) => v.size_value <= 0);
    if (invalidVariants.length > 0) {
      toast.error("Please enter size values for all variants");
      return;
    }

    setIsSavingProduct(true);
    try {
      // Extract product ID from URL if possible
      const urlParts = shopifyProductUrl.split("/products/");
      const productSlug = urlParts[1]?.split("?")[0]?.split("#")[0] || null;

      // Save product
      const productResult = await saveProduct(printer.id, {
        shopifyProductUrl: shopifyProductUrl.trim(),
        shopifyProductId: productSlug,
        productName: productName || null,
        sizeUnit: sizeUnit,
      });

      if (!productResult.success || !productResult.data) {
        toast.error(productResult.error || "Failed to save product");
        return;
      }

      // Save variants
      const variantsToSave = variants.map((v) => ({
        shopifyVariantId: v.shopify_variant_id,
        variantName: v.variant_name,
        sizeValue: v.size_value,
        price: v.price || undefined,
        cartUrl: v.cart_url,
      }));

      const variantsResult = await saveVariants(productResult.data.id, variantsToSave);

      if (variantsResult.success) {
        setProduct(productResult.data);
        toast.success("Product and variants saved successfully!");
      } else {
        toast.error(variantsResult.error || "Failed to save variants");
      }
    } catch (error) {
      toast.error("Failed to save product and variants");
      console.error("Error saving product:", error);
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Generate slug preview URL
  const builderUrl = slug
    ? `builder.dtflayout.com/${slug}`
    : "builder.dtflayout.com/your-slug";

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <FormSkeleton fields={5} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Website Integration</h1>
          <p className="text-gray-600">
            Connect your Shopify store and let customers design directly on your website
          </p>
        </div>

        {/* Section 1: Store Setup Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Store Setup</CardTitle>
            </div>
            <CardDescription>
              Configure your store information and generate your builder URL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store-name">Store Name</Label>
              <Input
                id="store-name"
                placeholder="e.g., Ninja Transfers"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="store-url">Store URL</Label>
              <Input
                id="store-url"
                type="url"
                placeholder="e.g., https://ninjatransfers.com"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                placeholder="e.g., ninjatransfers"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              />
              <p className="text-sm text-muted-foreground">
                Your builder URL: <span className="font-mono text-primary">{builderUrl}</span>
              </p>
            </div>

            <div className="pt-2">
              <Button onClick={handleSaveStore} disabled={isSavingStore}>
                {isSavingStore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Store Setup"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Shopify Product Setup Card */}
        <Card className={!isStoreSaved ? "opacity-60" : ""}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Shopify Product</CardTitle>
            </div>
            <CardDescription>
              Connect your Shopify product and configure size variants
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isStoreSaved && (
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Please save your store setup first to enable product configuration.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="shopify-url">Shopify Product URL</Label>
              <div className="flex gap-2">
                <Input
                  id="shopify-url"
                  type="url"
                  placeholder="https://yourstore.com/products/custom-dtf-print"
                  value={shopifyProductUrl}
                  onChange={(e) => setShopifyProductUrl(e.target.value)}
                  disabled={!isStoreSaved}
                  className="flex-1"
                />
                <Button
                  onClick={handleFetchVariants}
                  disabled={!isStoreSaved || isFetchingVariants}
                  variant="outline"
                >
                  {isFetchingVariants ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Fetch Variants"
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="size-unit">Size Unit</Label>
              <Select
                value={sizeUnit}
                onValueChange={(value: "mm" | "cm" | "inch" | "feet" | "meter") =>
                  setSizeUnit(value)
                }
                disabled={!isStoreSaved}
              >
                <SelectTrigger id="size-unit">
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
            </div>

            {/* Variants Table */}
            <div className="space-y-2">
              <Label>Product Variants</Label>
              {variants.length === 0 ? (
                <div className="border rounded-lg p-8 text-center bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    No variants fetched yet. Paste your Shopify product URL and click Fetch
                    Variants.
                  </p>
                </div>
              ) : (
                <>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left py-3 px-4 font-medium">Variant Name</th>
                            <th className="text-left py-3 px-4 font-medium">Size Value</th>
                            <th className="text-right py-3 px-4 font-medium">Price</th>
                            <th className="text-right py-3 px-4 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {variants.map((variant, index) => (
                            <tr key={variant.shopify_variant_id || index}>
                              <td className="py-3 px-4">{variant.variant_name || "-"}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={variant.size_value || ""}
                                    onChange={(e) =>
                                      handleSizeValueChange(index, e.target.value)
                                    }
                                    placeholder="Enter size"
                                    className="w-24"
                                    disabled={!isStoreSaved}
                                  />
                                  <span className="text-muted-foreground text-xs">
                                    {sizeUnit}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right">
                                {variant.price !== null
                                  ? `$${variant.price.toFixed(2)}`
                                  : "-"}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveVariant(index)}
                                  disabled={!isStoreSaved}
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
                  <div className="pt-2">
                    <Button
                      onClick={handleSaveProduct}
                      disabled={!isStoreSaved || isSavingProduct || variants.length === 0}
                    >
                      {isSavingProduct ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Product & Variants"
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default WebsiteIntegration;
