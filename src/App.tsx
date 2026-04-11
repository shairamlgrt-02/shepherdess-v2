// V2 Live 
// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  addDoc,
  deleteDoc,
  setDoc,
  query,
  serverTimestamp,
  runTransaction
} from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  Search,
  Lock,
  Unlock,
  Key,
  Check,
  Clock,
  ChevronRight,
  Sparkles,
  MessageSquare,
  LayoutDashboard,
  Store,
  Package,
  Users,
  Calendar,
  Copy,
  Upload,
  ExternalLink,
  ChevronDown,
  Trash2,
  Eye,
  EyeOff,
  Truck,
  CheckCircle,
  Ban,
  Settings,
  Save,
  ListFilter,
  Tag,
  ArrowUpDown,
  Database,
  CheckSquare,
  Square,
  Filter,
  Download,
  Edit,
  Instagram,
  Facebook,
  MessageCircle,
  Archive,
  RefreshCw,
  FileText,
  Printer,
  ChevronUp,
  ArrowUp,
  ArrowDown
} from "lucide-react";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// --- YOUR FIREBASE KEYS ---
const firebaseConfig = {
  apiKey: "AIzaSyDorDxQcL3PVPKDtXNoVH32CY_c4sxDol0",
  authDomain: "shepherdess-shop.firebaseapp.com",
  projectId: "shepherdess-shop",
  storageBucket: "shepherdess-shop.firebasestorage.app",
  messagingSenderId: "821551315722",
  appId: "1:821551315722:web:195f667fc0617d4d2718f3",
  measurementId: "G-E6WMQF4FKD",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const messaging = getMessaging(app);

// --- Aesthetic Constants ---
const THEME = {
  bg: "bg-[#FDFBF7]",
  primary: "text-[#4A4A4A]",
  accent: "text-[#D8849B]",
};

const LOGO_URL =
  "https://i.ibb.co/cck7F7yq/shepherdess-logo-small.png";

// --- DEFAULT DATA ---
const INITIAL_CONTENT = {
  heroTag: "Clearance Sale",
  heroTitle: "Authentic K-Beauty Deals",
  heroDescription:
    "Curated premium skincare and cosmetics. Shop our final inventory of authentic treasures at unmissable rates.",
  heroNote:
    "Note: Clearance items are nearing expiry. Dates listed for transparency.",
  footerTitle: "Shepherdess K-Beauty",
  footerText: "Authentic Korean Skincare in Bahrain.",
  footerCopyright: "Shepherdess Shop",
  // --- NEW SOCIAL FIELDS ---
  instagramUrl: "https://instagram.com/shopshepherdess",
  facebookUrl: "",
  whatsappNumber: "97333027588",
};

const INITIAL_CATEGORIES = {
  Skincare: [
    "Toner",
    "Serum",
    "Moisturizer",
    "Cleanser",
    "Sunscreen",
    "Mask",
    "Exfoliator",
  ],
  "Make Up": ["Face", "Lip", "Eye", "Tools"],
  "K-Pop": ["Album", "Lightstick", "Set", "Merch"],
  "Body & Hair": ["Body Wash", "Hair Care", "Body Lotion"],
};

// --- Helper: Compress Image ---
const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      };
    };
    reader.onerror = reject;
  });
};

// --- Components ---

// --- ⚡ NEW FLASH TIMER COMPONENT (SINGLE ROW) ---
const FlashTimer = ({ endDate, endTime }) => {
  const calculateTimeLeft = () => {
    if (!endDate) return null;
    const targetDate = new Date(`${endDate}T${endTime || "23:59:59"}`);
    const difference = targetDate - new Date();

    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    return null; // Time is up!
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [endDate, endTime]);

  if (!timeLeft) return null;

  return (
    <div className="bg-purple-600 text-white text-sm md:text-base font-medium py-1.5 w-full flex items-center justify-center tracking-widest">
      {timeLeft.days > 0 && <span>{timeLeft.days}day&nbsp;</span>}
      <span>
        {timeLeft.hours} : {String(timeLeft.minutes).padStart(2, '0')} : {String(timeLeft.seconds).padStart(2, '0')}
      </span>
    </div>
  );
};

const Notification = ({ message, type, onClose }) => {
  if (!message) return null;
  return (
    <div
      className={`fixed top-4 right-4 z-[60] px-6 py-3 rounded-lg shadow-xl animate-bounce-in ${type === "success"
        ? "bg-green-100 text-green-800 border border-green-200"
        : "bg-red-100 text-red-800 border border-red-200"
        }`}
      // This line allows the "View Bag" link to be clickable
      dangerouslySetInnerHTML={{ __html: message }}
      onClick={(e) => {
        // If they click the "View Bag" link specifically
        if (e.target.tagName === 'B') {
          onClose();
        }
      }}
    />
  );
};

