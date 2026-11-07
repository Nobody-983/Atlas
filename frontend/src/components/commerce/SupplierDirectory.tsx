import React, { useState } from 'react';
import { Building2, Mail, Phone, Globe, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { Supplier } from '../../lib/types.js';
import { formatMinorUnits } from '../../lib/formatters.js';
import { Button } from '../common/Button.js';
import { Badge } from '../common/Badge.js';

interface SupplierDirectoryProps {
  suppliers: Supplier[];
  onOpenCreateSupplier: () => void;
  onSelectSupplier: (s: Supplier) => void;
}

export const SupplierDirectory: React.FC<SupplierDirectoryProps> = ({
  suppliers,
  onOpenCreateSupplier,
  onSelectSupplier,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Supplier & Contractor Directory</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
              COMMERCE RELATIONSHIPS
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Global vendors, verified corporate entities, tax registrations, and payment routing profiles.
          </p>
        </div>

        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={onOpenCreateSupplier}>
          Add Supplier
        </Button>
      </div>

      {suppliers.length === 0 ? (
        <div className="py-16 text-center rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 p-8 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">No suppliers registered yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-6">
            Add international suppliers and vendors to begin issuing automated cross-border payouts and managing invoice reconciliation.
          </p>
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={onOpenCreateSupplier}>
            Add First Supplier
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="p-5 rounded-xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/8 hover:border-slate-300 dark:hover:border-white/15 transition-all flex flex-col justify-between shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-[#161B22] border border-slate-200 dark:border-white/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                    {s.name.slice(0, 2).toUpperCase()}
                  </div>
                  <Badge status={s.verification_status} />
                </div>

                <h3 className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-1">{s.name}</h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                  <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span>{s.country} • {s.business_type.replace('_', ' ').toUpperCase()}</span>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{s.contact_email}</span>
                  </div>
                  {s.tax_id && (
                    <div className="text-[11px] text-slate-500 font-mono">
                      Tax ID: {s.tax_id}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/8 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono">Total Paid</div>
                  <div className="font-bold text-slate-900 dark:text-white tabular-nums text-sm">
                    {formatMinorUnits(s.total_paid_minor, 'USD')}
                  </div>
                </div>

                <button
                  onClick={() => onSelectSupplier(s)}
                  className="px-2.5 py-1 rounded bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-xs"
                >
                  View History
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

