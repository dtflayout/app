import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Check, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  content: React.ReactNode;
  /** Validate this step before allowing Next. Return error message or null. */
  validate?: () => string | null;
  /** Called when user clicks Next on this step. Should save data. */
  onNext?: () => Promise<void>;
}

interface SetupWizardProps {
  title: string;
  subtitle: string;
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete: () => Promise<void>;
  onClose: () => void;
  completingText?: string;
  completeText?: string;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({
  title,
  subtitle,
  steps,
  currentStep,
  onStepChange,
  onComplete,
  onClose,
  completingText = 'Finishing...',
  completeText = 'Complete Setup',
}) => {
  const [saving, setSaving] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);

  const isLastStep = currentStep === steps.length - 1;
  const step = steps[currentStep];

  const handleNext = async () => {
    if (!step) return;

    // Validate
    if (step.validate) {
      const error = step.validate();
      if (error) return; // validation function should show toast
    }

    setSaving(true);
    try {
      // Save current step data
      if (step.onNext) {
        await step.onNext();
      }

      if (isLastStep) {
        await onComplete();
      } else {
        onStepChange(currentStep + 1);
      }
    } catch (err: any) {
      console.error('[SetupWizard] Error:', err);
      toast.error(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
    }
  };

  const handleClose = () => {
    if (currentStep === 0 && !step?.onNext) {
      // Haven't saved anything yet, safe to close
      onClose();
    } else {
      setShowCloseWarning(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Close Warning Modal */}
      {showCloseWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-4">
            <h3 className="font-heading text-lg font-bold text-gray-900">Leave Setup?</h3>
            <p className="mt-2 text-sm text-gray-500">
              Your progress has been saved. You can resume setup anytime by coming back to this page.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowCloseWarning(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Continue Setup
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl font-extrabold text-gray-900 tracking-tight">{title}</h1>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Close (progress will be saved)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center">
            {steps.map((s, idx) => {
              const isCompleted = idx < currentStep;
              const isCurrent = idx === currentStep;
              const isUpcoming = idx > currentStep;

              return (
                <React.Fragment key={s.id}>
                  {/* Step circle + label */}
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all shrink-0',
                        isCompleted && 'bg-indigo-600 text-white',
                        isCurrent && 'bg-indigo-600 text-white ring-4 ring-indigo-100',
                        isUpcoming && 'bg-gray-100 text-gray-400'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <div className="hidden sm:block">
                      <p
                        className={cn(
                          'text-sm font-medium leading-tight',
                          isCurrent ? 'text-gray-900' : isCompleted ? 'text-indigo-600' : 'text-gray-400'
                        )}
                      >
                        {s.title}
                      </p>
                    </div>
                  </div>

                  {/* Connector line */}
                  {idx < steps.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 mx-3',
                        idx < currentStep ? 'bg-indigo-600' : 'bg-gray-200'
                      )}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-6 pt-8 pb-28">
        {/* Step Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            {step && <step.icon className="h-5 w-5 text-indigo-600" />}
            <h2 className="font-heading text-lg font-bold text-gray-900">{step?.title}</h2>
          </div>
          <p className="text-sm text-gray-500 ml-8">{step?.description}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          {step?.content}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[70px] z-50">
        <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            {/* Left side */}
            <div>
              {currentStep > 0 ? (
                <button
                  onClick={handleBack}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              ) : (
                <div />
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">
                Step {currentStep + 1} of {steps.length}
              </span>
              <button
                onClick={handleNext}
                disabled={saving}
                className={cn(
                  'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all',
                  'hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed',
                  isLastStep
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-emerald-200'
                    : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:shadow-indigo-200'
                )}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isLastStep ? completingText : 'Saving...'}
                  </>
                ) : isLastStep ? (
                  <>
                    {completeText}
                    <Check className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
