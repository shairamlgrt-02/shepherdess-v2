// @ts-nocheck
import { useState, useEffect } from "react";
import { Eye, X, Clock, ShoppingBag, Check, Share } from "lucide-react";

const QuickViewModal = ({ product, promotions, getProductPrice, onClose, onAddToCart }) => {
  const [copied, setCopied] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  // Close the popup when pressing Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Stop the page behind from scrolling while the popup is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (!product) return null;

  const priceInfo = getProductPrice ? getProductPrice(product) : { final: product.price, original: product.originalPrice };
  const activePromos = promotions ? promotions.filter(pr =>
    pr.active !== false && pr.showTag !== false &&
    (pr.scope === "all" ||
      (pr.scope === "category" && (pr.targetSelections?.includes(product.category) || pr.targetSelections?.includes(product.subcategory))) ||
      (pr.scope === "specific" && (pr.targetSelections?.includes(product.id) || pr.productIds?.includes(product.id))))
  ) : [];
  const isSoldOut = product.stock === 0;
  const productCode = product.code || product.id || "";

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/product/${product.id}`;
    try { await navigator.clipboard.writeText(url); }
    catch (err) {
      const ta = document.createElement("textarea"); ta.value = url;
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch(e) {}
      document.body.removeChild(ta);
    }
    setCopied(true); setShowCopiedToast(true);
    setTimeout(() => { setCopied(false); setShowCopiedToast(false); }, 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto"
      onClick={onClose}
    >
      {/* Popup Card (clicking inside won't close it) */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto animate-modal-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Popup Top Bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-md border-b border-gray-100 rounded-t-2xl">
          <span className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold text-purple-600 uppercase tracking-widest">
            <Eye size={14} /> Quick View
          </span>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
            aria-label="Close quick view"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-10 p-4 md:p-8 items-start">
          {/* Image */}
          <div className="relative rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-auto max-h-[38vh] md:max-h-[62vh] object-contain"
              onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/600x750?text=Shepherdess+K-Beauty"; }}
            />
            {isSoldOut && (
              <div className="absolute top-3 right-3 bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase">
                Sold Out
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] md:text-[11px] bg-purple-50 text-purple-600 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                {product.category}
              </span>
              {product.subcategory && (
                <span className="text-[10px] md:text-[11px] bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-medium">
                  {product.subcategory}
                </span>
              )}
            </div>

            <h1 className="text-xl md:text-3xl font-serif font-bold text-gray-900 leading-tight">
              {product.name}
            </h1>

            {product.expiryDate && (
              <p className="text-xs md:text-sm font-bold text-red-500 flex items-center gap-1.5">
                <Clock size={14} /> Expiry: {product.expiryDate}
              </p>
            )}

            {activePromos.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {activePromos.map((pr) => (
                  pr.tagImage ? (
                    <img key={pr.id} src={pr.tagImage} alt={pr.title} className="w-10 h-10 md:w-12 md:h-12 object-contain" />
                  ) : (
                    <span key={pr.id} className="bg-gray-900 text-white text-[10px] px-2.5 py-1 rounded font-bold uppercase">
                      {pr.title}
                    </span>
                  )
                ))}
              </div>
            )}

            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-end gap-3 flex-wrap">
                <span className="text-2xl md:text-3xl font-black text-purple-600">
                  {(priceInfo.final ?? product.price).toFixed(3)} BHD
                </span>
                {priceInfo.original && priceInfo.original > priceInfo.final && (
                  <>
                    <span className="text-base md:text-lg text-gray-400 line-through">{priceInfo.original.toFixed(3)} BHD</span>
                    <span className="bg-red-50 text-red-600 text-xs font-bold px-2 py-1 rounded border border-red-100 uppercase">
                      Save {Math.round(((priceInfo.original - priceInfo.final) / priceInfo.original) * 100)}%
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs md:text-sm text-gray-500 mt-1">
                {isSoldOut ? "Out of stock" : `${product.stock} in stock`}
              </p>
            </div>

            <p className="text-gray-600 text-sm md:text-base leading-relaxed whitespace-pre-line">
              {product.description || "No description available."}
            </p>

            <div className="flex gap-3 mt-1 relative">
              <button
                disabled={isSoldOut}
                onClick={() => { onAddToCart(product); onClose(); }}
                className={`flex-1 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isSoldOut ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gray-900 text-white hover:bg-purple-600 hover:shadow-lg"}`}
              >
                <ShoppingBag size={18} /> {isSoldOut ? "Sold Out" : "Add to Bag"}
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all border ${
                  copied ? "bg-green-50 text-green-600 border-green-200" : "bg-gray-100 text-gray-400 border-gray-200 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200"
                }`}
              >
                {copied ? <Check size={18} /> : <Share size={18} />}
                {showCopiedToast && (
                  <span className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap">
                    Link copied!
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default QuickViewModal;
