import React from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-xl bg-white rounded-card shadow-card border border-slate-200">
        <div className="border-b-2 border-[#E8D7B9] px-5 py-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            {title || "Information"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 text-sm"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto text-sm text-slate-800 space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
};