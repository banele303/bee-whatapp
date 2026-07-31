'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Wrench, ShieldCheck, Tag, Box, FileSpreadsheet, ArrowUpRight, Sparkles, Loader2, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

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

export default function CatalogPage() {
  const router = useRouter();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [vinInput, setVinInput] = useState('');
  const [vinResult, setVinResult] = useState<any | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<CatalogItem>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCatalogFromSupabase = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('parts_catalog').select('*').order('created_at', { ascending: false });
      if (error) return;
      if (data) {
        const mapped: CatalogItem[] = data.map((p: any) => ({
          id: p.id,
          sku: p.sku,
          oemNumber: p.oem_number || 'N/A',
          name: p.name,
          category: p.category || 'General',
          brand: p.brand || 'Aftermarket',
          costPriceZAR: Number(p.cost_price) || 0,
          sellingPriceZAR: Number(p.selling_price) || 0,
          stockQty: Number(p.stock_qty) || 0,
          warehouseLocation: p.warehouse_location || 'Warehouse'
        }));
        setItems(mapped);
      }
    } catch {
      // keep empty
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

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    toast.loading('Importing CSV...', { id: 'csv-import' });
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/catalog/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data?.error || 'Import failed');
      
      toast.success(`Import successful: ${data.imported} products`, { id: 'csv-import' });
      fetchCatalogFromSupabase();
    } catch (err: any) {
      toast.error(err.message, { id: 'csv-import' });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const res = await fetch(`/api/catalog/products/crud?id=${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      toast.success('Item deleted successfully');
      fetchCatalogFromSupabase();
    } catch(err: any) {
      toast.error(err.message);
    }
  };

  const openAddModal = () => {
    setFormData({});
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (item: CatalogItem) => {
    setFormData(item);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        sku: formData.sku,
        oem_number: formData.oemNumber,
        name: formData.name,
        category: formData.category,
        brand: formData.brand,
        cost_price: formData.costPriceZAR,
        selling_price: formData.sellingPriceZAR,
        stock_qty: formData.stockQty,
        warehouse_location: formData.warehouseLocation,
      };

      const res = await fetch('/api/catalog/products/crud', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? { ...payload, id: formData.id } : payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      
      toast.success(isEditing ? 'Item updated' : 'Item added');
      setIsModalOpen(false);
      fetchCatalogFromSupabase();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.oemNumber.includes(searchQuery)
  );

  // TODO: The VIN decoder is hardcoded for demonstration purposes
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
          <h1 className="text-3xl font-extrabold text-foreground flex items-center gap-3">
            <Wrench className="w-8 h-8 text-orange-500" />
            Auto Parts & Inventory Catalog
          </h1>
          <p className="text-muted-foreground mt-1">
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
          
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleImportCsv} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card font-semibold text-sm hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 text-foreground"
          >
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
            Import CSV
          </button>
          
          <button 
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Part SKU
          </button>
        </div>
      </div>

      {/* VIN Decoder Widget */}
      <div className="bg-card text-foreground p-6 rounded-2xl shadow-md space-y-4">
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
            className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm uppercase"
          />
          <button
            onClick={handleDecodeVin}
            className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 font-bold text-sm text-white transition-colors"
          >
            Decode Vehicle Specs
          </button>
        </div>

        {vinResult && (
          <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-border grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-mono">
            <div>
              <span className="text-muted-foreground block">MAKE</span>
              <span className="font-bold text-foreground text-sm">{vinResult.make}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">MODEL</span>
              <span className="font-bold text-foreground text-sm">{vinResult.model}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">YEAR</span>
              <span className="font-bold text-foreground text-sm">{vinResult.year}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">ENGINE CODE</span>
              <span className="font-bold text-orange-400 text-sm">{vinResult.engineCode}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">TRIM</span>
              <span className="font-bold text-foreground text-sm">{vinResult.trim}</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter & Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by Part Name, SKU, or OEM Number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-foreground placeholder-muted-foreground text-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted-foreground">
            <thead className="bg-muted text-muted-foreground text-xs uppercase font-semibold border-b border-border">
              <tr>
                <th className="px-6 py-4">Part Name & Category</th>
                <th className="px-6 py-4">OEM Number</th>
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4">Brand</th>
                <th className="px-6 py-4">Price (ZAR)</th>
                <th className="px-6 py-4">Stock Qty</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-foreground">{item.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Tag className="w-3 h-3" />
                      {item.category}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-medium text-foreground">
                    {item.oemNumber}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                    {item.sku}
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-foreground">
                    {item.brand}
                  </td>
                  <td className="px-6 py-4 font-bold text-foreground">
                    R {item.sellingPriceZAR.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-mono font-bold text-foreground">
                      <Box className="w-4 h-4 text-muted-foreground" />
                      {item.stockQty}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {item.stockQty > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        In Stock
                      </span>
                    ) : (
                      <button 
                        onClick={() => router.push(`/source-parts?q=${encodeURIComponent(item.name)}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        <ArrowUpRight className="w-3 h-3" />
                        Scout External Supplier
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => openEditModal(item)}
                      className="p-2 text-blue-600 hover:bg-muted-foreground dark:hover:bg-blue-900/30 rounded-md transition-colors"
                      title="Edit Part"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-md transition-colors"
                      title="Delete Part"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                    No products found. Add a new part or import a CSV.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden my-8 border border-border">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
              <h2 className="text-xl font-bold text-foreground">
                {isEditing ? 'Edit Part SKU' : 'Add New Part SKU'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-2"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">SKU *</label>
                  <input
                    required
                    type="text"
                    value={formData.sku || ''}
                    onChange={e => setFormData({...formData, sku: e.target.value})}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. BP-TOY-4145"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">OEM Number</label>
                  <input
                    type="text"
                    value={formData.oemNumber || ''}
                    onChange={e => setFormData({...formData, oemNumber: e.target.value})}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. 04465-0K280"
                  />
                </div>
                
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium text-foreground">Part Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.name || ''}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. 2021 Toyota Hilux Front Brake Pads"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Category</label>
                  <input
                    type="text"
                    value={formData.category || ''}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. Braking System"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Brand</label>
                  <input
                    type="text"
                    value={formData.brand || ''}
                    onChange={e => setFormData({...formData, brand: e.target.value})}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. Ferodo"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Cost Price (ZAR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costPriceZAR || ''}
                    onChange={e => setFormData({...formData, costPriceZAR: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Selling Price (ZAR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.sellingPriceZAR || ''}
                    onChange={e => setFormData({...formData, sellingPriceZAR: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stockQty || ''}
                    onChange={e => setFormData({...formData, stockQty: parseInt(e.target.value, 10)})}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Location</label>
                  <input
                    type="text"
                    value={formData.warehouseLocation || ''}
                    onChange={e => setFormData({...formData, warehouseLocation: e.target.value})}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. Bin A-12"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-md border border-input bg-background text-foreground font-medium text-sm hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2 rounded-md bg-orange-600 hover:bg-orange-700 text-white font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isEditing ? 'Save Changes' : 'Add Part'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
