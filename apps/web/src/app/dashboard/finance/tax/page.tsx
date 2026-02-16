'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Printer,
  FileSpreadsheet,
  Save,
  Building2,
  Users,
  Receipt,
} from 'lucide-react';


export default function TaxPreparationPage() {
  const [selectedYear, setSelectedYear] = useState('2025');
  const [cpaNotes, setCpaNotes] = useState('Review Q4 commission adjustments. Verify home office deduction calculations. Follow up on rental income classification for 123 Oak property.');
  const [isLoading, setIsLoading] = useState(true);

  const [vendors1099] = useState([
    { name: 'Coastal Photography Co', type: 'Photography', ytdPayments: 67200, requires1099: true, ein: '**-***4567' },
    { name: 'Premier Home Staging', type: 'Staging', ytdPayments: 54800, requires1099: true, ein: '**-***5678' },
    { name: 'Blue Sky Inspections', type: 'Inspection', ytdPayments: 42100, requires1099: true, ein: '**-***6789' },
    { name: 'Digital Marketing Pros', type: 'Marketing', ytdPayments: 48300, requires1099: true, ein: '**-***7890' },
    { name: 'Cape Fear Title Services', type: 'Title', ytdPayments: 35200, requires1099: false, ein: '**-***8901' },
  ]);

  const [incomeSummary] = useState({
    totalCommissions: 1247850,
    referralFees: 34500,
    otherIncome: 12750,
    totalIncome: 1295100,
  });

  const [expensesByIRS] = useState([
    { category: 'Advertising & Marketing', amount: 48300, irsLine: 'Schedule C, Line 8' },
    { category: 'Car & Truck Expenses', amount: 18200, irsLine: 'Schedule C, Line 9' },
    { category: 'Commissions & Fees', amount: 12400, irsLine: 'Schedule C, Line 10' },
    { category: 'Contract Labor', amount: 164100, irsLine: 'Schedule C, Line 11' },
    { category: 'Insurance (E&O)', amount: 28800, irsLine: 'Schedule C, Line 15' },
    { category: 'Office Expense', amount: 15600, irsLine: 'Schedule C, Line 18' },
    { category: 'Rent (Office)', amount: 36000, irsLine: 'Schedule C, Line 20b' },
    { category: 'Utilities', amount: 8400, irsLine: 'Schedule C, Line 25' },
    { category: 'Other Expenses', amount: 10350, irsLine: 'Schedule C, Line 27a' },
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(val);

  const totalExpenses = expensesByIRS.reduce((sum, e) => sum + e.amount, 0);
  const total1099 = vendors1099.filter(v => v.requires1099).reduce((sum, v) => sum + v.ytdPayments, 0);

  if (isLoading) {
    return (<div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div></div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Inter, sans-serif" }}>Tax Preparation</h1>
          <p className="text-sm text-gray-500 mt-1">1099 tracking, income & expense summaries for tax filing</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium shadow-sm">
              <option value="2025">Tax Year 2025</option>
              <option value="2024">Tax Year 2024</option>
              <option value="2023">Tax Year 2023</option>
            </select>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
            <FileSpreadsheet className="w-4 h-4" /> CSV
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 text-sm font-medium shadow-sm">
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* 1099 Vendors */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-lg font-semibold text-gray-900">1099 Vendors</h2>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Vendors requiring 1099-NEC forms for tax year {selectedYear}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">EIN</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">YTD Payments</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">1099 Required</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vendors1099.map((vendor) => (
                <tr key={vendor.name} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{vendor.name}</td>
                  <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{vendor.type}</span></td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{vendor.ein}</td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900">{formatCurrency(vendor.ytdPayments)}</td>
                  <td className="px-6 py-4 text-center">
                    {vendor.requires1099 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700"><CheckCircle2 className="w-3.5 h-3.5" />Required</span>
                    ) : (
                      <span className="text-xs text-gray-400">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-300">
                <td colSpan={3} className="px-6 py-3 font-bold text-gray-900">Total 1099 Payments</td>
                <td className="px-6 py-3 text-right font-bold text-gray-900">{formatCurrency(total1099)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">Income Summary</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Total Commissions</span>
              <span className="font-semibold text-gray-900">{formatCurrency(incomeSummary.totalCommissions)}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Referral Fees</span>
              <span className="font-semibold text-gray-900">{formatCurrency(incomeSummary.referralFees)}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Other Income</span>
              <span className="font-semibold text-gray-900">{formatCurrency(incomeSummary.otherIncome)}</span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="font-bold text-gray-900">Total Gross Income</span>
              <span className="text-xl font-bold text-green-600">{formatCurrency(incomeSummary.totalIncome)}</span>
            </div>
          </div>
        </div>

        {/* Expense Summary by IRS Category */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-900">Expense Summary (IRS Categories)</h2>
            </div>
          </div>
          <div className="p-6 space-y-3">
            {expensesByIRS.map((exp) => (
              <div key={exp.category} className="flex items-center justify-between py-2 border-b border-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{exp.category}</p>
                  <p className="text-xs text-gray-400">{exp.irsLine}</p>
                </div>
                <span className="font-semibold text-gray-900">{formatCurrency(exp.amount)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <span className="font-bold text-gray-900">Total Deductions</span>
              <span className="text-xl font-bold text-red-600">{formatCurrency(totalExpenses)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 bg-green-50 rounded-lg p-4 -mx-2">
              <span className="font-bold text-green-800">Net Taxable Income</span>
              <span className="text-xl font-bold text-green-700">{formatCurrency(incomeSummary.totalIncome - totalExpenses)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CPA Notes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-lg font-semibold text-gray-900">CPA Notes</h2>
          </div>
          <button className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50">
            <Save className="w-3.5 h-3.5" /> Save Notes
          </button>
        </div>
        <div className="p-6">
          <textarea
            value={cpaNotes}
            onChange={(e) => setCpaNotes(e.target.value)}
            rows={6}
            placeholder="Add notes for your CPA here..."
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
          />
          <p className="text-xs text-gray-400 mt-2">These notes will be included in the exported tax preparation package.</p>
        </div>
      </div>
    </div>
  );
}
