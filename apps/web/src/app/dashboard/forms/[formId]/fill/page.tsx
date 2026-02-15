'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import {
  Save,
  CheckCircle2,
  Eye,
  Send,
  Wand2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  BookOpen,
  Plus,
  ArrowLeft,
  MapPin,
  Users,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormField {
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'textarea';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  dependsOn?: {
    field: string;
    value: string | boolean | number;
  };
  group?: string;
}

interface FormSchema {
  fields: Record<string, FormField>;
  groups?: { key: string; label: string }[];
}

interface FormTemplateDetail {
  id: string;
  name: string;
  type: string;
  jurisdiction: string;
  version: string;
  jsonSchema: FormSchema;
}

interface TransactionContext {
  id: string;
  address: string;
  buyerName: string;
  sellerName: string;
  buyerAgent: string;
  sellerAgent: string;
  listPrice: number;
  contractPrice: number;
  closingDate: string;
  propertyType: string;
}

interface ClauseItem {
  id: string;
  title: string;
  text: string;
  category: string;
}

interface ClausesResponse {
  clauses: ClauseItem[];
}

// ---------------------------------------------------------------------------
// Field Renderer
// ---------------------------------------------------------------------------

function FieldInput({
  fieldKey,
  field,
  value,
  onChange,
  hasError,
}: {
  fieldKey: string;
  field: FormField;
  value: string | boolean | number;
  onChange: (key: string, val: string | boolean | number) => void;
  hasError: boolean;
}) {
  const baseClasses = cn(
    'w-full rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-1',
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-[#2A9D8F] focus:ring-[#2A9D8F]',
  );

  switch (field.type) {
    case 'text':
      return (
        <input
          type="text"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          placeholder={field.placeholder}
          className={baseClasses}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={typeof value === 'number' ? value : ''}
          onChange={(e) =>
            onChange(
              fieldKey,
              e.target.value === '' ? '' : Number(e.target.value),
            )
          }
          placeholder={field.placeholder}
          className={baseClasses}
        />
      );

    case 'date':
      return (
        <input
          type="date"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className={baseClasses}
        />
      );

    case 'boolean':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(fieldKey, e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-[#2A9D8F] focus:ring-[#2A9D8F]"
          />
          <span className="text-sm text-gray-700">{field.placeholder ?? 'Yes'}</span>
        </label>
      );

    case 'select':
      return (
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className={baseClasses}
        >
          <option value="">Select...</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    case 'textarea':
      return (
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className={baseClasses}
        />
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Progress Bar
// ---------------------------------------------------------------------------

function ProgressBar({
  filled,
  total,
}: {
  filled: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((filled / total) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
        <span>Completion</span>
        <span className="font-medium text-gray-700">
          {filled} / {total} required fields
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-[#2A9D8F]' : 'bg-amber-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-right text-xs font-medium text-gray-500">{pct}%</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clause Sidebar Item
// ---------------------------------------------------------------------------

function ClauseCard({
  clause,
  onInsert,
}: {
  clause: ClauseItem;
  onInsert: (text: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-xs font-medium text-gray-800 line-clamp-1">
          {clause.title}
        </span>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
        )}
      </button>
      {expanded && (
        <div className="mt-2">
          <p className="text-xs text-gray-600 leading-relaxed">{clause.text}</p>
          <button
            type="button"
            onClick={() => onInsert(clause.text)}
            className="mt-2 inline-flex items-center gap-1 rounded bg-[#1B3A5C] px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-[#2A4F7A]"
          >
            <Plus className="h-3 w-3" />
            Insert
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function FormFillPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const formId = params.formId as string;
  const transactionId = searchParams.get('transactionId');

  const [formValues, setFormValues] = useState<Record<string, string | boolean | number>>({});
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());
  const [hasValidated, setHasValidated] = useState(false);
  const [clauseSidebarOpen, setClauseSidebarOpen] = useState(true);

  // Fetch form template
  const { data: formTemplate, isLoading: formLoading } = useQuery({
    queryKey: ['form-template', formId],
    queryFn: () => api<FormTemplateDetail>(`/forms/${formId}`),
    enabled: Boolean(formId),
  });

  // Fetch transaction context
  const { data: transaction } = useQuery({
    queryKey: ['transaction-context', transactionId],
    queryFn: () => api<TransactionContext>(`/transactions/${transactionId}`),
    enabled: Boolean(transactionId),
  });

  // Fetch clauses
  const { data: clausesData } = useQuery({
    queryKey: ['clauses', formTemplate?.jurisdiction],
    queryFn: () =>
      api<ClausesResponse>(
        `/clauses?jurisdiction=${encodeURIComponent(formTemplate?.jurisdiction ?? '')}`,
      ),
    enabled: Boolean(formTemplate?.jurisdiction),
  });

  const clauses = clausesData?.clauses ?? [];
  const schema = formTemplate?.jsonSchema;
  const fields = schema?.fields ?? {};
  const groups = schema?.groups ?? [];

  // Derive visible fields based on conditional logic
  const visibleFields = useMemo(() => {
    const result: Record<string, FormField> = {};
    for (const [key, field] of Object.entries(fields)) {
      if (field.dependsOn) {
        const depVal = formValues[field.dependsOn.field];
        if (depVal !== field.dependsOn.value) {
          continue;
        }
      }
      result[key] = field;
    }
    return result;
  }, [fields, formValues]);

  // Required field statistics
  const requiredFields = useMemo(
    () => Object.entries(visibleFields).filter(([, f]) => f.required),
    [visibleFields],
  );

  const filledRequired = useMemo(
    () =>
      requiredFields.filter(([key]) => {
        const val = formValues[key];
        if (val === undefined || val === null || val === '') return false;
        if (typeof val === 'boolean') return true;
        return true;
      }),
    [requiredFields, formValues],
  );

  // Handle field change
  const handleFieldChange = useCallback(
    (key: string, val: string | boolean | number) => {
      setFormValues((prev) => ({ ...prev, [key]: val }));
      if (hasValidated) {
        setValidationErrors((prev) => {
          const next = new Set(prev);
          const field = visibleFields[key];
          if (field?.required && (val === '' || val === undefined || val === null)) {
            next.add(key);
          } else {
            next.delete(key);
          }
          return next;
        });
      }
    },
    [hasValidated, visibleFields],
  );

  // Auto-fill from transaction
  const handleAutoFill = useCallback(() => {
    if (!transaction) {
      addToast({ type: 'warning', title: 'No transaction linked to auto-fill from' });
      return;
    }
    const autoMap: Record<string, string | number> = {
      buyer_name: transaction.buyerName,
      seller_name: transaction.sellerName,
      buyer_agent: transaction.buyerAgent,
      seller_agent: transaction.sellerAgent,
      property_address: transaction.address,
      list_price: transaction.listPrice,
      contract_price: transaction.contractPrice,
      closing_date: transaction.closingDate,
      property_type: transaction.propertyType,
    };
    setFormValues((prev) => {
      const next = { ...prev };
      for (const [key, val] of Object.entries(autoMap)) {
        if (key in visibleFields && val !== undefined && val !== null) {
          next[key] = val;
        }
      }
      return next;
    });
    addToast({ type: 'success', title: 'Fields auto-filled from transaction data' });
  }, [transaction, visibleFields]);

  // Validate
  const handleValidate = useCallback(() => {
    const errors = new Set<string>();
    for (const [key, field] of Object.entries(visibleFields)) {
      if (field.required) {
        const val = formValues[key];
        if (val === undefined || val === null || val === '') {
          errors.add(key);
        }
      }
    }
    setValidationErrors(errors);
    setHasValidated(true);

    if (errors.size === 0) {
      addToast({ type: 'success', title: 'All required fields are valid' });
    } else {
      addToast({
        type: 'error',
        title: `${errors.size} required field${errors.size > 1 ? 's' : ''} missing`,
      });
    }
    return errors.size === 0;
  }, [visibleFields, formValues]);

  // Save draft mutation
  const saveDraft = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api(`/forms/${formId}/drafts`, {
        method: 'POST',
        body: JSON.stringify({
          transactionId,
          values: data,
        }),
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Draft saved successfully' });
    },
    onError: () => {
      addToast({ type: 'error', title: 'Failed to save draft' });
    },
  });

  // Send for signature mutation
  const sendForSignature = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api(`/forms/${formId}/send`, {
        method: 'POST',
        body: JSON.stringify({
          transactionId,
          values: data,
        }),
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Form sent for signature' });
      router.push('/dashboard/forms');
    },
    onError: () => {
      addToast({ type: 'error', title: 'Failed to send for signature' });
    },
  });

  // Insert clause text into a focused textarea field
  const handleInsertClause = useCallback((text: string) => {
    // Find the first textarea field and append the clause
    const textareaKey = Object.entries(visibleFields).find(
      ([, f]) => f.type === 'textarea',
    );
    if (textareaKey) {
      const [key] = textareaKey;
      setFormValues((prev) => {
        const existing = typeof prev[key] === 'string' ? prev[key] : '';
        return {
          ...prev,
          [key]: existing ? `${existing}\n\n${text}` : text,
        };
      });
      addToast({ type: 'info', title: 'Clause inserted' });
    } else {
      addToast({ type: 'warning', title: 'No text area field found to insert clause' });
    }
  }, [visibleFields]);

  // Group fields for rendering
  const groupedFields = useMemo(() => {
    if (groups.length === 0) {
      return [{ key: '_all', label: 'Form Fields', fields: Object.entries(visibleFields) }];
    }
    const result = groups.map((g) => ({
      key: g.key,
      label: g.label,
      fields: Object.entries(visibleFields).filter(([, f]) => f.group === g.key),
    }));
    const ungrouped = Object.entries(visibleFields).filter(
      ([, f]) => !f.group || !groups.some((g) => g.key === f.group),
    );
    if (ungrouped.length > 0) {
      result.push({ key: '_other', label: 'Other Fields', fields: ungrouped });
    }
    return result.filter((g) => g.fields.length > 0);
  }, [groups, visibleFields]);

  const isFormValid = hasValidated && validationErrors.size === 0;

  // Loading state
  if (formLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A5C]" />
      </div>
    );
  }

  if (!formTemplate) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-10 w-10 text-gray-300" />
        <p className="mt-3 text-sm text-gray-500">Form template not found</p>
        <button
          type="button"
          onClick={() => router.push('/dashboard/forms')}
          className="mt-4 inline-flex items-center gap-1 text-sm text-[#2A9D8F] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Forms Library
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/forms')}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {formTemplate.name}
            </h1>
            <p className="text-xs text-gray-500">
              {formTemplate.type} &middot; {formTemplate.jurisdiction} &middot; v
              {formTemplate.version}
            </p>
          </div>
        </div>
        {transaction && (
          <button
            type="button"
            onClick={handleAutoFill}
            className="inline-flex items-center gap-2 rounded-lg border border-[#2A9D8F] px-3.5 py-2 text-sm font-medium text-[#2A9D8F] transition-colors hover:bg-[#2A9D8F]/5"
          >
            <Wand2 className="h-4 w-4" />
            Auto-Fill from Transaction
          </button>
        )}
      </div>

      {/* ── Main Layout ── */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* ── Left Panel (Form Fields) ── */}
        <div className="flex-1 lg:w-[70%]">
          <div className="space-y-6">
            {groupedFields.map((group) => (
              <div
                key={group.key}
                className="rounded-lg border border-gray-200 bg-white shadow-sm"
              >
                <div className="border-b border-gray-100 px-5 py-3">
                  <h2 className="text-sm font-semibold text-gray-800">
                    {group.label}
                  </h2>
                </div>
                <div className="space-y-4 p-5">
                  {group.fields.map(([key, field]) => (
                    <div key={key}>
                      <label
                        htmlFor={key}
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        {field.label}
                        {field.required && (
                          <span className="ml-1 text-red-500">*</span>
                        )}
                      </label>
                      <FieldInput
                        fieldKey={key}
                        field={field}
                        value={formValues[key] ?? ''}
                        onChange={handleFieldChange}
                        hasError={validationErrors.has(key)}
                      />
                      {validationErrors.has(key) && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                          <AlertCircle className="h-3 w-3" />
                          This field is required
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Panel (Sidebar) ── */}
        <div className="lg:w-[30%]">
          <div className="space-y-4 lg:sticky lg:top-4">
            {/* Progress */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">
                Form Progress
              </h3>
              <ProgressBar
                filled={filledRequired.length}
                total={requiredFields.length}
              />
            </div>

            {/* Transaction Context */}
            {transaction && (
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                  <MapPin className="h-4 w-4 text-[#1B3A5C]" />
                  Transaction
                </h3>
                <div className="space-y-2 text-xs text-gray-600">
                  <div>
                    <span className="font-medium text-gray-700">Address:</span>{' '}
                    {transaction.address}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span className="font-medium text-gray-700">Buyer:</span>{' '}
                    {transaction.buyerName}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span className="font-medium text-gray-700">Seller:</span>{' '}
                    {transaction.sellerName}
                  </div>
                  {transaction.closingDate && (
                    <div>
                      <span className="font-medium text-gray-700">Closing:</span>{' '}
                      {new Date(transaction.closingDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Clause Library */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setClauseSidebarOpen(!clauseSidebarOpen)}
                className="flex w-full items-center justify-between p-4"
              >
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                  <BookOpen className="h-4 w-4 text-[#1B3A5C]" />
                  Clause Library
                </h3>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-gray-400 transition-transform',
                    !clauseSidebarOpen && '-rotate-90',
                  )}
                />
              </button>
              {clauseSidebarOpen && (
                <div className="space-y-2 border-t border-gray-100 p-4">
                  {clauses.length > 0 ? (
                    clauses.map((clause) => (
                      <ClauseCard
                        key={clause.id}
                        clause={clause}
                        onInsert={handleInsertClause}
                      />
                    ))
                  ) : (
                    <p className="py-4 text-center text-xs text-gray-400">
                      No clauses available for this jurisdiction
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Action Bar ── */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-gray-200 bg-white px-4 py-3 shadow-lg lg:-mx-6 lg:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => saveDraft.mutate(formValues)}
            disabled={saveDraft.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {saveDraft.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Draft
          </button>
          <button
            type="button"
            onClick={handleValidate}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#2A9D8F] px-4 py-2 text-sm font-medium text-[#2A9D8F] transition-colors hover:bg-[#2A9D8F]/5"
          >
            <CheckCircle2 className="h-4 w-4" />
            Validate
          </button>
          <button
            type="button"
            onClick={() => {
              addToast({ type: 'info', title: 'Preview opening...' });
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <button
            type="button"
            onClick={() => {
              if (handleValidate()) {
                sendForSignature.mutate(formValues);
              }
            }}
            disabled={!isFormValid || sendForSignature.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1B3A5C] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#2A4F7A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sendForSignature.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send for Signature
          </button>
        </div>
      </div>
    </div>
  );
}
