'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Star,
  ChevronDown,
  ChevronUp,
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Filter,
  ArrowUpDown,
} from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  type: string;
  ytdPayments: number;
  avgTurnaround: string;
  rating: number;
  requires1099: boolean;
  phone: string;
  email: string;
  address: string;
  paymentHistory: { date: string; amount: number; description: string }[];
}

export default function VendorManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [vendors] = useState([
    { id: '1', name: 'Coastal Photography Co', type: 'Photography', ytdPayments: 67200, avgTurnaround: '2 days', rating: 5, requires1099: true, phone: '(555) 123-4567', email: 'info@coastalphoto.com', address: '100 Beach Rd, Wilmington NC', paymentHistory: [{ date: '2026-02-01', amount: 1350, description: '3 property shoots' }, { date: '2026-01-15', amount: 900, description: '2 property shoots' }] },
    { id: '2', name: 'Premier Home Staging', type: 'Staging', ytdPayments: 54800, avgTurnaround: '5 days', rating: 4, requires1099: true, phone: '(555) 234-5678', email: 'book@premierstaging.com', address: '250 Design Blvd, Wilmington NC', paymentHistory: [{ date: '2026-02-05', amount: 2800, description: 'Full staging - 456 Elm' }, { date: '2026-01-20', amount: 3200, description: 'Full staging - 789 Oak' }] },
    { id: '3', name: 'Blue Sky Inspections', type: 'Inspection', ytdPayments: 42100, avgTurnaround: '3 days', rating: 5, requires1099: true, phone: '(555) 345-6789', email: 'schedule@bluesky.com', address: '75 Main St, Wilmington NC', paymentHistory: [{ date: '2026-02-11', amount: 575, description: 'Inspection - 789 Pine' }] },
    { id: '4', name: 'Cape Fear Title Services', type: 'Title', ytdPayments: 35200, avgTurnaround: '7 days', rating: 4, requires1099: false, phone: '(555) 456-7890', email: 'closings@cfts.com', address: '500 Market St, Wilmington NC', paymentHistory: [{ date: '2026-02-09', amount: 425, description: 'Title search - 555 Cedar' }] },
    { id: '5', name: 'Digital Marketing Pros', type: 'Marketing', ytdPayments: 48300, avgTurnaround: '1 day', rating: 3, requires1099: true, phone: '(555) 567-8901', email: 'campaigns@dmpros.com', address: '200 Tech Park, Wilmington NC', paymentHistory: [{ date: '2026-02-12', amount: 1200, description: 'Facebook Q1 campaign' }] },
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(val);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-4 h-4 ${i < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
    ));
  };

  if (isLoading) {
    return (<div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div></div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Inter, sans-serif" }}>Vendor Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage vendor relationships, payments, and 1099 tracking</p>
        </div>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 text-sm font-medium shadow-sm">
          <Plus className="w-4 h-4" /> Add Vendor
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search vendors..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="all">All Types</option>
            <option value="photography">Photography</option>
            <option value="staging">Staging</option>
            <option value="inspection">Inspection</option>
            <option value="title">Title</option>
            <option value="marketing">Marketing</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="name">Sort by Name</option>
            <option value="spending">Sort by Spending</option>
            <option value="rating">Sort by Rating</option>
          </select>
        </div>
      </div>

      {/* Vendor Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">YTD Payments</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Turnaround</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Rating</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">1099</th>
                <th className="px-6 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vendors.map((vendor) => (
                <>
                  <tr key={vendor.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setExpandedVendor(expandedVendor === vendor.id ? null : vendor.id)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--color-secondary)] text-white flex items-center justify-center text-sm font-semibold">
                          {vendor.name.split(" ").map(w => w[0]).join("").slice(0,2)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{vendor.name}</p>
                          <p className="text-xs text-gray-500">{vendor.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{vendor.type}</span></td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">{formatCurrency(vendor.ytdPayments)}</td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">{vendor.avgTurnaround}</td>
                    <td className="px-6 py-4"><div className="flex items-center justify-center gap-0.5">{renderStars(vendor.rating)}</div></td>
                    <td className="px-6 py-4 text-center">
                      {vendor.requires1099 ? <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">Required</span> : <span className="text-xs text-gray-400">N/A</span>}
                    </td>
                    <td className="px-6 py-4">
                      {expandedVendor === vendor.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </td>
                  </tr>
                  {expandedVendor === vendor.id && (
                    <tr key={`${vendor.id}-details`}>
                      <td colSpan={7} className="px-6 py-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Contact Info</h4>
                            <div className="space-y-2 text-sm text-gray-600">
                              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" />{vendor.phone}</div>
                              <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" />{vendor.email}</div>
                              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" />{vendor.address}</div>
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Recent Payments</h4>
                            <div className="space-y-2">
                              {vendor.paymentHistory.map((p, i) => (
                                <div key={i} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{p.description}</p>
                                    <p className="text-xs text-gray-500">{p.date}</p>
                                  </div>
                                  <span className="font-semibold text-gray-900">{formatCurrency(p.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vendor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New Vendor</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                <input type="text" placeholder="Enter vendor name" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option>Photography</option><option>Staging</option><option>Inspection</option><option>Title</option><option>Marketing</option><option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" placeholder="(555) 000-0000" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" placeholder="vendor@email.com" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input type="text" placeholder="Full address" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="req1099" className="rounded border-gray-300" />
                <label htmlFor="req1099" className="text-sm text-gray-700">Requires 1099</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90">Save Vendor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
