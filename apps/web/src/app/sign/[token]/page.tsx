'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  XCircle,
  Pen,
  Type,
  Trash2,
  X,
  Shield,
  Download,
  Mail,
  Calendar,
  User,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { addToast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SigningDocument {
  id: string;
  name: string;
  pageCount: number;
  mimeType: string;
}

interface SigningRequestData {
  token: string;
  signerName: string;
  signerEmail: string;
  signerRole: string;
  envelopeName: string;
  status: 'pending' | 'opened' | 'in_progress' | 'completed' | 'declined' | 'expired' | 'voided';
  documents: SigningDocument[];
  expiresAt: string;
  senderName: string;
  senderCompany: string;
  completedAt: string | null;
  certificateId: string | null;
}

// ---------------------------------------------------------------------------
// Public API helper (no auth required)
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function publicFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const errorMessage = body.error?.message ?? `Request failed with status ${res.status}`;
    throw new Error(errorMessage);
  }

  const json = await res.json();
  return json.data ?? json;
}

// ---------------------------------------------------------------------------
// Signature Canvas Component
// ---------------------------------------------------------------------------

function SignatureCanvas({
  onSignatureChange,
  signerName,
}: {
  onSignatureChange: (dataUrl: string | null) => void;
  signerName: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnContent, setHasDrawnContent] = useState(false);
  const [mode, setMode] = useState<'type' | 'draw'>('type');
  const [typedSignature, setTypedSignature] = useState('');

  // Initialize canvas for drawing
  useEffect(() => {
    if (mode !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = '#1B3A5C';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [mode]);

  // Emit typed signature as a rendered canvas data URL
  useEffect(() => {
    if (mode === 'type' && typedSignature.trim()) {
      const offscreen = document.createElement('canvas');
      offscreen.width = 600;
      offscreen.height = 160;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, 600, 160);
        ctx.font = 'italic 36px Georgia, "Times New Roman", serif';
        ctx.fillStyle = '#1B3A5C';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedSignature, 24, 80);
        onSignatureChange(offscreen.toDataURL('image/png'));
      }
    } else if (mode === 'type') {
      onSignatureChange(null);
    }
  }, [typedSignature, mode, onSignatureChange]);

  const getCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (mode !== 'draw') return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawing || mode !== 'draw') return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawnContent(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    // Capture drawn signature
    const canvas = canvasRef.current;
    if (canvas && hasDrawnContent) {
      onSignatureChange(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnContent(false);
    onSignatureChange(null);
  };

  const handleModeSwitch = (newMode: 'type' | 'draw') => {
    setMode(newMode);
    setTypedSignature('');
    setHasDrawnContent(false);
    onSignatureChange(null);
  };

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleModeSwitch('type')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            mode === 'type'
              ? 'bg-[#1B3A5C] text-white shadow-sm'
              : 'border border-gray-300 text-gray-600 hover:bg-gray-50',
          )}
        >
          <Type className="h-4 w-4" />
          Type Signature
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch('draw')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            mode === 'draw'
              ? 'bg-[#1B3A5C] text-white shadow-sm'
              : 'border border-gray-300 text-gray-600 hover:bg-gray-50',
          )}
        >
          <Pen className="h-4 w-4" />
          Draw Signature
        </button>
      </div>

      {/* Signature Input Area */}
      {mode === 'type' ? (
        <div className="space-y-3">
          <input
            type="text"
            value={typedSignature}
            onChange={(e) => setTypedSignature(e.target.value)}
            placeholder={`Type your name (e.g. ${signerName})`}
            className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-base
                       placeholder:text-gray-400
                       focus:border-[#2A9D8F] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/20"
          />
          {typedSignature.trim() && (
            <div className="flex h-24 items-center justify-center rounded-lg border border-gray-200 bg-gray-50/80">
              <span
                className="text-3xl text-[#1B3A5C]"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic' }}
              >
                {typedSignature}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative rounded-lg border-2 border-dashed border-gray-300 bg-white">
            <canvas
              ref={canvasRef}
              className="h-32 w-full cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!hasDrawnContent && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-gray-400">Draw your signature here</p>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={clearCanvas}
              disabled={!hasDrawnContent}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700
                         disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Decline Modal Component
// ---------------------------------------------------------------------------

function DeclineModal({
  isOpen,
  onClose,
  onConfirm,
  isPending,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="decline-modal-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="decline-modal-title" className="text-lg font-semibold text-gray-900">
            Decline to Sign
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-600">
          Are you sure you want to decline signing these documents? The sender will be notified
          of your decision.
        </p>

        <label htmlFor="decline-reason" className="mb-1.5 block text-sm font-medium text-gray-700">
          Reason for declining (optional)
        </label>
        <textarea
          id="decline-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Please provide a reason..."
          className="mb-5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                     placeholder:text-gray-400
                     focus:border-[#1B3A5C] focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/20"
        />

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium
                       text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm Decline
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading State Component
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white">
      <div className="text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#1B3A5C]" />
        <p className="mt-4 text-sm font-medium text-gray-600">Loading your signing request...</p>
        <p className="mt-1 text-xs text-gray-400">This should only take a moment</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invalid / Expired Token State
// ---------------------------------------------------------------------------

function InvalidTokenState({ message }: { message?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4">
      <div className="w-full max-w-md text-center">
        {/* CrestDesk Branding */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B3A5C] font-bold text-white">
            CD
          </div>
          <span className="text-xl font-bold text-[#1B3A5C]">CrestDesk</span>
        </div>

        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
          <XCircle className="h-10 w-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          This signing link is no longer valid
        </h1>
        <p className="mt-3 text-gray-600">
          {message ?? 'This link may have expired, already been used, or been revoked by the sender.'}
        </p>

        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-5 text-left">
          <h3 className="text-sm font-semibold text-gray-800">What can you do?</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
              Contact the person who sent you this link to request a new one
            </li>
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
              Check your email for a more recent signing invitation
            </li>
          </ul>
        </div>

        <p className="mt-8 text-xs text-gray-400">
          Powered by CrestDesk &middot; Secure electronic signatures
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Completed State Component
// ---------------------------------------------------------------------------

function CompletedState({
  signerName,
  envelopeName,
  completedAt,
  certificateId,
}: {
  signerName: string;
  envelopeName: string;
  completedAt: string | null;
  certificateId: string | null;
}) {
  const formattedDate = completedAt
    ? new Intl.DateTimeFormat('en-US', {
        dateStyle: 'long',
        timeStyle: 'short',
      }).format(new Date(completedAt))
    : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4">
      <div className="w-full max-w-lg text-center">
        {/* CrestDesk Branding */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B3A5C] font-bold text-white">
            CD
          </div>
          <span className="text-xl font-bold text-[#1B3A5C]">CrestDesk</span>
        </div>

        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900">Documents Signed Successfully</h1>
        <p className="mt-3 text-gray-600">
          Thank you, {signerName}. You have successfully signed all documents
          in &ldquo;{envelopeName}&rdquo;.
        </p>

        {/* Certificate of Completion */}
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <Shield className="h-6 w-6 text-[#2A9D8F]" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Certificate of Completion</h3>
              <p className="text-xs text-gray-500">Electronic signature verification</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500">Signer:</span>
              <span className="font-medium text-gray-900">{signerName}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <FileText className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500">Envelope:</span>
              <span className="font-medium text-gray-900">{envelopeName}</span>
            </div>
            {formattedDate && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Signed:</span>
                <span className="font-medium text-gray-900">{formattedDate}</span>
              </div>
            )}
            {certificateId && (
              <div className="flex items-center gap-3 text-sm">
                <Shield className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Certificate ID:</span>
                <span className="font-mono text-xs font-medium text-gray-700">{certificateId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Next Steps */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">What happens next?</h3>
          <ul className="space-y-2.5 text-sm text-gray-600">
            <li className="flex items-start gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
              A confirmation email with signed copies will be sent to your email address
            </li>
            <li className="flex items-start gap-2.5">
              <Download className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
              You can download copies from the confirmation email
            </li>
            <li className="flex items-start gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
              Other parties will be notified to complete their signatures
            </li>
          </ul>
        </div>

        <p className="mt-8 text-xs text-gray-400">
          Powered by CrestDesk &middot; Secure electronic signatures
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Declined State Component
// ---------------------------------------------------------------------------

function DeclinedState({ signerName }: { signerName: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B3A5C] font-bold text-white">
            CD
          </div>
          <span className="text-xl font-bold text-[#1B3A5C]">CrestDesk</span>
        </div>

        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
          <XCircle className="h-10 w-10 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Signing Declined</h1>
        <p className="mt-3 text-gray-600">
          {signerName}, you have declined to sign these documents. The sender has been
          notified of your decision.
        </p>
        <p className="mt-8 text-xs text-gray-400">
          Powered by CrestDesk &middot; Secure electronic signatures
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Public Signing Page
// ---------------------------------------------------------------------------

export default function PublicSigningPage() {
  const params = useParams();
  const token = params.token as string;

  // Form state
  const [consentChecked, setConsentChecked] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [fullNameConfirmation, setFullNameConfirmation] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [hasMarkedOpened, setHasMarkedOpened] = useState(false);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const {
    data: signingRequest,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ['signing-request', token],
    queryFn: () => publicFetch<SigningRequestData>(`/api/v1/sign/${token}`),
    enabled: Boolean(token),
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // Mark as opened on first load
  useEffect(() => {
    if (signingRequest && !hasMarkedOpened && signingRequest.status === 'pending') {
      setHasMarkedOpened(true);
      publicFetch(`/api/v1/sign/${token}/mark-as-opened`, { method: 'POST' }).catch(() => {
        // Silently fail -- this is a non-critical tracking call
      });
    }
  }, [signingRequest, hasMarkedOpened, token]);

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const submitSignatureMutation = useMutation({
    mutationFn: (payload: { signatureImage: string; fullName: string }) =>
      publicFetch(`/api/v1/sign/${token}/signature`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Failed to submit signature',
        message: err.message,
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      publicFetch<SigningRequestData>(`/api/v1/sign/${token}/complete`, { method: 'POST' }),
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Documents signed successfully',
        message: 'A confirmation email will be sent shortly.',
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Failed to complete signing',
        message: err.message,
      });
    },
  });

  const declineMutation = useMutation({
    mutationFn: (reason: string) =>
      publicFetch(`/api/v1/sign/${token}/decline`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      setShowDeclineModal(false);
      addToast({
        type: 'info',
        title: 'Signing declined',
        message: 'The sender has been notified.',
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Failed to decline',
        message: err.message,
      });
    },
  });

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const handleSignatureChange = useCallback((dataUrl: string | null) => {
    setSignatureDataUrl(dataUrl);
  }, []);

  const nameMatches =
    signingRequest !== undefined &&
    fullNameConfirmation.trim().toLowerCase() === signingRequest.signerName.trim().toLowerCase();

  const canSubmit =
    consentChecked &&
    signatureDataUrl !== null &&
    nameMatches &&
    !submitSignatureMutation.isPending &&
    !completeMutation.isPending;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSignDocuments = async () => {
    if (!signatureDataUrl || !canSubmit) return;

    try {
      // Step 1: Submit the signature
      await submitSignatureMutation.mutateAsync({
        signatureImage: signatureDataUrl,
        fullName: fullNameConfirmation.trim(),
      });

      // Step 2: Complete the signing session
      await completeMutation.mutateAsync();
    } catch {
      // Errors are handled by individual mutation onError callbacks
    }
  };

  const handleDeclineConfirm = (reason: string) => {
    declineMutation.mutate(reason);
  };

  // ---------------------------------------------------------------------------
  // Render: Loading
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return <LoadingState />;
  }

  // ---------------------------------------------------------------------------
  // Render: Error / Invalid token
  // ---------------------------------------------------------------------------

  if (isError || !signingRequest) {
    const errorMessage = error instanceof Error ? error.message : undefined;
    return <InvalidTokenState message={errorMessage} />;
  }

  // ---------------------------------------------------------------------------
  // Render: Expired or voided
  // ---------------------------------------------------------------------------

  if (signingRequest.status === 'expired' || signingRequest.status === 'voided') {
    return <InvalidTokenState message="This signing request has expired. Please contact the sender to request a new signing link." />;
  }

  // ---------------------------------------------------------------------------
  // Render: Already completed
  // ---------------------------------------------------------------------------

  if (signingRequest.status === 'completed' || completeMutation.isSuccess) {
    return (
      <CompletedState
        signerName={signingRequest.signerName}
        envelopeName={signingRequest.envelopeName}
        completedAt={signingRequest.completedAt ?? new Date().toISOString()}
        certificateId={signingRequest.certificateId}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Declined
  // ---------------------------------------------------------------------------

  if (signingRequest.status === 'declined' || declineMutation.isSuccess) {
    return <DeclinedState signerName={signingRequest.signerName} />;
  }

  // ---------------------------------------------------------------------------
  // Render: Main signing interface
  // ---------------------------------------------------------------------------

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-50 to-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ----------------------------------------------------------------- */}
      {/* Header with CrestDesk Branding */}
      {/* ----------------------------------------------------------------- */}
      <header className="border-b border-[#1B3A5C]/10 bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1B3A5C] text-sm font-bold text-white">
              CD
            </div>
            <span className="text-lg font-bold text-[#1B3A5C]">CrestDesk</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1">
            <Shield className="h-3.5 w-3.5 text-green-600" />
            <span className="text-xs font-medium text-green-700">Secure Signing</span>
          </div>
        </div>
      </header>

      {/* ----------------------------------------------------------------- */}
      {/* Main Content */}
      {/* ----------------------------------------------------------------- */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Welcome, {signingRequest.signerName}
          </h1>
          <p className="mt-2 text-gray-600">
            {signingRequest.senderName}
            {signingRequest.senderCompany ? ` from ${signingRequest.senderCompany}` : ''} has
            requested your signature on the following documents.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#1B3A5C]/5 px-3 py-1.5">
            <FileText className="h-4 w-4 text-[#1B3A5C]" />
            <span className="text-sm font-medium text-[#1B3A5C]">{signingRequest.envelopeName}</span>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Document List */}
        {/* ----------------------------------------------------------------- */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Documents to Sign ({signingRequest.documents.length})
          </h2>
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
            {signingRequest.documents.map((doc, idx) => (
              <div key={doc.id} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#1B3A5C]/5">
                  <FileText className="h-5 w-5 text-[#1B3A5C]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{doc.name}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {doc.pageCount} page{doc.pageCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <span className="flex-shrink-0 text-xs font-medium text-gray-400">
                  {idx + 1} of {signingRequest.documents.length}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* E-Sign Consent */}
        {/* ----------------------------------------------------------------- */}
        <section className="mb-8">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <input
                  type="checkbox"
                  id="esign-consent"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-[#2A9D8F] focus:ring-[#2A9D8F]"
                />
              </div>
              <label htmlFor="esign-consent" className="cursor-pointer text-sm leading-relaxed text-gray-700">
                I agree to use electronic signatures in accordance with the Uniform Electronic
                Transactions Act (UETA) and the Electronic Signatures in Global and National
                Commerce Act (ESIGN Act). I understand that my electronic signature carries the
                same legal weight as a handwritten signature.
              </label>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* Signature Input */}
        {/* ----------------------------------------------------------------- */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Your Signature
          </h2>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <SignatureCanvas
              onSignatureChange={handleSignatureChange}
              signerName={signingRequest.signerName}
            />
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* Full Name Confirmation */}
        {/* ----------------------------------------------------------------- */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Confirm Your Identity
          </h2>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <label htmlFor="full-name-confirm" className="mb-1.5 block text-sm font-medium text-gray-700">
              Type your full legal name to confirm
            </label>
            <input
              type="text"
              id="full-name-confirm"
              value={fullNameConfirmation}
              onChange={(e) => setFullNameConfirmation(e.target.value)}
              placeholder={signingRequest.signerName}
              className={cn(
                'block w-full rounded-lg border px-4 py-3 text-base transition-colors',
                'placeholder:text-gray-400',
                'focus:outline-none focus:ring-2',
                fullNameConfirmation.trim() && !nameMatches
                  ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500/20'
                  : 'border-gray-300 focus:border-[#2A9D8F] focus:ring-[#2A9D8F]/20',
              )}
            />
            {fullNameConfirmation.trim() && !nameMatches && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                Name must match: {signingRequest.signerName}
              </p>
            )}
            {nameMatches && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                Name confirmed
              </p>
            )}
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* Validation Summary */}
        {/* ----------------------------------------------------------------- */}
        {(!consentChecked || !signatureDataUrl || !nameMatches) && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="mb-2 text-sm font-medium text-amber-800">
              Complete the following to sign:
            </p>
            <ul className="space-y-1.5 text-sm text-amber-700">
              {!consentChecked && (
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Accept the electronic signature consent
                </li>
              )}
              {!signatureDataUrl && (
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Provide your signature (type or draw)
                </li>
              )}
              {!nameMatches && (
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Confirm your full legal name
                </li>
              )}
            </ul>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* Action Buttons */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex flex-col gap-4 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleSignDocuments}
            disabled={!canSubmit}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold',
              'shadow-sm transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] focus:ring-offset-2',
              canSubmit
                ? 'bg-[#2A9D8F] text-white hover:bg-[#238b7e] hover:shadow-md active:scale-[0.98]'
                : 'cursor-not-allowed bg-gray-200 text-gray-400',
            )}
          >
            {(submitSignatureMutation.isPending || completeMutation.isPending) ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
            {submitSignatureMutation.isPending
              ? 'Submitting Signature...'
              : completeMutation.isPending
                ? 'Completing...'
                : 'Sign Documents'}
          </button>

          <button
            type="button"
            onClick={() => setShowDeclineModal(true)}
            className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-gray-500
                       hover:text-red-600 sm:justify-start"
          >
            <XCircle className="h-4 w-4" />
            Decline to Sign
          </button>
        </div>
      </main>

      {/* ----------------------------------------------------------------- */}
      {/* Footer */}
      {/* ----------------------------------------------------------------- */}
      <footer className="border-t border-gray-100 bg-white py-6">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Shield className="h-3.5 w-3.5" />
              <span>256-bit encryption &middot; SOC 2 compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-[#1B3A5C] text-[8px] font-bold text-white">
                CD
              </div>
              <span className="text-xs text-gray-400">
                Powered by CrestDesk &middot; Secure electronic signatures
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* ----------------------------------------------------------------- */}
      {/* Decline Modal */}
      {/* ----------------------------------------------------------------- */}
      <DeclineModal
        isOpen={showDeclineModal}
        onClose={() => setShowDeclineModal(false)}
        onConfirm={handleDeclineConfirm}
        isPending={declineMutation.isPending}
      />
    </div>
  );
}
