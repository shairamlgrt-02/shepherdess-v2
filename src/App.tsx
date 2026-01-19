// V2 Live 
// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  updateDoc,
  addDoc,
  deleteDoc,
  setDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
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
  ChevronUp,
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

// --- Updated ProductImage Component (Now accepts isNew prop) ---
const ProductImage = ({ src, alt, stock, discount, isNew }) => {
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

      {/* --- BADGE CONTAINER (Top Left) --- */}
      <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
        {/* 1. NEW BADGE (First priority) */}
        {isNew && (
          <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide shadow-sm flex items-center gap-1">
            <Sparkles size={10} /> NEW
          </span>
        )}

        {/* 2. DISCOUNT BADGE */}
        {discount > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide shadow-sm">
            Save {discount}%
          </span>
        )}

        {/* 3. LOW STOCK BADGE */}
        {stock < 3 && stock > 0 && (
          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-1 rounded-full border border-amber-200 uppercase tracking-wide">
            Low Stock
          </span>
        )}
      </div>

      {/* OUT OF STOCK OVERLAY */}
      {stock === 0 && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[2px]">
          <span className="bg-gray-900 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
            Sold Out
          </span>
        </div>
      )}
    </div>
  );
};

// --- ADMIN DASHBOARD ---
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

// --- ADMIN DASHBOARD (FIXED) ---
// --- ADMIN DASHBOARD (FIXED: Filters & Full Status Control) ---
const AdminDashboard = ({
  db,
  products,
  content,
  categories,
  promotions,
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
  // --- PASTE THIS HERE ---
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
  const [newPromo, setNewPromo] = useState({ title: "", productIds: [] });
  const [isEditingPromo, setIsEditingPromo] = useState(null);
  const [promoSearchQuery, setPromoSearchQuery] = useState("");

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
    const q = query(collection(db, "orders"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [db]);

  useEffect(() => {
    setEditableContent(content);
  }, [content]);
  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  // --- FILTERED ORDERS LOGIC ---
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // 1. Search
    if (orderSearch) {
      const search = orderSearch.toLowerCase();
      result = result.filter(
        (order) =>
          (order.orderId && order.orderId.toLowerCase().includes(search)) ||
          (order.customer?.name &&
            order.customer.name.toLowerCase().includes(search)) ||
          (order.customer?.phone && order.customer.phone.includes(search))
      );
    }

    // 2. Status Filter (NEW)
    if (filterStatus !== "all") {
      result = result.filter((o) => (o.status || "pending") === filterStatus);
    }

    // 3. Sorting
    result.sort((a, b) => {
      const statusA = a.status || "pending";
      const statusB = b.status || "pending";

      if (orderSort === "date-desc") return new Date(b.date) - new Date(a.date);
      if (orderSort === "date-asc") return new Date(a.date) - new Date(b.date);
      // Removed "Group by Status" sort because the Filter is better
      return 0;
    });

    return result;
  }, [orders, orderSearch, orderSort, filterStatus]);

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

  const togglePromoProduct = (id) =>
    setNewPromo((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(id)
        ? prev.productIds.filter((pid) => pid !== id)
        : [...prev.productIds, id],
    }));
  const selectAllFiltered = () =>
    setNewPromo((prev) => ({
      ...prev,
      productIds: [
        ...new Set([
          ...prev.productIds,
          ...filteredPromoProducts.map((p) => p.id),
        ]),
      ],
    }));
  const deselectAllFiltered = () =>
    setNewPromo((prev) => ({
      ...prev,
      productIds: prev.productIds.filter(
        (pid) => !filteredPromoProducts.map((p) => p.id).includes(pid)
      ),
    }));

  const savePromo = (e) => {
    e.preventDefault();
    if (isEditingPromo) {
      onUpdatePromotion(isEditingPromo, newPromo);
      setIsEditingPromo(null);
    } else onAddPromotion(newPromo);
    setNewPromo({ title: "", productIds: [] });
    setPromoSearchQuery("");
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

  // --- ADD THIS NEW ONE HERE ---
  const addItemToOrder = async (orderId, currentItems, product) => {
    const newItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      qty: 1,
      image: product.image
    };
    const updatedItems = { ...currentItems, [product.id]: newItem };
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
            <div className="text-center py-20 text-gray-500 bg-white rounded-xl border">
              No orders found in this view.
            </div>
          ) : (
            filteredOrders.map((order) => {
              const status = order.status || "pending"; // Default for old data

              return (
                <div
                  key={order.id}
                  className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm relative overflow-hidden transition-all hover:shadow-md"
                >
                  {/* Status Color Strip */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${status === "delivered"
                      ? "bg-green-500"
                      : status === "confirmed"
                        ? "bg-blue-500"
                        : status === "canceled"
                          ? "bg-red-500"
                          : "bg-amber-500"
                      }`}
                  />

                  <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-lg">
                          {order.customer?.name}
                        </h3>
                        {order.orderId && (
                          <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">
                            {order.orderId}
                          </span>
                        )}
                      </div>

                      {/* --- MASTER STATUS DROPDOWN (Fixes the "Mistake" problem) --- */}
                      <div className="relative inline-block">
                        <select
                          value={status}
                          onChange={(e) =>
                            updateOrderStatus(order.id, e.target.value)
                          }
                          className={`appearance-none pl-8 pr-8 py-1.5 rounded-full text-xs font-bold uppercase cursor-pointer border focus:outline-none focus:ring-2 focus:ring-offset-1 ${status === "delivered"
                            ? "bg-green-50 text-green-700 border-green-200 focus:ring-green-500"
                            : status === "confirmed"
                              ? "bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-500"
                              : status === "canceled"
                                ? "bg-red-50 text-red-700 border-red-200 focus:ring-red-500"
                                : "bg-amber-50 text-amber-700 border-amber-200 focus:ring-amber-500"
                            }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="delivered">Delivered</option>
                          <option value="canceled">Canceled</option>
                        </select>

                        {/* Icon overlay for the select */}
                        <div className="absolute left-2.5 top-1.5 pointer-events-none">
                          {status === "delivered" && (
                            <CheckCircle size={12} className="text-green-700" />
                          )}
                          {status === "confirmed" && (
                            <Check size={12} className="text-blue-700" />
                          )}
                          {status === "pending" && (
                            <Clock size={12} className="text-amber-700" />
                          )}
                          {status === "canceled" && (
                            <Ban size={12} className="text-red-700" />
                          )}
                        </div>
                        <ChevronDown
                          size={12}
                          className="absolute right-2.5 top-1.5 pointer-events-none opacity-50"
                        />
                      </div>

                      <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                        <Calendar size={12} />{" "}
                        {new Date(order.date).toLocaleString()}
                      </p>
                    </div>

                    <div className="text-right w-full md:w-auto flex flex-row md:flex-col justify-between items-center md:items-end">
                      <p className="text-xl font-bold text-purple-600">
                        {order.total?.toFixed(3)} BHD
                      </p>
                      <button
                        onClick={() => generateReceipt(order)}
                        className="text-xs flex items-center gap-1 text-gray-500 hover:text-purple-600 mt-0 md:mt-2"
                      >
                        <Download size={14} /> Receipt
                      </button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 text-sm border-t pt-4">
                    {/* LEFT COLUMN: Customer & Shipping */}
                    <div>
                      <h4 className="font-bold text-gray-400 text-xs uppercase mb-1">
                        Customer & Shipping
                      </h4>
                      <p><strong>Name:</strong> {order.customer?.name}</p>
                      <p><strong>Phone:</strong> {order.customer?.phone}</p>

                      <div className="mt-3 p-3 bg-purple-50 rounded-xl border border-purple-100 animate-fade-in">
                        <div className="flex items-center gap-2 mb-1">
                          {order.customer?.deliveryMethod === 'delivery' ? <Truck size={14} className="text-purple-600" /> : <Store size={14} className="text-purple-600" />}
                          <span className="font-bold text-purple-700 uppercase text-[10px] tracking-wider">
                            {order.customer?.deliveryMethod === 'delivery' ? 'Delivery' :
                              order.customer?.deliveryMethod === 'meetup' ? 'Meet-Up' : 'Pick-Up'}
                          </span>
                        </div>
                        <p className="text-gray-700 text-xs italic">
                          {order.customer?.deliveryMethod === 'delivery'
                            ? order.customer?.deliveryAddress
                            : order.customer?.meetupNote}
                        </p>
                      </div>

                      {order.customer?.proof && (
                        <div className="mt-3 group relative w-24 h-24 bg-gray-100 rounded border overflow-hidden cursor-pointer"
                          onClick={() => {
                            const w = window.open("");
                            w.document.write('<img src="' + order.customer.proof + '" style="max-width:100%"/>');
                          }}>
                          <img src={order.customer.proof} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink className="text-white" size={16} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* RIGHT COLUMN: Order Items + Replacement Tool */}
                    <div>
                      <h4 className="font-bold text-gray-400 text-[10px] uppercase mb-2 flex justify-between items-center">
                        Order Items <span className="text-purple-500 font-normal lowercase italic">(click X to remove)</span>
                      </h4>

                      {/* 1. The List of Current Items */}
                      <ul className="space-y-2 mb-4">
                        {order.items && Object.values(order.items).map((i) => (
                          <li key={i.id} className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded-lg border border-gray-100">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-purple-600">{i.qty}x</span>
                              <span className="truncate max-w-[140px]">{i.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-gray-500">{(i.price * i.qty).toFixed(3)}</span>
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Remove ${i.name}?`)) {
                                    const newItems = { ...order.items };
                                    delete newItems[i.id];
                                    await updateDoc(doc(db, "orders", order.id), { items: newItems });
                                  }
                                }}
                                className="text-red-400 hover:text-red-600 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>

                      {/* 2. THE REPLACEMENT DROPDOWN ✨ */}
                      <div className="mt-4 p-3 border-2 border-dashed border-purple-200 rounded-xl bg-purple-50/50 animate-pulse-subtle">
                        <p className="text-[9px] font-bold text-purple-500 uppercase mb-2 tracking-widest">✨ Add Replacement Item</p>
                        <select
                          className="w-full p-2 text-xs border border-purple-100 rounded-lg bg-white outline-none focus:ring-2 focus:ring-purple-300 transition-all cursor-pointer"
                          onChange={(e) => {
                            const prod = products.find(p => p.id === e.target.value);
                            if (prod) {
                              addItemToOrder(order.id, order.items, prod);
                              // This resets the dropdown so it says "Select a product" again
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="">Select a product to add...</option>
                          {products
                            .filter(p => p.active && p.stock > 0)
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} — {p.price.toFixed(3)} BHD
                              </option>
                            ))}
                        </select>
                        <p className="text-[8px] text-purple-400 mt-2 italic">Tip: Removing an item doesn't change the total automatically. Use the box below to adjust! 👇</p>
                      </div>

                      {/* 3. Pricing & Notes */}
                      <div className="border-t border-dashed pt-3 mt-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Adjusted Grand Total:</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.001"
                              defaultValue={order.total}
                              onBlur={(e) => updateOrderTotal(order.id, e.target.value)}
                              className="w-24 p-1 border border-purple-200 rounded text-right font-bold text-purple-600 focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                            <span className="text-[10px] font-bold text-purple-600">BHD</span>
                          </div>
                        </div>

                        <div className="mt-4">
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Internal Admin Notes 🤫</label>
                          <textarea
                            className="w-full p-2 text-xs border border-amber-200 rounded-lg bg-amber-50/50 focus:bg-white focus:ring-2 focus:ring-amber-300 outline-none transition-all"
                            placeholder="e.g. Swapped out toner for serum as per WA chat..."
                            defaultValue={order.adminNote || ""}
                            rows="2"
                            onBlur={(e) => updateOrderNote(order.id, e.target.value)}
                          />
                        </div>
                      </div> {/* Closes Pricing & Notes */}
                    </div> {/* Closes Right Column */}
                  </div> {/* Closes the Grid (This was likely the missing one!) */}

                  <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                    {status === "pending" && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "confirmed")}
                        className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm"
                      >
                        <Check size={14} /> Quick Confirm
                      </button>
                    )}
                    {(status === "pending" || status === "confirmed") && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "delivered")}
                        className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm"
                      >
                        <Truck size={14} /> Quick Deliver
                      </button>
                    )}
                    <button
                      onClick={() => deleteOrder(order.id)}
                      className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
                      title="Delete Record"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
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

      {/* PROMOTIONS TAB */}
      {tab === "promos" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-purple-200 shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-lg">
              <Tag size={20} className="text-purple-600" />{" "}
              {isEditingPromo ? "Edit Promotion" : "Create New Promotion"}
            </h3>
            <div className="mb-4">
              <label className="text-xs font-bold text-gray-500 uppercase">
                Promo Title
              </label>
              <input
                className="w-full border p-2 rounded-lg mt-1"
                placeholder="e.g. Valentine's Sale"
                value={newPromo.title}
                onChange={(e) =>
                  setNewPromo({ ...newPromo, title: e.target.value })
                }
              />
            </div>
            <div className="mb-2 flex flex-col md:flex-row gap-2 justify-between items-center">
              <label className="text-xs font-bold text-gray-500 uppercase">
                Select Products
              </label>
              <div className="relative w-full md:w-auto flex-1 max-w-sm">
                <Search
                  size={14}
                  className="absolute left-3 top-2.5 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-full pl-8 pr-4 py-2 border rounded-full text-sm bg-gray-50 focus:bg-white transition-colors"
                  value={promoSearchQuery}
                  onChange={(e) => setPromoSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="flex-1 md:flex-none flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-2 rounded text-xs font-bold hover:bg-purple-200"
                >
                  <CheckSquare size={14} /> Select All
                </button>
                <button
                  type="button"
                  onClick={deselectAllFiltered}
                  className="flex-1 md:flex-none flex items-center gap-1 bg-gray-100 text-gray-600 px-3 py-2 rounded text-xs font-bold hover:bg-gray-200"
                >
                  <Square size={14} /> Unselect
                </button>
              </div>
            </div>
            <div className="h-64 overflow-y-auto border rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 bg-gray-50">
              {filteredPromoProducts.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-2 bg-white p-3 rounded-lg border cursor-pointer transition-all ${newPromo.productIds.includes(p.id)
                    ? "border-purple-500 bg-purple-50 ring-1 ring-purple-500"
                    : "border-gray-200 hover:border-purple-300"
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={newPromo.productIds.includes(p.id)}
                    onChange={() => togglePromoProduct(p.id)}
                    className="accent-purple-600 w-4 h-4 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.category}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={savePromo}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700"
              >
                Save Promotion
              </button>
              {isEditingPromo && (
                <button
                  onClick={() => {
                    setIsEditingPromo(null);
                    setNewPromo({ title: "", productIds: [] });
                    setPromoSearchQuery("");
                  }}
                  className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-bold hover:bg-gray-200"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {promotions.map((promo) => (
              <div
                key={promo.id}
                className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative group hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">
                      {promo.title}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {promo.productIds.length} Products Included
                    </p>
                  </div>
                  <Tag className="text-purple-100" size={32} />
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setIsEditingPromo(promo.id);
                      setNewPromo(promo);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg text-sm font-bold hover:bg-blue-100"
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

  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [promotions, setPromotions] = useState([]);

  // --- LOAD/SAVE CART ---
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

  // --- UI & FILTER STATES ---
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

  // --- RESTORING MISSING VARIABLES ---
  const [visibleCount, setVisibleCount] = useState(12);
  const [sortOption, setSortOption] = useState("default");
  const [hideOutOfStock, setHideOutOfStock] = useState(false);
  const [notification, setNotification] = useState(null); // 👈 THIS WAS THE CRASH CAUSE!
  const [proofFile, setProofFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    phone: "",
    proof: "",
  });

  // Listener to open cart
  useEffect(() => {
    const handleOpenCart = () => {
      setCheckoutStep("cart");
      setIsCartOpen(true);
    };
    window.addEventListener('openCart', handleOpenCart);
    return () => window.removeEventListener('openCart', handleOpenCart);
  }, []);

  // Sync Data
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
    const unsubPr = onSnapshot(collection(db, "promotions"), (s) =>
      setPromotions(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => {
      unsubP();
      unsubC();
      unsubI();
      unsubPr();
    };
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
  // --- Helper: Generate PDF Receipt ---
  const generateReceipt = (orderData) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text("Shepherdess K-Beauty", 14, 22);
    doc.setFontSize(10);
    doc.text("Authentic Korean Skincare", 14, 28);

    // Order Details
    doc.setFontSize(12);
    doc.text(`Order Receipt: ${orderData.orderId}`, 14, 40);
    doc.setFontSize(10);
    doc.text(`Date: ${new Date(orderData.date).toLocaleDateString()}`, 14, 46);
    doc.text(`Customer: ${orderData.customer.name}`, 14, 52);
    doc.text(`Phone: ${orderData.customer.phone}`, 14, 58);

    // --- ADDED: DELIVERY/MEETUP INFO ---
    doc.setFont("helvetica", "bold");
    const methodTitle = orderData.customer.deliveryMethod === 'delivery' ? 'Delivery' :
      orderData.customer.deliveryMethod === 'meetup' ? 'Meet-Up' : 'Pick-Up';
    doc.text(`Method: ${methodTitle}`, 14, 64);
    doc.setFont("helvetica", "normal");

    const deliveryInfo = orderData.customer.deliveryMethod === 'delivery'
      ? orderData.customer.deliveryAddress
      : orderData.customer.meetupNote;
    doc.text(`${deliveryInfo}`, 14, 70);

    // Table (startY moved to 78 to make room for delivery info)
    const tableColumn = ["Item", "Qty", "Price", "Total"];
    const tableRows = [];

    Object.values(orderData.items).forEach((item) => {
      const itemData = [
        item.name,
        item.qty,
        `${item.price.toFixed(3)} BHD`,
        `${(item.price * item.qty).toFixed(3)} BHD`,
      ];
      tableRows.push(itemData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 78,
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [147, 51, 234] }, // Purple color
    });

    // Total Section
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Subtotal: ${orderData.subtotal.toFixed(3)} BHD`, 14, finalY);
    doc.text(`Delivery Fee: ${orderData.deliveryFee.toFixed(3)} BHD`, 14, finalY + 6);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Amount: ${orderData.total.toFixed(3)} BHD`, 14, finalY + 14);

    // Footer Note
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Status: Payment Under Verification", 14, finalY + 24);
    doc.text("Thank you for shopping with Shepherdess!", 14, finalY + 30);

    doc.save(`Shepherdess-Receipt-${orderData.orderId}.pdf`);
  };
  // Helper to generate short ID
  const generateOrderId = () => {
    return "#" + Math.floor(100000 + Math.random() * 900000).toString();
  };

  const [lastOrder, setLastOrder] = useState(null); // Add this state for the success screen

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!proofFile) return showNotification("Upload proof", "error");

    // Validation: Require Address for Delivery, Note for others
    if (deliveryMethod === 'delivery' && !deliveryAddress.trim()) {
      return showNotification("Please enter delivery address", "error");
    }

    setIsSubmitting(true);

    try {
      const proof = await compressImage(proofFile);
      const newOrderId = generateOrderId();

      // Calculate final total
      const cartTotal = Object.values(cart).reduce((s, i) => s + i.price * i.qty, 0);
      const deliveryFee = deliveryMethod === 'delivery' ? 1.000 : 0;
      const finalTotal = cartTotal + deliveryFee;

      const orderData = {
        orderId: newOrderId,
        customer: {
          ...customerDetails,
          proof,
          // Save the delivery info clearly
          deliveryMethod: deliveryMethod,
          deliveryAddress: deliveryMethod === 'delivery' ? deliveryAddress : "N/A",
          meetupNote: deliveryMethod !== 'delivery' ? meetupNote : "N/A"
        },
        items: cart,
        subtotal: cartTotal, // Keep track of pure product cost
        deliveryFee: deliveryFee,
        total: finalTotal,
        date: new Date().toISOString(),
        status: "pending",
      };

      await addDoc(collection(db, "orders"), orderData);

      // Inventory update logic (Same as before)
      for (const [id, item] of Object.entries(cart)) {
        const p = products.find((prod) => prod.id === id);
        if (p)
          await updateDoc(doc(db, "products", id), {
            stock: p.stock - item.qty,
            sold: (p.sold || 0) + item.qty,
          });
      }

      setLastOrder(orderData);
      setCart({});
      setCheckoutStep("success");
      // Reset forms
      setDeliveryAddress("");
      setMeetupNote("");
    } catch (e) {
      console.error(e);
      showNotification("Error processing order", "error");
    }
    setIsSubmitting(false);
  };

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
        if (promo) matchesCategory = promo.productIds.includes(p.id);
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
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md shadow-sm border-b border-purple-100">
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
                className="hidden sm:flex items-center gap-2 bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-bold hover:bg-purple-200 transition-colors"
              >
                {viewMode === "shop" ? (
                  <LayoutDashboard size={16} />
                ) : (
                  <Store size={16} />
                )}{" "}
                {viewMode === "shop" ? "Dashboard" : "Shop View"}
              </button>
            )}
            {viewMode === "shop" && (
              <button
                onClick={() => {
                  setCheckoutStep("cart"); // <--- This is the magic line!
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
          generateReceipt={generateReceipt} // <--- ADD THIS LINE!
          db={db}
          products={products}
          content={shopContent}
          categories={categories}
          promotions={promotions}
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
        />
      ) : (
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              {shopContent.heroTag}
            </span>
            <h2 className="text-4xl font-serif mt-2 mb-4 text-gray-900">
              {shopContent.heroTitle}
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg leading-relaxed">
              {shopContent.heroDescription}
            </p>
            <div className="mt-4">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                <Clock size={12} /> {shopContent.heroNote}
              </span>
            </div>
          </div>

          {/* 1. TOP FILTERS (Not Sticky - Will scroll away) */}
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

            {/* Category Buttons */}
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => { setSelectedCategory("All"); setVisibleCount(12); }}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${selectedCategory === "All" ? "bg-purple-600 text-white shadow-md" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
              >
                All
              </button>
              {promotions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedCategory(p.title); setVisibleCount(12); }}
                  className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-1 transition-all ${selectedCategory === p.title ? "bg-red-500 text-white shadow-md" : "bg-red-50 text-red-600 hover:bg-red-100"}`}
                >
                  <Tag size={12} /> {p.title}
                </button>
              ))}
              {availableCategories.map((c) => (
                <button
                  key={c}
                  onClick={() => { setSelectedCategory(c); setVisibleCount(12); }}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${selectedCategory === c || currentMainCategory === c ? "bg-purple-600 text-white shadow-md transform scale-105" : "bg-gray-100 hover:bg-gray-200"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* 2. THE STICKY CONTROL BAR (Only Sort & Toggle - Stays at top) */}
          <div className="sticky top-20 z-20 bg-white/90 backdrop-blur-md py-3 mb-8 border-y border-purple-50 shadow-sm px-4 -mx-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {displayedProducts.map((p) => (
              <div
                key={p.id}
                className="group bg-white rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all border border-transparent hover:border-purple-100 flex flex-col relative"
              >
                <ProductImage
                  src={p.image}
                  alt={p.name}
                  stock={p.stock}
                  // Add this new line below:
                  isNew={isNewArrival(p.createdAt)}
                  discount={
                    p.originalPrice
                      ? Math.round(
                        ((p.originalPrice - p.price) / p.originalPrice) * 100
                      )
                      : 0
                  }
                />
                <div className="flex-1 flex flex-col">
                  <div className="flex gap-1 mb-1">
                    <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      {p.category}
                    </span>
                    {p.subcategory && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                        {p.subcategory}
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif font-bold text-lg leading-tight mb-1 text-gray-900">
                    {p.name}
                  </h3>

                  {/* EXPIRY DATE ADDED HERE */}
                  {p.expiryDate && (
                    <p className="text-xs font-bold text-red-500 mb-2 flex items-center gap-1">
                      <Clock size={12} /> Expiry: {p.expiryDate}
                    </p>
                  )}

                  <p className="text-sm text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                    {p.description}
                  </p>
                  <div className="mt-auto flex justify-between items-center">
                    <div className="flex flex-col">
                      {p.originalPrice && (
                        <span className="text-xs text-gray-400 line-through font-medium">
                          {p.originalPrice.toFixed(3)} BHD
                        </span>
                      )}
                      <span className="text-lg font-bold text-red-600">
                        {p.price.toFixed(3)} BHD
                      </span>
                    </div>
                    <button
                      onClick={() => addToCart(p)}
                      disabled={p.stock === 0}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all ${p.stock === 0
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-gray-900 hover:bg-purple-600 hover:shadow-lg"
                        }`}
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {displayedProducts.length < filteredProducts.length && (
            <div className="text-center mt-12 pb-12">
              <button
                onClick={() => setVisiƒbleCount((c) => c + 12)}
                className="bg-white border border-gray-200 text-gray-600 px-8 py-3 rounded-full font-bold hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-all shadow-sm flex items-center gap-2 mx-auto"
              >
                <ChevronDown size={20} /> Show More Products
              </button>
            </div>
          )}
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
                  <button onClick={() => generateReceipt(lastOrder)} className="flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-all w-full shadow-lg">
                    <Download size={18} /> Download Receipt (PDF)
                  </button>
                  {/* WhatsApp Button: Aesthetic Unicode Edition ♡ */}
                  <a
                    href={(() => {
                      // These symbols are 100% safe and will NOT turn into question marks
                      const symHeart = "\u2661"; // ♡
                      const symStar = "\u22C6";  // ⋆
                      const symSparkle = "\u2727"; // ✧
                      const symArrow = "\u279C"; // ➜

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
                  {Object.values(cart).map((i) => (
                    <div key={i.id} className="flex gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 relative">
                      <div className="w-20 h-24 bg-white rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                        <img src={i.image} alt={i.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div className="pr-6">
                          <h4 className="font-bold text-gray-900 text-sm line-clamp-2">{i.name}</h4>
                          <p className="text-[10px] text-purple-600 font-bold uppercase mt-1">{i.category}</p>
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
                  ))}
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
                        <input className="w-full p-3 border rounded-lg text-sm" placeholder="Your Name" value={customerDetails.name} onChange={(e) => setCustomerDetails({ ...customerDetails, name: e.target.value })} required />
                        <input className="w-full p-3 border rounded-lg text-sm" placeholder="Phone Number" type="tel" value={customerDetails.phone} onChange={(e) => setCustomerDetails({ ...customerDetails, phone: e.target.value })} required />
                      </div>
                    </div>
                  </div>

                  {/* Summary Section matching Image 3 */}
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <h3 className="font-bold text-purple-900 mb-3 text-sm">Total to Transfer</h3>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Subtotal:</span>
                      <span>{Object.values(cart).reduce((s, i) => s + i.price * i.qty, 0).toFixed(3)} BHD</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mb-3 border-b border-purple-200 pb-2">
                      <span>Delivery Fee:</span>
                      <span>{(deliveryMethod === 'delivery' ? 1.000 : 0).toFixed(3)} BHD</span>
                    </div>

                    <div className="flex justify-between items-end mb-4">
                      <span className="text-purple-700 font-bold text-lg">Total:</span>
                      <span className="font-mono text-2xl font-bold text-gray-900">
                        {(Object.values(cart).reduce((s, i) => s + i.price * i.qty, 0) + (deliveryMethod === 'delivery' ? 1.000 : 0)).toFixed(3)} BHD
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-purple-200 relative group cursor-pointer mb-4" onClick={() => { navigator.clipboard.writeText("+97333027588"); showNotification("Number Copied!"); }}>
                      <p className="text-[10px] text-purple-500 uppercase font-bold tracking-wider mb-1">Pay to BenefitPay</p>
                      <p className="font-mono text-lg font-bold text-gray-900 tracking-wider">+973 3302 7588</p>
                      <Copy size={16} className="absolute right-3 top-4 text-purple-400" />
                    </div>
                    <p className="text-[10px] text-center text-gray-400">Name: <span className="font-bold">ILA Shai</span></p>
                  </div>

                  {/* Proof Upload */}
                  <div className="pt-2">
                    <label className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-white transition-all ${proofFile ? "border-green-400" : "border-gray-200"}`}>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => setProofFile(e.target.files[0])} />
                      <div className="flex items-center gap-2 text-gray-400">
                        {proofFile ? <CheckCircle size={18} className="text-green-500" /> : <Upload size={18} />}
                        <span className="text-xs font-bold">{proofFile ? proofFile.name : "Upload Payment Screenshot"}</span>
                      </div>
                    </label>
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
                    onClick={() => setCheckoutStep("form")}
                    className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
                  >
                    Proceed to Checkout <ChevronRight size={18} />
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

          {/* --- SOCIAL MEDIA LINKS (Dynamic) --- */}
          <div className="flex justify-center gap-6 mb-8">
            {/* Instagram - Only shows if link exists */}
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

            {/* Facebook - Only shows if link exists */}
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

            {/* WhatsApp - Only shows if number exists */}
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
}



