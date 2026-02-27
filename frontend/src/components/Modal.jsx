// src/components/Modal.jsx
'use client';

export default function Modal({ open, title, onClose, children, maxWidth = 'max-w-2xl' }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className={`w-full ${maxWidth} bg-white rounded shadow-lg`}>
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <button className="text-sm px-2 py-1 border rounded" onClick={onClose}>✕</button>
                </div>
                <div className="p-4">{children}</div>
            </div>
        </div>
    );
}
