import React, { useState } from 'react';
import {
  Plus,
  Search,
  RefreshCw,
  History,
  Trash2,
  ExternalLink,
  TrendingDown,
  TrendingUp,
  Minus
} from 'lucide-react';
import { Product } from '../types';

interface ProductListProps {
  products: Product[];
  onOpenCreateModal: () => void;
  onOpenHistory: (product: Product) => void;
  onRunCheck: (productId: string) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  checkingProductId: string | null;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  onOpenCreateModal,
  onOpenHistory,
  onRunCheck,
  onDeleteProduct,
  checkingProductId,
}) => {
  const [search, setSearch] = useState('');

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.product_id.toLowerCase().includes(q) ||
      (p.seller && p.seller.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by product name, SKU, or seller..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Register Product</span>
          </button>
        </div>
      </div>

      {/* Product Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 text-xs">
          No registered products matched your query.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((prod) => {
            const currentPrice = prod.latest_price ?? prod.target_price;
            const diff = currentPrice - prod.target_price;
            const isDrop = diff < 0;
            const isChecking = checkingProductId === prod.product_id;

            return (
              <div
                key={prod.product_id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Metadata header */}
                  <div className="flex items-center justify-between text-xs text-slate-500 font-mono mb-2">
                    <span className="truncate max-w-[200px]">{prod.product_id}</span>
                    <span>{prod.observation_count} checks</span>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-sm text-white line-clamp-2 mb-2 leading-snug">
                    {prod.name}
                  </h3>

                  {/* Variant & Seller */}
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-4 truncate">
                    <span>{prod.variant || 'Standard'}</span>
                    <span>·</span>
                    <span>{prod.seller || 'Direct'}</span>
                  </div>

                  {/* Price Comparison block */}
                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 mb-4 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-400">Current Observed:</span>
                      <span className="font-mono font-bold text-base text-white">
                        ${currentPrice.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-slate-400">Target Trigger:</span>
                      <span className="font-mono text-slate-300">
                        ${prod.target_price.toFixed(2)}
                      </span>
                    </div>

                    <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Variance:</span>
                      {isDrop ? (
                        <span className="text-emerald-400 font-semibold font-mono flex items-center gap-1">
                          <TrendingDown className="w-3.5 h-3.5" />
                          -${Math.abs(diff).toFixed(2)} ({((Math.abs(diff) / prod.target_price) * 100).toFixed(1)}% OFF)
                        </span>
                      ) : diff === 0 ? (
                        <span className="text-slate-400 font-mono flex items-center gap-1">
                          <Minus className="w-3.5 h-3.5" /> At target
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-slate-500" /> +${diff.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card footer actions */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onRunCheck(prod.product_id)}
                      disabled={isChecking}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      title="Run real-time probe against mock adapter"
                    >
                      <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                      <span>{isChecking ? 'Checking...' : 'Check Price'}</span>
                    </button>

                    <button
                      onClick={() => onOpenHistory(prod)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md font-medium transition-colors flex items-center gap-1.5"
                      title="View chronological price timeline"
                    >
                      <History className="w-3 h-3 text-slate-400" />
                      <span>History</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <a
                      href={prod.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
                      title="Source URL"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => onDeleteProduct(prod.product_id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete watched product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
