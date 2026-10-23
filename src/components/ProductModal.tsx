import React, { useState } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    product_id: string;
    name: string;
    url: string;
    variant: string;
    seller: string;
    target_price: number;
    currency: string;
  }) => Promise<void>;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [productId, setProductId] = useState('');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [variant, setVariant] = useState('');
  const [seller, setSeller] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const priceNum = parseFloat(targetPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Target price must be a positive number.');
      return;
    }

    if (!productId.trim() || !name.trim() || !url.trim()) {
      setError('Product ID, Name, and URL are required.');
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        product_id: productId.trim(),
        name: name.trim(),
        url: url.trim(),
        variant: variant.trim(),
        seller: seller.trim(),
        target_price: priceNum,
        currency: 'USD',
      });
      // reset
      setProductId('');
      setName('');
      setUrl('');
      setVariant('');
      setSeller('');
      setTargetPrice('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <h2 className="text-lg font-bold text-white tracking-tight">Register Monitored Product</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Set target price and variant specifications for anti-hallucination tracking.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-md text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-slate-300 mb-1">Product ID (Unique Stable SKU)</label>
            <input
              type="text"
              required
              placeholder="e.g. PROD-APL-AIRPODS-MAX"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Product Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Apple AirPods Max Wireless Headphones"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Target Price ($ USD)</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="449.00"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Variant Spec</label>
              <input
                type="text"
                placeholder="e.g. Space Gray / Over-Ear"
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Authorized Seller</label>
              <input
                type="text"
                placeholder="e.g. Apple Direct"
                value={seller}
                onChange={(e) => setSeller(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Store / Page URL</label>
            <input
              type="url"
              required
              placeholder="https://demo-store.internal/items/airpods-max"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? 'Registering...' : 'Register Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
