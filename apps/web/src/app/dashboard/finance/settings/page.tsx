'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Plus,
  X,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Link2,
  Unlink,
  Calendar,
  Percent,
  DollarSign,
  Users,
  ArrowRight,
  AlertTriangle,
  Zap,
  Database,
  Edit3,
  Trash2,
} from 'lucide-react';


export default function FinancialSettingsPage() {
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const [defaultStructure] = useState({
    brokeragePercent: 30,
    agentPercent: 70,
    effectiveDate: '2025-01-01',
    franchiseFee: 6,
  });

  const [agentOverrides] = useState([
    { id: '1', agent: 'Sarah Mitchell', brokeragePercent: 25, agentPercent: 75, effectiveDate: '2025-06-01', reason: 'Top producer tier' },
    { id: '2', agent: 'James Rodriguez', brokeragePercent: 28, agentPercent: 72, effectiveDate: '2025-03-15', reason: 'Senior agent agreement' },
    { id: '3', agent: 'Emily Chen', brokeragePercent: 25, agentPercent: 75, effectiveDate: '2025-09-01', reason: 'Performance milestone' },
  ]);

  const [qbConnection] = useState({
    isConnected: true,
    lastSync: '2026-02-15 08:30 AM',
    companyName: 'Coastal Crest Realty LLC',
    syncStatus: 'success',
  });

  const [accountMappings] = useState([
    { category: 'Commission Income', qbAccount: '4000 - Commission Revenue', qbCode: '4000', status: 'mapped' },
    { category: 'Referral Fees', qbAccount: '4100 - Referral Income', qbCode: '4100', status: 'mapped' },
    { category: 'Desk Fee Income', qbAccount: '4200 - Agent Fees', qbCode: '4200', status: 'mapped' },
    { category: 'Photography Expense', qbAccount: '5100 - Marketing Expenses', qbCode: '5100', status: 'mapped' },
    { category: 'Staging Expense', qbAccount: '5100 - Marketing Expenses', qbCode: '5100', status: 'mapped' },
    { category: 'Marketing Expense', qbAccount: '5200 - Advertising', qbCode: '5200', status: 'mapped' },
    { category: 'Insurance (E&O)', qbAccount: '5300 - Insurance Expense', qbCode: '5300', status: 'mapped' },
    { category: 'Office Rent', qbAccount: '5400 - Rent Expense', qbCode: '5400', status: 'mapped' },
    { category: 'Technology Fees', qbAccount: '5500 - Technology', qbCode: '5500', status: 'mapped' },
    { category: 'Agent Payouts', qbAccount: '6000 - Commission Payable', qbCode: '6000', status: 'mapped' },
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  };

  const handleTestConnection = () => {
    setIsTesting(true);
    setTimeout(() => setIsTesting(false), 1500);
  };

  if (isLoading) {
    return (<div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div></div>);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Inter, sans-serif" }}>Financial Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure commission structures and QuickBooks integration</p>
      </div>

      {/* Commission Structure Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-lg font-semibold text-gray-900">Commission Structure</h2>
          </div>
          <button onClick={() => setShowStructureModal(true)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-xs font-medium hover:opacity-90">
            <Plus className="w-3.5 h-3.5" /> Add Structure
          </button>
        </div>
        <div className="p-6">
          {/* Default Structure Card */}
          <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-100 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-primary)] text-white">DEFAULT</span>
              <span className="text-sm text-gray-500">Effective since {defaultStructure.effectiveDate}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Brokerage Split</p>
                <p className="text-2xl font-bold text-[var(--color-primary)]">{defaultStructure.brokeragePercent}%%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Agent Split</p>
                <p className="text-2xl font-bold text-[var(--color-secondary)]">{defaultStructure.agentPercent}%%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Franchise Fee</p>
                <p className="text-2xl font-bold text-gray-700">{defaultStructure.franchiseFee}%%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Effective Date</p>
                <p className="text-lg font-semibold text-gray-700">{defaultStructure.effectiveDate}</p>
              </div>
            </div>
          </div>

          {/* Agent Overrides Table */}
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Agent-Specific Overrides</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border border-gray-200 rounded-t-lg">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Agent</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Brokerage %%</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Agent %%</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Effective Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reason</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 border-x border-b border-gray-200">
                {agentOverrides.map((override) => (
                  <tr key={override.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{override.agent}</td>
                    <td className="px-4 py-3 text-center text-sm">{override.brokeragePercent}%%</td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-[var(--color-secondary)]">{override.agentPercent}%%</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{override.effectiveDate}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{override.reason}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit3 className="w-3.5 h-3.5 text-gray-500" /></button>
                        <button className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* QuickBooks Connection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">QuickBooks Integration</h2>
          </div>
        </div>
        <div className="p-6">
          {/* Connection Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${qbConnection.isConnected ? "bg-green-100" : "bg-red-100"}`}>
                {qbConnection.isConnected ? <Link2 className="w-6 h-6 text-green-600" /> : <Unlink className="w-6 h-6 text-red-600" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{qbConnection.isConnected ? "Connected" : "Disconnected"}</p>
                  {qbConnection.isConnected && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                </div>
                {qbConnection.isConnected && (
                  <div className="text-sm text-gray-500 mt-0.5">
                    <span>{qbConnection.companyName}</span>
                    <span className="mx-2">|</span>
                    <span>Last sync: {qbConnection.lastSync}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {qbConnection.isConnected ? (
                <>
                  <button onClick={handleTestConnection} disabled={isTesting} className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50">
                    <Zap className={`w-4 h-4 ${isTesting ? "animate-pulse" : ""}`} /> {isTesting ? "Testing..." : "Test Connection"}
                  </button>
                  <button onClick={handleSync} disabled={isSyncing} className="inline-flex items-center gap-2 px-3 py-2 bg-[var(--color-secondary)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} /> {isSyncing ? "Syncing..." : "Sync Now"}
                  </button>
                </>
              ) : (
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                  <Link2 className="w-4 h-4" /> Connect to QuickBooks
                </button>
              )}
            </div>
          </div>

          {/* Account Mapping */}
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Account Mapping</h3>
          <p className="text-xs text-gray-500 mb-4">Map CrestDesk categories to QuickBooks chart of accounts</p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">CrestDesk Category</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-10"></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">QB Account</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Code</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 border-x border-b border-gray-200">
                {accountMappings.map((mapping) => (
                  <tr key={mapping.category} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 text-sm">{mapping.category}</td>
                    <td className="px-4 py-3 text-center"><ArrowRight className="w-4 h-4 text-gray-300 mx-auto" /></td>
                    <td className="px-4 py-3 text-sm text-gray-700">{mapping.qbAccount}</td>
                    <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 rounded bg-gray-100 text-xs font-mono text-gray-600">{mapping.qbCode}</span></td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3" />Mapped</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Structure Modal */}
      {showStructureModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Commission Structure</h3>
              <button onClick={() => setShowStructureModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent (leave empty for default)</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Default Structure</option>
                  <option>Sarah Mitchell</option><option>James Rodriguez</option><option>Emily Chen</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brokerage %%</label>
                  <input type="number" placeholder="30" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agent %%</label>
                  <input type="number" placeholder="70" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
                <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Notes</label>
                <textarea rows={2} placeholder="Reason for override..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowStructureModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => setShowStructureModal(false)} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90">Save Structure</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
