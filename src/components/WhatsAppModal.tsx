// @ts-nocheck
import { useState } from "react";
import { MessageCircle, X } from "lucide-react";

const WhatsAppModal = ({ order, templates, onClose }) => {
  if (!order) return null;
  const [message, setMessage] = useState("");

  const getCleanPhone = (phone) => {
    if (!phone) return "";
    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.length === 8) clean = "973" + clean;
    return clean;
  };

  const applyTemplate = (templateText) => {
    // 1. Build the Goods list summary
    const itemList = Object.values(order.items || {})
      .map(i => `⋆ ${i.qty} x ${i.name}`)
      .join('\n');

    // 2. Identify Delivery Method & Details
    const isDelivery = order.customer?.deliveryMethod === 'delivery';
    const deliveryType = isDelivery ? 'Delivery' : (order.customer?.deliveryMethod === 'pickup' ? 'Pick-Up' : 'Meet-Up');

    const deliveryDetail = isDelivery
      ? order.customer?.deliveryAddress
      : (order.customer?.meetupNote || "Direct Sell");

    // 3. YOUR EXACT JOURNEY MAPPING
    const journeyLabels = {
      pending: "PAYMENT UNDER VERIFICATION",
      confirmed: "PAYMENT VERIFIED",
      packing: "PREPARING ORDER",
      out_for_delivery: "OUT FOR DELIVERY",
      ready_for_pickup: "READY FOR PICKUP",
      delivered: "ORDER COMPLETED",
      canceled: "ORDER CANCELED"
    };
    const currentStatus = journeyLabels[order.journeyStatus] || "PAYMENT UNDER VERIFICATION";

    // 4. Run the replacements
    const processed = templateText
      .replace(/{name}/g, order.customer?.name || "Bestie")
      .replace(/{orderId}/g, order.orderId || "")
      .replace(/{total}/g, (order.total || 0).toFixed(3))
      .replace(/{method}/g, deliveryType.toUpperCase())
      .replace(/{details}/g, deliveryDetail)
      .replace(/{summary}/g, itemList)
      .replace(/{status}/g, currentStatus);

    setMessage(processed);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-[#25D366] p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2 font-bold">
            <MessageCircle size={20} /> WhatsApp Hub
          </div>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Template</p>
          <div className="grid grid-cols-2 gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t.text)}
                className="text-[10px] font-bold p-2 border rounded-lg hover:bg-green-50 hover:border-green-200 transition-colors text-left"
              >
                {t.label}
              </button>
            ))}
          </div>
          <textarea
            className="w-full h-40 p-3 border rounded-xl text-sm bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-green-400 transition-all"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Select a template above..."
          />
          <button
            onClick={() => window.open(`https://wa.me/${getCleanPhone(order.customer?.phone)}?text=${encodeURIComponent(message)}`, "_blank")}
            className="w-full py-3 bg-[#25D366] text-white rounded-xl font-bold hover:bg-[#128C7E] shadow-lg transition-transform active:scale-95"
          >
            Send WhatsApp Message
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppModal;
