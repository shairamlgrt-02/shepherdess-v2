// @ts-nocheck
import { X } from "lucide-react";

const OrderReceiptModal = ({ order, onClose }) => {
  if (!order) return null;

  // ✨ SMART MATH
  const subtotal = order.subtotal !== undefined
    ? order.subtotal
    : Object.values(order.items || {}).reduce((sum, item) => sum + ((item.price || 0) * (item.qty || 1)), 0);

  const deliveryFee = order.deliveryFee || 0;
  const discount = order.discount || 0;
  const promoCode = order.promoCode || null;

  const total = order.total !== undefined ? order.total : Math.max(0, subtotal + deliveryFee - discount);

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center p-4">
      <div className="relative w-full max-w-[360px] my-8">
        <div className="bg-white shadow-2xl rounded-sm p-6 flex flex-col items-center text-gray-800 font-sans relative">

          <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-red-500">
            <X size={24} />
          </button>

          {/* Aesthetic Header */}
          <div className="flex flex-col items-center mb-6 mt-2">
            <div className="bg-[#8B5CF6] text-white w-12 h-12 rounded-full flex items-center justify-center mb-2 shadow-sm">
              <span className="font-serif text-2xl italic">S</span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-gray-900 tracking-tight">Shepherdess</h1>
            <p className="text-[10px] font-bold text-[#8B5CF6] tracking-[0.25em] uppercase mt-1">K-BEAUTY</p>
          </div>

          <div className="w-full text-center mb-4">
            <h2 className="text-lg font-bold text-[#7C3AED] uppercase tracking-wide">
              ORDER ID: {order.orderId}
            </h2>
            <p className="text-[10px] text-gray-400">{new Date(order.date).toLocaleDateString()}</p>
          </div>

          <div className="w-full border-t-2 border-[#7C3AED] border-dashed mb-5"></div>

          {/* Customer Details */}
          <div className="w-full text-sm space-y-2 mb-6 font-medium text-gray-700">
            <div className="flex justify-between">
              <span className="font-bold">Customer:</span>
              <span>{order.customer?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Phone:</span>
              <span>{order.customer?.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Method:</span>
              <span className="uppercase">{order.customer?.deliveryMethod}</span>
            </div>
          </div>

          <div className="w-full border-t border-gray-100 mb-5"></div>

          {/* Items */}
          <div className="w-full space-y-3 mb-6">
            {Object.values(order.items || {}).map((item, i) => (
              <div key={i} className="flex justify-between items-start text-sm">
                <div className="flex gap-2">
                  <span className="font-bold text-gray-900">{item.qty}x</span>
                  <span className="text-gray-700 max-w-[160px]">{item.name}</span>
                </div>
                <span className="font-mono">{(item.price * item.qty).toFixed(3)}</span>
              </div>
            ))}
          </div>

          <div className="w-full border-t-2 border-gray-800 mb-6"></div>

          {/* ✨ UPGRADED TOTALS SECTION */}
          <div className="w-full space-y-2 mb-8">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>{subtotal.toFixed(3)} BHD</span>
            </div>

            <div className="flex justify-between text-sm text-gray-500">
              <span>Delivery Fee</span>
              <span>{deliveryFee.toFixed(3)} BHD</span>
            </div>

            {/* 🔥 NEW: Explicit Discount Line */}
            {discount > 0 && (
              <div className="flex justify-between text-sm font-bold text-red-500 bg-red-50 p-1.5 rounded mt-1 border border-red-100">
                <span>Discount {promoCode ? `(${promoCode})` : ''}</span>
                <span>- {discount.toFixed(3)} BHD</span>
              </div>
            )}

            <div className="flex justify-between items-center text-xl font-bold text-[#7C3AED] mt-4 pt-4 border-t border-dashed border-gray-200">
              <span>TOTAL</span>
              <span>{total.toFixed(3)} BHD</span>
            </div>
          </div>

          {/* Aesthetic Barcode */}
          <div className="w-full flex flex-col items-center pt-4">
            <div
              className="h-10 w-full mb-2 opacity-80"
              style={{ background: `repeating-linear-gradient(90deg, #333 0px, #333 2px, transparent 2px, transparent 4px)` }}
            ></div>
            <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">
              Thank you for shopping!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


export default OrderReceiptModal;
