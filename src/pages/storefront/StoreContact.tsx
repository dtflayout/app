import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { QuickStore } from '@/types/quickStore';
import { trackEvent } from '@/services/storefrontService';
import { submitContactMessage } from '@/services/storefrontService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  Send,
  ExternalLink,
  CheckCircle
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
    message: ''
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    trackEvent(store.id, 'contact_view');
  }, [store.id]);

  // Parse business hours from settings
  const businessHours: BusinessHour[] = store.business_hours || [
    { day: 'Monday', open: '09:00', close: '18:00', closed: false },
    { day: 'Tuesday', open: '09:00', close: '18:00', closed: false },
    { day: 'Wednesday', open: '09:00', close: '18:00', closed: false },
    { day: 'Thursday', open: '09:00', close: '18:00', closed: false },
    { day: 'Friday', open: '09:00', close: '18:00', closed: false },
    { day: 'Saturday', open: '10:00', close: '16:00', closed: false },
    { day: 'Sunday', open: '', close: '', closed: true }
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
      trackEvent(store.id, 'contact_submit', {
        hasEmail: !!formData.email
      });

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Contact Information */}
          <div className="space-y-6">
            <div>
              <h1 className="font-heading text-3xl font-extrabold tracking-tight mb-2">Contact Us</h1>
              <p className="text-muted-foreground">
                Get in touch with {store.store_name}. We're here to help with all your DTF printing needs.
              </p>
            </div>

            {/* Quick Contact Buttons */}
            <div className="flex flex-wrap gap-3">
              {store.whatsapp && (
                <Button
                  onClick={handleWhatsApp}
                  className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </Button>
              )}
              {store.phone && (
                <Button variant="outline" onClick={handleCall} className="gap-2">
                  <Phone className="w-4 h-4" />
                  Call Now
                </Button>
              )}
              {store.email && (
                <Button variant="outline" onClick={handleEmail} className="gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Button>
              )}
            </div>

            {/* Contact Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {store.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Phone</p>
                      <a
                        href={`tel:${store.phone}`}
                        className="text-primary hover:underline"
                      >
                        {store.phone}
                      </a>
                    </div>
                  </div>
                )}

                {store.whatsapp && (
                  <div className="flex items-start gap-3">
                    <MessageCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">WhatsApp</p>
                      <button
                        onClick={handleWhatsApp}
                        className="text-primary hover:underline"
                      >
                        {store.whatsapp}
                      </button>
                    </div>
                  </div>
                )}

                {store.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Email</p>
                      <a
                        href={`mailto:${store.email}`}
                        className="text-primary hover:underline"
                      >
                        {store.email}
                      </a>
                    </div>
                  </div>
                )}

                {store.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Address</p>
                      <p className="text-muted-foreground">{store.address}</p>
                      {store.google_maps_url && (
                        <a
                          href={store.google_maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1 mt-1"
                        >
                          View on Maps <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Business Hours Card */}
            {store.show_business_hours !== false && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Business Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {businessHours.map((hour) => (
                    <div
                      key={hour.day}
                      className="flex justify-between py-1 border-b last:border-0"
                    >
                      <span className="font-medium">{hour.day}</span>
                      <span className={hour.closed ? 'text-red-500' : 'text-muted-foreground'}>
                        {hour.closed
                          ? 'Closed'
                          : `${formatTime(hour.open)} - ${formatTime(hour.close)}`}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            )}
          </div>

          {/* Contact Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Send a Message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sent ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
                    <p className="text-muted-foreground mb-4">
                      Thank you for reaching out. We'll contact you soon.
                    </p>
                    <Button variant="outline" onClick={() => setSent(false)}>
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Your name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Your phone number"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email (Optional)</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Your email address"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="How can we help you?"
                        rows={4}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full gap-2" disabled={sending}>
                      {sending ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Google Map Embed - uses google_maps_url for iframe */}
            {store.google_maps_url && (
              <Card className="mt-6 overflow-hidden">
                <iframe
                  src={store.google_maps_url}
                  className="h-64 w-full border-0"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Store Location"
                />
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreContact;
