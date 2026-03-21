import React from 'react';
import { QuickStoreOrder, ORDER_STATUS_LABELS } from '@/types/quickStore';
import { cn } from '@/lib/utils';
import {
  ClipboardList,
  Download,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

type OrderStatus = QuickStoreOrder['status'];

interface Props {
  currentStatus: OrderStatus;
  createdAt: string | null;
  downloadedAt: string | null;
  completedAt: string | null;
  vertical?: boolean;
}

interface Step {
  key: OrderStatus | 'submitted';
  label: string;
  icon: React.ReactNode;
  timestamp: string | null;
}

const OrderStatusTracker: React.FC<Props> = ({
  currentStatus,
  createdAt,
  downloadedAt,
  completedAt,
  vertical = false
}) => {
  // If cancelled, show different view
  if (currentStatus === 'cancelled') {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <p className="font-medium text-red-800">Order Cancelled</p>
          {createdAt && (
            <p className="text-sm text-muted-foreground mt-1">
              Originally placed on {formatDate(createdAt)}
            </p>
          )}
        </div>
      </div>
    );
  }

  const steps: Step[] = [
    {
      key: 'submitted',
      label: 'Submitted',
      icon: <ClipboardList className="w-5 h-5" />,
      timestamp: createdAt
    },
    {
      key: 'pending',
      label: 'Pending Review',
      icon: <Clock className="w-5 h-5" />,
      timestamp: createdAt
    },
    {
      key: 'downloaded',
      label: 'Processing',
      icon: <Download className="w-5 h-5" />,
      timestamp: downloadedAt
    },
    {
      key: 'completed',
      label: 'Completed',
      icon: <CheckCircle className="w-5 h-5" />,
      timestamp: completedAt
    }
  ];

  const getStepStatus = (stepKey: string): 'completed' | 'current' | 'upcoming' => {
    const statusOrder = ['submitted', 'pending', 'downloaded', 'completed'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = statusOrder.indexOf(stepKey);

    // Special handling for 'submitted' which maps to 'pending'
    if (stepKey === 'submitted') {
      return currentIndex >= 0 ? 'completed' : 'upcoming';
    }

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (vertical) {
    return (
      <div className="space-y-0">
        {steps.map((step, index) => {
          const status = getStepStatus(step.key);
          const isLast = index === steps.length - 1;

          return (
            <div key={step.key} className="relative">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="relative">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center border-2 bg-white z-10 relative',
                      status === 'completed' && 'border-indigo-500 bg-indigo-500 text-white',
                      status === 'current' && 'border-primary bg-primary text-white',
                      status === 'upcoming' && 'border-gray-200 text-gray-400'
                    )}
                  >
                    {step.icon}
                  </div>
                  {/* Connecting line */}
                  {!isLast && (
                    <div
                      className={cn(
                        'absolute left-1/2 top-10 w-0.5 h-8 -translate-x-1/2',
                        status === 'completed' || status === 'current'
                          ? 'bg-indigo-500'
                          : 'bg-gray-200'
                      )}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-8">
                  <p
                    className={cn(
                      'font-medium',
                      status === 'upcoming' && 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </p>
                  {step.timestamp && status !== 'upcoming' && (
                    <p className="text-sm text-muted-foreground">
                      {formatDate(step.timestamp)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal layout
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const status = getStepStatus(step.key);
          const isLast = index === steps.length - 1;

          return (
            <React.Fragment key={step.key}>
              {/* Step */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center border-2 mb-2',
                    status === 'completed' && 'border-indigo-500 bg-indigo-500 text-white',
                    status === 'current' && 'border-primary bg-primary text-white animate-pulse',
                    status === 'upcoming' && 'border-gray-200 bg-white text-gray-400'
                  )}
                >
                  {step.icon}
                </div>
                <p
                  className={cn(
                    'text-sm font-medium text-center',
                    status === 'upcoming' && 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </p>
                {step.timestamp && status !== 'upcoming' && (
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    {formatDate(step.timestamp)}
                  </p>
                )}
              </div>

              {/* Connector */}
              {!isLast && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 mb-10',
                    status === 'completed' ? 'bg-indigo-500' : 'bg-gray-200'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// Helper function for formatting dates
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export default OrderStatusTracker;
