'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import { addToast } from '../../../../hooks/use-toast';
import { Shield, Plus, X } from 'lucide-react';
import { cn } from '../../../../lib/utils';

const CATEGORIES = [
  'advertising', 'disclosure', 'signature', 'privacy', 'retention', 'commission',
];

const ENFORCEMENT_COLORS: Record<string, string> = {
  block: 'bg-red-100 text-red-800',
  warn: 'bg-yellow-100 text-yellow-800',
  require: 'bg-blue-100 text-blue-800',
  insert: 'bg-green-100 text-green-800',
};

const CONTENT_TYPES = ['social_post', 'email', 'document', 'listing_image', 'video'];

export default function ComplianceSettingsPage() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    category: 'advertising',
    title: '',
    description: '',
    enforcement: 'warn',
    appliesTo: [] as string[],
  });

  const { data: compliance, isLoading } = useQuery({
    queryKey: ['tenant-compliance'],
    queryFn: () => api<any>('/tenant/compliance'),
  });

  const addRule = useMutation({
    mutationFn: (data: any) =>
      api('/tenant/compliance/rules', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-compliance'] });
      setShowAddForm(false);
      setFormData({ category: 'advertising', title: '', description: '', enforcement: 'warn', appliesTo: [] });
      addToast({ type: 'success', title: 'Custom rule added' });
    },
    onError: () => {
      addToast({ type: 'error', title: 'Failed to add rule' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description || formData.appliesTo.length === 0) {
      addToast({ type: 'warning', title: 'Please fill all required fields' });
      return;
    }
    addRule.mutate(formData);
  };

  const toggleAppliesTo = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      appliesTo: prev.appliesTo.includes(type)
        ? prev.appliesTo.filter((t) => t !== type)
        : [...prev.appliesTo, type],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A5C]" />
      </div>
    );
  }

  const federal = compliance?.federal ?? [];
  const state = compliance?.state ?? [];
  const custom = compliance?.custom ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Compliance Rules</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage federal, state, and custom compliance rules for your brokerage
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B3A5C] text-white rounded-lg text-sm font-medium hover:bg-[#2A4F7A]"
        >
          <Plus className="h-4 w-4" />
          Add Custom Rule
        </button>
      </div>

      {/* Add Custom Rule Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium">New Custom Rule</h3>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enforcement</label>
                <select
                  value={formData.enforcement}
                  onChange={(e) => setFormData((p) => ({ ...p, enforcement: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="block">Block</option>
                  <option value="warn">Warn</option>
                  <option value="require">Require</option>
                  <option value="insert">Insert</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g., Brokerage Branding Requirement"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Describe what this rule enforces..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Applies To</label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleAppliesTo(type)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium border',
                      formData.appliesTo.includes(type)
                        ? 'bg-[#2A9D8F] text-white border-[#2A9D8F]'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400',
                    )}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                type="submit"
                disabled={addRule.isPending}
                className="px-4 py-2 bg-[#1B3A5C] text-white rounded-lg text-sm font-medium hover:bg-[#2A4F7A] disabled:opacity-50"
              >
                {addRule.isPending ? 'Adding...' : 'Add Rule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Federal Rules */}
      <RuleSection title="Federal Rules" rules={federal} icon={<Shield className="h-5 w-5 text-red-600" />} />

      {/* State Rules */}
      <RuleSection title="State Rules" rules={state} icon={<Shield className="h-5 w-5 text-blue-600" />} />

      {/* Custom Rules */}
      <RuleSection title="Custom Brokerage Rules" rules={custom} icon={<Shield className="h-5 w-5 text-[#2A9D8F]" />} />
    </div>
  );
}

function RuleSection({ title, rules, icon }: { title: string; rules: any[]; icon: React.ReactNode }) {
  if (rules.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
        {icon}
        <h3 className="text-base font-medium text-gray-900">{title}</h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{rules.length}</span>
      </div>
      <div className="divide-y divide-gray-50">
        {rules.map((rule: any, i: number) => (
          <div key={rule.id ?? i} className="px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium text-gray-900">{rule.title}</h4>
                  <span className={cn('px-2 py-0.5 rounded text-xs font-medium', ENFORCEMENT_COLORS[rule.enforcement] ?? 'bg-gray-100 text-gray-600')}>
                    {rule.enforcement}
                  </span>
                  <span className="text-xs text-gray-400">{rule.category}</span>
                </div>
                <p className="text-sm text-gray-600">{rule.description}</p>
                {rule.appliesTo && (
                  <div className="flex gap-1 mt-2">
                    {rule.appliesTo.map((t: string) => (
                      <span key={t} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                        {t.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
