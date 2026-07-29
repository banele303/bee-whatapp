'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Wrench, ShieldCheck, Tag, Box, FileSpreadsheet, ArrowUpRight, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface CatalogItem {
  id: string;
  sku: string;
  oemNumber: string;
  name: string;
  category: string;
  brand: string;
  costPriceZAR: number;
  sellingPriceZAR: number;
  stockQty: number;
  warehouseLocation: string;
}

const INITIAL_CATALOG: CatalogItem[] = [
  {
    id: '1',
    sku: 'BP-TOY-4145',
    oemNumber: '04465-0K280',
    name: '2021 Toyota Hilux 2.8 GD-6 Front Brake Pad Set',
    category: 'Braking System',
    brand: 'Ferodo / Bosch',
    costPriceZAR: 450,
    sellingPriceZAR: 650,
    stockQty: 18,
    warehouseLocation: 'Bin A-12'
  },
  {
    id: '2',
    sku: 'HL-TOY-81110',
    oemNumber: '81110-0E050',
    name: '2023 Toyota Fortuner LED Headlight Assembly (Left)',
    category: 'Lighting & Body',
    brand: 'Depo / OEM Toyota',
    costPriceZAR: 3200,
    sellingPriceZAR: 4500,
    stockQty: 4,
    warehouseLocation: 'Rack L-03'
  },
  {
    id: '3',
    sku: 'WP-VW-06H12',
    oemNumber: '06H121026DD',
    name: 'VW Polo 1.2 TSI Engine Water Pump Assembly',
    category: 'Cooling System',
    brand: 'Febi Bilstein',
    costPriceZAR: 1200,
    sellingPriceZAR: 1750,
    stockQty: 0, // Triggers Stagehand Browser Agent Sourcing!
    warehouseLocation: 'Bin C-04'
  }
];

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>(INITIAL_CATALOG);
  const [searchQuery, setSearchQuery] = useState('');
  const [vinInput, setVinInput] = useState('');
  const [vinResult, setVinResult] = useState<any | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const fetchCatalogFromSupabase = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('parts_catalog').select('*').order('created_at', { ascending: false });
      if (error) return;
      if (data && data.length > 0) {
        const mapped: CatalogItem[] = data.map((p: any) => ({
          id: p.id,
          sku: p.sku,
          oemNumber: p.oem_number || 'N/A',
          name: p.name,
          category: p.category || 'General Auto Parts',
          brand: p.brand || 'Aftermarket',
          costPriceZAR: Number(p.cost_price) || 0,
          sellingPriceZAR: Number(p.selling_price) || 0,
          stockQty: Number(p.stock_qty) || 0,
          warehouseLocation: p.warehouse_location || 'Warehouse'
        }));
        setItems(mapped);
      }
    } catch {
      // Keep initial catalog
    }
  };

  useEffect(() => {
    fetchCatalogFromSupabase();
  }, []);

  const handleSeedCatalog = async () => {
    setIsSeeding(true);
    toast.info('Seeding South African automotive parts database...');
    try {
      const res = await fetch('/api/catalog/seed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to seed');
      toast.success(data.message || 'Successfully seeded catalog database!');
      await fetchCatalogFromSupabase();
    } catch (err: any) {
      toast.error(err?.message || 'Error seeding database');
    } finally {
      setIsSeeding(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.oemNumber.includes(searchQuery)
  );

  const handleDecodeVin = () => {
    if (!vinInput) return;
    setVinResult({
      vin: vinInput.toUpperCase(),
      make: 'Toyota',
      model: 'Hilux 2.8 GD-6 4x4',
      year: 2021,
      engineCode: '1GD-FTV',
      trim: 'Legend 50 Automatic'
    });
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <Wrench className="w-8 h-8 text-orange-500" />
            Auto Parts & Inventory Catalog
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage your OEM cross-references, stock levels, VIN fitment database, and live supplier scouting.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedCatalog}
            disabled={isSeeding}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-emerald-200" />}
            Seed SA Products DB
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Import CSV
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Add New Part SKU
          </button>
        </div>
      </div>

      {/* VIN Decoder Widget */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-md space-y-4">
        <div className="flex items-center gap-2 text-orange-400 font-semibold text-sm">
          <ShieldCheck className="w-5 h-5" />
          <span>INSTANT VIN DECODER & FITMENT SEARCH</span>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            placeholder="Enter 17-character VIN (e.g. WVWZZZAUZHW123456)..."
            value={vinInput}
            onChange={(e) => setVinInput(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm uppercase"
          />
          <button
            onClick={handleDecodeVin}
            className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 font-bold text-sm text-white transition-colors"
          >
            Decode Vehicle Specs
          </button>
        </div>

        {vinResult && (
          <div className="mt-4 p-4 rounded-xl bg-slate-800/90 border border-slate-700 grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400 block">MAKE</span>
              <span className="font-bold text-white text-sm">{vinResult.make}</span>
            </div>
            <div>
              <span className="text-slate-400 block">MODEL</span>
              <span className="font-bold text-white text-sm">{vinResult.model}</span>
            </div>
            <div>
              <span className="text-slate-400 block">YEAR</span>
              <span className="font-bold text-white text-sm">{vinResult.year}</span>
            </div>
            <div>
              <span className="text-slate-400 block">ENGINE CODE</span>
              <span className="font-bold text-orange-400 text-sm">{vinResult.engineCode}</span>
            </div>
            <div>
              <span className="text-slate-400 block">TRIM</span>
              <span className="font-bold text-white text-sm">{vinResult.trim}</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter & Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Part Name, SKU, or OEM Number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-400 text-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Part Name & Category</th>
                <th className="px-6 py-4">OEM Number</th>
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4">Brand</th>
                <th className="px-6 py-4">Price (ZAR)</th>
                <th className="px-6 py-4">Stock Qty</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Tag className="w-3 h-3" />
                      {item.category}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-medium text-slate-900 dark:text-white">
                    {item.oemNumber}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">
                    {item.sku}
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {item.brand}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                    R {item.sellingPriceZAR.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-mono font-bold">
                      <Box className="w-4 h-4 text-slate-400" />
                      {item.stockQty}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {item.stockQty > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        In Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        <ArrowUpRight className="w-3 h-3" />
                        Scout External Supplier
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