// --- 📝 NEW EXPANDABLE DESCRIPTION COMPONENT ---
const ExpandableDescription = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!text) return null;

  // Roughly 60 characters is a good threshold for 2 lines on mobile
  const isLong = text.length > 60;

  return (
    <div className="mb-2 md:mb-4">
      <p className={`text-[10px] md:text-sm text-gray-500 leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}>
        {text}
      </p>
      {isLong && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="text-[10px] md:text-xs font-bold text-purple-600 mt-1 hover:underline focus:outline-none"
        >
          {isExpanded ? "See Less" : "See More"}
        </button>
      )}
    </div>
  );
};

// --- Updated ProductImage Component (Now supports Custom Tag Images) ---
const ProductImage = ({ src, alt, stock, discount, isNew, activePromos }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="aspect-[4/5] bg-gray-100 rounded-xl mb-4 overflow-hidden relative group">
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
        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ${loaded ? "opacity-100" : "opacity-0"
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

// --- ADMIN DASHBOARD ---
// --- 🧾 FINAL PERFECT PRINT RECEIPT ---
const OrderReceiptModal = ({ order, onClose }) => {
  if (!order) return null;

  const subtotal = order.items
    ? Object.values(order.items).reduce((sum, item) => sum + (item.price * item.qty), 0)
    : 0;
  const deliveryFee = order.deliveryFee || 0;
  const total = subtotal + deliveryFee;

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

          {/* Totals */}
          <div className="w-full space-y-2 mb-8">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>{subtotal.toFixed(3)} BHD</span>
            </div>
            <div className="flex justify-between border-t border-dashed pt-2 mt-2">
              <span className="text-gray-400">Delivery Fee</span>
              <span className="font-bold">{(order.deliveryFee || 0).toFixed(3)} BHD</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Delivery</span>
              <span>{deliveryFee.toFixed(3)} BHD</span>
            </div>
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
// --- 💬 SMART WHATSAPP HUB ---
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
// --- NEW ANALYTICS COMPONENT ---
const AnalyticsSummary = ({ products, orders }) => {
  // 1. Calculate Revenue (Only delivered/completed orders)
  const totalRevenue = orders
    .filter((o) => o.status === "completed" || o.status === "delivered")
    .reduce((sum, order) => sum + (order.total || 0), 0);

  // 2. Low Stock (Less than 3)
  const lowStockItems = products.filter((p) => p.stock < 3 && p.active);

  // 3. Expiring Soon (Within 90 days)
  const expiringItems = products.filter((p) => {
    if (!p.expiryDate || !p.active) return false;
    const today = new Date();
    const expiry = new Date(p.expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 90;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Revenue Card */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
          <Database size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-500 font-bold uppercase">
            Total Revenue
          </p>
          <h3 className="text-2xl font-serif font-bold text-gray-900">
            {totalRevenue.toFixed(3)} BHD
          </h3>
        </div>
      </div>

      {/* Low Stock Card */}
      <div
        className={`p-6 rounded-xl border shadow-sm flex items-center gap-4 transition-all ${lowStockItems.length > 0
          ? "bg-amber-50 border-amber-200"
          : "bg-white border-gray-100"
          }`}
      >
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center ${lowStockItems.length > 0
            ? "bg-amber-100 text-amber-600"
            : "bg-gray-100 text-gray-400"
            }`}
        >
          <Package size={24} />
        </div>
        <div>
          <p
            className={`text-sm font-bold uppercase ${lowStockItems.length > 0 ? "text-amber-700" : "text-gray-500"
              }`}
          >
            Low Stock Alerts
          </p>
          <h3 className="text-2xl font-serif font-bold text-gray-900">
            {lowStockItems.length}{" "}
            <span className="text-sm font-sans font-normal text-gray-500">
              Items
            </span>
          </h3>
          {lowStockItems.length > 0 && (
            <p className="text-xs text-amber-600 mt-1">Restock recommended</p>
          )}
        </div>
      </div>

      {/* Expiry Card */}
      <div
        className={`p-6 rounded-xl border shadow-sm flex items-center gap-4 transition-all ${expiringItems.length > 0
          ? "bg-red-50 border-red-200"
          : "bg-white border-gray-100"
          }`}
      >
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center ${expiringItems.length > 0
            ? "bg-red-100 text-red-600"
            : "bg-gray-100 text-gray-400"
            }`}
        >
          <Clock size={24} />
        </div>
        <div>
          <p
            className={`text-sm font-bold uppercase ${expiringItems.length > 0 ? "text-red-700" : "text-gray-500"
              }`}
          >
            Expiring Soon
          </p>
          <h3 className="text-2xl font-serif font-bold text-gray-900">
            {expiringItems.length}{" "}
            <span className="text-sm font-sans font-normal text-gray-500">
              Items
            </span>
          </h3>
          {expiringItems.length > 0 && (
            <p className="text-xs text-red-600 mt-1">Within 90 Days</p>
          )}
        </div>
      </div>
    </div>
  );
};

// --- 🖼️ NEW IMAGE PREVIEW MODAL ---
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
// --- ADMIN DASHBOARD (FIXED: Filters & Full Status Control) ---
const AdminDashboard = ({
  db,
  products,
  content,
  categories,
  promotions,
  whatsappTemplates,
  setWhatsappTemplates,
  onUpdateStock,
  onUpdateExpiry,
  onUpdatePrice,
  onToggleStatus,
  onDeleteProduct,
  onAddProduct,
  onUpdateProduct,
  onUpdateContent,
  onUpdateCategories,
  onAddPromotion,
  onDeletePromotion,
  onUpdatePromotion,
  generateReceipt,
}) => {
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("orders");
  const [editableContent, setEditableContent] = useState(content);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [whatsappOrder, setWhatsappOrder] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const updateOrderJourney = async (orderId, newJourney) => {
    await updateDoc(doc(db, "orders", orderId), { journeyStatus: newJourney });
  };
  // --- ADD THIS NEW FUNCTION ---
  const handleDeleteProof = async (orderId) => {
    if (window.confirm("Are you sure you want to remove this payment proof?")) {
      try {
        // Set the proof field to null in Firebase
        await updateDoc(doc(db, "orders", orderId), { "customer.proof": null });
      } catch (error) {
        console.error("Error deleting proof:", error);
        alert("Failed to delete proof.");
      }
    }
  };
  const handleProofUpload = async (e, orderId) => {
    const file = e.target.files[0];
    if (!file) return;

    if (window.confirm("Replace the current payment proof with this new image?")) {
      try {
        const compressed = await compressImage(file);
        await updateDoc(doc(db, "orders", orderId), {
          "customer.proof": compressed
        });
        alert("Payment proof updated successfully!");
      } catch (error) {
        console.error("Error updating proof:", error);
        alert("Failed to update proof.");
      }
    }
  };

  const toggleArchiveStatus = async (product) => {
    const newStatus = !product.archived;
    const confirmMsg = newStatus
      ? `Archive "${product.name}"? It will be hidden from the main list.`
      : `Unarchive "${product.name}"? It will return to the active inventory.`;

    if (window.confirm(confirmMsg)) {
      try {
        await updateDoc(doc(db, "products", product.id), { archived: newStatus });
      } catch (error) {
        console.error("Error updating status:", error);
        alert("Error: Could not update product. Check console.");
      }
    }
  };
  // --- 1. ORDERS STATE ---
  const [orderSearch, setOrderSearch] = useState("");
  const [orderSort, setOrderSort] = useState("date-desc");
  const [filterStatus, setFilterStatus] = useState("all");

  // --- 2. CATEGORIES & PROMOS STATE ---
  const [localCategories, setLocalCategories] = useState(categories);
  const [newMainCat, setNewMainCat] = useState("");
  const [newSubCat, setNewSubCat] = useState({ main: "", sub: "" });
  // --- UPDATED: Complex Promo State ---
  const [newPromo, setNewPromo] = useState({
    title: "",
    type: "collection", // options: 'collection' (tab), 'coupon' (code), 'auto' (sale)
    code: "",
    discountType: "percentage", // percentage, fixed
    value: 0,
    startDate: "",
    endDate: "",
    endTime: "",
    usageLimit: "",
    minSpend: "",
    scope: "specific", // specific, category, all
    targetSelections: [], // Stores product IDs OR Category names
    active: true,
    showTag: true,
    showInMenu: true
  });
  const [isEditingPromo, setIsEditingPromo] = useState(null);
  const [promoSearchQuery, setPromoSearchQuery] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // --- 3. INVENTORY & MULTI-SORT STATE ---
  const [invSearch, setInvSearch] = useState("");
  const [invCategory, setInvCategory] = useState("All");
  const [invSubCategory, setInvSubCategory] = useState("All");

  const initialSort = [{ key: "name", direction: "asc" }];
  const [sortConfig, setSortConfig] = useState(initialSort);
  const [visFilter, setVisFilter] = useState("all");

  const [editingId, setEditingId] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [hideOutOfStock, setHideOutOfStock] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // --- 4. PRODUCT FORM STATE ---
  const [productForm, setProductForm] = useState({
    name: "",
    category: "",
    subcategory: "",
    price: "",
    originalPrice: "",
    stock: "",
    expiryDate: "",
    description: "",
    image: "",
  });

  // --- 5. POWER MULTI-SORT LOGIC ---
  const clearAllFilters = () => {
    setSortConfig(initialSort);
    setVisFilter("all");
    setInvSearch("");
    setInvCategory("All");
    setInvSubCategory("All");
    setHideOutOfStock(false);
  };

  // --- 📦 BULK ACTIONS ENGINE ---

  // 1. Export Current Inventory Backup
  const handleExportCSV = () => {
    const headers = ["name", "category", "subcategory", "price", "originalPrice", "stock", "expiryDate", "description", "image", "active"];
    let csvContent = headers.join(",") + "\n";

    products.forEach(p => {
      const row = headers.map(header => {
        let val = p[header] === undefined || p[header] === null ? "" : p[header];
        // Wrap in quotes to safely handle descriptions with commas inside them
        if (typeof val === "string") val = `"${val.replace(/"/g, '""')}"`;
        return val;
      });
      csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Shepherdess_Backup_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Download Blank Template
  const handleDownloadTemplate = () => {
    const headers = "name,category,subcategory,price,originalPrice,stock,expiryDate,description,image\n";
    const sample = 'Glass Skin Serum,Skincare,Serum,12.500,,50,2027-12-31,"Amazing glowing serum",https://example.com/image.jpg\n';
    const blob = new Blob([headers + sample], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "Shepherdess_Import_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. Process & Import Uploaded CSV
  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm("Import these products? They will be added to your current inventory.")) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target.result;

        // Smart Regex to split by commas, but IGNORE commas inside double quotes
        const regex = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\s\S][^'\\]*)*)'|"([^"\\]*(?:\\[\s\S][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;

        const rows = text.split('\n').filter(row => row.trim() !== '');

        // Extract Headers
        const headers = [];
        let headerMatch;
        const headerLine = rows[0];
        while ((headerMatch = regex.exec(headerLine)) !== null) {
          if (headerMatch.index === regex.lastIndex) regex.lastIndex++;
          headers.push((headerMatch[1] || headerMatch[2] || headerMatch[3] || '').trim());
        }

        let addedCount = 0;

        // Loop through rows and send to Firebase
        for (let i = 1; i < rows.length; i++) {
          const values = [];
          let valMatch;
          regex.lastIndex = 0; // Reset regex
          while ((valMatch = regex.exec(rows[i])) !== null) {
            if (valMatch.index === regex.lastIndex) regex.lastIndex++;
            let val = valMatch[1] || valMatch[2] || valMatch[3] || '';
            val = val.replace(/""/g, '"'); // Fix Excel double quotes
            values.push(val.trim());
          }

          const item = {};
          headers.forEach((h, index) => { item[h] = values[index]; });

          // Skip empty or invalid rows
          if (!item.name || !item.category) continue;

          const formattedData = {
            name: item.name,
            category: item.category,
            subcategory: item.subcategory || "",
            price: parseFloat(item.price) || 0,
            originalPrice: item.originalPrice ? parseFloat(item.originalPrice) : null,
            stock: parseInt(item.stock) || 0,
            expiryDate: item.expiryDate || "",
            description: item.description || "",
            image: item.image || "",
            active: true,
            archived: false,
            createdAt: serverTimestamp() // Time tag
          };

          // Bulk Add straight to Firebase
          await addDoc(collection(db, "products"), formattedData);
          addedCount++;
        }
        alert(`Success! 🎉 ${addedCount} products have been added to your shop.`);
      } catch (error) {
        console.error("Import failed:", error);
        alert("Oops! The file format was incorrect. Please use the exact template.");
      } finally {
        setIsImporting(false);
        e.target.value = ''; // Reset input so you can upload the same file again if needed
      }
    };
    reader.readAsText(file);
  };

  const handleHeaderSort = (key) => {
    setSortConfig((currentSorts) => {
      const existingIndex = currentSorts.findIndex((s) => s.key === key);
      let newDirection = "asc";

      if (existingIndex !== -1) {
        newDirection = currentSorts[existingIndex].direction === "asc" ? "desc" : "asc";
      }

      const others = currentSorts.filter(s => s.key !== key);
      return [{ key, direction: newDirection }, ...others];
    });
  };

  const cycleVisFilter = () => {
    if (visFilter === "all") setVisFilter("visible");
    else if (visFilter === "visible") setVisFilter("hidden");
    else setVisFilter("all");
  };

  useEffect(() => {
    const q = query(collection(db, "orders"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allOrders = snapshot.docs.map((doc) => {
        const data = doc.data();
        let finalDate;

        // Standardization Logic:
        if (data.date && data.date.seconds) {
          // 1. Check if it's an old Firebase Timestamp (seconds/nanoseconds)
          finalDate = new Date(data.date.seconds * 1000);
        } else if (data.date) {
          // 2. Check if it's our new ISO String (YYYY-MM-DDTHH:mm:ss)
          finalDate = new Date(data.date);
        } else {
          // 3. Absolute fallback if the record is somehow empty
          finalDate = new Date();
        }

        return {
          id: doc.id,
          ...data,
          date: finalDate // Standardized as a JS Date object for the UI
        };
      });

      // Sort by time (getTime() ensures the comparison uses milliseconds)
      setOrders(allOrders.sort((a, b) => b.date.getTime() - a.date.getTime()));
    });
    return () => unsubscribe();
  }, [db]);

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (filterStatus !== "all") {
      result = result.filter((o) => (o.status || "pending") === filterStatus);
    }
    if (orderSearch) {
      const s = orderSearch.toLowerCase();
      result = result.filter(o =>
        (o.orderId || "").toLowerCase().includes(s) ||
        (o.customer?.name || "").toLowerCase().includes(s)
      );
    }
    return result;
  }, [orders, orderSearch, filterStatus]);

  // --- HANDLERS ---
  const handleProductSubmit = (e) => {
    e.preventDefault();
    const formattedData = {
      ...productForm,
      price: parseFloat(productForm.price),
      originalPrice: productForm.originalPrice
        ? parseFloat(productForm.originalPrice)
        : null,
      stock: parseInt(productForm.stock),
      active: true,
    };
    if (editingId) onUpdateProduct(editingId, formattedData);
    else onAddProduct(formattedData);
    setProductForm({
      name: "",
      category: "",
      subcategory: "",
      price: "",
      originalPrice: "",
      stock: "",
      expiryDate: "",
      description: "",
      image: "",
    });
    setEditingId(null);
    setShowProductForm(false);
  };

  const startEditProduct = (product) => {
    setProductForm({
      name: product.name,
      category: product.category,
      subcategory: product.subcategory || "",
      price: product.price,
      originalPrice: product.originalPrice || "",
      stock: product.stock,
      expiryDate: product.expiryDate || "",
      description: product.description || "",
      image: product.image || "",
    });
    setEditingId(product.id);
    setShowProductForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleContentSubmit = (e) => {
    e.preventDefault();
    onUpdateContent(editableContent);
  };
  const addMainCategory = () => {
    if (!newMainCat) return;
    onUpdateCategories({ ...localCategories, [newMainCat]: [] });
    setNewMainCat("");
  };
  const deleteMainCategory = (cat) => {
    if (!window.confirm(`Delete ${cat}?`)) return;
    const updated = { ...localCategories };
    delete updated[cat];
    onUpdateCategories(updated);
  };
  const addSubCategory = () => {
    if (!newSubCat.main || !newSubCat.sub) return;
    onUpdateCategories({
      ...localCategories,
      [newSubCat.main]: [
        ...(localCategories[newSubCat.main] || []),
        newSubCat.sub,
      ],
    });
    setNewSubCat({ ...newSubCat, sub: "" });
  };
  const deleteSubCategory = (main, sub) => {
    onUpdateCategories({
      ...localCategories,
      [main]: localCategories[main].filter((s) => s !== sub),
    });
  };

  const filteredPromoProducts = useMemo(
    () =>
      products.filter((p) =>
        // The fix is here: we added (p.name || "")
        (p.name || "").toLowerCase().includes(promoSearchQuery.toLowerCase())
      ),
    [products, promoSearchQuery]
  );

  // --- NEW: Handle Target Selection (Products or Categories) ---
  const toggleTarget = (item) => {
    setNewPromo((prev) => {
      const exists = prev.targetSelections.includes(item);
      return {
        ...prev,
        targetSelections: exists
          ? prev.targetSelections.filter((i) => i !== item)
          : [...prev.targetSelections, item],
      };
    });
  };

  const selectAllFiltered = () => {
    // If scope is specific, select all visible products
    const ids = filteredPromoProducts.map(p => p.id);
    setNewPromo(prev => ({
      ...prev,
      targetSelections: [...new Set([...prev.targetSelections, ...ids])]
    }));
  };

  const deselectAllFiltered = () => {
    setNewPromo(prev => ({ ...prev, targetSelections: [] }));
  };

  const savePromo = (e) => {
    e.preventDefault();

    // Basic Validation
    if (newPromo.type === 'coupon' && !newPromo.code) return alert("Please enter a Promo Code");
    if (newPromo.type === 'auto' && newPromo.value <= 0) return alert("Please enter a discount value");

    const finalData = {
      ...newPromo,
      value: parseFloat(newPromo.value) || 0,
      usageLimit: parseInt(newPromo.usageLimit) || null,
      minSpend: parseFloat(newPromo.minSpend) || null,
      // Backwards compatibility for the "Home Page Tabs" feature (Feature 2)
      productIds: newPromo.scope === 'specific' ? newPromo.targetSelections : []
    };

    if (isEditingPromo) {
      onUpdatePromotion(isEditingPromo, finalData);
      setIsEditingPromo(null);
    } else {
      onAddPromotion(finalData);
    }

    // Reset Form
    setNewPromo({
      title: "", type: "collection", code: "", discountType: "percentage", value: 0,
      startDate: "", endDate: "", endTime: "", usageLimit: "", minSpend: "",
      scope: "specific", targetSelections: [], active: true, showTag: true, showInMenu: true
    });
    setPromoSearchQuery("");
  };

  const movePromotion = async (index, direction) => {
    const promos = [...promotions];

    // We update Firebase directly so the order is permanently saved!
    if (direction === 'up' && index > 0) {
      const current = promos[index];
      const above = promos[index - 1];
      await updateDoc(doc(db, "promotions", current.id), { orderIndex: index - 1 });
      await updateDoc(doc(db, "promotions", above.id), { orderIndex: index });
    } else if (direction === 'down' && index < promos.length - 1) {
      const current = promos[index];
      const below = promos[index + 1];
      await updateDoc(doc(db, "promotions", current.id), { orderIndex: index + 1 });
      await updateDoc(doc(db, "promotions", below.id), { orderIndex: index });
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    await updateDoc(doc(db, "orders", orderId), { status: newStatus });
  };

  const updateOrderNote = async (orderId, note) => {
    await updateDoc(doc(db, "orders", orderId), { adminNote: note });
  };

  const updateOrderTotal = async (orderId, newTotal) => {
    await updateDoc(doc(db, "orders", orderId), { total: parseFloat(newTotal) });
  };

  const deleteOrder = async (orderId) => {
    if (window.confirm("Delete order?"))
      await deleteDoc(doc(db, "orders", orderId));
  };

  // --- UPDATED: Smart Item Addition ---
  const addItemToOrder = async (orderId, currentItems, product) => {
    // 1. Check if the item already exists in the order
    const existingItem = currentItems[product.id];
    let updatedItems;

    if (existingItem) {
      // 2. If it exists, create a copy and increase qty by 1
      updatedItems = {
        ...currentItems,
        [product.id]: {
          ...existingItem,
          qty: existingItem.qty + 1
        }
      };
    } else {
      // 3. If it's new, add it with qty 1
      updatedItems = {
        ...currentItems,
        [product.id]: {
          id: product.id,
          name: product.name,
          price: product.price,
          qty: 1,
          image: product.image
        }
      };
    }

    // 4. Update Firebase
    await updateDoc(doc(db, "orders", orderId), { items: updatedItems });
  };

  // --- FILTERED INVENTORY (Smart Stack Sort) ---
  const filteredInventory = useMemo(() => {
    let data = [...products];

    // 1. ARCHIVE & SEARCH & CATEGORY FILTERS (Standard)
    if (showArchived) data = data.filter((p) => p.archived === true);
    else data = data.filter((p) => !p.archived);

    if (invSearch) data = data.filter((p) => (p.name || "").toLowerCase().includes(invSearch.toLowerCase()));

    if (invCategory !== "All") data = data.filter((p) => p.category === invCategory);
    if (invCategory !== "All" && invSubCategory !== "All") data = data.filter((p) => p.subcategory === invSubCategory);

    if (hideOutOfStock) data = data.filter((p) => (p.stock || 0) > 0);

    // 2. NEW: VISIBILITY FILTER 👁️
    if (visFilter === "visible") data = data.filter(p => p.active);
    if (visFilter === "hidden") data = data.filter(p => !p.active);

    // 3. ✨ POWER MULTI-COLUMN SORTING (With Chronological Expiry)
    data.sort((a, b) => {
      for (const sort of sortConfig) {
        let aVal = a[sort.key] ?? 0;
        let bVal = b[sort.key] ?? 0;

        if (sort.key === "name") {
          aVal = (a.name || "").toLowerCase();
          bVal = (b.name || "").toLowerCase();
        } else if (sort.key === "expiryDate") {
          // 💡 This turns "2025-01-01" into a number. 
          // Missing dates are set to a huge number so they always stay at the bottom.
          aVal = a.expiryDate ? new Date(a.expiryDate).getTime() : 9999999999999;
          bVal = b.expiryDate ? new Date(b.expiryDate).getTime() : 9999999999999;
        } else {
          aVal = Number(aVal);
          bVal = Number(bVal);
        }

        if (aVal !== bVal) {
          if (aVal < bVal) return sort.direction === "asc" ? -1 : 1;
          if (aVal > bVal) return sort.direction === "asc" ? 1 : -1;
        }
      }
      return 0;
    });

    return data;
  }, [products, invSearch, invCategory, invSubCategory, sortConfig, hideOutOfStock, showArchived, visFilter]);


  // Counts for Filter Badges
  const getCount = (status) =>
    orders.filter((o) => (o.status || "pending") === status).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-serif font-bold text-gray-900 mb-8 flex items-center gap-3">
        <LayoutDashboard className="text-purple-600" /> Admin Dashboard
      </h2>

      <AnalyticsSummary products={products} orders={orders} />

      {/* Main Navigation Tabs */}
      <div className="flex gap-4 mb-8 border-b border-gray-200 overflow-x-auto">
        {[
          { id: "orders", icon: Users, label: "Orders" },
          { id: "inventory", icon: Package, label: "Inventory" },
          { id: "categories", icon: ListFilter, label: "Categories" },
          { id: "promos", icon: Tag, label: "Promotions" },
          { id: "content", icon: Settings, label: "Content" },
          { id: "wa-templates", icon: MessageCircle, label: "WA Templates" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${tab === t.id
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            <t.icon size={18} /> {t.label}
          </button>
        ))}
      </div>

      {/* --- ORDERS TAB --- */}
      {tab === "orders" && (
        <div className="space-y-4">
          {/* 1. FILTER TABS (View Only specific status) */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              {
                id: "all",
                label: "All Orders",
                count: orders.length,
                color: "bg-gray-100 text-gray-700",
              },
              {
                id: "pending",
                label: "Pending",
                count: getCount("pending"),
                color: "bg-amber-100 text-amber-800",
              },
              {
                id: "confirmed",
                label: "Confirmed",
                count: getCount("confirmed"),
                color: "bg-blue-100 text-blue-800",
              },
              {
                id: "delivered",
                label: "Delivered",
                count: getCount("delivered"),
                color: "bg-green-100 text-green-800",
              },
              {
                id: "canceled",
                label: "Canceled",
                count: getCount("canceled"),
                color: "bg-red-100 text-red-800",
              },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${filterStatus === f.id
                  ? "ring-2 ring-purple-500 ring-offset-1 border-transparent transform scale-105"
                  : "border-transparent opacity-70 hover:opacity-100"
                  } ${f.color}`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>

          {/* 2. SEARCH & SORT */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-2.5 text-gray-400"
                size={16}
              />
              <input
                placeholder="Search ID, Name, Phone..."
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
            </div>
            <div className="relative">
              <Filter
                className="absolute left-3 top-2.5 text-gray-400"
                size={16}
              />
              <select
                className="pl-9 pr-8 py-2 border rounded-lg text-sm appearance-none bg-white cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={orderSort}
                onChange={(e) => setOrderSort(e.target.value)}
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
              </select>
            </div>
          </div>

          {/* 3. ORDER LIST */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-20 text-gray-500 bg-white rounded-xl border border-dashed">
              No orders found in this view.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const status = order.status || "pending";
                const statusColors = {
                  delivered: "border-green-500 bg-green-50/30 text-green-700",
                  confirmed: "border-blue-500 bg-blue-50/30 text-blue-700",
                  canceled: "border-red-500 bg-red-50/30 text-red-700",
                  pending: "border-amber-500 bg-amber-50/30 text-amber-700"
                };

                return (
                  <div key={order.id} className="bg-white border border-gray-100 rounded-2xl p-4 md:p-6 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
                    {/* Status Indicator Line */}
                    <div className={`absolute top-0 left-0 right-0 h-1 ${statusColors[status].split(' ')[0]}`} />

                    {/* --- TOP HEADER: NAME, STATUS, DATE, JOURNEY --- */}
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 text-lg">{order.customer?.name}</h3>
                          <span className="text-[10px] font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-500 border border-gray-200">
                            {order.orderId}
                          </span>
                        </div>

                        {/* Order Status Badge */}
                        <div className="flex items-center gap-2">
                          <select
                            value={status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            className={`text-[10px] font-bold uppercase py-1 px-3 rounded-full border cursor-pointer focus:outline-none transition-colors ${statusColors[status]}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="delivered">Delivered</option>
                            <option value="canceled">Canceled</option>
                          </select>
                        </div>

                        {/* Date & Time below Status */}
                        <p className="text-[11px] text-gray-400 font-medium flex items-center gap-1.5 ml-1">
                          <Clock size={12} className="opacity-70" />
                          {order.date.toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>



                        {/* Detailed Journey below Date */}
                        <div className="mt-1 ml-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Detailed Journey</label>
                          <select
                            value={order.journeyStatus || "pending"}
                            onChange={(e) => updateDoc(doc(db, "orders", order.id), { journeyStatus: e.target.value })}
                            className="w-full max-w-[220px] p-2 text-[11px] border border-gray-100 rounded-xl bg-gray-50/50 outline-none focus:ring-1 focus:ring-purple-200 transition-all font-medium text-gray-600"
                          >
                            <option value="pending">🕒 Payment Under Verfication</option>
                            <option value="confirmed">💳 Payment Verified</option>
                            <option value="packing">📦 Preparing Order</option>
                            <option value="out_for_delivery">🚚 Out for Delivery</option>
                            <option value="ready_for_pickup">🏪 Ready for Pickup</option>
                            <option value="delivered">✅ Order Completed</option>
                            <option value="canceled"> ❌ Order Canceled</option>
                          </select>
                        </div>
                      </div>

                      {/* Right Side: Price & Receipt Link */}
                      <div className="flex flex-col items-end gap-2">
                        <p className="text-2xl font-bold text-purple-600 leading-none">
                          {order.total?.toFixed(3)} <span className="text-xs">BHD</span>
                        </p>
                        <button
                          onClick={() => generateReceipt(order)}
                          className="text-[11px] font-bold text-gray-400 hover:text-purple-600 flex items-center gap-2 transition-colors bg-white border border-gray-100 px-3 py-1.5 rounded-lg shadow-sm"
                        >
                          <Download size={14} />
                          <span>Receipt</span>
                        </button>
                      </div>
                    </div>

                    {/* --- BOTTOM GRID: SHIPPING & ITEMS (NOTES/TOOLS PRESERVED) --- */}
                    <div className="grid md:grid-cols-2 gap-8 text-sm border-t border-gray-50 pt-6">

                      {/* LEFT: Shipping & Proof */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customer & Shipping</h4>
                        <div className="flex items-center gap-3 text-gray-700 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                          <div className="bg-purple-50 p-2 rounded-lg text-purple-600">
                            {order.customer?.deliveryMethod === 'delivery' ? <Truck size={18} /> : <Store size={18} />}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{order.customer?.phone}</p>
                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-tight">{order.customer?.deliveryMethod}</p>
                            <p className="text-xs italic text-gray-500 mt-1">
                              {order.customer?.deliveryMethod === 'delivery' ? order.customer?.deliveryAddress : order.customer?.meetupNote}
                            </p>
                          </div>
                        </div>

                        {/* START OF NEW PAYMENT PROOF SECTION */}
                        <div className="mt-4">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                            Payment Proof
                          </label>

                          {order.customer?.proof ? (
                            <div className="flex items-start gap-3">
                              {/* 1. The Image (Click to Preview) */}
                              <div className="relative group">
                                <img
                                  src={order.customer.proof}
                                  onClick={() => setPreviewImage(order.customer.proof)}
                                  className="w-24 h-24 object-cover rounded-xl border border-gray-100 cursor-pointer hover:opacity-80 transition-opacity"
                                />
                                {/* Delete Button (Appears on Hover) */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteProof(order.id);
                                  }}
                                  className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full p-1 shadow-md border border-gray-100 hover:bg-red-50 transition-colors"
                                  title="Remove Proof"
                                >
                                  <X size={14} />
                                </button>
                              </div>

                              {/* 2. Change Button */}
                              <div className="flex flex-col gap-2 pt-1">
                                <label className="cursor-pointer bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-colors flex items-center gap-1">
                                  <Upload size={12} /> Change
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleProofUpload(e, order.id)}
                                  />
                                </label>
                              </div>
                            </div>
                          ) : (
                            /* 3. Upload Button (If no proof exists) */
                            <label className="flex items-center gap-3 border border-dashed border-gray-300 rounded-xl p-3 cursor-pointer hover:bg-gray-50 hover:border-purple-300 transition-colors w-full max-w-[200px] group">
                              <div className="bg-gray-100 group-hover:bg-purple-100 p-2 rounded-full text-gray-400 group-hover:text-purple-500 transition-colors">
                                <Upload size={16} />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-gray-600 block group-hover:text-purple-700">Upload Proof</span>
                                <span className="text-[10px] text-gray-400 block">Click to add image</span>
                              </div>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleProofUpload(e, order.id)}
                              />
                            </label>
                          )}
                        </div>
                        {/* END OF NEW PAYMENT PROOF SECTION */}
                      </div>

                      {/* RIGHT: Items & Tools (PRESERVED) */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order Items</h4>
                          <span className="text-[10px] italic text-purple-400">(click x to remove)</span>
                        </div>

                        <ul className="space-y-2">
                          {order.items && Object.values(order.items).map((i: any) => (
                            <li key={i.id} className="flex justify-between items-center text-xs bg-gray-50/50 p-2 rounded-xl border border-gray-100 group">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-purple-600">{i.qty}x</span>
                                <span className="text-gray-700">{i.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-gray-400">{i.price.toFixed(3)}</span>
                                <button
                                  onClick={async () => { if (window.confirm("Remove?")) { const n = { ...order.items }; delete n[i.id]; await updateDoc(doc(db, "orders", order.id), { items: n }); } }}
                                  className="text-gray-300 hover:text-red-500 transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>

                        {/* Delivery Fee Display */}
                        <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Delivery Fee:</span>
                          <span className="font-mono text-xs text-gray-600">
                            {(order.deliveryFee || 0).toFixed(3)} BHD
                          </span>
                        </div>

                        {/* Grand Total Adjustment */}
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Adjusted Total:</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number" step="0.001" defaultValue={order.total}
                              onBlur={(e) => updateOrderTotal(order.id, e.target.value)}
                              className="w-20 p-1 border border-gray-200 rounded text-right font-bold text-purple-600 text-xs"
                            />
                            <span className="text-[10px] font-bold text-gray-400">BHD</span>
                          </div>
                        </div>

                        {/* PRESERVED: Replacement Tool */}
                        <div className="p-3 border border-dashed border-purple-100 rounded-xl bg-purple-50/30">
                          <p className="text-[10px] font-bold text-purple-700 mb-2">✨ ADD REPLACEMENT ITEM</p>
                          <select
                            className="w-full p-2 text-xs border border-purple-100 rounded-lg bg-white outline-none"
                            onChange={(e) => { const prod = products.find(p => p.id === e.target.value); if (prod) { addItemToOrder(order.id, order.items, prod); e.target.value = ""; } }}
                          >
                            <option value="">Select a product to add...</option>
                            {products.filter(p => p.active && p.stock > 0).map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                          </select>
                        </div>

                        {/* PRESERVED: Grand Total Adjustment */}
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Adjust Total:</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number" step="0.001" defaultValue={order.total}
                              onBlur={(e) => updateOrderTotal(order.id, e.target.value)}
                              className="w-20 p-1 border border-gray-200 rounded text-right font-bold text-purple-600 text-xs"
                            />
                            <span className="text-[10px] font-bold text-gray-400">BHD</span>
                          </div>
                        </div>

                        {/* PRESERVED: Admin Notes */}
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Internal Admin Notes 🤫</label>
                          <textarea
                            className="w-full p-3 text-xs border border-gray-100 rounded-xl bg-gray-50/50 outline-none focus:bg-white focus:border-purple-200 transition-all"
                            placeholder="e.g. Swapped out toner..."
                            defaultValue={order.adminNote || ""}
                            rows={2}
                            onBlur={(e) => updateOrderNote(order.id, e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Hub */}
                    <div className="mt-6 pt-4 border-t border-gray-50 flex justify-end gap-2">
                      <button onClick={() => setWhatsappOrder(order)} className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-lg text-[10px] font-bold">
                        <MessageCircle size={14} /> WhatsApp
                      </button>
                      <button onClick={() => updateOrderStatus(order.id, "delivered")} className="px-4 py-2 bg-green-500 text-white rounded-lg text-[10px] font-bold">
                        Quick Deliver
                      </button>
                      <button onClick={() => deleteOrder(order.id)} className="p-2 text-gray-300 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* INVENTORY TAB */}
      {tab === "inventory" && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-2 flex-1 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input
                  className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white transition-colors"
                  placeholder="Search product name..."
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                />
              </div>
              <select
                className="border p-2 rounded-lg text-sm bg-white"
                value={invCategory}
                onChange={(e) => {
                  setInvCategory(e.target.value);
                  setInvSubCategory("All");
                }}
              >
                <option value="All">All Categories</option>
                {Object.keys(categories).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {invCategory !== "All" && (
                <select
                  className="border p-2 rounded-lg text-sm bg-white animate-fade-in"
                  value={invSubCategory}
                  onChange={(e) => setInvSubCategory(e.target.value)}
                >
                  <option value="All">All {invCategory}</option>
                  {(categories[invCategory] || []).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* --- TOOLBAR GROUP --- */}
            <div className="flex flex-wrap items-center justify-start md:justify-end gap-3 w-full md:w-auto mt-3 md:mt-0">

              {/* CLEAR ALL BUTTON */}
              <button
                onClick={clearAllFilters}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold border border-gray-200 uppercase tracking-tighter hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <RefreshCw size={14} /> Clear All
              </button>

              {/* TOGGLE SWITCH */}
              <div
                onClick={() => setHideOutOfStock(!hideOutOfStock)}
                className="flex items-center gap-2 cursor-pointer group select-none bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100"
              >
                <div className={`relative w-9 h-5 rounded-full transition-colors ${hideOutOfStock ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full shadow transform transition-transform ${hideOutOfStock ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <span className="text-[9px] font-bold text-gray-500 uppercase">Hide 0</span>
              </div>

              {/* 2. ARCHIVE BUTTON */}
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`p-2 rounded-lg transition-all border ${showArchived
                  ? "bg-amber-100 text-amber-800 border-amber-200"
                  : "bg-white text-gray-400 border-gray-200 hover:text-gray-600"
                  }`}
                title={showArchived ? "Back to Inventory" : "View Archived Items"}
              >
                {showArchived ? <RefreshCw size={20} /> : <Archive size={20} />}
              </button>

              {/* 3. ADD PRODUCT BUTTON */}
              {!showArchived && (
                <button
                  onClick={() => {
                    setEditingId(null);
                    setProductForm({
                      name: "", category: Object.keys(categories)[0] || "", subcategory: "", price: "", originalPrice: "", stock: "", expiryDate: "", description: "", image: "",
                    });
                    setShowProductForm(!showProductForm);
                  }}
                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-purple-700 transition-colors whitespace-nowrap"
                >
                  {showProductForm ? <X size={16} /> : <Plus size={16} />}{" "}
                  {showProductForm ? "Cancel" : "Add Product"}
                </button>
              )}

              {/* 4. CSV BULK ACTIONS ENGINE */}
              <div className="flex gap-2 border-l border-gray-200 pl-3 ml-1">
                <button
                  onClick={handleDownloadTemplate}
                  title="Download Blank Template"
                  className="p-2 text-gray-400 hover:text-green-600 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-green-50 transition-colors"
                >
                  <FileText size={16} />
                </button>
                <button
                  onClick={handleExportCSV}
                  title="Backup & Export Inventory"
                  className="p-2 text-gray-400 hover:text-blue-600 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-blue-50 transition-colors"
                >
                  <Download size={16} />
                </button>
                <label
                  title="Import Products via CSV"
                  className={`p-2 bg-white border border-gray-200 rounded-lg shadow-sm transition-colors relative ${isImporting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer text-gray-400 hover:text-purple-600 hover:bg-purple-50'}`}
                >
                  <Upload size={16} />
                  <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} disabled={isImporting} />
                  {isImporting && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                    </span>
                  )}
                </label>
              </div>

            </div>
          </div>

          {showProductForm && (
            <form
              onSubmit={handleProductSubmit}
              className="bg-white border border-purple-200 rounded-xl p-6 shadow-sm space-y-4 animate-fade-in"
            >
              <h3 className="font-bold text-gray-900">
                {editingId ? "Edit Product" : "Add New Product"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required placeholder="Name" className="p-3 border rounded-lg text-sm" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
                <select className="p-3 border rounded-lg text-sm" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value, subcategory: "" })}>
                  <option value="">Select Category</option>
                  {Object.keys(categories).map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
                <select className="p-3 border rounded-lg text-sm" value={productForm.subcategory} onChange={(e) => setProductForm({ ...productForm, subcategory: e.target.value })}>
                  <option value="">Select Subcategory</option>
                  {(categories[productForm.category] || []).map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
                <div className="flex gap-2">
                  <input required type="number" step="0.001" placeholder="Price" className="p-3 border rounded-lg text-sm w-1/2" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} />
                  <input type="number" step="0.001" placeholder="Old Price" className="p-3 border rounded-lg text-sm w-1/2" value={productForm.originalPrice} onChange={(e) => setProductForm({ ...productForm, originalPrice: e.target.value })} />
                </div>
                <input required type="number" placeholder="Stock" className="p-3 border rounded-lg text-sm" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} />
                <input placeholder="Expiry (YYYY-MM-DD)" className="p-3 border rounded-lg text-sm" value={productForm.expiryDate} onChange={(e) => setProductForm({ ...productForm, expiryDate: e.target.value })} />
                <input placeholder="Image URL" className="p-3 border rounded-lg text-sm" value={productForm.image} onChange={(e) => setProductForm({ ...productForm, image: e.target.value })} />
                <textarea placeholder="Description" className="p-3 border rounded-lg text-sm md:col-span-2" rows="2" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
              </div>
              <button type="submit" className="w-full bg-gray-900 text-white py-3 rounded-lg font-bold hover:bg-black">
                {editingId ? "Update Product" : "Save Product"}
              </button>
            </form>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs">
                  <tr>
                    {/* PRODUCT HEADER */}
                    <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleHeaderSort("name")}>
                      <div className="flex items-center gap-1">
                        Product
                        {sortConfig.map((s, index) => s.key === "name" && (
                          <span key="name-sort" className="text-purple-600 flex items-center">
                            {s.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            <span className="ml-1 bg-purple-100 px-1.5 rounded-full text-[9px]">{index + 1}</span>
                          </span>
                        ))}
                      </div>
                    </th>

                    {/* STOCK HEADER */}
                    <th className="p-4 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleHeaderSort("stock")}>
                      <div className="flex items-center justify-center gap-1">
                        Stock
                        {sortConfig.map((s, index) => s.key === "stock" && (
                          <span key="stock-sort" className="text-purple-600 flex items-center">
                            {s.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            <span className="ml-1 bg-purple-100 px-1.5 rounded-full text-[9px]">{index + 1}</span>
                          </span>
                        ))}
                      </div>
                    </th>

                    {/* PRICE HEADER */}
                    <th className="p-4 text-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleHeaderSort("price")}>
                      <div className="flex items-center justify-center gap-1">
                        Price
                        {sortConfig.map((s, index) => s.key === "price" && (
                          <span key="price-sort" className="text-purple-600 flex items-center">
                            {s.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            <span className="ml-1 bg-purple-100 px-1.5 rounded-full text-[9px]">{index + 1}</span>
                          </span>
                        ))}
                      </div>
                    </th>

                    {/* --- EXPIRY HEADER --- */}
                    <th
                      className="p-4 text-center cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => handleHeaderSort("expiryDate")}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Expiry
                        {sortConfig.map((s, index) => s.key === "expiryDate" && (
                          <span key="expiry-sort" className="text-purple-600 flex items-center">
                            {s.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {sortConfig.length > 1 && (
                              <span className="ml-1 bg-purple-100 px-1.5 rounded-full text-[9px] font-bold">
                                {index + 1}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </th>

                    {/* --- VISIBLE HEADER (FILTER) --- */}
                    <th
                      className="p-4 text-center cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={cycleVisFilter}
                      title="Click to toggle: All -> Visible -> Hidden"
                    >
                      <div className="flex items-center justify-center gap-2">
                        {visFilter === "all" && <span>Visible</span>}
                        {visFilter === "visible" && <span className="text-green-600 flex items-center gap-1"><Eye size={14} /> Only</span>}
                        {visFilter === "hidden" && <span className="text-gray-400 flex items-center gap-1"><EyeOff size={14} /> Only</span>}

                        {/* The Filter Icon you requested */}
                        <div className="text-gray-300">
                          {visFilter === "all" ? <Filter size={12} /> : <Filter size={12} className="text-purple-500" />}
                        </div>
                      </div>
                    </th>

                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredInventory.map((p) => (
                    <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${!p.active ? "opacity-60 bg-gray-50" : ""}`}>
                      <td className="p-4">
                        <div className="font-bold text-gray-900">{p.name}</div>
                        {p.expiryDate && (() => {
                          const diff = Math.ceil((new Date(p.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                          if (diff < 0) return <span className="inline-block mt-1 text-[10px] font-bold text-white bg-red-800 px-2 py-0.5 rounded animate-pulse">⚠️ EXPIRED</span>;
                          if (diff <= 90) return <span className="inline-block mt-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">⏳ Expiring in {diff} days</span>;
                          return null;
                        })()}
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full border border-purple-100 font-bold">{p.category}</span>
                          {p.subcategory && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{p.subcategory}</span>}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <input type="number" className={`w-16 p-2 border rounded text-center font-bold ${p.stock < 3 ? "text-red-600 border-red-200 bg-red-50" : "border-gray-200"}`} value={p.stock} onChange={(e) => onUpdateStock(p.id, e.target.value)} />
                      </td>
                      <td className="p-4 text-center">
                        <input type="number" step="0.001" className="w-20 p-2 border border-gray-200 rounded text-center text-purple-600 font-bold" value={p.price} onChange={(e) => onUpdatePrice(p.id, e.target.value)} />
                      </td>
                      <td className="p-4 text-center text-[11px] font-mono text-gray-500">
                        {p.expiryDate ? p.expiryDate : "—"}
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={() => onToggleStatus(p.id, p.active)} className={`p-2 rounded-full ${p.active ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`}>
                          {p.active ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>
                      </td>
                      <td className="p-4 text-center flex justify-center gap-2">
                        <button onClick={() => startEditProduct(p)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-full" title="Edit">
                          <Edit size={18} />
                        </button>

                        {/* ARCHIVE BUTTON */}
                        <button
                          onClick={() => toggleArchiveStatus(p)}
                          className={`p-2 rounded-full transition-colors ${p.archived ? "text-green-500 hover:bg-green-50" : "text-amber-500 hover:bg-amber-50"}`}
                          title={p.archived ? "Restore" : "Archive"}
                        >
                          {p.archived ? <RefreshCw size={18} /> : <Archive size={18} />}
                        </button>

                        <button onClick={() => onDeleteProduct(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full" title="Delete">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORIES TAB */}
      {tab === "categories" && (
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold mb-4 text-lg">Main Categories</h3>
            <div className="flex gap-2 mb-4">
              <input
                className="border p-2 rounded-lg flex-1 text-sm"
                placeholder="New Category Name"
                value={newMainCat}
                onChange={(e) => setNewMainCat(e.target.value)}
              />
              <button
                onClick={addMainCategory}
                className="bg-purple-600 text-white px-4 rounded-lg text-sm font-bold hover:bg-purple-700"
              >
                Add
              </button>
            </div>
            <ul className="space-y-2">
              {Object.keys(localCategories).map((cat) => (
                <li
                  key={cat}
                  className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100"
                >
                  <span className="font-medium">{cat}</span>
                  <button
                    onClick={() => deleteMainCategory(cat)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold mb-4 text-lg">Subcategories</h3>
            <div className="flex gap-2 mb-4">
              <select
                className="border p-2 rounded-lg text-sm bg-white"
                value={newSubCat.main}
                onChange={(e) =>
                  setNewSubCat({ ...newSubCat, main: e.target.value })
                }
              >
                <option value="">Select Main</option>
                {Object.keys(localCategories).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                className="border p-2 rounded-lg flex-1 text-sm"
                placeholder="Subcategory Name"
                value={newSubCat.sub}
                onChange={(e) =>
                  setNewSubCat({ ...newSubCat, sub: e.target.value })
                }
              />
              <button
                onClick={addSubCategory}
                className="bg-purple-600 text-white px-4 rounded-lg text-sm font-bold hover:bg-purple-700"
              >
                Add
              </button>
            </div>
            <div className="space-y-4 h-[400px] overflow-y-auto pr-2">
              {Object.entries(localCategories).map(([main, subs]) => (
                <div key={main}>
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 sticky top-0 bg-white py-1">
                    {main}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {subs.map((sub) => (
                      <span
                        key={sub}
                        className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm flex items-center gap-2 border border-purple-100"
                      >
                        {sub}
                        <button
                          onClick={() => deleteSubCategory(main, sub)}
                          className="text-purple-300 hover:text-red-500"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PROMOTIONS TAB (UPGRADED) */}
      {tab === "promos" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-purple-200 shadow-sm animate-fade-in">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-lg text-purple-900">
              <Tag size={20} className="text-purple-600" />
              {isEditingPromo ? "Edit Promotion" : "Create New Campaign"}
            </h3>

            {/* 1. CAMPAIGN TYPE SELECTOR */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { id: 'collection', label: 'Collection Tab', icon: LayoutDashboard, desc: 'Group items for Home Page' },
                { id: 'coupon', label: 'Coupon Code', icon: Tag, desc: 'Customer enters code at checkout' },
                { id: 'auto', label: 'Seasonal Sale', icon: Sparkles, desc: 'Auto-discount visible in shop' },
                { id: 'flash', label: 'Flash Sale', icon: Clock, desc: 'Time-limited deal with countdown' },
              ].map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setNewPromo({ ...newPromo, type: type.id })}
                  className={`p-4 rounded-xl border text-left transition-all ${newPromo.type === type.id
                    ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600'
                    : 'border-gray-200 hover:border-purple-300'}`}
                >
                  <type.icon size={24} className={`mb-2 ${newPromo.type === type.id ? 'text-purple-600' : 'text-gray-400'}`} />
                  <div className="font-bold text-sm text-gray-900">{type.label}</div>
                  <div className="text-[10px] text-gray-500 leading-tight mt-1">{type.desc}</div>
                </button>
              ))}
            </div>

            {/* 2. BASIC DETAILS */}
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Internal Title</label>
                <input
                  className="w-full border p-2 rounded-lg mt-1 text-sm"
                  placeholder="e.g. Valentine's Sale 2026"
                  value={newPromo.title}
                  onChange={(e) => setNewPromo({ ...newPromo, title: e.target.value })}
                />
              </div>

              {newPromo.type === 'coupon' && (
                <div>
                  <label className="text-xs font-bold text-purple-600 uppercase">Promo Code</label>
                  <input
                    className="w-full border-2 border-purple-100 p-2 rounded-lg mt-1 text-sm font-mono uppercase font-bold text-purple-700 focus:border-purple-500 outline-none"
                    placeholder="e.g. SAVE10"
                    value={newPromo.code}
                    onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                  />
                </div>
              )}

              {/* --- NEW: CUSTOM GRAPHIC UPLOAD --- */}
              <div className="md:col-span-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Custom Floating Tag</label>
                <div className="mt-1 flex items-center gap-3">
                  {newPromo.tagImage ? (
                    <div className="relative w-10 h-10 rounded bg-gray-100 border flex-shrink-0">
                      <img src={newPromo.tagImage} className="w-full h-full object-contain rounded" />
                      <button type="button" onClick={() => setNewPromo({ ...newPromo, tagImage: null })} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={12} /></button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center w-10 h-10 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:bg-purple-50 text-gray-400 transition-colors">
                      <Upload size={14} />
                      <input
                        type="file"
                        accept="image/png, image/gif, image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            // We use FileReader directly to bypass compression and keep the transparent background intact
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setNewPromo({ ...newPromo, tagImage: reader.result });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  )}<p className="text-[9px] text-gray-400 leading-tight mb-2">Upload a square PNG for the bottom-left corner overlay.</p>

                  {/* TAG TOGGLE */}
                  <label className="flex items-center gap-2 cursor-pointer mt-2 bg-gray-50 p-2 rounded border border-gray-100 w-fit">
                    <input
                      type="checkbox"
                      checked={newPromo.showTag !== false}
                      onChange={(e) => setNewPromo({ ...newPromo, showTag: e.target.checked })}
                      className="accent-purple-600"
                    />
                    <span className="text-[10px] font-bold text-gray-600 uppercase">Show tag on products</span>
                  </label>

                  {/* MENU VISIBILITY TOGGLE */}
                  <label className="flex items-center gap-2 cursor-pointer mt-2 bg-gray-50 p-2 rounded border border-gray-100 w-fit">
                    <input
                      type="checkbox"
                      checked={newPromo.showInMenu !== false}
                      onChange={(e) => setNewPromo({ ...newPromo, showInMenu: e.target.checked })}
                      className="accent-purple-600"
                    />
                    <span className="text-[10px] font-bold text-gray-600 uppercase">Show as Tab in Shop Menu</span>
                  </label>

                </div>
              </div>
            </div>

            {/* 3. RULES ENGINE (Only for Coupons & Sales) */}
            {newPromo.type !== 'collection' && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6 space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Discount Rules</h4>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500">Value</label>
                    <div className="flex mt-1">
                      <input
                        type="number"
                        className="w-full p-2 border rounded-l-lg text-sm"
                        value={newPromo.value}
                        onChange={(e) => setNewPromo({ ...newPromo, value: e.target.value })}
                      />
                      <select
                        className="bg-gray-100 border-y border-r rounded-r-lg px-3 text-sm font-bold"
                        value={newPromo.discountType}
                        onChange={(e) => setNewPromo({ ...newPromo, discountType: e.target.value })}
                      >
                        <option value="percentage">% OFF</option>
                        <option value="fixed">BHD OFF</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500">Min Spend (Optional)</label>
                    <input
                      type="number"
                      placeholder="0.000"
                      className="w-full p-2 border rounded-lg mt-1 text-sm"
                      value={newPromo.minSpend}
                      onChange={(e) => setNewPromo({ ...newPromo, minSpend: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500">Start Date</label>
                    <input type="date" className="w-full p-2 border rounded-lg mt-1 text-sm" value={newPromo.startDate} onChange={(e) => setNewPromo({ ...newPromo, startDate: e.target.value })} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500">End Date</label>
                    <input type="date" className="w-full p-2 border rounded-lg mt-1 text-sm" value={newPromo.endDate} onChange={(e) => setNewPromo({ ...newPromo, endDate: e.target.value })} />
                  </div>
                  {newPromo.type === 'flash' && (
                    <div className="flex-1 animate-fade-in">
                      <label className="text-xs font-bold text-red-500 flex items-center gap-1"><Clock size={12} /> End Time</label>
                      <input type="time" className="w-full p-2 border-2 border-red-100 rounded-lg mt-1 text-sm focus:border-red-400 outline-none font-mono" value={newPromo.endTime || ""} onChange={(e) => setNewPromo({ ...newPromo, endTime: e.target.value })} />
                    </div>
                  )}
                  {newPromo.type === 'coupon' && (
                    <div className="flex-1">
                      <label className="text-xs font-bold text-gray-500">Usage Limit</label>
                      <input type="number" placeholder="∞" className="w-full p-2 border rounded-lg mt-1 text-sm" value={newPromo.usageLimit} onChange={(e) => setNewPromo({ ...newPromo, usageLimit: e.target.value })} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. SCOPE SELECTION */}
            <div className="mb-2 flex flex-col md:flex-row gap-2 justify-between items-center">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Apply To:</label>
                <select
                  className="text-sm border rounded-lg p-1 bg-white"
                  value={newPromo.scope}
                  onChange={(e) => setNewPromo({ ...newPromo, scope: e.target.value, targetSelections: [] })}
                >
                  <option value="specific">Specific Products</option>
                  <option value="category">Specific Categories</option>
                  <option value="all">Entire Store (All Items)</option>
                </select>
              </div>

              {newPromo.scope === 'specific' && (
                <div className="relative w-full md:w-auto flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    className="w-full pl-8 pr-4 py-2 border rounded-full text-sm bg-gray-50 focus:bg-white"
                    value={promoSearchQuery}
                    onChange={(e) => setPromoSearchQuery(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* 5. SELECTION GRID */}
            {newPromo.scope === 'specific' && (
              <div className="h-64 overflow-y-auto border rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 bg-gray-50 mb-4">
                <div className="col-span-full flex gap-2 mb-2">
                  <button type="button" onClick={selectAllFiltered} className="text-xs font-bold text-purple-600 hover:underline">Select All Visible</button>
                  <button type="button" onClick={deselectAllFiltered} className="text-xs font-bold text-gray-400 hover:underline">Clear</button>
                </div>
                {filteredPromoProducts.map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-center gap-2 bg-white p-3 rounded-lg border cursor-pointer transition-all ${newPromo.targetSelections.includes(p.id)
                      ? "border-purple-500 bg-purple-50 ring-1 ring-purple-500"
                      : "border-gray-200 hover:border-purple-300"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={newPromo.targetSelections.includes(p.id)}
                      onChange={() => toggleTarget(p.id)}
                      className="accent-purple-600 w-4 h-4 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.category}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {newPromo.scope === 'category' && (
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.keys(categories).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleTarget(cat)}
                    className={`px-3 py-1 rounded-full text-sm font-bold border transition-colors ${newPromo.targetSelections.includes(cat) ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={savePromo}
                className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-700 shadow-md flex items-center gap-2"
              >
                <Save size={18} /> {isEditingPromo ? "Update Campaign" : "Launch Campaign"}
              </button>
              {isEditingPromo && (
                <button
                  onClick={() => {
                    setIsEditingPromo(null);
                    setNewPromo({ title: "", type: "collection", code: "", discountType: "percentage", value: 0, startDate: "", endDate: "", usageLimit: "", minSpend: "", scope: "specific", targetSelections: [], active: true });
                  }}
                  className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* LIST OF ACTIVE PROMOS */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {promotions.map((promo, index) => (
              <div
                key={promo.id}
                className={`flex bg-white p-5 rounded-xl border shadow-sm relative group hover:shadow-md transition-shadow ${promo.active === false ? 'opacity-60 grayscale' : 'border-purple-100'}`}
              >
                {/* REORDER BUTTONS */}
                <div className="flex flex-col gap-1 pr-4 border-r border-gray-100 mr-4 pt-1">
                  <button onClick={() => movePromotion(index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-purple-600 disabled:opacity-20 transition-colors"><ArrowUp size={16} /></button>
                  <button onClick={() => movePromotion(index, 'down')} disabled={index === promotions.length - 1} className="p-1 text-gray-400 hover:text-purple-600 disabled:opacity-20 transition-colors"><ArrowDown size={16} /></button>
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${promo.type === 'coupon' ? 'bg-blue-100 text-blue-700' :
                          promo.type === 'auto' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                          {promo.type === 'auto' ? 'SALE' : promo.type.toUpperCase()}
                        </span>
                        {promo.code && <span className="font-mono text-xs font-bold bg-gray-100 px-1 rounded">{promo.code}</span>}
                      </div>
                      <h4 className="font-bold text-lg text-gray-900 leading-tight">
                        {promo.title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {promo.scope === 'all' ? 'Entire Store' : `${promo.targetSelections?.length || 0} Items/Cats`}
                        {promo.value > 0 && ` • ${promo.value}${promo.discountType === 'percentage' ? '%' : ' BHD'} OFF`}
                      </p>
                      {promo.expiryDate && <p className="text-[10px] text-red-400 mt-2 font-bold">Ends: {promo.expiryDate}</p>}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
                    <button
                      onClick={() => {
                        setIsEditingPromo(promo.id);
                        setNewPromo({
                          ...promo,
                          type: promo.type || 'collection',
                          scope: promo.scope || 'specific',
                          targetSelections: promo.targetSelections || promo.productIds || [],
                          showTag: promo.showTag !== false,
                          showInMenu: promo.showInMenu !== false,
                          endTime: promo.endTime || ""
                        });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg text-xs font-bold hover:bg-blue-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDeletePromotion(promo.id)}
                      className="px-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONTENT TAB */}
      {tab === "content" && (
        <form
          onSubmit={handleContentSubmit}
          className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6"
        >
          <div className="flex justify-between items-center border-b pb-4">
            <h3 className="font-bold text-lg">Store Content Settings</h3>
            <button
              type="submit"
              className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-purple-700"
            >
              <Save size={16} /> Save Changes
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {Object.entries(editableContent).map(([key, val]) => (
              <div
                key={key}
                className={key.includes("Description") ? "md:col-span-2" : ""}
              >
                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </label>
                {key.includes("Description") ? (
                  <textarea
                    className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    rows="3"
                    value={val}
                    onChange={(e) =>
                      setEditableContent({
                        ...editableContent,
                        [key]: e.target.value,
                      })
                    }
                  />
                ) : (
                  <input
                    className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    value={val}
                    onChange={(e) =>
                      setEditableContent({
                        ...editableContent,
                        [key]: e.target.value,
                      })
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </form>
      )}
      {tab === "wa-templates" && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6 animate-fade-in">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h3 className="font-bold text-lg text-gray-900">Edit WhatsApp Templates</h3>
              <p className="text-xs text-gray-500">Manage your message automation.</p>
            </div>
            <div className="flex gap-3">
              {/* ➕ NEW ADD BUTTON */}
              <button
                onClick={() => {
                  const newTemp = {
                    id: Date.now().toString(), // Generates a unique ID
                    label: "New Template Name",
                    text: "Type your message here... ✧"
                  };
                  setWhatsappTemplates([...whatsappTemplates, newTemp]);
                }}
                className="bg-purple-50 text-purple-600 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-purple-100 transition-all"
              >
                <Plus size={16} /> Add Template
              </button>

              <button
                onClick={async () => {
                  try {
                    await setDoc(doc(db, "settings", "whatsapp_templates"), { templates: whatsappTemplates });
                    alert("All changes saved! 🚀");
                  } catch (e) { console.error(e); }
                }}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 shadow-sm"
              >
                <Save size={16} /> Save All
              </button>
            </div>
          </div>

          {/* This section generates the actual text boxes */}
          <div className="grid gap-6">
            {whatsappTemplates && whatsappTemplates.length > 0 ? (
              whatsappTemplates.map((temp, index) => (
                <div key={temp.id || index} className="p-5 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-purple-400">#0{index + 1}</span>
                    <input
                      className="w-full font-bold bg-transparent border-b border-transparent hover:border-gray-200 focus:border-purple-400 mb-1 outline-none transition-all text-gray-800"
                      value={temp.label}
                      onChange={(e) => {
                        const updated = [...whatsappTemplates];
                        updated[index] = { ...updated[index], label: e.target.value };
                        setWhatsappTemplates(updated);
                      }}
                    />
                  </div>

                  <textarea
                    className="w-full h-40 p-4 text-sm border border-gray-100 rounded-xl bg-white resize-none focus:ring-2 focus:ring-purple-100 focus:border-purple-300 outline-none transition-all shadow-inner text-gray-700 font-medium"
                    value={temp.text}
                    onChange={(e) => {
                      const updated = [...whatsappTemplates];
                      updated[index] = { ...updated[index], text: e.target.value };
                      setWhatsappTemplates(updated);
                    }}
                  />

                  <div className="flex flex-wrap gap-2 pt-1">
                    {['{name}', '{orderId}', '{total}', '{method}', '{summary}', '{status}'].map(tag => (
                      <span key={tag} className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-gray-200 text-purple-500">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400">
                <p>No templates found. Try refreshing or check Firebase.</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ✨ WHATSAPP HUB POPUP */}
      {whatsappOrder && (
        <WhatsAppModal
          order={whatsappOrder}
          templates={whatsappTemplates}
          onClose={() => setWhatsappOrder(null)}
        />
      )}

      {/* ✨ RECEIPT MODAL */}
      {receiptOrder && (
        <OrderReceiptModal
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      )}

      {/* ✨ PREVIEW MODAL (Restored for Admin) */}
      <ImagePreviewModal
        src={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
};
// --- MAIN APP ---
export default function App() {
  useEffect(() => {
    document.title = "Shepherdess K-Beauty";
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = LOGO_URL;
  }, []);
  // --- ROBUST NOTIFICATION SETUP ---
  const handleNotificationSetup = async () => {
    console.log("1. Starting setup...");

    if (!('serviceWorker' in navigator)) {
      alert("This browser does not support notifications.");
      return;
    }

    try {
      // A. Clear old workers to prevent conflicts
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
      }
      console.log("2. Old workers cleared.");

      // B. Ask for Permission
      const permission = await window.Notification.requestPermission();
      if (permission !== "granted") {
        alert("Permission denied. Please enable notifications in browser settings.");
        return;
      }
      console.log("3. Permission granted.");

      // C. Register the new worker explicitly
      const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log("4. Service Worker registered:", swRegistration);

      // D. Get the Token using that specific registration
      const token = await getToken(messaging, {
        vapidKey: "BM110yqqzY-oIJZJM8XankX3t0VdrpLFCOTTIASts_mpYJPmv3E0JlR3_KiyOAs6A4ZlNh5nE5Saf_fmIXcNJZY",
        serviceWorkerRegistration: swRegistration
      });

      if (token) {
        console.log("5. SUCCESS! Token:", token);
        // Save to Firebase
        await setDoc(doc(db, "notification_tokens", token), {
          createdAt: new Date().toISOString(),
          userAgent: navigator.userAgent
        });
        alert("Success! You will now receive Shepherdess updates. 🌸");
      }

    } catch (error) {
      console.error("SETUP FAILED:", error);
      alert("Error: " + error.message);
    }
  };
  // --- FOREGROUND LISTENER (New!) ---
  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground Message:', payload);
      // This triggers a standard alert when you are looking at the site
      alert(`🔔 ${payload.notification?.title}: ${payload.notification?.body}`);
    });
    return () => unsubscribe();
  }, []);
  // --- 🧾 V8: DYNAMIC HEIGHT RECEIPT (Perfect Cut) ---
  const generateReceipt = async (order) => {
    // 1. CALCULATE HEIGHT BEFORE CREATING PDF
    const items = Object.values(order.items || {});
    const itemCount = items.length;

    // Check for notes/address to add extra space
    const methodRaw = order.customer?.deliveryMethod || order.method || "Pickup";
    let noteText = "";
    if (methodRaw.toLowerCase() === 'delivery') noteText = order.customer?.deliveryAddress || "";
    else noteText = order.customer?.meetupNote || "";

    const hasNote = noteText && noteText !== "N/A" && noteText.trim() !== "";

    // --- FIX: Increased Base (150) and per-item (10) for safe dynamic growth ---
    const dynamicHeight = 150 + (itemCount * 10) + (hasNote ? 25 : 0);

    // 2. SETUP PDF WITH CALCULATED HEIGHT
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, dynamicHeight]
    });

    const centerX = 40;
    let y = 10;

    // --- HELPER: Circular Image (Restored exactly from your old code) ---
    const loadCircularImage = (url) => {
      return new Promise((resolve) => {
        if (!url) return resolve(null);
        const img = new Image();
        img.src = url;
        img.crossOrigin = "Anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const size = Math.min(img.width, img.height);
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, size, size);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => resolve(null);
      });
    };

    // 3. 🌸 LOGO & HEADER
    const logoData = await loadCircularImage(LOGO_URL);
    if (logoData) {
      doc.addImage(logoData, "PNG", centerX - 9, y, 18, 18);
      y += 24;
    }

    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("Shepherdess", centerX, y, null, "center");
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(124, 58, 237);
    doc.text("K-BEAUTY STORE", centerX, y, null, "center");
    y += 8;

    // 4. 🆔 ORDER INFO
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    const cleanId = order.orderId.replace('#', '');
    doc.text(`ORDER #${cleanId}`, centerX, y, null, "center");
    y += 5;

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text(new Date(order.date).toLocaleDateString(), centerX, y, null, "center");
    y += 6;

    // --- DASHED DIVIDER ---
    doc.setDrawColor(200, 200, 200);
    doc.setLineDash([1, 1], 0);
    doc.line(6, y, 74, y);
    y += 6;

    // 5. 👤 CUSTOMER DETAILS
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);

    const drawRow = (label, value) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, 6, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, 74, y, null, "right");
      y += 5;
    };

    drawRow("Customer:", order.customer?.name || "Guest");
    drawRow("Phone:", order.customer?.phone || "N/A");
    drawRow("Method:", methodRaw.toUpperCase());

    // --- NOTE / ADDRESS ---
    if (hasNote) {
      y += 1;
      doc.setFont("helvetica", "italic");
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(7);
      const splitNote = doc.splitTextToSize(noteText, 65);
      doc.text(splitNote, centerX, y, null, "center");
      y += (splitNote.length * 3.5) + 2;
      doc.setTextColor(0, 0, 0);
    } else {
      y += 2;
    }

    // --- DASHED DIVIDER ---
    doc.setLineDash([1, 1], 0);
    doc.setDrawColor(200, 200, 200);
    doc.line(6, y, 74, y);
    y += 6;

    // 6. 🛒 ITEMS LIST
    items.forEach(item => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);

      let name = item.name;
      if (name.length > 22) name = name.substring(0, 20) + "...";

      doc.text(`${item.qty}x ${name}`, 6, y);

      doc.setFont("courier", "bold");
      doc.text(`${(item.price * item.qty).toFixed(3)}`, 74, y, null, "right");
      y += 5;
    });

    y += 2;
    // --- SOLID TOTALS LINE ---
    doc.setLineDash([], 0);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(6, y, 74, y);
    y += 6;

    // 7. 💰 TOTALS
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    const subtotal = order.items ? Object.values(order.items).reduce((sum, i) => sum + (i.price * i.qty), 0) : 0;
    const deliveryFee = order.deliveryFee || 0;
    const total = subtotal + deliveryFee;

    doc.text("Subtotal", 6, y);
    doc.text(`${subtotal.toFixed(3)} BHD`, 74, y, null, "right");
    y += 5;

    doc.text("Delivery", 6, y);
    doc.text(`${deliveryFee.toFixed(3)} BHD`, 74, y, null, "right");
    y += 8;

    // GRAND TOTAL
    doc.setTextColor(124, 58, 237);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("TOTAL", 6, y);
    doc.text(`${total.toFixed(3)} BHD`, 74, y, null, "right");
    y += 12;

    // 8. ║█║ BARCODE (Bottom Anchor)
    doc.setFillColor(0, 0, 0);
    const barcodeH = 12;
    const barcodeW = 60;
    const startX = (80 - barcodeW) / 2;
    const endX = startX + barcodeW;

    let currentBarX = startX;
    while (currentBarX < endX) {
      const w = Math.random() > 0.5 ? 1.5 : 0.6;
      if (currentBarX + w > endX) break;
      doc.rect(currentBarX, y, w, barcodeH, "F");
      const gap = Math.random() > 0.5 ? 0.5 : 0.8;
      currentBarX += w + gap;
    }

    y += barcodeH + 4; // Space below barcode

    doc.setTextColor(0, 0, 0);
    doc.setFont("courier", "normal");
    doc.setFontSize(9);
    doc.text("THANK YOU FOR SHOPPING!", centerX, y, null, "center");

    // --- NEW: TIGHT PADDING LOGIC ---
    // Instead of relying on a pre-calculated height, we crop the page 
    // to the current 'y' position plus a small bottom margin (e.g., 10mm).
    const finalContentHeight = y + 10;

    // This removes the extra white space seen in your current PDFs
    doc.save(`Receipt-${cleanId}.pdf`);
  };
  // --- 1. ALL DATA STATES ---
  const [user, setUser] = useState(null);
  const [whatsappTemplates, setWhatsappTemplates] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [promotions, setPromotions] = useState([]);
  const [customerReceipt, setCustomerReceipt] = useState(null);

  // --- 2. LOAD CART ---
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem("shepherdess_cart");
      return savedCart ? JSON.parse(savedCart) : {};
    } catch (error) {
      console.error("Failed to load cart", error);
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("shepherdess_cart", JSON.stringify(cart));
  }, [cart]);

  // --- 3. UI STATES ---
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [shopContent, setShopContent] = useState(INITIAL_CONTENT);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [viewMode, setViewMode] = useState("shop");
  const [checkoutStep, setCheckoutStep] = useState("cart");
  const [deliveryMethod, setDeliveryMethod] = useState("meetup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [meetupNote, setMeetupNote] = useState("");

  // --- 4. RESTORED VARIABLES ---
  const [visibleCount, setVisibleCount] = useState(12);
  const [sortOption, setSortOption] = useState("default");
  const [hideOutOfStock, setHideOutOfStock] = useState(false);
  const [notification, setNotification] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    phone: "",
    proof: "",
  });

  // --- 5. MARKETING ENGINE (The New Logic) ---
  const [appliedCode, setAppliedCode] = useState(null); // Stores: { code, value, type, id }
  const [promoError, setPromoError] = useState("");

  // A. Helper: Check if a promo is active based on dates
  const isPromoActive = (promo) => {
    if (!promo.startDate || !promo.endDate) return true;
    const now = new Date();
    const start = new Date(promo.startDate);
    const end = new Date(promo.endDate);
    end.setHours(23, 59, 59, 999);
    return now >= start && now <= end;
  };

  // B. Helper: Calculate "Auto-Sale" Price (Visual Discount)
  const getProductPrice = (product) => {
    // 1. Find an active 'auto' sale that applies to this product
    const activeSale = promotions.find(p =>
      p.type === 'auto' &&
      isPromoActive(p) &&
      (
        p.scope === 'all' ||
        (p.scope === 'category' && (p.targetSelections.includes(product.category) || p.targetSelections.includes(product.subcategory))) ||
        (p.scope === 'specific' && p.targetSelections.includes(product.id))
      )
    );

    if (!activeSale) return { final: product.price, original: product.originalPrice, isSale: false };

    // 2. Calculate Discount
    let discounted = product.price;
    if (activeSale.discountType === 'percentage') {
      discounted = product.price * (1 - (activeSale.value / 100));
    } else {
      discounted = Math.max(0, product.price - activeSale.value);
    }

    return {
      final: discounted,
      original: product.price,
      isSale: true,
      label: activeSale.title
    };
  };

  // C. Helper: Validate Coupon Code (Checkout)
  const validateCoupon = (code, cartTotal, cartItems) => {
    const promo = promotions.find(p => p.code === code && p.type === 'coupon');

    if (!promo) return { valid: false, error: "Invalid code" };
    if (!isPromoActive(promo)) return { valid: false, error: "Code expired" };
    if (promo.usageLimit && promo.usedCount >= promo.usageLimit) return { valid: false, error: "Usage limit reached" };
    if (promo.minSpend && cartTotal < promo.minSpend) return { valid: false, error: `Min spend: ${promo.minSpend} BHD` };

    // Check Scope (Does cart have eligible items?)
    let eligibleTotal = 0;
    if (promo.scope === 'all') {
      eligibleTotal = cartTotal;
    } else {
      cartItems.forEach(item => {
        if (
          (promo.scope === 'category' && (promo.targetSelections.includes(item.category) || promo.targetSelections.includes(item.subcategory))) ||
          (promo.scope === 'specific' && promo.targetSelections.includes(item.id))
        ) {
          eligibleTotal += (item.price * item.qty);
        }
      });
    }

    if (eligibleTotal === 0) return { valid: false, error: "Code not applicable to these items" };

    // Calculate Discount Amount
    let discountAmount = 0;
    if (promo.discountType === 'percentage') {
      discountAmount = eligibleTotal * (promo.value / 100);
    } else {
      discountAmount = promo.value; // Fixed amount
    }

    // Ensure we don't discount more than the total
    discountAmount = Math.min(discountAmount, cartTotal);

    return { valid: true, discount: discountAmount, promoId: promo.id };
  };

  // Sync Data (Live Listeners)
  useEffect(() => {
    const unsubP = onSnapshot(collection(db, "products"), (s) =>
      setProducts(s.docs.map((d) => ({ ...d.data(), id: d.id })))
    );
    const unsubC = onSnapshot(doc(db, "settings", "categories"), (s) =>
      s.exists()
        ? setCategories(s.data())
        : setDoc(doc(db, "settings", "categories"), INITIAL_CATEGORIES)
    );
    const unsubI = onSnapshot(
      doc(db, "settings", "store_info"),
      (s) => s.exists() && setShopContent({ ...INITIAL_CONTENT, ...s.data() })
    );
    const unsubPr = onSnapshot(collection(db, "promotions"), (s) => {
      const fetchedPromos = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Sort them by our new orderIndex (defaulting to 0 if they don't have one yet)
      fetchedPromos.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
      setPromotions(fetchedPromos);
    });

    return () => {
      unsubP();
      unsubC();
      unsubI();
      unsubPr();
    };
  }, []);

  // --- NEW: Load WhatsApp Templates ONCE (Fixes the typing lock) ---
  useEffect(() => {
    const loadTemplates = async () => {
      const docRef = doc(db, "settings", "whatsapp_templates");
      const s = await getDoc(docRef); // 👈 Use getDoc, NOT onSnapshot
      if (s.exists()) {
        setWhatsappTemplates(s.data().templates);
      }
    };
    loadTemplates();
  }, []);

  // --- Actions ---
  const showNotification = (msg, type = "success") => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdateContent = async (data) => {
    await setDoc(doc(db, "settings", "store_info"), data);
    showNotification("Content updated");
  };
  const handleUpdateCategories = async (data) => {
    await setDoc(doc(db, "settings", "categories"), data);
    showNotification("Categories updated");
  };

  const handleUpdateStock = async (id, val) =>
    updateDoc(doc(db, "products", id), { stock: parseInt(val) });
  const handleUpdatePrice = async (id, val) =>
    updateDoc(doc(db, "products", id), { price: parseFloat(val) });
  const handleToggleStatus = async (id, val) =>
    updateDoc(doc(db, "products", id), { active: !val });
  const handleDeleteProduct = async (id) => {
    if (window.confirm("Delete?")) await deleteDoc(doc(db, "products", id));
  };
  // --- ARCHIVE / UNARCHIVE FUNCTION ---
  const toggleArchiveStatus = async (product) => {
    const newStatus = !product.archived; // Flip the status
    const confirmMsg = newStatus
      ? `Archive "${product.name}"? It will be hidden from the main list.`
      : `Unarchive "${product.name}"? It will return to the active inventory.`;

    if (window.confirm(confirmMsg)) {
      await updateDoc(doc(db, "products", product.id), { archived: newStatus });
    }
  };
  const handleAddProduct = async (data) => {
    await addDoc(collection(db, "products"), {
      ...data,
      createdAt: serverTimestamp(),
    });
    showNotification("Product added");
  };
  const handleUpdateProduct = async (id, data) => {
    await updateDoc(doc(db, "products", id), data);
    showNotification("Product updated");
  };
  const handleUpdateExpiry = async (id, val) =>
    updateDoc(doc(db, "products", id), { expiryDate: val });

  const handleAddPromotion = async (data) => {
    await addDoc(collection(db, "promotions"), data);
    showNotification("Promo created");
  };
  const handleUpdatePromotion = async (id, data) => {
    await updateDoc(doc(db, "promotions", id), data);
    showNotification("Promo updated");
  };
  const handleDeletePromotion = async (id) => {
    if (window.confirm("Delete promo?"))
      await deleteDoc(doc(db, "promotions", id));
  };

  const addToCart = (p) => {
    setCart((prev) => {
      if ((prev[p.id]?.qty || 0) >= p.stock) {
        showNotification("Max stock reached", "error");
        return prev;
      }
      return { ...prev, [p.id]: { ...p, qty: (prev[p.id]?.qty || 0) + 1 } };
    });

    // Custom success message with clickable "View Bag"
    const successMsg = `Added to cart! <b onclick="window.dispatchEvent(new CustomEvent('openCart'))" style="text-decoration: underline; font-style: italic; cursor: pointer; margin-left: 8px;">View Bag</b>`;
    showNotification(successMsg);
  };
  const updateCartQty = (id, delta) => {
    setCart((prev) => {
      const item = prev[id];
      if (!item) return prev;
      const newQty = item.qty + delta;
      if (newQty <= 0) {
        const n = { ...prev };
        delete n[id];
        return n;
      }
      if (newQty > item.stock) return prev;
      return { ...prev, [id]: { ...item, qty: newQty } };
    });
  };

  // Helper to generate short ID
  const generateOrderId = () => {
    return "#" + Math.floor(100000 + Math.random() * 900000).toString();
  };

  // --- NEW: Handle Promo Code Application ---
  const handleApplyCode = () => {
    if (!appliedCodeInput.trim()) return;
    const cartItems = Object.values(cart);
    const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

    // Use the helper from Step 1
    const result = validateCoupon(appliedCodeInput, cartTotal, cartItems);

    if (result.valid) {
      setAppliedCode({ code: appliedCodeInput, discount: result.discount, id: result.promoId });
      setPromoError("");
      showNotification(`Code applied! saved ${result.discount.toFixed(3)} BHD`);
    } else {
      setAppliedCode(null);
      setPromoError(result.error);
    }
  };

  // --- UPDATED: Checkout with Discount Support ---
  const handleCheckout = async (e) => {
    e.preventDefault();

    if (!proofFile) return showNotification("Please upload payment proof", "error");
    if (deliveryMethod === 'delivery' && !deliveryAddress.trim()) {
      return showNotification("Please enter delivery address", "error");
    }

    setIsSubmitting(true);

    try {
      const compressedProof = await compressImage(proofFile);
      const orderId = generateOrderId();
      const cartItems = Object.values(cart);

      // Calculate Totals
      const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
      const deliveryFee = deliveryMethod === 'delivery' ? 1.000 : 0;
      const discount = appliedCode ? appliedCode.discount : 0;
      const finalTotal = Math.max(0, subtotal + deliveryFee - discount);

      await runTransaction(db, async (transaction) => {
        // 1. Stock Check
        const validatedItems = [];
        for (const item of cartItems) {
          const productRef = doc(db, "products", item.id);
          const productSnap = await transaction.get(productRef);
          if (!productSnap.exists()) throw `Product ${item.name} no longer exists!`;
          const currentStock = productSnap.data().stock || 0;
          if (currentStock < item.qty) {
            throw `Sorry! Only ${currentStock} left of ${item.name}.`;
          }
          validatedItems.push({ ref: productRef, newStock: currentStock - item.qty });
        }

        // 2. Update Stock
        validatedItems.forEach(update => {
          transaction.update(update.ref, { stock: update.newStock });
        });

        // 3. Increment Promo Usage (If used)
        if (appliedCode && appliedCode.id) {
          const promoRef = doc(db, "promotions", appliedCode.id);
          const promoSnap = await transaction.get(promoRef);
          if (promoSnap.exists()) {
            const newCount = (promoSnap.data().usedCount || 0) + 1;
            transaction.update(promoRef, { usedCount: newCount });
          }
        }

        // 4. Create Order
        const newOrderRef = doc(collection(db, "orders"));
        const orderData = {
          orderId,
          customer: {
            name: customerDetails.name,
            phone: customerDetails.phone,
            deliveryMethod,
            deliveryAddress: deliveryMethod === 'delivery' ? deliveryAddress : '',
            meetupNote: deliveryMethod !== 'delivery' ? meetupNote : '',
            proof: compressedProof
          },
          items: cart,
          subtotal: subtotal,
          deliveryFee: deliveryFee,
          discount: discount,          // <--- SAVED TO DB
          promoCode: appliedCode ? appliedCode.code : null, // <--- SAVED TO DB
          total: finalTotal,
          journeyStatus: "pending",
          date: new Date().toISOString(),
        };
        transaction.set(newOrderRef, orderData);
        setLastOrder(orderData);
      });

      setCheckoutStep("success");
      setCart({});
      setProofFile(null);
      setAppliedCode(null); // Reset code
      showNotification("Order placed successfully! ✧", "success");

    } catch (error) {
      console.error("Checkout error:", error);
      showNotification(error.toString(), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // New state for the input box
  const [appliedCodeInput, setAppliedCodeInput] = useState("");

  const toggleAdmin = () => {
    if (adminPin === "742472") {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPin("");
      setViewMode("dashboard");
      showNotification("Welcome back!");
    } else {
      showNotification("Incorrect PIN", "error");
    }
  };

  const availableCategories = useMemo(
    () =>
      Object.keys(categories).filter((cat) =>
        products.some((p) => p.active && p.category === cat)
      ),
    [categories, products]
  );

  // NEW: Calculate Current Main Category based on Selection
  const currentMainCategory = useMemo(() => {
    if (categories[selectedCategory]) return selectedCategory; // Is a Main Category
    // Check if it's a subcategory
    const mainParent = Object.keys(categories).find((main) =>
      categories[main].includes(selectedCategory)
    );
    return mainParent || null;
  }, [selectedCategory, categories]);

  // NEW: Subcategories to display (only if they have active products)
  const displaySubcategories = useMemo(() => {
    if (!currentMainCategory) return [];
    const subs = categories[currentMainCategory] || [];
    return subs.filter((sub) =>
      products.some((p) => p.active && p.subcategory === sub)
    );
  }, [currentMainCategory, categories, products]);

  // --- HELPER: CHECK IF NEW (30 DAYS) ---
  const isNewArrival = (createdAt) => {
    if (!createdAt) return false;
    const today = new Date();
    // Handle both Firebase Timestamp (.seconds) and standard Date objects
    const productDate = new Date(
      createdAt.seconds ? createdAt.seconds * 1000 : createdAt
    );
    const diffTime = Math.abs(today - productDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30; // 30 Day Limit
  };

  // --- FILTERED PRODUCTS LOGIC ---
  const filteredProducts = useMemo(() => {
    // 1. Start with the initial filter
    let result = products.filter((p) => {
      // Basic Active Check
      if (!p.active && !isAdmin) return false;

      // Hide Out of Stock Check
      if (hideOutOfStock && p.stock === 0) return false;

      // Search Filter
      const matchesSearch = (p.name || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      // Category Filter
      let matchesCategory = false;
      if (selectedCategory === "All") matchesCategory = true;
      else if (categories[selectedCategory])
        matchesCategory = p.category === selectedCategory;
      else if (Object.values(categories).flat().includes(selectedCategory))
        matchesCategory = p.subcategory === selectedCategory;
      else {
        const promo = promotions.find((pr) => pr.title === selectedCategory);
        if (promo) {
          // Support for new scopes (Category/All) in Tabs
          if (promo.scope === 'all') {
            matchesCategory = true;
          } else if (promo.scope === 'category') {
            matchesCategory = (promo.targetSelections || []).includes(p.category) ||
              (promo.targetSelections || []).includes(p.subcategory);
          } else {
            // Fallback to specific IDs (Checking both legacy productIds and new targetSelections)
            const ids = promo.targetSelections || promo.productIds || [];
            matchesCategory = ids.includes(p.id);
          }
        }
      }
      return matchesCategory && matchesSearch;
    });

    // 2. Apply Sorting
    result.sort((a, b) => {
      if (sortOption === "price-asc") return a.price - b.price;
      if (sortOption === "price-desc") return b.price - a.price;
      if (sortOption === "alpha-asc") return (a.name || "").localeCompare(b.name || "");
      if (sortOption === "newest") {
        const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0);
        return dateB - dateA;
      }
      if (sortOption === "bestseller") return (b.sold || 0) - (a.sold || 0);
      if (sortOption === "available") return (b.stock > 0 ? 1 : 0) - (a.stock > 0 ? 1 : 0);
      return 0; // Default
    });

    return result; // 👈 THIS IS THE CRITICAL RETURN!
  }, [
    products,
    selectedCategory,
    searchQuery,
    isAdmin,
    categories,
    promotions,
    sortOption,
    hideOutOfStock
  ]);

  const displayedProducts = filteredProducts.slice(0, visibleCount);

  // --- WELCOME SCREEN ---
  if (
    products.length === 0 &&
    firebaseConfig.apiKey !== "PASTE_YOUR_API_KEY_HERE" &&
    !isAdmin
  ) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] p-4 animate-fade-in font-sans">
        <img
          src={LOGO_URL}
          alt="Shepherdess"
          className="w-24 h-24 rounded-full shadow-xl mb-6 object-cover border-2 border-white"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.nextSibling.style.display = "flex";
          }}
        />
        <div className="hidden w-24 h-24 bg-purple-600 rounded-full items-center justify-center text-white font-serif text-3xl shadow-lg mb-6">
          S
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 tracking-tight mb-2">
          Welcome to Shepherdess
        </h1>
        <p className="text-sm text-purple-600 font-bold tracking-[0.3em] uppercase mb-12">
          K-Beauty Store
        </p>
        <button
          onClick={() => setShowAdminLogin(true)}
          className="text-gray-300 hover:text-purple-400 transition-colors p-2"
          title="Owner Access"
        >
          <Key size={20} />
        </button>
        {showAdminLogin && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center">
              <input
                type="password"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                placeholder="Enter PIN"
                className="w-full text-center text-xl p-3 border rounded-lg mb-4"
              />
              <button
                onClick={toggleAdmin}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold"
              >
                Enter
              </button>
              <button
                onClick={() => setShowAdminLogin(false)}
                className="mt-2 text-sm text-gray-400 underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans ${THEME.bg} text-slate-800`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Lato:wght@300;400;700&display=swap');
        h1, h2, h3, .font-serif { font-family: 'Playfair Display', serif; }
        body { font-family: 'Lato', sans-serif; }
        @keyframes spin-slow { to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 3s linear infinite; }
      `}</style>

      {notification && (
        <Notification {...notification} onClose={() => setNotification(null)} />
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md shadow-sm border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-20">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => {
              setViewMode("shop");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <img
              src={LOGO_URL}
              className="w-12 h-12 rounded-full border border-purple-100 object-cover"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
            <div className="hidden w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-serif">
              S
            </div>
            <div>
              <h1 className="text-2xl font-bold font-serif">Shepherdess</h1>
              <p className="text-xs text-purple-600 font-bold uppercase tracking-widest">
                K-Beauty
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <button
                onClick={() =>
                  setViewMode((prev) =>
                    prev === "shop" ? "dashboard" : "shop"
                  )
                }
                className="flex items-center gap-1.5 bg-purple-100 text-purple-800 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[10px] md:text-sm font-bold hover:bg-purple-200 transition-colors shadow-sm"
              >
                {viewMode === "shop" ? (
                  <LayoutDashboard size={14} className="md:w-4 md:h-4" />
                ) : (
                  <Store size={14} className="md:w-4 md:h-4" />
                )}
                {/* Sa mobile, icon + word lang. Sa desktop, full text */}
                <span>{viewMode === "shop" ? "Admin" : "Shop"}</span>
              </button>
            )}

            {viewMode === "shop" && (
              <button
                onClick={() => {
                  setCheckoutStep("cart");
                  setIsCartOpen(true);
                }}
                className="relative p-2 hover:text-purple-600 transition-colors"
              >
                <ShoppingBag size={24} />
                {Object.values(cart).reduce((a, b) => a + b.qty, 0) > 0 && (
                  <span className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                    {Object.values(cart).reduce((a, b) => a + b.qty, 0)}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* DASHBOARD OR SHOP */}
      {viewMode === "dashboard" && isAdmin ? (
        <AdminDashboard
          db={db}
          products={products}
          content={shopContent}
          categories={categories}
          promotions={promotions}
          whatsappTemplates={whatsappTemplates}
          setWhatsappTemplates={setWhatsappTemplates}
          onUpdateStock={handleUpdateStock}
          onUpdateExpiry={handleUpdateExpiry}
          onUpdatePrice={handleUpdatePrice}
          onToggleStatus={handleToggleStatus}
          onDeleteProduct={handleDeleteProduct}
          onAddProduct={handleAddProduct}
          onUpdateProduct={handleUpdateProduct}
          onUpdateContent={handleUpdateContent}
          onUpdateCategories={handleUpdateCategories}
          onAddPromotion={handleAddPromotion}
          onUpdatePromotion={handleUpdatePromotion}
          onDeletePromotion={handleDeletePromotion}
          generateReceipt={generateReceipt}
        />
      ) : (
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center mb-6 md:mb-8">

            {/* ✨ NEW: Dynamic Popping Hero Tag with Sparkles */}
            <div className="relative inline-block mb-2">
              <style>{`
                @keyframes pop-in {
                  0% { transform: scale(0.5); opacity: 0; }
                  60% { transform: scale(1.15); opacity: 1; }
                  100% { transform: scale(1); opacity: 1; }
                }
                @keyframes sparkle-burst {
                  0% { transform: scale(0) rotate(0deg); opacity: 0; }
                  50% { transform: scale(1.2) rotate(45deg); opacity: 1; }
                  100% { transform: scale(0.5) rotate(90deg); opacity: 0; }
                }
                .animate-pop-once {
                  animation: pop-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }
                .animate-sparkle-1 {
                  animation: sparkle-burst 0.8s ease-in-out forwards;
                  animation-delay: 0.1s;
                }
                .animate-sparkle-2 {
                  animation: sparkle-burst 0.8s ease-in-out forwards;
                  animation-delay: 0.25s;
                }
              `}</style>

              {/* The Sparkles (Absolutely positioned around the tag) */}
              <div className="absolute -top-3 -left-4 text-red-400 opacity-0 animate-sparkle-1 pointer-events-none">
                <Sparkles size={16} />
              </div>
              <div className="absolute -bottom-2 -right-4 text-red-400 opacity-0 animate-sparkle-2 pointer-events-none">
                <Sparkles size={14} />
              </div>

              {/* The Tag Itself */}
              <span className="relative z-10 inline-block bg-red-100 text-red-600 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-sm animate-pop-once">
                {shopContent.heroTag}
              </span>
            </div>

            {/* Smaller, tighter title */}
            <h2 className="text-2xl md:text-3xl font-serif mt-2 mb-2 text-gray-900">
              {shopContent.heroTitle}
            </h2>

            {/* Smaller description */}
            <p className="text-gray-500 max-w-xl mx-auto text-sm leading-relaxed px-4">
              {shopContent.heroDescription}
            </p>

            {/* ✨ NEW: Seamless Scrolling Marquee Note */}
            <div className="mt-5 max-w-md mx-auto relative bg-purple-50 border border-purple-100 rounded-full py-1.5 flex items-center shadow-sm overflow-hidden">
              <style>{`
                @keyframes marquee {
                  0% { transform: translateX(0%); }
                  100% { transform: translateX(-50%); }
                }
                .animate-scroll {
                  display: flex;
                  width: max-content;
                  /* Lower the 10s to make it faster, raise it to make it slower */
                  animation: marquee 10s linear infinite; 
                }
              `}</style>

              {/* Static Icon on the left */}
              <div className="pl-3 pr-2 z-10 bg-purple-50 flex items-center text-purple-600 shadow-[4px_0_8px_-2px_rgba(250,245,255,1)]">
                <Clock size={14} />
              </div>

              {/* Scrolling Text Container */}
              <div className="flex-1 overflow-hidden relative w-full">
                <div className="animate-scroll text-[10px] md:text-xs font-bold text-purple-600 tracking-wide uppercase flex items-center gap-6 pr-6">
                  {/* Duplicating the text 4 times creates the infinite seamless loop */}
                  <span>{shopContent.heroNote}</span>
                  <span className="text-purple-300">✧</span>
                  <span>{shopContent.heroNote}</span>
                  <span className="text-purple-300">✧</span>
                  <span>{shopContent.heroNote}</span>
                  <span className="text-purple-300">✧</span>
                  <span>{shopContent.heroNote}</span>
                  <span className="text-purple-300">✧</span>
                </div>
              </div>

              {/* Fading edge on the right for a smooth disappear effect */}
              <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-purple-50 to-transparent pointer-events-none z-10"></div>
            </div>

            {/* 1. TOP FILTERS */}
            <div className="flex flex-col gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">

              {/* Search Bar */}
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search for product, or a keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-2xl text-sm focus:outline-none border border-gray-100 focus:ring-2 focus:ring-purple-200 transition-all"
                />
                <Search size={18} className="absolute left-3.5 top-3.5 text-gray-400" />
              </div>

              {/* Main Category Buttons */}
              <div className="flex flex-wrap gap-1.5 md:gap-2 justify-center">
                <button
                  onClick={() => { setSelectedCategory("All"); setVisibleCount(12); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selectedCategory === "All" ? "bg-purple-600 text-white shadow-md" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                >
                  All
                </button>

                {/* Promotions/Sales Tabs */}
                {promotions.filter(p => p.showInMenu !== false && p.active !== false && isPromoActive(p)).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedCategory(p.title); setVisibleCount(12); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${selectedCategory === p.title ? "bg-red-500 text-white shadow-md" : "bg-red-50 text-red-600 hover:bg-red-100"}`}
                  >
                    <Tag size={10} /> {p.title}
                  </button>
                ))}

                {/* Dynamic Main Categories */}
                {availableCategories.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setSelectedCategory(c); setVisibleCount(12); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selectedCategory === c || currentMainCategory === c ? "bg-purple-600 text-white shadow-md transform scale-105" : "bg-gray-100 hover:bg-gray-200"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* NEW: Subcategory Filter Strip (Only shows when a Main Category is active) */}
              {displaySubcategories.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center pt-3 border-t border-gray-50 animate-fade-in">
                  <span className="w-full text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Filter {currentMainCategory}:
                  </span>
                  {displaySubcategories.map((sub) => (
                    <button
                      key={sub}
                      onClick={() => { setSelectedCategory(sub); setVisibleCount(12); }}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${selectedCategory === sub
                        ? "bg-purple-100 border-purple-300 text-purple-700 shadow-sm"
                        : "bg-white border-gray-100 text-gray-500 hover:border-purple-200"
                        }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* --- ⚡ FLASH SALE HOMEPAGE PREVIEW (STREAMLINED & MOBILE OPTIMIZED) --- */}
            {(() => {
              // Find active flash sale
              const flashPromo = promotions.find(p => p.type === 'flash' && p.active !== false && isPromoActive(p));

              // Only show if a flash sale exists AND we are on the main "All" homepage
              if (!flashPromo || selectedCategory !== "All") return null;

              // Get exactly 4 products for the preview
              const flashProducts = products.filter(p =>
                p.active && (
                  flashPromo.scope === 'all' ||
                  (flashPromo.scope === 'category' && (flashPromo.targetSelections?.includes(p.category) || flashPromo.targetSelections?.includes(p.subcategory))) ||
                  (flashPromo.scope === 'specific' && (flashPromo.targetSelections?.includes(p.id) || flashPromo.productIds?.includes(p.id)))
                )
              ).slice(0, 4);

              if (flashProducts.length === 0) return null;

              return (
                <div className="mb-8 md:mb-10 animate-fade-in">
                  {/* Header Section */}
                  <div className="flex justify-between items-end mb-2 px-1">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Sparkles size={14} className="text-purple-600" />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-purple-600">Limited Time Offer</span>
                      </div>
                      <h3 className="text-xl md:text-2xl font-serif font-bold text-gray-900 uppercase italic">
                        {flashPromo.title}
                      </h3>
                    </div>

                    {/* Minimalist See All Button */}
                    <button
                      onClick={() => { setSelectedCategory(flashPromo.title); setVisibleCount(12); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className="text-[10px] md:text-xs font-semibold text-gray-500 hover:text-purple-700 transition-colors border border-gray-200 px-3 py-1 bg-white hover:bg-gray-50 uppercase tracking-wider"
                    >
                      See All
                    </button>
                  </div>

                  {/* Single Row Timer */}
                  <div className="mb-4">
                    <FlashTimer endDate={flashPromo.endDate} endTime={flashPromo.endTime} />
                  </div>

                  {/* 4 Item Preview Grid (2x2 on mobile) */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    {flashProducts.map(p => (
                      <div
                        key={p.id}
                        onClick={() => { setSelectedCategory(flashPromo.title); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className="bg-white rounded-xl p-2.5 md:p-3 shadow-sm hover:shadow-md cursor-pointer border border-transparent hover:border-purple-200 transition-all group flex flex-col"
                      >
                        <div className="aspect-square rounded-lg overflow-hidden mb-2 md:mb-3 relative border border-purple-100">
                          <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 bg-purple-600 text-white text-[9px] md:text-[10px] font-bold px-2 py-0.5 md:py-1 rounded-full shadow-sm">
                            FLASH DEAL
                          </div>
                        </div>
                        <h4 className="font-serif font-bold text-xs md:text-sm text-gray-900 line-clamp-1 mb-1">{p.name}</h4>
                        <div className="mt-auto flex flex-wrap items-center gap-1.5 md:gap-2">
                          {p.originalPrice && <span className="text-[9px] md:text-[10px] text-gray-400 line-through">{p.originalPrice.toFixed(3)}</span>}
                          <span className="text-xs md:text-sm font-bold text-purple-600">{p.price.toFixed(3)} BHD</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* 2. THE STICKY CONTROL BAR */}
            <div className="sticky top-20 z-40 bg-white/90 backdrop-blur-md py-3 mb-8 border-y border-purple-50 shadow-sm px-4 -mx-4">
              <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

                {/* Sort Option */}
                <div className="relative flex-1 max-w-[180px]">
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="appearance-none bg-gray-50 pl-9 pr-4 py-2 rounded-xl text-xs font-bold cursor-pointer focus:outline-none border border-gray-200 w-full"
                  >
                    <option value="default">Sort: Default</option>
                    <option value="price-asc">Price: Low</option>
                    <option value="price-desc">Price: High</option>
                    <option value="newest">New Arrivals</option>
                  </select>
                  <ArrowUpDown size={14} className="absolute left-3 top-2.5 text-gray-400" />
                </div>

                {/* Toggle Switch */}
                <div className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                  <span className={`text-[10px] font-bold uppercase tracking-tight ${hideOutOfStock ? 'text-purple-600' : 'text-gray-400'}`}>
                    Hide Sold Out
                  </span>
                  <button
                    type="button"
                    onClick={() => setHideOutOfStock(!hideOutOfStock)}
                    className={`relative inline-flex h-4 w-9 items-center rounded-full transition-colors ${hideOutOfStock ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${hideOutOfStock ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* UPDATED: 2 Columns on Mobile, 4 on Desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
              {displayedProducts.map((p) => {
                const activePromosForProduct = promotions.filter(promo =>
                  promo.active !== false &&
                  isPromoActive(promo) &&
                  promo.showTag !== false &&
                  (
                    promo.scope === 'all' ||
                    (promo.scope === 'category' && (promo.targetSelections?.includes(p.category) || promo.targetSelections?.includes(p.subcategory))) ||
                    (promo.scope === 'specific' && (promo.targetSelections?.includes(p.id) || promo.productIds?.includes(p.id)))
                  )
                );

                return (
                  <div
                    key={p.id}
                    className="group bg-white rounded-xl md:rounded-2xl p-2.5 md:p-4 shadow-sm hover:shadow-xl transition-all border border-transparent hover:border-purple-100 flex flex-col relative"
                  >
                    {/* --- ⚡ UNIVERSAL FLASH SALE BADGE --- */}
                    {(() => {
                      const activeFlash = promotions.find(promo =>
                        promo.type === 'flash' && promo.active !== false && isPromoActive(promo) &&
                        (promo.scope === 'all' ||
                          (promo.scope === 'category' && (promo.targetSelections?.includes(p.category) || promo.targetSelections?.includes(p.subcategory))) ||
                          (promo.scope === 'specific' && (promo.targetSelections?.includes(p.id) || promo.productIds?.includes(p.id))))
                      );

                      if (!activeFlash) return null;

                      const [y, m, d] = (activeFlash.endDate || "").split('-');
                      const shortDate = d && m ? `${d}/${m}` : '';
                      const shortTime = activeFlash.endTime || "23:59";

                      return (
                        <div className="absolute top-6 right-6 flex flex-col items-end z-20 pointer-events-none">
                          <div className="bg-purple-600 text-white text-[9px] md:text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
                            <Sparkles size={10} className="text-purple-200" />
                            FLASH DEAL
                          </div>
                          <div className="text-[8px] md:text-[9px] font-bold text-white bg-gray-900/80 px-1.5 py-0.5 rounded mt-1 shadow-sm tracking-wide">
                            Ends {shortDate} {shortTime}
                          </div>
                        </div>
                      );
                    })()}

                    <ProductImage
                      src={p.image}
                      alt={p.name}
                      stock={p.stock}
                      isNew={isNewArrival(p.createdAt)}
                      discount={
                        p.originalPrice
                          ? Math.round(
                            ((p.originalPrice - p.price) / p.originalPrice) * 100
                          )
                          : 0
                      }
                      activePromos={activePromosForProduct}
                    />
                    <div className="flex-1 flex flex-col">
                      <div className="flex flex-wrap gap-1 mb-1">
                        <span className="text-[9px] md:text-[10px] bg-purple-50 text-purple-600 px-1.5 md:px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          {p.category}
                        </span>
                        {p.subcategory && (
                          <span className="text-[9px] md:text-[10px] bg-gray-100 text-gray-500 px-1.5 md:px-2 py-0.5 rounded-full font-medium">
                            {p.subcategory}
                          </span>
                        )}
                      </div>

                      {/* Responsive Title */}
                      <h3 className="font-serif font-bold text-xs md:text-lg leading-tight mb-1 text-gray-900 line-clamp-2 md:line-clamp-none">
                        {p.name}
                      </h3>

                      {p.expiryDate && (
                        <p className="text-[9px] md:text-xs font-bold text-red-500 mb-1 md:mb-2 flex items-center gap-1">
                          <Clock size={10} className="md:w-3 md:h-3" /> Expiry: {p.expiryDate}
                        </p>
                      )}

                      {/* NEW: Expandable Description */}
                      <ExpandableDescription text={p.description} />

                      {/* UPDATED PRICE & TAGS CONTAINER */}
                      <div className="mt-auto pt-3 border-t border-gray-50 flex flex-col gap-2">

                        {/* Top Row: Price, Discount Badge, and Cart Button */}
                        <div className="flex justify-between items-end">
                          <div className="flex flex-col">
                            {p.originalPrice && (
                              <span className="text-[9px] md:text-[10px] text-gray-400 line-through font-medium leading-none mb-1">
                                {p.originalPrice.toFixed(3)} BHD
                              </span>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-sm md:text-lg font-bold text-red-600 leading-none">
                                {p.price.toFixed(3)} BHD
                              </span>
                              {/* Save % Badge next to price */}
                              {p.originalPrice && p.originalPrice > p.price && (
                                <span className="bg-red-50 text-red-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-100 uppercase tracking-tight">
                                  Save {Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}%
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Responsive Add to Cart Button */}
                          <button
                            onClick={() => addToCart(p)}
                            disabled={p.stock === 0}
                            className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-white transition-all flex-shrink-0 ${p.stock === 0
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-gray-900 hover:bg-purple-600 hover:shadow-lg"
                              }`}
                          >
                            <Plus size={16} className="md:w-5 md:h-5" />
                          </button>
                        </div>

                        {/* Bottom Row: NEW ARRIVAL & LOW STOCK TAGS */}
                        {(isNewArrival(p.createdAt) || (p.stock < 3 && p.stock > 0)) && (
                          <div className="flex flex-wrap gap-1.5">
                            {isNewArrival(p.createdAt) && (
                              <span className="text-[9px] md:text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 uppercase tracking-tight">
                                <Sparkles size={10} /> NEW
                              </span>
                            )}
                            {p.stock < 3 && p.stock > 0 && (
                              <span className="text-[9px] md:text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shadow-sm uppercase tracking-tight">
                                Low Stock
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {displayedProducts.length < filteredProducts.length && (
              <div className="text-center mt-12 pb-12">
                <button
                  onClick={() => setVisibleCount((c) => c + 12)}
                  className="bg-white border border-gray-200 text-gray-600 px-8 py-3 rounded-full font-bold hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-all shadow-sm flex items-center gap-2 mx-auto"
                >
                  <ChevronDown size={20} /> Show More Products
                </button>
              </div>
            )}
          </div>
        </main>
      )}

      {/* CART */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setIsCartOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300">
            {/* Cart Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-purple-50/50">
              <h2 className="text-2xl font-serif font-bold text-gray-900">
                {checkoutStep === "success" ? "Thank You!" : "Your Bag"}
              </h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Cart Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {checkoutStep === "success" ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-fade-in px-4">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-sm">
                    <Check size={40} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-gray-900 mb-1">Order Placed!</h3>
                    <p className="text-xl font-mono font-bold text-purple-600 mb-2">{lastOrder?.orderId || "#ORDER"}</p>
                    <p className="text-gray-500 text-sm max-w-xs mx-auto">Your order has been received and is waiting for payment verification.</p>
                  </div>
                  <button
                    onClick={() => generateReceipt(lastOrder)}
                    className="flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-all w-full shadow-lg"
                  >
                    <Download size={18} /> Download Receipt PDF
                  </button>
                  {/* WhatsApp Button */}
                  <a
                    href={(() => {
                      const symHeart = "\u2661";
                      const symStar = "\u22C6";
                      const symSparkle = "\u2727";
                      const symArrow = "\u279C";

                      const deliveryType = lastOrder?.customer?.deliveryMethod === 'delivery' ? 'Delivery' :
                        lastOrder?.customer?.deliveryMethod === 'meetup' ? 'Meet-Up' : 'Pick-Up';

                      const deliveryDetail = lastOrder?.customer?.deliveryMethod === 'delivery'
                        ? lastOrder.customer.deliveryAddress
                        : lastOrder.customer.meetupNote;

                      const itemList = Object.values(lastOrder?.items || {})
                        .map(i => `${symStar} ${i.qty} x ${i.name}`)
                        .join('\n');

                      const message = `Hi K-Beauty Bestie! I just placed an order from Shepherdess! ${symSparkle}\n\n` +
                        `*ORDER SUMMARY* ${symHeart}\n` +
                        `${symArrow} *Name:* ${lastOrder?.customer?.name}\n` +
                        `${symArrow} *Order ID:* ${lastOrder?.orderId}\n` +
                        `${symArrow} *Method:* ${deliveryType}\n` +
                        `${symArrow} *Details:* ${deliveryDetail}\n\n` +
                        `*THE GOODIES:* ${symSparkle}\n${itemList}\n\n` +
                        `*Total:* ${lastOrder?.total?.toFixed(3)} BHD`;

                      return `https://wa.me/97333027588?text=${encodeURIComponent(message)}`;
                    })()}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-[#128C7E] transition-colors w-full"
                  >
                    <MessageSquare size={18} /> Chat on WhatsApp
                  </a>
                  <button onClick={() => { setCheckoutStep("cart"); setIsCartOpen(false); setLastOrder(null); }} className="text-gray-400 font-bold hover:text-gray-600 text-sm mt-4">
                    Close & Continue Shopping
                  </button>
                </div>
              ) : Object.keys(cart).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                  <ShoppingBag size={48} className="text-purple-200" />
                  <p>Your bag is empty.</p>
                  <button onClick={() => setIsCartOpen(false)} className="text-purple-600 font-semibold hover:underline">Start Shopping</button>
                </div>
              ) : checkoutStep === "cart" ? (
                /* --- STEP 1: SUMMARY VIEW --- */
                <div className="space-y-6 animate-fade-in">
                  {Object.values(cart).map((i) => {
                    const liveProduct = products.find(p => p.id === i.id);
                    const isOutOfStock = !liveProduct || liveProduct.stock <= 0;

                    return (
                      <div key={i.id} className={`flex gap-4 p-3 rounded-xl border relative ${isOutOfStock ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                        <div className="w-20 h-24 bg-white rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 relative">
                          <img src={i.image} alt={i.name} className={`w-full h-full object-cover ${isOutOfStock ? 'opacity-40 grayscale' : ''}`} />
                          {isOutOfStock && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm">SOLD OUT</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-1">
                          <div className="pr-6">
                            <h4 className={`font-bold text-sm line-clamp-2 ${isOutOfStock ? 'text-red-900' : 'text-gray-900'}`}>{i.name}</h4>
                            <p className="text-[10px] text-purple-600 font-bold uppercase mt-1">{i.category}</p>
                            {isOutOfStock && <p className="text-[9px] text-red-500 font-bold italic mt-1">Item no longer available</p>}
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-bold text-gray-900">{(i.price * i.qty).toFixed(3)} BHD</span>
                            <div className="flex items-center gap-3 bg-white rounded-full px-2 py-1 border border-gray-200">
                              <button onClick={() => updateCartQty(i.id, -1)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500"><Minus size={14} /></button>
                              <span className="text-sm font-bold w-4 text-center">{i.qty}</span>
                              <button onClick={() => updateCartQty(i.id, 1)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500"><Plus size={14} /></button>
                            </div>
                          </div>
                          <button onClick={() => updateCartQty(i.id, -i.qty)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ); // <--- Added missing semicolon and parenthesis
                  })} {/* <--- Added missing closing brace */}
                  <p className="text-[10px] text-center text-gray-400 italic">Review your items before proceeding</p>
                </div>
              ) : (
                /* --- STEP 2: DELIVERY & PAYMENT DETAILS --- */
                <div className="space-y-6 animate-fade-in">
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 text-sm">Select Delivery Method</h3>

                    {/* Option 1: Meet-Up */}
                    <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${deliveryMethod === 'meetup' ? 'border-purple-600 bg-purple-50' : 'border-gray-200'}`}>
                      <div className="flex items-center gap-3 mb-1" onClick={() => setDeliveryMethod('meetup')}>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${deliveryMethod === 'meetup' ? 'border-purple-600 bg-purple-600' : 'border-gray-300'}`}>
                          {deliveryMethod === 'meetup' && <div className="w-2 h-2 bg-white rounded-full shadow-inner" />}
                        </div>
                        <div className="flex-1">
                          <span className="font-bold text-gray-900 block">Meet-Up</span>
                          <span className="text-xs text-purple-600 font-bold">+ 0.000 BHD</span>
                        </div>
                        <Store size={20} className="text-gray-400" />
                      </div>
                      {deliveryMethod === 'meetup' && (
                        <div className="ml-8 text-[11px] text-gray-600 space-y-1 mt-2 bg-white/50 p-2 rounded border border-purple-100 animate-fade-in">
                          <p><strong>Manama Centre:</strong> Sun-Thu (9AM - 3PM)</p>
                          <p><strong>Bahrain Tower:</strong> Mon/Tue/Thu (8PM-11PM) or Fri (11AM-2PM)</p>
                          <p className="italic text-purple-700 mt-1">"Or let's coordinate somewhere else!"</p>
                        </div>
                      )}
                    </label>

                    {/* Option 2: Pick-Up */}
                    <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${deliveryMethod === 'pickup' ? 'border-purple-600 bg-purple-50' : 'border-gray-200'}`}>
                      <div className="flex items-center gap-3" onClick={() => setDeliveryMethod('pickup')}>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${deliveryMethod === 'pickup' ? 'border-purple-600 bg-purple-600' : 'border-gray-300'}`}>
                          {deliveryMethod === 'pickup' && <div className="w-2 h-2 bg-white rounded-full shadow-inner" />}
                        </div>
                        <div className="flex-1">
                          <span className="font-bold text-gray-900 block">Pick-Up (Sanabis)</span>
                          <span className="text-xs text-purple-600 font-bold">+ 0.000 BHD</span>
                        </div>
                        <Store size={20} className="text-gray-400" />
                      </div>
                      {deliveryMethod === 'pickup' && (
                        <p className="ml-8 mt-2 text-[11px] text-gray-500 italic animate-fade-in">
                          I can leave it for you to pick up in Sanabis anytime!
                        </p>
                      )}
                    </label>

                    {/* Option 3: Delivery */}
                    <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${deliveryMethod === 'delivery' ? 'border-purple-600 bg-purple-50' : 'border-gray-200'}`}>
                      <div className="flex items-center gap-3" onClick={() => setDeliveryMethod('delivery')}>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${deliveryMethod === 'delivery' ? 'border-purple-600 bg-purple-600' : 'border-gray-300'}`}>
                          {deliveryMethod === 'delivery' && <div className="w-2 h-2 bg-white rounded-full shadow-inner" />}
                        </div>
                        <div className="flex-1">
                          <span className="font-bold text-gray-900 block">Delivery</span>
                          <span className="text-xs text-red-600 font-bold">+ 1.000 BHD</span>
                        </div>
                        <Truck size={20} className="text-gray-400" />
                      </div>
                      {deliveryMethod === 'delivery' && (
                        <p className="ml-8 mt-2 text-[11px] text-gray-500 italic animate-fade-in">
                          Same Day Delivery for orders until 2:30PM
                        </p>
                      )}
                    </label>
                  </div>

                  {/* Dynamic Inputs */}
                  <div className="space-y-4">
                    <div className="animate-fade-in">
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">
                        {deliveryMethod === 'delivery' ? "Delivery Address" :
                          deliveryMethod === 'meetup' ? "Preferred Time / Location?" : "When will you pick up?"}
                      </label>
                      <textarea
                        className="w-full p-3 border border-gray-200 rounded-lg text-sm bg-purple-50 focus:bg-white transition-colors"
                        placeholder={deliveryMethod === 'delivery' ? "House, Road, Block, Area..." :
                          deliveryMethod === 'meetup' ? "e.g. Friday at Bahrain Tower, 1 PM" : "e.g. Tonight, around 8 PM"}
                        rows="2"
                        value={deliveryMethod === 'delivery' ? deliveryAddress : meetupNote}
                        onChange={(e) => deliveryMethod === 'delivery' ? setDeliveryAddress(e.target.value) : setMeetupNote(e.target.value)}
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Contact Details</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          name="customerName"        // <--- Added name
                          id="customerName"          // <--- Added id
                          autoComplete="name"        // <--- tells browser this is a Name
                          className="w-full p-3 border rounded-lg text-sm"
                          placeholder="Your Name"
                          value={customerDetails.name}
                          onChange={(e) => setCustomerDetails({ ...customerDetails, name: e.target.value })}
                          required
                        />
                        <input
                          name="customerPhone"       // <--- Added name
                          id="customerPhone"         // <--- Added id
                          autoComplete="tel"         // <--- tells browser this is a Phone Number
                          className="w-full p-3 border rounded-lg text-sm"
                          placeholder="Phone Number"
                          type="tel"
                          value={customerDetails.phone}
                          onChange={(e) => setCustomerDetails({ ...customerDetails, phone: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary Section */}
                  {/* Summary Section with Promo Code */}
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-3">
                    <h3 className="font-bold text-purple-900 text-sm">Total to Transfer</h3>

                    {/* Subtotal & Delivery */}
                    <div className="space-y-1 pb-3 border-b border-purple-200">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Subtotal:</span>
                        <span>{Object.values(cart).reduce((s, i) => s + i.price * i.qty, 0).toFixed(3)} BHD</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Delivery Fee:</span>
                        <span>{(deliveryMethod === 'delivery' ? 1.000 : 0).toFixed(3)} BHD</span>
                      </div>
                      {appliedCode && (
                        <div className="flex justify-between text-xs text-green-600 font-bold animate-pulse">
                          <span>Discount ({appliedCode.code}):</span>
                          <span>- {appliedCode.discount.toFixed(3)} BHD</span>
                        </div>
                      )}
                    </div>

                    {/* PROMO CODE INPUT */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Promo Code?"
                        className="flex-1 p-2 text-xs border border-purple-200 rounded-lg uppercase placeholder:normal-case focus:outline-none focus:border-purple-500"
                        value={appliedCodeInput}
                        onChange={(e) => setAppliedCodeInput(e.target.value.toUpperCase())}
                      />
                      <button
                        onClick={handleApplyCode}
                        disabled={!!appliedCode}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${appliedCode ? 'bg-green-500 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                      >
                        {appliedCode ? <Check size={14} /> : "Apply"}
                      </button>
                    </div>
                    {promoError && <p className="text-[10px] text-red-500 font-bold">{promoError}</p>}


                    {/* FINAL TOTAL */}
                    <div className="flex justify-between items-end pt-2">
                      <span className="text-purple-700 font-bold text-lg">Total:</span>
                      <span className="font-mono text-2xl font-bold text-gray-900">
                        {(
                          Math.max(0, Object.values(cart).reduce((s, i) => s + i.price * i.qty, 0) +
                            (deliveryMethod === 'delivery' ? 1.000 : 0) -
                            (appliedCode ? appliedCode.discount : 0))
                        ).toFixed(3)} BHD
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-purple-200 relative group cursor-pointer" onClick={() => { navigator.clipboard.writeText("+97333027588"); showNotification("Number Copied!"); }}>
                      <p className="text-[10px] text-purple-500 uppercase font-bold tracking-wider mb-1">Pay to BenefitPay</p>
                      <p className="font-mono text-lg font-bold text-gray-900 tracking-wider">+973 3302 7588</p>
                      <Copy size={16} className="absolute right-3 top-4 text-purple-400" />
                    </div>
                    <p className="text-[10px] text-center text-gray-400">Name: <span className="font-bold">ILA Shai</span></p>
                    {/* --- PAYMENT PROOF UPLOAD BPAY --- */}
                    <div className="mt-4 pt-4 border-t border-purple-100">
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">
                        Upload Transfer Screenshot *
                      </label>
                      <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${proofFile ? 'border-green-400 bg-green-50' : 'border-purple-200 bg-white hover:bg-purple-50'}`}>
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {proofFile ? (
                            <>
                              <CheckCircle size={24} className="text-green-500 mb-2" />
                              <p className="text-xs font-bold text-green-700">Image Attached</p>
                              <p className="text-[10px] text-green-600 mt-1 truncate max-w-[200px]">{proofFile.name}</p>
                            </>
                          ) : (
                            <>
                              <Upload size={24} className="text-purple-400 mb-2" />
                              <p className="text-xs font-bold text-gray-600">Click to upload screenshot</p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => setProofFile(e.target.files[0])}
                        />
                      </label>
                    </div>
                    {/* ---------------------------- */}
                  </div>

                </div>
              )}
            </div>
            {/* Cart Footer (Sticky) */}
            {Object.keys(cart).length > 0 && checkoutStep !== "success" && (
              <div className="p-6 border-t border-gray-100 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-xl font-bold text-gray-900">
                    {Object.values(cart)
                      .reduce((s, i) => s + i.price * i.qty, 0)
                      .toFixed(3)}{" "}
                    BHD
                  </span>
                </div>
                {checkoutStep === "cart" ? (
                  <button
                    onClick={() => {
                      const hasSoldOut = Object.values(cart).some(item => {
                        const live = products.find(p => p.id === item.id);
                        return !live || live.stock <= 0;
                      });

                      if (hasSoldOut) {
                        showNotification("Please remove sold out items before proceeding", "error");
                      } else {
                        setCheckoutStep("form");
                      }
                    }}
                    className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${Object.values(cart).some(item => (products.find(p => p.id === item.id)?.stock || 0) <= 0)
                      ? "bg-red-100 text-red-400 cursor-not-allowed border border-red-200"
                      : "bg-gray-900 text-white hover:bg-purple-600 shadow-lg"
                      }`}
                  >
                    {Object.values(cart).some(item => (products.find(p => p.id === item.id)?.stock || 0) <= 0)
                      ? "Remove Sold Out Items"
                      : "Proceed to Checkout"}
                    <ChevronRight size={18} />
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCheckoutStep("cart")}
                      className="px-6 py-4 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleCheckout}
                      disabled={isSubmitting || !proofFile}
                      className={`flex-1 py-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${isSubmitting || !proofFile
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                        : "bg-purple-600 text-white hover:bg-purple-700 shadow-purple-200"
                        }`}
                    >
                      {isSubmitting ? "Uploading..." : "Confirm Order"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-white border-t border-gray-200 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-xl font-serif font-bold text-gray-900 mb-4">
            {shopContent.footerTitle}
          </h2>
          <p className="text-gray-500 mb-8">{shopContent.footerText}</p>

          <div className="flex justify-center gap-6 mb-8">
            {shopContent.instagramUrl && (
              <a
                href={shopContent.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="text-gray-400 hover:text-purple-600 transition-colors transform hover:scale-110"
              >
                <Instagram size={24} />
              </a>
            )}
            {shopContent.facebookUrl && (
              <a
                href={shopContent.facebookUrl}
                target="_blank"
                rel="noreferrer"
                className="text-gray-400 hover:text-blue-600 transition-colors transform hover:scale-110"
              >
                <Facebook size={24} />
              </a>
            )}
            {shopContent.whatsappNumber && (
              <a
                href={`https://wa.me/${shopContent.whatsappNumber.replace(
                  /[^0-9]/g,
                  ""
                )}`}
                target="_blank"
                rel="noreferrer"
                className="text-gray-400 hover:text-green-500 transition-colors transform hover:scale-110"
              >
                <MessageCircle size={24} />
              </a>
            )}
          </div>

          {/* Test Notification Button */}
          <div className="flex justify-center mb-6">
            <button
              onClick={handleNotificationSetup}
              className="text-[10px] bg-purple-50 text-purple-600 px-3 py-1 rounded-full font-bold border border-purple-100 hover:bg-purple-100 transition-colors"
            >
              🔔 Enable Notifications
            </button>
          </div>

          <div className="flex justify-center items-center gap-4 text-sm text-gray-400">
            <span>
              © {new Date().getFullYear()} {shopContent.footerCopyright}
            </span>
            <span>•</span>
            <button
              onClick={() =>
                isAdmin ? setIsAdmin(false) : setShowAdminLogin(true)
              }
              className="hover:text-purple-600 transition-colors"
            >
              {isAdmin ? <Unlock size={14} /> : <Lock size={14} />}
            </button>
          </div>
        </div>
      </footer>

      {/* ADMIN LOGIN MODAL */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Owner Access
            </h3>
            <input
              type="password"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              placeholder="PIN"
              className="text-center text-3xl tracking-widest w-full p-4 border border-gray-200 rounded-xl focus:border-purple-500 outline-none mb-6"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowAdminLogin(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={toggleAdmin}
                className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700"
              >
                Enter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


