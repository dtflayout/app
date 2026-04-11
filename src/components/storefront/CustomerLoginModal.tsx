/**
 * CustomerLoginModal
 * Email + OTP login for Quick Store customers
 * Step 1: Enter email → Step 2: Enter 6-digit code
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, ArrowLeft, User } from 'lucide-react';
import { toast } from 'sonner';
import { sendCustomerOtp, verifyCustomerOtp, QSCustomer } from '@/services/qsCustomerService';

interface CustomerLoginModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: (customer: QSCustomer) => void;
  storeId: string;
  storeName: string;
  primaryColor?: string;
}

type Step = 'email' | 'otp';

const OTP_LENGTH = 6;
const COOLDOWN_SECONDS = 60;

const CustomerLoginModal: React.FC<CustomerLoginModalProps> = ({
  open,
  onClose,
  onLogin,
  storeId,
  storeName,
  primaryColor = '#4F46E5',
}) => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setStep('email');
        setEmail('');
        setName('');
        setOtpDigits(Array(OTP_LENGTH).fill(''));
        setCooldown(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Auto-focus first OTP input when entering OTP step
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  // ── Send OTP ────────────────────────────────────────────────────────
  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    setIsLoading(true);
    const result = await sendCustomerOtp(storeId, email.trim());
    setIsLoading(false);

    if (result.success) {
      setStep('otp');
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setCooldown(COOLDOWN_SECONDS);
      toast.success('Verification code sent to your email');
    } else {
      toast.error(result.error || 'Failed to send code');
    }
  };

  // ── Resend OTP ──────────────────────────────────────────────────────
  const handleResend = async () => {
    if (cooldown > 0) return;
    setIsLoading(true);
    const result = await sendCustomerOtp(storeId, email.trim());
    setIsLoading(false);

    if (result.success) {
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setCooldown(COOLDOWN_SECONDS);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
      toast.success('New code sent');
    } else {
      toast.error(result.error || 'Failed to resend code');
    }
  };

  // ── Verify OTP ──────────────────────────────────────────────────────
  const handleVerify = useCallback(async (digits: string[]) => {
    const otp = digits.join('');
    if (otp.length !== OTP_LENGTH) return;

    setIsLoading(true);
    const result = await verifyCustomerOtp(storeId, email.trim(), otp, name.trim() || undefined);
    setIsLoading(false);

    if (result.success && result.customer) {
      toast.success(result.customer.name ? `Welcome back, ${result.customer.name}!` : 'Welcome!');
      onLogin(result.customer);
      onClose();
    } else {
      toast.error(result.error || 'Invalid code');
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [storeId, email, name, onLogin, onClose]);

  // ── OTP Input Handlers ──────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    // Only accept digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (digit && index === OTP_LENGTH - 1 && newDigits.every((d) => d !== '')) {
      handleVerify(newDigits);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newDigits = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);

    // Focus next empty or last input
    const nextEmpty = newDigits.findIndex((d) => d === '');
    inputRefs.current[nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty]?.focus();

    // Auto-submit if full
    if (pasted.length === OTP_LENGTH) {
      handleVerify(newDigits);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'email' ? 'Sign in to your account' : 'Enter verification code'}
          </DialogTitle>
          <DialogDescription>
            {step === 'email'
              ? `Enter your email to sign in to ${storeName}.`
              : `We sent a 6-digit code to ${email}`}
          </DialogDescription>
        </DialogHeader>

        {/* ── Step 1: Email ──────────────────────────────────────── */}
        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="login-email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Name <span className="text-xs text-gray-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="login-name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              className="w-full text-white"
              style={{ backgroundColor: primaryColor }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending code...
                </>
              ) : (
                'Continue'
              )}
            </Button>

            <p className="text-xs text-center text-[#7c7c7c]">
              We'll send a verification code to your email. No password needed.
            </p>
          </form>
        )}

        {/* ── Step 2: OTP ────────────────────────────────────────── */}
        {step === 'otp' && (
          <div className="space-y-6 pt-2">
            {/* OTP digit inputs */}
            <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  disabled={isLoading}
                  className="w-11 h-13 text-center text-xl font-semibold border-2 rounded-lg outline-none transition-colors focus:ring-2 focus:ring-offset-1 disabled:opacity-50"
                  style={{
                    borderColor: digit ? primaryColor : '#e5e7eb',
                    ...(digit ? { boxShadow: `0 0 0 1px ${primaryColor}20` } : {}),
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = primaryColor;
                    e.target.style.boxShadow = `0 0 0 2px ${primaryColor}30`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = digit ? primaryColor : '#e5e7eb';
                    e.target.style.boxShadow = digit ? `0 0 0 1px ${primaryColor}20` : 'none';
                  }}
                />
              ))}
            </div>

            {isLoading && (
              <div className="flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            )}

            {/* Resend + Back */}
            <div className="space-y-3">
              <p className="text-sm text-center text-[#7c7c7c]">
                Didn't get the code?{' '}
                {cooldown > 0 ? (
                  <span className="text-gray-400">Resend in {cooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isLoading}
                    className="font-medium hover:underline"
                    style={{ color: primaryColor }}
                  >
                    Resend code
                  </button>
                )}
              </p>

              <button
                type="button"
                onClick={() => { setStep('email'); setOtpDigits(Array(OTP_LENGTH).fill('')); }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mx-auto"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Use a different email
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomerLoginModal;
