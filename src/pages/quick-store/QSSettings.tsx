import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { updateQuickStore, setStorePublished, deleteQuickStore } from '@/services/quickStoreService';
import { QuickStore } from '@/types/quickStore';
import { buildStoreUrl } from '@/hooks/useSubdomain';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, ExternalLink, Copy, Trash2, AlertTriangle, Palette, Bell } from 'lucide-react';

interface OutletContextType {
  store: QuickStore | null;
  setStore: (store: QuickStore | null) => void;
}

const QSSettings: React.FC = () => {
  const { store, setStore } = useOutletContext<OutletContextType>();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Color settings
  const [colorPrimary, setColorPrimary] = useState(store?.color_primary || '#4F46E5');
  const [colorSecondary, setColorSecondary] = useState(store?.color_secondary || '#3b82f6');
  const [colorBackground, setColorBackground] = useState(store?.color_background || '#ffffff');
  const [colorText, setColorText] = useState(store?.color_text || '#1f2937');

  const handleCopyUrl = () => {
    if (!store?.slug) return;
    const url = buildStoreUrl(store.slug);
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard!');
  };

  const handleSaveColors = async () => {
    if (!store?.id) return;

    setSaving(true);
    const result = await updateQuickStore(store.id, {
      color_primary: colorPrimary,
      color_secondary: colorSecondary,
      color_background: colorBackground,
      color_text: colorText,
    });

    if (result.success && result.data) {
      setStore(result.data);
      toast.success('Colors saved!');
    } else {
      toast.error(result.error || 'Failed to save');
    }
    setSaving(false);
  };

  const handlePublishToggle = async (publish: boolean) => {
    if (!store?.id) return;

    const result = await setStorePublished(store.id, publish);
    if (result.success) {
      setStore({ ...store, is_published: publish });
      toast.success(publish ? 'Store published!' : 'Store unpublished');
    } else {
      toast.error(result.error || 'Failed to update');
    }
  };

  const handleDelete = async () => {
    if (!store?.id || deleteConfirmText !== store.slug) {
      toast.error('Please type your store URL to confirm');
      return;
    }

    setDeleting(true);
    const result = await deleteQuickStore(store.id);

    if (result.success) {
      toast.success('Store deleted');
      setStore(null);
      navigate('/app/quick-store/setup');
    } else {
      toast.error(result.error || 'Failed to delete');
    }
    setDeleting(false);
    setDeleteDialogOpen(false);
  };

  if (!store) {
    return (
      <div className="p-6 text-center text-gray-500">
        Please complete store setup first
      </div>
    );
  }

  const storeUrl = buildStoreUrl(store.slug);

  return (
    <div className="space-y-6">
      {/* Store URL */}
      <Card>
          <CardHeader>
            <CardTitle>Store URL</CardTitle>
            <CardDescription>Share this link with your customers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                value={storeUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button variant="outline" onClick={handleCopyUrl}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button variant="outline" onClick={() => window.open(storeUrl, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Publish Status */}
        <Card>
          <CardHeader>
            <CardTitle>Publish Status</CardTitle>
            <CardDescription>Control your store's visibility</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {store.is_published ? '🟢 Store is Live' : '⚪ Store is Draft'}
                </p>
                <p className="text-sm text-gray-500">
                  {store.is_published
                    ? 'Customers can access your store at the URL above'
                    : 'Only you can see your store (in preview mode)'}
                </p>
              </div>
              <Switch
                checked={store.is_published}
                onCheckedChange={handlePublishToggle}
              />
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Brand Colors
            </CardTitle>
            <CardDescription>Customize your store's appearance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colorPrimary}
                    onChange={(e) => setColorPrimary(e.target.value)}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={colorPrimary}
                    onChange={(e) => setColorPrimary(e.target.value)}
                    className="font-mono uppercase"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Secondary Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colorSecondary}
                    onChange={(e) => setColorSecondary(e.target.value)}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={colorSecondary}
                    onChange={(e) => setColorSecondary(e.target.value)}
                    className="font-mono uppercase"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Background Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colorBackground}
                    onChange={(e) => setColorBackground(e.target.value)}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={colorBackground}
                    onChange={(e) => setColorBackground(e.target.value)}
                    className="font-mono uppercase"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Text Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colorText}
                    onChange={(e) => setColorText(e.target.value)}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={colorText}
                    onChange={(e) => setColorText(e.target.value)}
                    className="font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div 
              className="border rounded-lg p-4 mt-4"
              style={{ backgroundColor: colorBackground, color: colorText }}
            >
              <p className="font-medium mb-2">Preview</p>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 rounded text-white text-sm"
                  style={{ backgroundColor: colorPrimary }}
                >
                  Primary Button
                </button>
                <button
                  className="px-4 py-2 rounded text-white text-sm"
                  style={{ backgroundColor: colorSecondary }}
                >
                  Secondary Button
                </button>
              </div>
            </div>

            <Button onClick={handleSaveColors} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Colors
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Store</p>
                <p className="text-sm text-gray-500">
                  Permanently delete your Quick Store and all its data
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Store
              </Button>
            </div>
          </CardContent>
        </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Quick Store</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your store,
              all products, orders, and analytics data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm">
              Please type <strong className="font-mono">{store.slug}</strong> to confirm:
            </p>
            <Input
              placeholder={store.slug}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || deleteConfirmText !== store.slug}
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Store
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QSSettings;
