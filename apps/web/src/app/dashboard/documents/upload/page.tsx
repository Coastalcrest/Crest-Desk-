'use client';

import { useState, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  CloudUpload,
  File,
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  Sparkles,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface UploadedFile {
  localId: string;
  file: File;
  status: 'queued' | 'uploading' | 'classifying' | 'complete' | 'error';
  progress: number;
  serverId: string | null;
  classification: ClassificationResult | null;
  overrideType: string | null;
  errorMessage: string | null;
}

interface ClassificationResult {
  documentType: string;
  confidence: number;
  suggestedFolder: string;
}

interface Transaction {
  id: string;
  propertyAddress: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DOCUMENT_TYPES = [
  'Purchase Agreement',
  'Listing Agreement',
  'Disclosure',
  'Inspection Report',
  'Appraisal',
  'Title Report',
  'Closing Document',
  'Addendum',
  'Amendment',
  'Power of Attorney',
  'Lead Paint Disclosure',
  'HOA Documents',
  'Survey',
  'Other',
];

let fileIdCounter = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'DOC';
  if (mimeType.includes('image')) return 'IMG';
  return 'FILE';
}

// ---------------------------------------------------------------------------
// File Thumbnail
// ---------------------------------------------------------------------------
function FileThumbnail({ file }: { file: File }) {
  const ext = getFileIcon(file.type);
  const colorMap: Record<string, string> = {
    PDF: 'bg-red-100 text-red-700',
    DOC: 'bg-blue-100 text-blue-700',
    IMG: 'bg-purple-100 text-purple-700',
    FILE: 'bg-gray-100 text-gray-700',
  };
  return (
    <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold', colorMap[ext] ?? colorMap.FILE)}>
      {ext}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confidence Badge
// ---------------------------------------------------------------------------
function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  let color = 'text-green-700 bg-green-50 border-green-200';
  if (pct < 70) color = 'text-red-700 bg-red-50 border-red-200';
  else if (pct < 85) color = 'text-yellow-700 bg-yellow-50 border-yellow-200';

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium', color)}>
      <Sparkles className="h-3 w-3" />
      {pct}%
    </span>
  );
}

// ---------------------------------------------------------------------------
// File Row
// ---------------------------------------------------------------------------
function FileRow({
  uploadedFile,
  onRemove,
  onOverride,
}: {
  uploadedFile: UploadedFile;
  onRemove: () => void;
  onOverride: (type: string) => void;
}) {
  const [showOverride, setShowOverride] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <FileThumbnail file={uploadedFile.file} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {uploadedFile.file.name}
              </p>
              <p className="text-xs text-gray-500">{formatFileSize(uploadedFile.file.size)}</p>
            </div>
            <button
              onClick={onRemove}
              className="ml-2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Progress bar */}
          {(uploadedFile.status === 'uploading' || uploadedFile.status === 'classifying') && (
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    uploadedFile.status === 'classifying' ? 'bg-[#1B3A5C]' : 'bg-[#2A9D8F]',
                  )}
                  style={{ width: `${uploadedFile.progress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {uploadedFile.status === 'uploading' && 'Uploading...'}
                {uploadedFile.status === 'classifying' && 'AI is classifying document...'}
              </p>
            </div>
          )}

          {/* Status indicators */}
          {uploadedFile.status === 'queued' && (
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              Queued for upload
            </div>
          )}

          {uploadedFile.status === 'error' && (
            <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="h-3 w-3" />
              {uploadedFile.errorMessage ?? 'Upload failed'}
            </div>
          )}

          {/* Classification result */}
          {uploadedFile.status === 'complete' && uploadedFile.classification && (
            <div className="mt-3 rounded-lg bg-gray-50 p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-gray-900">Classification Complete</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-[#1B3A5C]/10 px-2.5 py-1 text-xs font-semibold text-[#1B3A5C]">
                  {uploadedFile.overrideType ?? uploadedFile.classification.documentType}
                </span>
                <ConfidenceBadge confidence={uploadedFile.classification.confidence} />
                {uploadedFile.overrideType && (
                  <span className="text-xs text-gray-400">(manually overridden)</span>
                )}
              </div>
              <button
                onClick={() => setShowOverride(!showOverride)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#2A9D8F] hover:text-[#238b7e]"
              >
                <RefreshCw className="h-3 w-3" />
                Override Classification
                <ChevronDown className={cn('h-3 w-3 transition-transform', showOverride && 'rotate-180')} />
              </button>
              {showOverride && (
                <div className="mt-2">
                  <select
                    value={uploadedFile.overrideType ?? uploadedFile.classification.documentType}
                    onChange={(e) => {
                      onOverride(e.target.value);
                      setShowOverride(false);
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function UploadPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [transactionId, setTransactionId] = useState('');

  // Fetch transactions for linking
  const { data: transactionsData } = useQuery<{ transactions: Transaction[] }>({
    queryKey: ['transactions-list'],
    queryFn: () => api<{ transactions: Transaction[] }>('/transactions?pageSize=100'),
  });
  const transactions = transactionsData?.transactions ?? [];

  // Upload + classify mutation
  const uploadMutation = useMutation({
    mutationFn: async (uploadFile: UploadedFile) => {
      const formData = new FormData();
      formData.append('file', uploadFile.file);
      if (transactionId) formData.append('transactionId', transactionId);

      const result = await api<{
        id: string;
        classification: ClassificationResult;
      }>('/documents/upload-and-classify', {
        method: 'POST',
        body: formData,
      });

      return result;
    },
  });

  const addFiles = useCallback((newFiles: File[]) => {
    const uploaded: UploadedFile[] = newFiles.map((f) => ({
      localId: `file-${++fileIdCounter}`,
      file: f,
      status: 'queued' as const,
      progress: 0,
      serverId: null,
      classification: null,
      overrideType: null,
      errorMessage: null,
    }));

    setFiles((prev) => [...prev, ...uploaded]);

    // Start uploading each file
    uploaded.forEach((uf) => {
      processFile(uf.localId);
    });
  }, [transactionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const processFile = async (localId: string) => {
    // Set uploading state
    setFiles((prev) =>
      prev.map((f) =>
        f.localId === localId ? { ...f, status: 'uploading' as const, progress: 30 } : f,
      ),
    );

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setFiles((prev) =>
        prev.map((f) =>
          f.localId === localId && f.status === 'uploading'
            ? { ...f, progress: Math.min(f.progress + 10, 60) }
            : f,
        ),
      );
    }, 300);

    try {
      const fileObj = files.find((f) => f.localId === localId) ??
        (await new Promise<UploadedFile>((resolve) => {
          setFiles((prev) => {
            const found = prev.find((f) => f.localId === localId);
            if (found) resolve(found);
            return prev;
          });
        }));

      // Move to classifying
      clearInterval(progressInterval);
      setFiles((prev) =>
        prev.map((f) =>
          f.localId === localId ? { ...f, status: 'classifying' as const, progress: 75 } : f,
        ),
      );

      const formData = new FormData();
      formData.append('file', fileObj.file);
      if (transactionId) formData.append('transactionId', transactionId);

      const result = await api<{
        id: string;
        classification: ClassificationResult;
      }>('/documents/upload-and-classify', {
        method: 'POST',
        body: formData,
      });

      // Complete
      setFiles((prev) =>
        prev.map((f) =>
          f.localId === localId
            ? {
                ...f,
                status: 'complete' as const,
                progress: 100,
                serverId: result.id,
                classification: result.classification,
              }
            : f,
        ),
      );
    } catch (err) {
      clearInterval(progressInterval);
      setFiles((prev) =>
        prev.map((f) =>
          f.localId === localId
            ? {
                ...f,
                status: 'error' as const,
                progress: 0,
                errorMessage: err instanceof Error ? err.message : 'Upload failed',
              }
            : f,
        ),
      );
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) addFiles(droppedFiles);
    },
    [addFiles],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const removeFile = (localId: string) => {
    setFiles((prev) => prev.filter((f) => f.localId !== localId));
  };

  const overrideType = (localId: string, type: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.localId === localId ? { ...f, overrideType: type } : f)),
    );
  };

  const completedFiles = files.filter((f) => f.status === 'complete');
  const hasInProgress = files.some((f) => f.status === 'uploading' || f.status === 'classifying');
  const allComplete = files.length > 0 && completedFiles.length === files.length;

  // Confirm and save overrides, then redirect
  const confirmMutation = useMutation({
    mutationFn: async () => {
      const overrides = completedFiles
        .filter((f) => f.overrideType !== null && f.serverId !== null)
        .map((f) => ({
          documentId: f.serverId!,
          documentType: f.overrideType!,
        }));

      if (overrides.length > 0) {
        await api('/documents/batch-reclassify', {
          method: 'POST',
          body: JSON.stringify({ overrides }),
        });
      }
    },
    onSuccess: () => {
      addToast({ type: 'success', title: `${completedFiles.length} document(s) saved successfully` });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      // Redirect to the first document or the document list
      if (completedFiles.length === 1 && completedFiles[0].serverId) {
        router.push(`/dashboard/documents/${completedFiles[0].serverId}`);
      } else {
        router.push('/dashboard/documents');
      }
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Save failed', message: err.message });
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/dashboard/documents')}
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Documents
      </button>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Documents</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload documents and let AI automatically classify and organize them
        </p>
      </div>

      {/* Transaction selector */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Link to Transaction (optional)
        </label>
        <select
          value={transactionId}
          onChange={(e) => setTransactionId(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
        >
          <option value="">No transaction -- upload as standalone</option>
          {transactions.map((t) => (
            <option key={t.id} value={t.id}>{t.propertyAddress}</option>
          ))}
        </select>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-8 py-16 transition-all',
          dragActive
            ? 'border-[#2A9D8F] bg-[#2A9D8F]/5 shadow-inner'
            : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50',
        )}
      >
        <CloudUpload
          className={cn(
            'mb-4 h-14 w-14 transition-colors',
            dragActive ? 'text-[#2A9D8F]' : 'text-gray-400',
          )}
        />
        <p className="text-base font-semibold text-gray-700">
          Drop files here or click to browse
        </p>
        <p className="mt-1 text-sm text-gray-500">
          PDF, DOC, DOCX, JPG, PNG -- up to 25MB per file
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* File queue */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              Uploaded Files ({files.length})
            </h2>
            {hasInProgress && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Processing...
              </span>
            )}
          </div>

          {files.map((uf) => (
            <FileRow
              key={uf.localId}
              uploadedFile={uf}
              onRemove={() => removeFile(uf.localId)}
              onOverride={(type) => overrideType(uf.localId, type)}
            />
          ))}
        </div>
      )}

      {/* Confirm & Save */}
      {files.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {allComplete
                ? `${completedFiles.length} document(s) ready to save`
                : hasInProgress
                  ? 'Waiting for uploads to complete...'
                  : 'Some uploads encountered errors'}
            </p>
            {allComplete && (
              <p className="mt-0.5 text-xs text-gray-500">
                Review classifications above, then confirm to save all documents.
              </p>
            )}
          </div>
          <button
            onClick={() => confirmMutation.mutate()}
            disabled={!allComplete || confirmMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#238b7e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirmMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm & Save
          </button>
        </div>
      )}

      {/* Empty state hint */}
      {files.length === 0 && (
        <div className="rounded-lg bg-blue-50 p-4">
          <div className="flex gap-3">
            <Sparkles className="h-5 w-5 flex-shrink-0 text-blue-600" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">AI-Powered Classification</h3>
              <p className="mt-1 text-sm text-blue-700">
                After upload, our AI will automatically classify each document by type (e.g.,
                Purchase Agreement, Disclosure, Inspection Report) with a confidence score. You
                can review and override any classification before saving.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
