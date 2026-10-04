import React, { useState, useEffect } from 'react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className={`fixed bottom-8 right-8 z-50 p-4 border-2 border-ink bg-parchment shadow-[8px_8px_0_rgba(44,24,16,0.15)] animate-slide-up flex items-center gap-4`}>
      <div className={`w-3 h-3 ${type === 'success' ? 'bg-water' : 'bg-coral'}`}></div>
      <div className="font-bold text-xs uppercase tracking-widest text-ink pr-8">
        {message}
      </div>
      <button onClick={onClose} className="text-ink hover:text-coral transition-colors font-bold">
        X
      </button>
    </div>
  );
}
