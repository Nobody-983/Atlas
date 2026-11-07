import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { Supplier } from '../../lib/types.js';
import { api } from '../../lib/api.js';
import { Button } from '../common/Button.js';

interface InvoiceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  orgId?: string;
  onUploadSuccess: (data: any) => void;
}

export const InvoiceUploadModal: React.FC<InvoiceUploadModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  orgId,
  onUploadSuccess,
}) => {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [fileName, setFileName] = useState('');
  const [rawText, setRawText] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setRawText(text);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) {
      setError('Please provide a document file name.');
      return;
    }
    if (!rawText.trim()) {
      setError('Please provide invoice text or upload a document.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.uploadInvoice({
        organisationId: orgId,
        supplierId: supplierId || null,
        fileName,
        rawText,
      });

      onUploadSuccess(data);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Upload & Ingest Vendor Invoice</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">ATLAS OCR field extraction and duplicate detection</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* File Selection Zone */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#161B22] border border-dashed border-slate-300 dark:border-white/15 hover:border-emerald-500/40 transition-colors text-center">
            <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <label className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 font-medium cursor-pointer">
              <span>Select invoice file (PDF, TXT, JSON)</span>
              <input
                type="file"
                accept=".txt,.pdf,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <p className="text-[10px] text-slate-500 mt-1">or paste raw invoice remittance text below</p>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-400 mb-1">Associated Supplier</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">-- Detect Automatically from OCR --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.country})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-400 mb-1">Document File Name</label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-400 mb-1">
              Invoice Text Content (Simulating OCR text layer ingestion)
            </label>
            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-[11px] leading-relaxed"
              placeholder="Paste raw invoice text or remittance instructions..."
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-white/8 flex items-center justify-end gap-2">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isLoading} icon={<Upload className="w-4 h-4" />}>
              Process & Extract Intelligence
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

