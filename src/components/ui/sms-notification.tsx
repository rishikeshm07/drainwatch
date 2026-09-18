'use client';
import React, { useEffect, useState } from 'react';
import { MessageSquare, CheckCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SMSNotificationProps {
  phone: string;
  ticketNumber: string;
  onClose: () => void;
}

export function SMSNotification({ phone, ticketNumber, onClose }: SMSNotificationProps) {
  const [stage, setStage] = useState<'sending' | 'sent'>('sending');

  // Mask phone number for privacy: show only last 4 digits
  const masked = phone.length >= 4
    ? `+91 ******* ${phone.slice(-4)}`
    : phone;

  useEffect(() => {
    const t1 = setTimeout(() => setStage('sent'), 1400);
    const t2 = setTimeout(() => onClose(), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onClose]);

  return (
    <div className={cn(
      'fixed bottom-24 right-5 z-50 w-80 rounded-2xl border shadow-2xl overflow-hidden',
      'animate-slide-in-right',
      stage === 'sent'
        ? 'bg-green-950 border-green-700'
        : 'bg-gray-900 border-gray-700'
    )}>
      {/* Phone screen chrome */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/40">
        <span className="text-[10px] text-gray-400 font-medium">SMS MESSAGE</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-4 pb-4 pt-2">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5',
            stage === 'sent' ? 'bg-green-600' : 'bg-blue-600'
          )}>
            {stage === 'sending'
              ? <MessageSquare className="w-4 h-4 text-white animate-pulse" />
              : <CheckCheck className="w-4 h-4 text-white" />
            }
          </div>

          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1">
              To: <span className="text-white font-mono">{masked}</span>
            </p>
            {stage === 'sending' ? (
              <p className="text-sm text-gray-300">Sending confirmation SMS…</p>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-bold text-green-400 flex items-center gap-1">
                  <CheckCheck className="w-3 h-3" /> SMS Delivered
                </p>
                <div className="bg-white/10 rounded-xl p-3 text-xs text-white leading-relaxed">
                  <p className="font-bold text-green-300 mb-1">DrainWatch Kerala</p>
                  Your drain blockage complaint has been registered successfully.{' '}
                  <span className="font-bold text-yellow-300">Ticket ID: {ticketNumber}</span>.{' '}
                  Track status at drainwatch.kerala.gov.in or reply TRACK to this number.
                  Ward officer will respond within 48 hours.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
