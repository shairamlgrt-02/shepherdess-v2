// @ts-nocheck
import { X } from "lucide-react";

const ImagePreviewModal = ({ src, onClose }) => {
  if (!src) return null;
  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
      onClick={onClose}
    >
      <img
        src={src}
        alt="Payment Proof Full"
        className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
      />
      <button className="absolute top-5 right-5 text-white bg-white/20 p-2 rounded-full hover:bg-white/40">
        <X size={24} />
      </button>
    </div>
  );
};

export default ImagePreviewModal;
