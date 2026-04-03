import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { QuickStore } from '@/types/quickStore';
import { trackEvent } from '@/services/storefrontService';
import { submitContactMessage } from '@/services/storefrontService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  Send,
  ExternalLink,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  store: QuickStore;
}

interface BusinessHour {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

const StoreContact: React.FC<Props> = ({ store }) => {
  const location = useLocation();
  const basePath = location.pathname.startsWith('/s/') ? `/s/${store.slug}` : '';

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    trackEvent(store.id, 'contact_view');
  }, [store.id]);

  const businessHours: BusinessHour[] = store.business_hours || [
    { day: 'Monday', open: '09:00', close: '18:00', closed: false },
    { day: 'Tuesday', open: '09:00', close: '18:00', closed: false },
    { day: 'Wednesday', open: '09:00', close: '18:00', closed: false },
    { day: 'Thursday', open: '09:00', close: '18:00', closed: false },
    { day: 'Friday', open: '09:00', close: '18:00', closed: false },
    { day: 'Saturday', open: '10:00', close: '16:00', closed: false },
    { day: 'Sunday', open: '', close: '', closed: true },
  ];

  const formatTime = (time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSending(true);

    try {
      trackEvent(store.id, 'contact_submit', { hasEmail: !!formData.email });

      const result = await submitContactMessage(store.id, formData);

      if (!result.success) {
        toast.error(result.error || 'Failed to send message. Please try again.');
        return;
      }

      setSent(true);
      toast.success('Message sent! The store will contact you soon.');
      setFormData({ name: '', phone: '', email: '', message: '' });
    } catch (err) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleWhatsApp = () => {
    if (store.whatsapp) {
      const message = encodeURIComponent(`Hi! I'm interested in your DTF printing services.`);
      window.open(`https://wa.me/${store.whatsapp.replace(/\D/g, '')}?text=${message}`, '_blank');
      trackEvent(store.id, 'whatsapp_click');
    }
  };

  const handleCall = () => {
    if (store.phone) {
      window.open(`tel:${store.phone}`, '_self');
      trackEvent(store.id, 'phone_click');
    }
  };

  const handleEmail = () => {
    if (store.email) {
      window.open(`mailto:${store.email}`, '_self');
      trackEvent(store.id, 'email_click');
    }
  };

  const primary = store.color_primary || '#4f46e5';

  return (
    <div className="min-h-screen">
      {/* ── Hero Banner ── */}
      <div
        className="relative py-16 sm:py-20"
        style={{ background: `linear-gradient(135deg, ${primary}, ${primary}dd)` }}
      >
        <div className="absolute inset-0 opacity-10">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />
        </div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Get in Touch
          </h1>
          <p className="text-white/80 text-lg max-w-lg mx-auto">
            We'd love to hear from you. Reach out and let's talk about your printing needs.
          </p>
        </div>
      </div>

      {/* ── Quick Action Buttons ── */}
      <div className="container mx-auto px-4 -mt-7 relative z-20">
        <div className="flex flex-wrap justify-center gap-3">
          {store.whatsapp && (
            <button
              onClick={handleWhatsApp}
              className="flex items-center gap-2.5 bg-white rounded-full px-6 py-3 shadow-lg hover:shadow-xl transition-all text-sm font-semibold border border-gray-100 hover:-translate-y-0.5"
            >
              <MessageCircle className="w-[18px] h-[18px] text-green-600" />
              <span>WhatsApp Us</span>
            </button>
          )}
          {store.phone && (
            <button
              onClick={handleCall}
              className="flex items-center gap-2.5 bg-white rounded-full px-6 py-3 shadow-lg hover:shadow-xl transition-all text-sm font-semibold border border-gray-100 hover:-translate-y-0.5"
            >
              <Phone className="w-[18px] h-[18px]" style={{ color: primary }} />
              <span>Call Now</span>
            </button>
          )}
          {store.email && (
            <button
              onClick={handleEmail}
              className="flex items-center gap-2.5 bg-white rounded-full px-6 py-3 shadow-lg hover:shadow-xl transition-all text-sm font-semibold border border-gray-100 hover:-translate-y-0.5"
            >
              <Mail className="w-[18px] h-[18px]" style={{ color: primary }} />
              <span>Send Email</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="container mx-auto px-4 py-12 sm:py-16">
        <div className="grid lg:grid-cols-5 gap-10 lg:gap-14">
          {/* ── Left: Contact Info ── */}
          <div className="lg:col-span-2 space-y-8">
            {/* Contact Details */}
            <div>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="w-8 h-0.5 rounded-full" style={{ backgroundColor: primary }} />
                Contact Details
              </h2>
              <div className="space-y-5">
                {store.phone && (
                  <a href={`tel:${store.phone}`} className="flex items-start gap-4 group">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${primary}12` }}
                    >
                      <Phone className="w-[18px] h-[18px]" style={{ color: primary }} />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-0.5">Phone</p>
                      <p className="font-medium group-hover:underline">{store.phone}</p>
                    </div>
                  </a>
                )}

                {store.whatsapp && (
                  <button onClick={handleWhatsApp} className="flex items-start gap-4 group text-left w-full">
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-[18px] h-[18px] text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-0.5">WhatsApp</p>
                      <p className="font-medium group-hover:underline">{store.whatsapp}</p>
                    </div>
                  </button>
                )}

                {store.email && (
                  <a href={`mailto:${store.email}`} className="flex items-start gap-4 group">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${primary}12` }}
                    >
                      <Mail className="w-[18px] h-[18px]" style={{ color: primary }} />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-0.5">Email</p>
                      <p className="font-medium group-hover:underline">{store.email}</p>
                    </div>
                  </a>
                )}

                {store.address && (
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${primary}12` }}
                    >
                      <MapPin className="w-[18px] h-[18px]" style={{ color: primary }} />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-0.5">Address</p>
                      <p className="font-medium">{store.address}</p>
                      {store.city && (
                        <p className="text-sm text-gray-500">
                          {store.city}
                          {store.country ? `, ${store.country}` : ''}
                        </p>
                      )}
                      {store.google_maps_url && (
                        <a
                          href={store.google_maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm mt-1.5 hover:underline"
                          style={{ color: primary }}
                        >
                          View on Maps <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Business Hours */}
            {store.show_business_hours !== false && (
              <div>
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <span className="w-8 h-0.5 rounded-full" style={{ backgroundColor: primary }} />
                  Business Hours
                </h2>
                <div className="rounded-2xl border border-gray-100 overflow-hidden">
                  {businessHours.map((hour, idx) => (
                    <div
                      key={hour.day}
                      className={`flex justify-between items-center px-4 py-3 ${
                        idx % 2 === 0 ? 'bg-gray-50/60' : 'bg-white'
                      }`}
                    >
                      <span className="text-sm font-medium">{hour.day}</span>
                      {hour.closed ? (
                        <span className="text-xs font-medium text-red-500 bg-red-50 px-2.5 py-1 rounded-full">
                          Closed
                        </span>
                      ) : (
                        <span className="text-sm text-gray-600">
                          {formatTime(hour.open)} – {formatTime(hour.close)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Google Map Embed */}
            {store.google_maps_url && (
              <div className="rounded-2xl overflow-hidden border border-gray-100">
                <iframe
                  src={store.google_maps_url}
                  className="h-52 w-full border-0"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Store Location"
                />
              </div>
            )}
          </div>

          {/* ── Right: Message Form ── */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
              {sent ? (
                <div className="text-center py-12">
                  <div
                    className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
                    style={{ backgroundColor: `${primary}15` }}
                  >
                    <CheckCircle className="w-8 h-8" style={{ color: primary }} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Message Sent!</h3>
                  <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                    Thank you for reaching out. We'll get back to you as soon as possible.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setSent(false)}
                    className="rounded-full px-6"
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-1">Send a Message</h2>
                    <p className="text-gray-500 text-sm">
                      Fill out the form and we'll get back to you shortly.
                    </p>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-xs font-medium uppercase tracking-wider text-gray-500">
                          Name *
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Your name"
                          required
                          className="rounded-xl h-11 border-gray-200 focus:border-gray-300"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-xs font-medium uppercase tracking-wider text-gray-500">
                          Phone *
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="Your phone number"
                          required
                          className="rounded-xl h-11 border-gray-200 focus:border-gray-300"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-gray-500">
                        Email <span className="normal-case tracking-normal text-gray-400">(optional)</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Your email address"
                        className="rounded-xl h-11 border-gray-200 focus:border-gray-300"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="message" className="text-xs font-medium uppercase tracking-wider text-gray-500">
                        Message *
                      </Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Tell us what you need help with..."
                        rows={5}
                        required
                        className="rounded-xl border-gray-200 focus:border-gray-300 resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl gap-2 text-sm font-semibold text-white transition-all hover:opacity-90"
                      style={{ backgroundColor: primary }}
                      disabled={sending}
                    >
                      {sending ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Message
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreContact;
