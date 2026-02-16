'use client';

import { useState, useEffect } from 'react';
import {
  Image, Wand2, Download, Eye, RefreshCw, CheckCircle,
  AlertTriangle, ChevronDown, Palette, Type, ToggleLeft,
  Sparkles, Home, Share2, Layout, Layers, Camera, Upload,
} from 'lucide-react';

const projectTypes = [
  { id: "listing", label: "Listing Graphic", icon: "Home" },
  { id: "social", label: "Social Graphic", icon: "Share2" },
  { id: "staging", label: "Virtual Staging", icon: "Layers" },
  { id: "enhancement", label: "Property Enhancement", icon: "Camera" },
  { id: "custom", label: "Custom", icon: "Palette" },
];

const styleOptions = ["Modern", "Classic", "Minimalist", "Luxury", "Rustic", "Contemporary"];
const templateOptions = ["Just Listed", "Under Contract", "Just Sold", "Open House", "Price Reduction", "Custom"];

const mockProperties = [
  { id: "p1", address: "123 Oak Street, Miami, FL 33101", price: "$749,000" },
  { id: "p2", address: "456 Elm Avenue, Fort Lauderdale, FL 33301", price: "$1,250,000" },
  { id: "p3", address: "789 Pine Road, Boca Raton, FL 33432", price: "$925,000" },
];

const mockResults = [
  { id: "r1", thumbnail: "/gen-1.jpg", label: "Variation A" },
  { id: "r2", thumbnail: "/gen-2.jpg", label: "Variation B" },
  { id: "r3", thumbnail: "/gen-3.jpg", label: "Variation C" },
  { id: "r4", thumbnail: "/gen-4.jpg", label: "Variation D" },
];

export default function ImageGeneratorPage() {
  const [selectedType, setSelectedType] = useState("listing");
  const [selectedProperty, setSelectedProperty] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("Just Listed");
  const [selectedStyle, setSelectedStyle] = useState("Modern");
  const [brandingEnabled, setBrandingEnabled] = useState(true);
  const [overlayText, setOverlayText] = useState("");
  const [complianceStatus, setComplianceStatus] = useState("passed");
  const [selectedResult, setSelectedResult] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const iconMap: Record<string, any> = { Home, Share2, Layers, Camera, Palette };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg"><Wand2 className="w-5 h-5 text-white" /></div>
            <div><h1 className="text-xl font-bold text-gray-900">Image Generator</h1><p className="text-sm text-gray-500">Create AI-powered visuals for your listings</p></div>
          </div>
          <div className="flex items-center gap-3">
            <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-secondary)] focus:border-transparent">
              {templateOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {complianceStatus === "passed" ? (<span className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-medium"><CheckCircle className="w-3.5 h-3.5" />Compliant</span>) : (<span className="flex items-center gap-1 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-full text-xs font-medium"><AlertTriangle className="w-3.5 h-3.5" />Review Needed</span>)}
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Project Type */}
        <div className="w-64 bg-white border-r border-gray-200 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Project Type</h3>
          {projectTypes.map((pt) => {
            const IconComp = iconMap[pt.icon];
            return (
              <button key={pt.id} onClick={() => setSelectedType(pt.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${selectedType === pt.id ? "bg-[var(--color-primary)] text-white shadow-md" : "text-gray-600 hover:bg-gray-50"}`}>
                {IconComp && <IconComp className="w-5 h-5" />}
                <span className="text-sm font-medium">{pt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Center - Preview Workspace */}
        <div className="flex-1 p-6 flex flex-col">
          <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center relative overflow-hidden">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Image className="w-12 h-12 text-gray-300" />
              </div>
              <p className="text-gray-400 text-lg font-medium mb-2">Preview will appear here</p>
              <p className="text-gray-300 text-sm">Select options and click Generate to create your image</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button className="px-8 py-3 bg-[var(--color-secondary)] text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"><Sparkles className="w-5 h-5" />Generate</button>
            <button className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all flex items-center gap-2"><RefreshCw className="w-4 h-4" />Regenerate</button>
            <button className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all flex items-center gap-2"><Layers className="w-4 h-4" />Variations</button>
          </div>

          {/* Generated Results Carousel */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Generated Results</h3>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {mockResults.map((result) => (
                <div key={result.id} className={`flex-shrink-0 w-40 rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${selectedResult === result.id ? "border-[var(--color-secondary)] shadow-md" : "border-gray-200 hover:border-gray-300"}`} onClick={() => setSelectedResult(result.id)}>
                  <div className="h-28 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center"><Image className="w-8 h-8 text-gray-300" /></div>
                  <div className="p-2 bg-white">
                    <p className="text-xs font-medium text-gray-700 text-center">{result.label}</p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <button className="p-1 text-gray-400 hover:text-[var(--color-secondary)]"><Eye className="w-3.5 h-3.5" /></button>
                      <button className="p-1 text-gray-400 hover:text-[var(--color-secondary)]"><Download className="w-3.5 h-3.5" /></button>
                      <button className="p-1 text-gray-400 hover:text-[var(--color-secondary)]"><Upload className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Settings */}
        <div className="w-72 bg-white border-l border-gray-200 p-5 space-y-6 overflow-y-auto">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Property</label>
            <select value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-secondary)]">
              <option value="">Select a property...</option>
              {mockProperties.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Style</label>
            <div className="grid grid-cols-2 gap-2">
              {styleOptions.map((style) => (
                <button key={style} onClick={() => setSelectedStyle(style)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${selectedStyle === style ? "bg-[var(--color-primary)] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{style}</button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700">Branding</label>
            <button onClick={() => setBrandingEnabled(\!brandingEnabled)} className={`w-11 h-6 rounded-full transition-colors ${brandingEnabled ? "bg-[var(--color-secondary)]" : "bg-gray-300"}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${brandingEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Color Scheme</label>
            <div className="flex gap-2">
              {["#1B3A5C", "#2A9D8F", "#E76F51", "#264653", "#F4A261"].map((color) => (<button key={color} className="w-8 h-8 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform" style={{ backgroundColor: color }} />))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Overlay Text</label>
            <input type="text" value={overlayText} onChange={(e) => setOverlayText(e.target.value)} placeholder="Enter overlay text..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-secondary)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
