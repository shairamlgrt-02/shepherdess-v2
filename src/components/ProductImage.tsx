// @ts-nocheck
import { useState } from "react";
import { Sparkles, Eye } from "lucide-react";

const ProductImage = ({ src, alt, stock, discount, isNew, activePromos, onClick }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      className={`aspect-[4/5] bg-gray-100 rounded-xl mb-4 overflow-hidden relative group/img ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
      title={onClick ? "Quick View" : undefined}
    >
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <Sparkles className="text-gray-300 w-8 h-8 animate-spin-slow" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700 ${loaded ? "opacity-100" : "opacity-0"
          }`}
        onError={(e) => {
          e.currentTarget.src =
            "https://via.placeholder.com/400x500?text=Shepherdess+K-Beauty";
          setLoaded(true);
        }}
      />

      {/* Tags have been moved below the product description */}

      {/* --- 🌸 MULTIPLE PROMO TAGS (Moved to Top-Left, Tighter Padding, Smaller) --- */}
      {activePromos && activePromos.length > 0 && (
        <div className="absolute top-1 left-1 z-20 flex flex-col gap-1 items-start pointer-events-none">
          {activePromos.map((promo, idx) => (
            promo.tagImage ? (
              <img
                key={promo.id || idx}
                src={promo.tagImage}
                alt="Promo Tag"
                className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-lg"
              />
            ) : (
              <span key={promo.id || idx} className="bg-[#1C1C1C] block text-white text-[9px] md:text-[10px] font-semibold tracking-widest uppercase px-1.5 py-0.5 rounded-sm shadow-md">
                {promo.title}
              </span>
            )
          ))}
        </div>
      )}

      {/* 👁 QUICK VIEW OVERLAY (Desktop: appears when hovering the product photo) */}
      {onClick && (
        <div className="absolute inset-0 z-20 hidden md:flex items-center justify-center pointer-events-none bg-black/0 group-hover/img:bg-black/45 transition-colors duration-300">
          <span className="flex items-center gap-2 bg-white text-gray-900 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-full shadow-xl opacity-0 scale-90 group-hover/img:opacity-100 group-hover/img:scale-100 transition-all duration-300">
            <Eye size={15} /> Quick View
          </span>
        </div>
      )}

      {/* 👁 QUICK VIEW HINT (Mobile: always visible since phones have no hover) */}
      {onClick && (
        <div className="absolute bottom-2 right-2 z-20 flex md:hidden items-center gap-1 bg-black/55 backdrop-blur-[2px] text-white text-[9px] font-bold uppercase tracking-wide px-2 py-1 rounded-full shadow-md pointer-events-none">
          <Eye size={11} /> Quick View
        </div>
      )}

      {/* OUT OF STOCK OVERLAY */}
      {stock === 0 && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[2px] z-30">
          <span className="bg-gray-900 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
            Sold Out
          </span>
        </div>
      )}
    </div>
  );
};


export default ProductImage;
