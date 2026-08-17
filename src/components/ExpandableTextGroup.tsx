// @ts-nocheck
import { useState } from "react";
import { Clock } from "lucide-react";

const ExpandableTextGroup = ({ name, expiryDate, text }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isNameLong = name && name.length > 45;
  const isTextLong = text && text.length > 60;
  const needsExpansion = isNameLong || isTextLong;

  return (
    // ✨ NEW: Added items-start and text-left to force left alignment
    <div className="flex flex-col items-start text-left mb-1 md:mb-3 w-full">
      {/* 1. Expandable Title */}
      <h3 className={`font-sans font-bold text-sm md:text-base leading-tight mb-1 text-gray-900 transition-all text-left ${!isExpanded ? 'line-clamp-2' : ''}`}>
        {name}
      </h3>

      {/* 2. Expiry Date */}
      {expiryDate && (
        <p className="text-[9px] md:text-xs font-bold text-red-500 mb-1 md:mb-2 flex items-center justify-start gap-1 w-full text-left">
          <Clock size={10} className="md:w-3 md:h-3" /> Expiry: {expiryDate}
        </p>
      )}

      {/* 3. Expandable Description */}
      {text && (
        <p className={`text-[10px] md:text-sm text-gray-500 leading-relaxed transition-all text-left w-full ${!isExpanded ? 'line-clamp-2' : ''}`}>
          {text}
        </p>
      )}

      {/* Toggle Button */}
      {needsExpansion && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="text-[10px] md:text-xs font-bold text-purple-600 mt-1 hover:underline focus:outline-none text-left"
        >
          {isExpanded ? "See Less" : "See More"}
        </button>
      )}
    </div>
  );
};


export default ExpandableTextGroup;
