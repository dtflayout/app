import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { getQSOrderById, updateQSOrderStatus, deleteQSOrder, formatTimeRemaining, formatDate as formatDateHelper } from '@/services/qsOrderService';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditsContext';
import { logSheetGeneration } from '@/lib/usageLogger';
import { logCreditTransaction } from '@/lib/creditLedgerService';
import { QuickStore, QSOrder, OrderStatus, formatPrice } from '@/types/quickStore';
import { getR2PublicUrl } from '@/lib/r2Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Download, CheckCircle, XCircle, Phone, Mail, MessageSquare, Clock, Package, User, FileText, CreditCard, AlertTriangle, Trash2 } from 'lucide-react';
import { OrderDetailSkeleton } from "@/components/Skeletons";
import { format } from 'date-fns';

interface OutletContextType { store: QuickStore | null; }

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-800' },
  downloaded: { label: 'Downloaded', color: 'bg-blue-100 text-blue-800' },
  expired: { label: 'Expired', color: 'bg-red-100 text-red-800' },
};

const QSOrderDetail: React.FC = () => {
  const { store } = useOutletContext<OutletContextType>();
  const navigate = useNavigate();
  const { orderId } = useParams();
  const { user } = useAuth();
  const { credits, deductCredits } = useCredits();

  const [order, setOrder] = useState<QSOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showPaidConfirm, setShowPaidConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) return;
      const result = await getQSOrderById(orderId);
      if (result.success && result.data) setOrder(result.data);
      else { toast.error('Order not found'); navigate('/app/quick-store/orders'); }
      setLoading(false);
    };
    loadOrder();
  }, [orderId, navigate]);

  const creditsNeeded = order ? Math.round(order.total_area_sq_inches) : 0;
  const hasEnoughCredits = credits >= creditsNeeded;
  const balanceAfterDeduction = credits - creditsNeeded;
  const isExpired = order ? new Date(order.expires_at) < new Date() : false;
  const effectiveStatus = isExpired ? 'expired' : order?.status || 'pending';

  // ─── Mark as Paid ──────────────────────────────────────────────────────────
  const handleMarkPaidClick = () => {
    if (!order) return;
    if (!hasEnoughCredits) { toast.error(`Insufficient credits. Need ${creditsNeeded}, have ${Math.round(credits)}`); return; }
    setShowPaidConfirm(true);
  };

  const handleConfirmMarkPaid = async () => {
    if (!order || !user) return;
    setShowPaidConfirm(false);
    setUpdatingStatus(true);
    try {
      const totalArea = order.total_area_sq_inches;
      const creditsBefore = credits;
      const deductResult = await deductCredits(totalArea, `Quick Store - ${order.order_code}`);
      if (!deductResult.success) { toast.error(deductResult.error || 'Failed to deduct credits'); setUpdatingStatus(false); return; }
      const newBalance = deductResult.newBalance ?? (creditsBefore - totalArea);

      await logSheetGeneration({ user_id: user.id, user_email: user.email || '', sq_inches_used: totalArea, sheet_width: order.sheets[0]?.width_inches || 0, sheet_height: order.sheets.reduce((sum, s) => sum + s.height_inches, 0), image_count: order.sheet_count, credits_before: creditsBefore, credits_after: newBalance, source: 'quick_store', design_code: order.order_code });
      await logCreditTransaction(user.id, user.email || '', 'usage', -totalArea, newBalance, `Quick Store - ${order.order_code}`, order.order_code);

      const updateResult = await updateQSOrderStatus(order.id, 'paid', totalArea);
      if (updateResult.success) {
        // Recalculate expires_at (10 days from now, matching service)
        const newExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
        setOrder({ ...order, status: 'paid', paid_at: new Date().toISOString(), credits_deducted: Math.round(totalArea), deducted_at: new Date().toISOString(), expires_at: newExpiry });
        toast.success(`${order.order_code} marked as paid — credits deducted`);
      } else toast.error(updateResult.error || 'Failed to update status');
    } catch { toast.error('Failed to mark as paid'); }
    setUpdatingStatus(false);
  };

  // ─── Download ──────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!order) return;
    setDownloading(true);
    try {
      for (const sheet of order.sheets) {
        const storagePath = sheet.storage_path || `orders/${store?.slug || 'unknown'}/${order.order_code}/sheet_${sheet.sheet_number}.png`;
        const publicUrl = getR2PublicUrl("design-files", storagePath);
        if (publicUrl) {
          try {
            const response = await fetch(publicUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a'); link.href = url; link.download = `${order.order_code}_sheet${sheet.sheet_number}_${Math.round(sheet.width_inches)}x${Math.round(sheet.height_inches)}in.png`;
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          } catch (err) { console.error(`Failed to download sheet ${sheet.sheet_number}:`, err); }
        }
      }
      if (order.status === 'paid') {
        await updateQSOrderStatus(order.id, 'downloaded');
        const newExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
        setOrder({ ...order, status: 'downloaded', downloaded_at: new Date().toISOString(), expires_at: newExpiry });
      }
      toast.success('Files downloaded!');
    } catch { toast.error('Failed to download'); }
    setDownloading(false);
  };

  // ─── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!order || !store) return;
    setUpdatingStatus(true);
    try {
      const result = await deleteQSOrder(order.id, store.slug, order.order_code);
      if (result.success) { toast.success('Order deleted'); navigate('/app/quick-store/orders'); }
      else toast.error(result.error || 'Failed to delete order');
    } catch { toast.error('Failed to delete order'); }
    setUpdatingStatus(false);
    setShowDeleteConfirm(false);
  };

  const handleWhatsApp = () => { if (!order?.customer_phone) return; window.open(`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`, '_blank'); };
  const handleCall = () => { if (!order?.customer_phone) return; window.open(`tel:${order.customer_phone}`, '_blank'); };

  if (loading) return <OrderDetailSkeleton />;
  if (!order || !store) return null;

  const config = statusConfig[effectiveStatus] || statusConfig.pending;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/quick-store/orders')}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-extrabold tracking-tight font-mono">{order.order_code}</h1>
            <Badge className={config.color}>{config.label}</Badge>
          </div>
          <p className="text-sm text-gray-500">Submitted {format(new Date(order.created_at), 'PPP p')}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><User className="h-5 w-5" />Customer</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="font-medium text-lg">{order.customer_name}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCall}><Phone className="h-4 w-4 mr-2" />{order.customer_phone}</Button>
                  <Button variant="outline" size="sm" onClick={handleWhatsApp}><MessageSquare className="h-4 w-4 mr-2" />WhatsApp</Button>
                </div>
                {order.customer_email && <div className="flex items-center gap-2 text-sm text-gray-600"><Mail className="h-4 w-4" />{order.customer_email}</div>}
                {order.customer_notes && <div className="mt-3 p-3 bg-gray-50 rounded-lg"><p className="text-sm font-medium text-gray-700 mb-1">Customer Notes:</p><p className="text-sm text-gray-600">{order.customer_notes}</p></div>}
              </div>
            </CardContent>
          </Card>

          {/* Sheet Previews */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Package className="h-5 w-5" />Sheets ({order.sheet_count})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.sheets.map((sheet, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex gap-4">
                      {sheet.preview_url && <img src={sheet.preview_url} alt={`Sheet ${sheet.sheet_number}`} className="w-32 h-32 object-contain border rounded" />}
                      <div>
                        <p className="font-medium">Sheet {sheet.sheet_number}</p>
                        <p className="text-sm text-gray-500">{sheet.width_inches}" × {Number(sheet.height_inches).toFixed(2)}"</p>
                        <p className="text-sm text-gray-500">{Math.round(sheet.area_sq_inches)} sq.inches</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5" />Order Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between"><span className="text-gray-600">Sheets</span><span>{order.sheet_count}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Total Area</span><span>{Math.round(order.total_area_sq_inches)} sq.in</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Total Length</span><span>{Math.round(order.total_length_inches)}"</span></div>
              <Separator />
              {order.show_pricing && order.calculated_price ? <div className="flex justify-between text-lg font-medium"><span>Customer Price</span><span>{formatPrice(order.calculated_price, order.currency)}</span></div> : <div className="text-sm text-gray-500 italic">Pricing hidden from customer</div>}
            </CardContent>
          </Card>

          {/* Auto-Delete Info */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className={`rounded-lg border p-4 ${effectiveStatus === "pending" ? "bg-amber-50 border-amber-200" : isExpired ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex items-start gap-3">
                  <Clock className={`h-5 w-5 mt-0.5 ${effectiveStatus === "pending" ? "text-amber-600" : isExpired ? "text-red-600" : "text-gray-500"}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Auto-Delete</p>
                    <p className="text-sm text-gray-600 mt-0.5">{formatDateHelper(order.expires_at)}</p>
                    <p className={`text-sm font-medium mt-1 ${isExpired ? "text-red-600" : effectiveStatus === "pending" ? "text-amber-600" : "text-gray-600"}`}>
                      {isExpired ? "Expired" : `${formatTimeRemaining(order.expires_at)} remaining`}
                    </p>
                    {effectiveStatus === "pending" && !isExpired && (
                      <p className="text-xs text-amber-700 mt-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Mark as paid to extend retention by 10 days</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credits Info */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CreditCard className="h-5 w-5" />Credits</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between"><span className="text-gray-600">Required</span><span className="font-medium">{creditsNeeded.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Your Balance</span><span className={hasEnoughCredits ? 'text-indigo-600' : 'text-red-600'}>{credits.toLocaleString()}</span></div>
              {order.credits_deducted && (
                <><Separator /><div className="flex justify-between text-sm text-green-700"><span>Deducted</span><span>{order.credits_deducted.toLocaleString()} sq.in</span></div>
                {order.deducted_at && <div className="text-xs text-gray-400">{format(new Date(order.deducted_at), 'PPP p')}</div>}</>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              {effectiveStatus === 'pending' && (
                <>
                  <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleMarkPaidClick} disabled={updatingStatus || !hasEnoughCredits}>
                    {updatingStatus ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}Mark as Paid
                  </Button>
                  {!hasEnoughCredits && <p className="text-xs text-red-500 text-center">Insufficient credits ({creditsNeeded} needed). Please recharge.</p>}
                </>
              )}

              {effectiveStatus === 'paid' && (
                <Button className="w-full" onClick={handleDownload} disabled={downloading}>
                  {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}Download Files
                </Button>
              )}

              {effectiveStatus === 'downloaded' && (
                <>
                  <div className="text-center py-3"><CheckCircle className="h-10 w-10 text-blue-500 mx-auto mb-2" /><p className="font-medium text-blue-700">Files Downloaded</p>
                    <p className="text-sm text-gray-500">{order.downloaded_at && format(new Date(order.downloaded_at), 'PPP p')}</p>
                  </div>
                  <Button className="w-full" variant="outline" onClick={handleDownload} disabled={downloading}><Download className="h-4 w-4 mr-2" />Download Again</Button>
                </>
              )}

              {isExpired && (
                <div className="text-center py-3"><XCircle className="h-10 w-10 text-red-400 mx-auto mb-2" /><p className="font-medium text-red-600">Order Expired</p></div>
              )}

              {/* Delete — always available */}
              <Button variant="ghost" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setShowDeleteConfirm(true)} disabled={updatingStatus}>
                <Trash2 className="h-4 w-4 mr-2" />Delete Order
              </Button>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Clock className="h-5 w-5" />Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex gap-3"><div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5" /><div><p className="font-medium">Order Submitted</p><p className="text-gray-500">{format(new Date(order.created_at), 'PPP p')}</p></div></div>
                {order.paid_at && <div className="flex gap-3"><div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" /><div><p className="font-medium">Marked as Paid</p><p className="text-gray-500">{format(new Date(order.paid_at), 'PPP p')}</p></div></div>}
                {order.downloaded_at && <div className="flex gap-3"><div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" /><div><p className="font-medium">Files Downloaded</p><p className="text-gray-500">{format(new Date(order.downloaded_at), 'PPP p')}</p></div></div>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mark as Paid Confirmation */}
      <Dialog open={showPaidConfirm} onOpenChange={setShowPaidConfirm}><DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Confirm Mark as Paid</DialogTitle><DialogDescription>Review the credit deduction before marking this order as paid.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Sheet dimensions:</p>
            <p className="text-2xl font-heading font-bold">{order.sheets[0]?.width_inches}" × {Number(order.sheets[0]?.height_inches || 0).toFixed(2)}"</p>
            {order.sheet_count > 1 && <p className="text-sm text-gray-500 mt-1">({order.sheet_count} sheets total)</p>}
          </div>
          <div>
            <p className="text-sm mb-3">This will deduct <span className="font-bold">{creditsNeeded.toLocaleString()} sq.inches</span> from your credits.</p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between"><span className="text-gray-600">Your current balance:</span><span className="font-semibold">{credits.toLocaleString(undefined, { maximumFractionDigits: 2 })} sq.in</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-gray-600">After deduction:</span><span className={`font-semibold ${balanceAfterDeduction < 0 ? 'text-red-600' : 'text-indigo-600'}`}>{balanceAfterDeduction.toLocaleString(undefined, { maximumFractionDigits: 2 })} sq.in</span></div>
            </div>
          </div>
          {balanceAfterDeduction < 500 && balanceAfterDeduction >= 0 && <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg"><AlertTriangle className="h-4 w-4 flex-shrink-0" /><p className="text-sm">Your balance will be low after this deduction.</p></div>}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setShowPaidConfirm(false)}>Cancel</Button>
          <Button onClick={handleConfirmMarkPaid} disabled={!hasEnoughCredits || updatingStatus} className="bg-green-600 hover:bg-green-700">{updatingStatus ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}Confirm & Mark as Paid</Button>
        </DialogFooter>
      </DialogContent></Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}><DialogContent>
        <DialogHeader><DialogTitle>Delete Order</DialogTitle><DialogDescription>Are you sure you want to delete order {order.order_code}? This will permanently delete the design files and cannot be undone.</DialogDescription></DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={updatingStatus}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={updatingStatus}>{updatingStatus ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : "Delete Order"}</Button>
        </DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
};

export default QSOrderDetail;
