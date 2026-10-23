import React from 'react';
import { X, TrendingDown, Clock, ShieldCheck, ExternalLink } from 'lucide-react';
import { Product, PriceObservation } from '../types';

interface PriceHistoryModalProps {
  product: Product | null;
  history: PriceObservation[];
  isLoading: boolean;
  onClose: () => void;
}

export const PriceHistoryModal: React.FC<PriceHistoryModalProps> = ({
  product,
  history,
  isLoading,
  onClose,
}) => {
  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative text-slate-100 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mb-1">
              <span>{product.product_id}</span>
              <span>·</span>
              <span>{product.seller || 'Direct'}</span>
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">{product.name}</h2>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
              <span>Target: <strong className="text-white font-mono">${product.target_price.toFixed(2)}</strong></span>
              <span>·</span>
              <span>Current: <strong className="text-emerald-400 font-mono">${(product.latest_price ?? product.target_price).toFixed(2)}</strong></span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2.5">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500 text-xs">Loading price observations...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">No price observations recorded yet.</div>
          ) : (
            history.map((obs) => {
              const isBelowTarget = obs.observed_price < product.target_price;
              const dateStr = new Date(obs.timestamp).toLocaleString();

              return (
                <div
                  key={obs.id}
                  className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-sm text-white">
                        ${obs.observed_price.toFixed(2)} {obs.currency}
                      </span>
                      {isBelowTarget && (
                        <span className="text-emerald-400 text-xs font-medium flex items-center gap-1">
                          <TrendingDown className="w-3.5 h-3.5" />
                          ${(product.target_price - obs.observed_price).toFixed(2)} below target
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <span>{obs.variant_observed || product.variant || 'Standard'}</span>
                      <span>·</span>
                      <span>{obs.seller_observed || product.seller || 'Merchant'}</span>
                    </div>
                  </div>

                  <div className="text-right text-slate-500 font-mono flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{dateStr}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cryptographically sealed SQLite evidence trail</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
