// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import {
  collection, doc, onSnapshot, updateDoc, addDoc, deleteDoc, setDoc, query, serverTimestamp
} from "firebase/firestore";
import {
  LayoutDashboard, Users, Package, Database, ListFilter, Tag, Sparkles,
  MessageCircle, Settings, Search, Filter, Clock, Download, Truck, Store,
  Upload, X, Edit, RefreshCw, Archive, Eye, EyeOff, Trash2, Plus, FileText,
  Save, Calendar, ArrowUp, ArrowDown
} from "lucide-react";
import AnalyticsSummary from "./AnalyticsSummary";
import ImagePreviewModal from "./ImagePreviewModal";
import OrderReceiptModal from "./OrderReceiptModal";
import WhatsAppModal from "./WhatsAppModal";
import { compressImage } from "../lib/utils";
import { LOGO_URL } from "../constants";

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
  const [tab, setTab] = useState(() => { const s = sessionStorage.getItem("shepherdess_admin_tab"); if(s) { sessionStorage.removeItem("shepherdess_admin_tab"); return s; } return "orders"; });
  const [editableContent, setEditableContent] = useState(content);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [whatsappOrder, setWhatsappOrder] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [accView, setAccView] = useState("overview");
  const [trendTimeframe, setTrendTimeframe] = useState('monthly');
  const [trendStartDate, setTrendStartDate] = useState('');
  const [trendEndDate, setTrendEndDate] = useState('');

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
    cost: "", // ✨ NEW: Cost field
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
    // ✨ NEW: "id" is now the very first column
    const headers = ["id", "name", "category", "subcategory", "cost", "price", "originalPrice", "stock", "expiryDate", "description", "image", "active"];
    let csvContent = headers.join(",") + "\n";

    products.forEach(p => {
      const row = headers.map(header => {
        let val = p[header] === undefined || p[header] === null ? "" : p[header];
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
    const headers = "id,name,category,subcategory,cost,price,originalPrice,stock,expiryDate,description,image\n";
    // ✨ NEW: The first value is empty (starting with a comma) so the system knows it's a new product
    const sample = ',Glass Skin Serum,Skincare,Serum,5.000,12.500,,50,2027-12-31,"Amazing glowing serum",https://example.com/image.jpg\n';
    const blob = new Blob([headers + sample], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "Shepherdess_Import_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. Process & Import Uploaded CSV (SMART ID ENGINE)
  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm("Import products? Existing IDs will update their products. Rows with a blank ID will be added as new products.")) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const regex = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\s\S][^'\\]*)*)'|"([^"\\]*(?:\\[\s\S][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;
        const rows = text.split('\n').filter(row => row.trim() !== '');

        const headers = [];
        let headerMatch;
        const headerLine = rows[0];
        while ((headerMatch = regex.exec(headerLine)) !== null) {
          if (headerMatch.index === regex.lastIndex) regex.lastIndex++;
          headers.push((headerMatch[1] || headerMatch[2] || headerMatch[3] || '').trim().toLowerCase());
        }

        let addedCount = 0;
        let updatedCount = 0;

        for (let i = 1; i < rows.length; i++) {
          const values = [];
          let valMatch;
          regex.lastIndex = 0;
          while ((valMatch = regex.exec(rows[i])) !== null) {
            if (valMatch.index === regex.lastIndex) regex.lastIndex++;
            let val = valMatch[1] || valMatch[2] || valMatch[3] || '';
            val = val.replace(/""/g, '"');
            values.push(val.trim());
          }

          const item = {};
          headers.forEach((h, index) => { item[h] = values[index]; });

          // Must have at least a name to process
          if (!item.name) continue;

          // ✨ NEW: Look up by ID instead of Name
          const existingProduct = item.id ? products.find(p => p.id === item.id) : null;

          const formattedData = {
            name: item.name,
            category: item.category || "Uncategorized",
            subcategory: item.subcategory || "",
            cost: parseFloat(item.cost) || 0,
            price: parseFloat(item.price) || 0,
            originalPrice: item.originalprice ? parseFloat(item.originalprice) : null,
            stock: parseInt(item.stock) || 0,
            expiryDate: item.expirydate || item.expiryDate || "",
            description: item.description || "",
            image: item.image || "",
          };

          if (existingProduct) {
            // UPDATE: Product exists, update its data
            await updateDoc(doc(db, "products", existingProduct.id), {
              ...formattedData,
              updatedAt: serverTimestamp()
            });
            updatedCount++;
          } else {
            // ADD: No ID provided, create a brand new product
            await addDoc(collection(db, "products"), {
              ...formattedData,
              active: true,
              archived: false,
              createdAt: serverTimestamp()
            });
            addedCount++;
          }
        }
        alert(`Success! 🎉 ${addedCount} new items added, ${updatedCount} items updated.`);
      } catch (error) {
        console.error("Import failed:", error);
        alert("Oops! The file format was incorrect. Please ensure you didn't accidentally delete the 'id' column header.");
      } finally {
        setIsImporting(false);
        e.target.value = '';
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
      cost: parseFloat(productForm.cost) || 0, // ✨ NEW
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
      name: "", category: "", subcategory: "", cost: "", price: "", originalPrice: "", stock: "", expiryDate: "", description: "", image: "",
    });
    setEditingId(null);
    setShowProductForm(false);
  };

  const startEditProduct = (product) => {
    setProductForm({
      name: product.name,
      category: product.category,
      subcategory: product.subcategory || "",
      cost: product.cost || "", // ✨ NEW
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
        // ✨ NEW: Only include products that are active AND not archived
        p.active && !p.archived &&
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
          { id: "accounting", icon: Database, label: "Accounting" }, // ✨ NEW TAB
          { id: "categories", icon: ListFilter, label: "Categories" },
          { id: "promos", icon: Tag, label: "Promotions" },
          { id: "marketing", icon: Sparkles, label: "Marketing" },
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

                // ✨ BULLETPROOF FIX 1: Added safe fallbacks for old database test orders
                const statusColors = {
                  delivered: "border-green-500 bg-green-50/30 text-green-700",
                  completed: "border-green-500 bg-green-50/30 text-green-700", // For old data
                  shipped: "border-blue-500 bg-blue-50/30 text-blue-700", // For old data
                  confirmed: "border-blue-500 bg-blue-50/30 text-blue-700",
                  canceled: "border-red-500 bg-red-50/30 text-red-700",
                  pending: "border-amber-500 bg-amber-50/30 text-amber-700"
                };

                // ✨ BULLETPROOF FIX 2: If a weird status appears, safely default to pending colors
                const safeColorString = statusColors[status] || statusColors.pending;

                return (
                  <div key={order.id} className="bg-white border border-gray-100 rounded-2xl p-4 md:p-6 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
                    {/* Status Indicator Line */}
                    <div className={`absolute top-0 left-0 right-0 h-1 ${safeColorString.split(' ')[0]}`} />

                    {/* --- TOP HEADER: NAME, STATUS, DATE, JOURNEY --- */}
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 text-lg">{order.customer?.name || "Guest"}</h3>
                          <span className="text-[10px] font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-500 border border-gray-200">
                            {order.orderId || "#UNKNOWN"}
                          </span>
                        </div>

                        {/* Order Status Badge */}
                        <div className="flex items-center gap-2">
                          <select
                            value={status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            className={`text-[10px] font-bold uppercase py-1 px-3 rounded-full border cursor-pointer focus:outline-none transition-colors ${safeColorString}`}
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
                          {order.date instanceof Date && !isNaN(order.date) ? order.date.toLocaleString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', hour12: true
                          }) : "Unknown Date"}
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
                          {(Number(order.total) || 0).toFixed(3)} <span className="text-xs">BHD</span>
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

                    {/* --- BOTTOM GRID: SHIPPING & ITEMS --- */}
                    <div className="grid md:grid-cols-2 gap-8 text-sm border-t border-gray-50 pt-6">

                      {/* LEFT: Shipping & Proof */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customer & Shipping</h4>
                        <div className="flex items-center gap-3 text-gray-700 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                          <div className="bg-purple-50 p-2 rounded-lg text-purple-600">
                            {order.customer?.deliveryMethod === 'delivery' ? <Truck size={18} /> : <Store size={18} />}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{order.customer?.phone || "N/A"}</p>
                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-tight">{order.customer?.deliveryMethod || "Unknown"}</p>
                            <p className="text-xs italic text-gray-500 mt-1">
                              {order.customer?.deliveryMethod === 'delivery' ? order.customer?.deliveryAddress : order.customer?.meetupNote}
                            </p>
                          </div>
                        </div>

                        {/* START OF PAYMENT PROOF SECTION */}
                        <div className="mt-4">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                            Payment Proof
                          </label>

                          {order.customer?.proof ? (
                            <div className="flex items-start gap-3">
                              <div className="relative group">
                                <img
                                  src={order.customer.proof}
                                  onClick={() => setPreviewImage(order.customer.proof)}
                                  className="w-24 h-24 object-cover rounded-xl border border-gray-100 cursor-pointer hover:opacity-80 transition-opacity"
                                />
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

                              <div className="flex flex-col gap-2 pt-1">
                                <label className="cursor-pointer bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-colors flex items-center gap-1">
                                  <Upload size={12} /> Change
                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleProofUpload(e, order.id)} />
                                </label>
                              </div>
                            </div>
                          ) : (
                            <label className="flex items-center gap-3 border border-dashed border-gray-300 rounded-xl p-3 cursor-pointer hover:bg-gray-50 hover:border-purple-300 transition-colors w-full max-w-[200px] group">
                              <div className="bg-gray-100 group-hover:bg-purple-100 p-2 rounded-full text-gray-400 group-hover:text-purple-500 transition-colors">
                                <Upload size={16} />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-gray-600 block group-hover:text-purple-700">Upload Proof</span>
                                <span className="text-[10px] text-gray-400 block">Click to add image</span>
                              </div>
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleProofUpload(e, order.id)} />
                            </label>
                          )}
                        </div>
                      </div>

                      {/* RIGHT: Items & Tools */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order Items</h4>
                          <span className="text-[10px] italic text-purple-400">(click x to remove)</span>
                        </div>

                        <ul className="space-y-2">
                          {order.items && Object.values(order.items).map((i) => (
                            <li key={i.id} className="flex justify-between items-center text-xs bg-gray-50/50 p-2 rounded-xl border border-gray-100 group">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-purple-600">{i.qty || 1}x</span>
                                <span className="text-gray-700">{i.name || "Unknown Item"}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                {/* ✨ BULLETPROOF FIX 3: Safely parse item prices */}
                                <span className="font-mono text-gray-400">{(Number(i.price) || 0).toFixed(3)}</span>
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
                            {(Number(order.deliveryFee) || 0).toFixed(3)} BHD
                          </span>
                        </div>

                        {/* Replacement Tool */}
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

                        {/* Grand Total Adjustment */}
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Adjust Total:</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number" step="0.001" defaultValue={Number(order.total) || 0}
                              onBlur={(e) => updateOrderTotal(order.id, e.target.value)}
                              className="w-20 p-1 border border-gray-200 rounded text-right font-bold text-purple-600 text-xs"
                            />
                            <span className="text-[10px] font-bold text-gray-400">BHD</span>
                          </div>
                        </div>

                        {/* Admin Notes */}
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

      {/* INVENTORY TAB (COMPACT & OPTIMIZED) */}
      {tab === "inventory" && (
        <div className="space-y-4">
          {/* Top Controls - Made much smaller */}
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-2 flex-1 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2 text-gray-400" size={14} />
                <input
                  className="w-full pl-8 pr-3 py-1.5 border rounded-lg text-xs bg-gray-50 focus:bg-white transition-colors"
                  placeholder="Search product name..."
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                />
              </div>
              <select
                className="border py-1.5 px-2 rounded-lg text-xs bg-white"
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
                  className="border py-1.5 px-2 rounded-lg text-xs bg-white animate-fade-in"
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
            <div className="flex flex-wrap items-center justify-start md:justify-end gap-2 w-full md:w-auto mt-2 md:mt-0">
              <button
                onClick={clearAllFilters}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-[9px] font-bold border border-gray-200 uppercase tracking-tighter hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <RefreshCw size={12} /> Clear
              </button>

              <div
                onClick={() => setHideOutOfStock(!hideOutOfStock)}
                className="flex items-center gap-1.5 cursor-pointer group select-none bg-gray-50 px-2 py-1 rounded-lg border border-gray-100"
              >
                <div className={`relative w-7 h-4 rounded-full transition-colors ${hideOutOfStock ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full shadow transform transition-transform ${hideOutOfStock ? 'translate-x-3' : 'translate-x-0'}`} />
                </div>
                <span className="text-[9px] font-bold text-gray-500 uppercase">Hide 0</span>
              </div>

              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`p-1.5 rounded-lg transition-all border ${showArchived
                  ? "bg-amber-100 text-amber-800 border-amber-200"
                  : "bg-white text-gray-400 border-gray-200 hover:text-gray-600"
                  }`}
                title={showArchived ? "Back to Inventory" : "View Archived Items"}
              >
                {showArchived ? <RefreshCw size={16} /> : <Archive size={16} />}
              </button>

              {!showArchived && (
                <button
                  onClick={() => {
                    setEditingId(null);
                    setProductForm({
                      name: "", category: Object.keys(categories)[0] || "", subcategory: "", price: "", originalPrice: "", stock: "", expiryDate: "", description: "", image: "",
                    });
                    setShowProductForm(!showProductForm);
                  }}
                  className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-purple-700 transition-colors whitespace-nowrap"
                >
                  {showProductForm ? <X size={14} /> : <Plus size={14} />}{" "}
                  {showProductForm ? "Cancel" : "Add"}
                </button>
              )}

              <div className="flex gap-1.5 border-l border-gray-200 pl-2 ml-1">
                <button onClick={handleDownloadTemplate} title="Download Blank Template" className="p-1.5 text-gray-400 hover:text-green-600 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-green-50">
                  <FileText size={14} />
                </button>
                <button onClick={handleExportCSV} title="Backup & Export Inventory" className="p-1.5 text-gray-400 hover:text-blue-600 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-blue-50">
                  <Download size={14} />
                </button>
                <label className={`p-1.5 bg-white border border-gray-200 rounded-lg shadow-sm relative ${isImporting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer text-gray-400 hover:text-purple-600 hover:bg-purple-50'}`}>
                  <Upload size={14} />
                  <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} disabled={isImporting} />
                </label>
              </div>
            </div>
          </div>

          {showProductForm && (
            <form
              onSubmit={handleProductSubmit}
              className="bg-white border border-purple-200 rounded-xl p-4 shadow-sm space-y-3 animate-fade-in"
            >
              <h3 className="font-bold text-sm text-gray-900">
                {editingId ? "Edit Product" : "Add New Product"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input required placeholder="Name" className="p-2 border rounded-lg text-xs" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
                <select className="p-2 border rounded-lg text-xs" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value, subcategory: "" })}>
                  <option value="">Select Category</option>
                  {Object.keys(categories).map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
                <select className="p-2 border rounded-lg text-xs" value={productForm.subcategory} onChange={(e) => setProductForm({ ...productForm, subcategory: e.target.value })}>
                  <option value="">Select Subcategory</option>
                  {(categories[productForm.category] || []).map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
                <div className="flex gap-2">
                  <input type="number" step="0.001" placeholder="Cost" className="p-2 border border-purple-200 bg-purple-50 rounded-lg text-xs w-1/3 text-purple-700 font-bold" value={productForm.cost} onChange={(e) => setProductForm({ ...productForm, cost: e.target.value })} />
                  <input required type="number" step="0.001" placeholder="Selling Price" className="p-2 border rounded-lg text-xs w-1/3" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} />
                  <input type="number" step="0.001" placeholder="Old Price" className="p-2 border rounded-lg text-xs w-1/3" value={productForm.originalPrice} onChange={(e) => setProductForm({ ...productForm, originalPrice: e.target.value })} />
                </div>
                <input required type="number" placeholder="Stock" className="p-2 border rounded-lg text-xs" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} />
                <input placeholder="Expiry (YYYY-MM-DD)" className="p-2 border rounded-lg text-xs" value={productForm.expiryDate} onChange={(e) => setProductForm({ ...productForm, expiryDate: e.target.value })} />
                <input placeholder="Image URL" className="p-2 border rounded-lg text-xs" value={productForm.image} onChange={(e) => setProductForm({ ...productForm, image: e.target.value })} />
                <textarea placeholder="Description" className="p-2 border rounded-lg text-xs md:col-span-2" rows="2" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
              </div>
              <button type="submit" className="w-full bg-gray-900 text-white py-2 rounded-lg text-xs font-bold hover:bg-black">
                {editingId ? "Update Product" : "Save Product"}
              </button>
            </form>
          )}

          {/* TABLE - Made extremely compact */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-2.5 cursor-pointer hover:bg-gray-100" onClick={() => handleHeaderSort("name")}>Product</th>
                    <th className="p-2.5 text-center cursor-pointer hover:bg-gray-100" onClick={() => handleHeaderSort("stock")}>Stock</th>
                    <th className="p-2.5 text-center cursor-pointer hover:bg-gray-100" onClick={() => handleHeaderSort("price")}>Price</th>
                    <th className="p-2.5 text-center cursor-pointer hover:bg-gray-100" onClick={() => handleHeaderSort("expiryDate")}>Expiry</th>
                    <th className="p-2.5 text-center cursor-pointer hover:bg-gray-100" onClick={cycleVisFilter}>Vis</th>
                    <th className="p-2.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInventory.map((p) => (
                    <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${!p.active ? "opacity-60 bg-gray-50" : ""}`}>
                      <td className="p-2">
                        <div className="font-bold text-gray-900 text-[11px] md:text-xs leading-tight line-clamp-1">{p.name}</div>
                        <div className="flex gap-1 mt-1">
                          <span className="text-[8px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full border border-purple-100 font-bold leading-none">{p.category}</span>
                          {p.subcategory && <span className="text-[8px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full leading-none">{p.subcategory}</span>}
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <input type="number" className={`w-12 p-1 text-[11px] border rounded text-center font-bold ${p.stock < 3 ? "text-red-600 border-red-200 bg-red-50" : "border-gray-200"}`} value={p.stock} onChange={(e) => onUpdateStock(p.id, e.target.value)} />
                      </td>
                      <td className="p-2 text-center">
                        <input type="number" step="0.001" className="w-16 p-1 text-[11px] border border-gray-200 rounded text-center text-purple-600 font-bold" value={p.price} onChange={(e) => onUpdatePrice(p.id, e.target.value)} />
                      </td>
                      <td className="p-2 text-center text-[10px] font-mono text-gray-500">
                        {p.expiryDate ? p.expiryDate : "—"}
                      </td>
                      <td className="p-2 text-center">
                        <button onClick={() => onToggleStatus(p.id, p.active)} className={`p-1.5 rounded-full ${p.active ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`}>
                          {p.active ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                      </td>
                      <td className="p-2 text-center flex justify-center gap-1">
                        <button onClick={() => startEditProduct(p)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-full"><Edit size={14} /></button>
                        <button onClick={() => toggleArchiveStatus(p)} className={`p-1.5 rounded-full ${p.archived ? "text-green-500 hover:bg-green-50" : "text-amber-500 hover:bg-amber-50"}`}>
                          {p.archived ? <RefreshCw size={14} /> : <Archive size={14} />}
                        </button>
                        <button onClick={() => onDeleteProduct(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNTING TAB */}
      {tab === "accounting" && (() => {
        // --- 1. BULLETPROOF DATA PARSERS ---
        const parseDate = (order) => {
          const dateData = order.date || order.createdAt || order.timestamp;
          if (!dateData) return new Date();
          if (dateData.toDate) return dateData.toDate();
          if (dateData.seconds) return new Date(dateData.seconds * 1000);
          return new Date(dateData);
        };

        const validOrders = Object.values(orders).filter(o =>
          o.status?.toLowerCase() === "delivered"
        );

        // --- 2. CALCULATIONS ---
        const totalGrossSales = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const totalCOGS = validOrders.reduce((sum, o) => sum + (o.totalCOGS || 0), 0);
        const netProfit = totalGrossSales - totalCOGS;
        const profitMargin = totalGrossSales > 0 ? (netProfit / totalGrossSales) * 100 : 0;

        const currentInventoryValue = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.cost || p.costPrice || 0)), 0);
        const totalCapitalInvested = totalCOGS + currentInventoryValue;
        const breakEvenPercentage = totalCapitalInvested > 0 ? (totalGrossSales / totalCapitalInvested) * 100 : 0;
        const isPureProfit = totalGrossSales >= totalCapitalInvested;
        const ordersMissingCosts = validOrders.filter(o => o.totalCOGS === undefined).length;

        // --- 3. ✨ ADVANCED AXIS GRAPH ENGINE ---
        let filteredOrdersForGraph = validOrders;

        if (trendStartDate) {
          const sDate = new Date(trendStartDate + 'T00:00:00');
          filteredOrdersForGraph = filteredOrdersForGraph.filter(o => parseDate(o) >= sDate);
        }
        if (trendEndDate) {
          const eDate = new Date(trendEndDate + 'T23:59:59');
          filteredOrdersForGraph = filteredOrdersForGraph.filter(o => parseDate(o) <= eDate);
        }

        const getGroupKey = (date) => {
          const d = new Date(date);
          const year = d.getFullYear();
          const shortYear = year.toString().slice(-2);
          const month = d.getMonth();

          if (trendTimeframe === 'yearly') return `${year}`;
          if (trendTimeframe === 'quarterly') return `Q${Math.floor(month / 3) + 1} '${shortYear}`;
          if (trendTimeframe === 'weekly') {
            const firstDay = new Date(year, 0, 1);
            const days = Math.floor((d - firstDay) / (24 * 60 * 60 * 1000));
            const week = Math.ceil((days + firstDay.getDay() + 1) / 7);
            return `W${week} '${shortYear}`;
          }
          if (trendTimeframe === 'daily') return d.toLocaleDateString('default', { month: 'short', day: 'numeric' });

          return d.toLocaleString('default', { month: 'short', year: '2-digit' });
        };

        const graphData = {};
        const groupTimestamps = {};

        filteredOrdersForGraph.forEach(order => {
          const date = parseDate(order);
          if (isNaN(date.getTime())) return;

          const key = getGroupKey(date);
          if (!graphData[key]) {
            graphData[key] = 0;
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            if (trendTimeframe === 'monthly' || trendTimeframe === 'quarterly') d.setDate(1);
            if (trendTimeframe === 'yearly') { d.setDate(1); d.setMonth(0); }
            groupTimestamps[key] = d.getTime();
          }
          graphData[key] += (order.total || 0);
        });

        const existingTimestamps = Object.values(groupTimestamps);
        if (existingTimestamps.length > 0) {
          let minTime = Math.min(...existingTimestamps);
          let maxTime = Math.max(...existingTimestamps);

          if (trendStartDate) minTime = Math.min(minTime, new Date(trendStartDate + 'T00:00:00').getTime());
          if (trendEndDate) maxTime = Math.max(maxTime, new Date(trendEndDate + 'T23:59:59').getTime());

          let current = new Date(minTime);
          let safeLoop = 0;

          while (current.getTime() <= maxTime && safeLoop < 1000) {
            safeLoop++;
            const key = getGroupKey(current);

            if (graphData[key] === undefined) {
              graphData[key] = 0;
              groupTimestamps[key] = current.getTime();
            }

            if (trendTimeframe === 'yearly') current.setFullYear(current.getFullYear() + 1);
            else if (trendTimeframe === 'quarterly') current.setMonth(current.getMonth() + 3);
            else if (trendTimeframe === 'monthly') current.setMonth(current.getMonth() + 1);
            else if (trendTimeframe === 'weekly') current.setDate(current.getDate() + 7);
            else current.setDate(current.getDate() + 1);
          }
        }

        const sortedGraphKeys = Object.keys(graphData).sort((a, b) => groupTimestamps[a] - groupTimestamps[b]);

        // ✨ Prepare Data for the X/Y Axis Render
        const graphColumns = sortedGraphKeys.map(key => {
          const total = graphData[key];
          const date = new Date(groupTimestamps[key]);
          const year = date.getFullYear();
          let labelTop = '';
          let groupLabel = '';

          if (trendTimeframe === 'daily') {
            labelTop = date.getDate().toString().padStart(2, '0');
            groupLabel = date.toLocaleString('default', { month: 'short' });
          } else if (trendTimeframe === 'weekly') {
            const end = new Date(date);
            end.setDate(end.getDate() + 6);
            labelTop = `${date.getDate().toString().padStart(2, '0')}-${end.getDate().toString().padStart(2, '0')}`;
            groupLabel = date.toLocaleString('default', { month: 'short' });
          } else if (trendTimeframe === 'monthly') {
            labelTop = date.toLocaleString('default', { month: 'short' });
            groupLabel = year.toString();
          } else if (trendTimeframe === 'quarterly') {
            labelTop = `Q${Math.floor(date.getMonth() / 3) + 1}`;
            groupLabel = year.toString();
          } else {
            labelTop = year.toString();
            groupLabel = 'YEARLY';
          }

          return { key, total, year, labelTop, groupLabel };
        });

        // Group columns by their bracket label (e.g. Month or Year)
        const groupedColumns = [];
        let currentGroup = null;
        graphColumns.forEach(col => {
          if (!currentGroup || currentGroup.label !== col.groupLabel || currentGroup.year !== col.year) {
            currentGroup = { label: col.groupLabel, year: col.year, columns: [] };
            groupedColumns.push(currentGroup);
          }
          currentGroup.columns.push(col);
        });

        // Calculate Y-Axis Scale
        const maxRaw = Math.max(...graphColumns.map(c => c.total), 0);
        const maxGraphValue = maxRaw > 0 ? maxRaw * 1.15 : 10; // Give 15% headroom above the tallest bar
        const yTicks = [maxGraphValue, maxGraphValue * 0.75, maxGraphValue * 0.5, maxGraphValue * 0.25, 0];

        // Find visible years for the top right badge
        const visibleYears = Array.from(new Set(graphColumns.map(c => c.year))).join(' - ');

        // --- 4. CSV EXPORT ---
        const exportToCSV = () => {
          if (validOrders.length === 0) {
            alert("No valid orders found to export.");
            return;
          }

          let csvContent = "Order ID,Date,Status,Customer,Method,Gross Sales (BHD),COGS (BHD),Net Profit (BHD),Items\n";
          validOrders.forEach(o => {
            const date = parseDate(o).toLocaleDateString();
            const items = Object.values(o.items || {}).map(i => `${i.qty}x ${i.name}`).join(" + ");
            const cogs = o.totalCOGS || 0;
            const profit = (o.total || 0) - cogs;
            const status = `"${(o.status || 'Pending').toUpperCase()}"`;
            const cleanName = `"${(o.customer?.name || 'Guest').replace(/"/g, '""')}"`;
            const cleanItems = `"${items.replace(/"/g, '""')}"`;
            const method = `"${o.customer?.deliveryMethod || 'N/A'}"`;

            csvContent += `${o.orderId},${date},${status},${cleanName},${method},${(o.total || 0).toFixed(3)},${cogs.toFixed(3)},${profit.toFixed(3)},${cleanItems}\n`;
          });

          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", `Shepherdess_Ledger_${new Date().toLocaleDateString()}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        // --- 5. RETROACTIVE SYNC ---
        const handleRetroactiveSync = async () => {
          if (!window.confirm(`Update ${ordersMissingCosts} old orders with CURRENT product costs?`)) return;
          let updatedCount = 0;
          for (const order of validOrders) {
            if (order.totalCOGS === undefined) {
              let orderCOGS = 0;
              const updatedItems = { ...order.items };
              for (const key in updatedItems) {
                const item = updatedItems[key];
                const liveProduct = products.find(p => p.id === item.id);
                const itemCost = liveProduct ? (liveProduct.cost || liveProduct.costPrice || 0) : 0;
                updatedItems[key].cost = itemCost;
                orderCOGS += (itemCost * item.qty);
              }
              await updateDoc(doc(db, "orders", order.id), { items: updatedItems, totalCOGS: orderCOGS });
              updatedCount++;
            }
          }
          alert(`Success! ${updatedCount} historical orders have been updated.`);
        };

        return (
          <div className="space-y-6 animate-fade-in pb-8">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-4">
              <div>
                <h3 className="font-bold text-2xl text-gray-900 font-serif">Financial Overview</h3>
                <p className="text-sm text-gray-500">Based on {validOrders.length} delivered orders.</p>
              </div>

              <div className="flex gap-2">
                {ordersMissingCosts > 0 && (
                  <button onClick={handleRetroactiveSync} className="bg-amber-100 text-amber-800 px-3 py-2 rounded-lg text-xs font-bold hover:bg-amber-200 flex items-center gap-2">
                    <RefreshCw size={14} /> Sync {ordersMissingCosts} Old Orders
                  </button>
                )}
                <button onClick={exportToCSV} className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-700 flex items-center gap-2 shadow-sm">
                  <Download size={14} /> Export CSV
                </button>
              </div>
            </div>

            <div className="flex bg-gray-100 p-1 rounded-xl w-full max-w-sm mb-6 shadow-inner">
              <button onClick={() => setAccView('overview')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${accView === 'overview' ? 'bg-white shadow-sm text-purple-700' : 'text-gray-500 hover:text-gray-900'}`}>
                Dashboard
              </button>
              <button onClick={() => setAccView('ledger')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${accView === 'ledger' ? 'bg-white shadow-sm text-purple-700' : 'text-gray-500 hover:text-gray-900'}`}>
                Ledger Table
              </button>
            </div>

            {accView === 'overview' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Gross Sales</p>
                    <h4 className="text-3xl font-serif font-bold text-gray-900">{totalGrossSales.toFixed(3)}</h4>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Cost of Goods</p>
                    <h4 className="text-3xl font-serif font-bold text-gray-900">{totalCOGS.toFixed(3)}</h4>
                  </div>
                  <div className="bg-purple-600 p-6 rounded-xl shadow-lg">
                    <p className="text-xs font-bold text-purple-200 uppercase tracking-widest mb-2">Net Profit</p>
                    <h4 className="text-3xl font-serif font-bold text-white">{netProfit.toFixed(3)}</h4>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Profit Margin</p>
                    <h4 className={`text-3xl font-serif font-bold ${profitMargin > 40 ? 'text-green-500' : profitMargin > 20 ? 'text-amber-500' : 'text-red-500'}`}>
                      {profitMargin.toFixed(1)}%
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 mt-4">

                  {/* ✨ ADVANCED X/Y AXIS GRAPH */}
                  <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                    <div className="flex flex-col xl:flex-row justify-between xl:items-end mb-6 gap-4 border-b border-gray-50 pb-4">
                      <div>
                        <h4 className="font-bold text-xl text-gray-900 font-serif">Sales Trends</h4>
                        <p className="text-xs text-gray-500 mt-1">Visualize revenue over time by specific dates.</p>
                      </div>

                      {/* Controls & Year Tag */}
                      <div className="flex flex-col items-end gap-3">
                        {visibleYears && (
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-100 uppercase tracking-widest">
                            {visibleYears}
                          </span>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                            <input type="date" className="text-xs bg-transparent outline-none text-gray-700 cursor-pointer w-24 sm:w-auto" value={trendStartDate} onChange={(e) => setTrendStartDate(e.target.value)} />
                            <span className="text-gray-400 text-xs font-bold px-1">to</span>
                            <input type="date" className="text-xs bg-transparent outline-none text-gray-700 cursor-pointer w-24 sm:w-auto" value={trendEndDate} onChange={(e) => setTrendEndDate(e.target.value)} />
                            {(trendStartDate || trendEndDate) && (
                              <button onClick={() => { setTrendStartDate(''); setTrendEndDate(''); }} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                                <X size={14} />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                            <Filter size={14} className="text-gray-400 ml-1 mr-2" />
                            <select className="text-xs font-bold bg-transparent text-gray-700 outline-none cursor-pointer" value={trendTimeframe} onChange={(e) => setTrendTimeframe(e.target.value)}>
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                              <option value="quarterly">Quarterly</option>
                              <option value="yearly">Yearly</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {sortedGraphKeys.length === 0 ? (
                      <div className="w-full flex flex-col items-center justify-center text-gray-400 py-12 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                        <Calendar size={32} className="mb-2 text-gray-300" />
                        <p className="text-sm font-medium">No sales data found for this period.</p>
                      </div>
                    ) : (
                      <div className="flex w-full h-[320px]">
                        {/* Y-AXIS (Left Side) */}
                        <div className="flex flex-col justify-between pb-[60px] pr-3 w-12 border-r border-gray-200 text-[10px] text-gray-400 font-mono text-right shrink-0">
                          <span>{yTicks[0].toFixed(0)}</span>
                          <span>{yTicks[1].toFixed(0)}</span>
                          <span>{yTicks[2].toFixed(0)}</span>
                          <span>{yTicks[3].toFixed(0)}</span>
                          <span>0</span>
                        </div>

                        {/* GRAPH & X-AXIS AREA (Right Side) */}
                        <div className="flex-1 relative overflow-x-auto custom-scrollbar">

                          {/* Horizontal Grid Lines */}
                          <div className="absolute top-0 left-0 right-0 bottom-[60px] flex flex-col justify-between pointer-events-none z-0 px-2">
                            <div className="border-t border-gray-100 w-full"></div>
                            <div className="border-t border-gray-100 w-full"></div>
                            <div className="border-t border-gray-100 w-full"></div>
                            <div className="border-t border-gray-100 w-full"></div>
                            <div className="border-t border-gray-300 w-full"></div> {/* Baseline */}
                          </div>

                          {/* Bars and Group Brackets */}
                          <div className="absolute top-0 left-0 h-full flex px-4 gap-6 z-10 min-w-max">
                            {groupedColumns.map((group, i) => (
                              <div key={i} className="flex flex-col h-full">

                                {/* Bars Area (Sits strictly above the X-Axis) */}
                                <div className="flex-1 flex items-end gap-2 pb-[1px] justify-center">
                                  {group.columns.map(col => {
                                    const heightPercent = Math.max((col.total / maxGraphValue) * 100, 1);
                                    return (
                                      // ✨ Made columns slightly wider (w-8) to fit the text
                                      <div key={col.key} className="flex flex-col items-center group relative w-8 sm:w-10 h-full justify-end">

                                        {/* Hover Tooltip (moved slightly higher to make room for the new text) */}
                                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-5 bg-gray-900 text-white text-[10px] font-bold py-1 px-2 rounded z-20 whitespace-nowrap shadow-xl pointer-events-none transition-opacity duration-200">
                                          {col.total.toFixed(3)} BHD
                                        </div>

                                        {/* ✨ NEW: Persistent Amount Label on top of the bar */}
                                        {col.total > 0 && (
                                          <span className="text-[8px] sm:text-[9px] font-bold text-purple-800 mb-1 text-center w-full truncate">
                                            {col.total.toFixed(1)}
                                          </span>
                                        )}

                                        {/* The Purple Bar */}
                                        <div
                                          className="w-full bg-purple-400 group-hover:bg-purple-600 rounded-t-sm transition-all duration-500 ease-out cursor-pointer shadow-sm"
                                          style={{ height: `${heightPercent}%` }}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* X-Axis Area (Exactly 60px tall below the baseline) */}
                                <div className="h-[60px] flex flex-col items-center pt-2 w-full">

                                  {/* Day / Week Labels directly under bars */}
                                  <div className="flex justify-center gap-2 w-full">
                                    {group.columns.map(col => (
                                      // ✨ Made labels match the new bar width (w-8)
                                      <span key={col.key} className="w-8 sm:w-10 text-center text-[9px] font-bold text-gray-500 truncate">
                                        {col.labelTop}
                                      </span>
                                    ))}
                                  </div>

                                  {/* Horizontal Bracket & Month Label */}
                                  {group.label !== 'YEARLY' && (
                                    <div className="w-full mt-1.5 px-0.5">
                                      <div className="w-full border-t border-x border-gray-300 h-1.5 rounded-t-[2px]"></div>
                                      <p className="text-center text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
                                        {group.label}
                                      </p>
                                    </div>
                                  )}

                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* BREAK-EVEN TRACKER */}
                  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mt-2">
                    <div className="flex justify-between items-end mb-4 border-b pb-4">
                      <div>
                        <h4 className="font-bold text-lg text-gray-900">Total Break-Even</h4>
                        <p className="text-xs text-gray-500">Gross Sales vs Total Inventory Costs</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Invested</p>
                        <p className="text-xl font-mono font-bold text-gray-900">{totalCapitalInvested.toFixed(3)} BHD</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 h-6 rounded-full overflow-hidden mb-3 shadow-inner">
                      <div className={`h-full flex items-center justify-end pr-2 rounded-full ${isPureProfit ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${Math.max(10, Math.min(breakEvenPercentage, 100))}%` }}>
                        <span className="text-[10px] font-bold text-white shadow-sm">{breakEvenPercentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-3 rounded-lg border">
                      <div><p className="text-gray-500 uppercase text-[9px] mb-1">COGS (Sold)</p><p className="font-bold">{totalCOGS.toFixed(3)} BHD</p></div>
                      <div><p className="text-gray-500 uppercase text-[9px] mb-1">Sunk Cost (Unsold)</p><p className="font-bold text-amber-600">{currentInventoryValue.toFixed(3)} BHD</p></div>
                    </div>
                  </div>

                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="p-4 font-bold">Order / Date</th>
                        <th className="p-4 font-bold">Status</th>
                        <th className="p-4 font-bold">Customer</th>
                        <th className="p-4 font-bold text-right">Gross (BHD)</th>
                        <th className="p-4 font-bold text-right text-red-500">COGS (BHD)</th>
                        <th className="p-4 font-bold text-right text-green-600">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {validOrders.length === 0 ? (
                        <tr><td colSpan="6" className="p-8 text-center text-gray-400 italic">No valid orders to display.</td></tr>
                      ) : (
                        validOrders.map(o => {
                          const cogs = o.totalCOGS || 0;
                          const profit = (o.total || 0) - cogs;
                          return (
                            <tr key={o.id} className="hover:bg-purple-50 transition-colors">
                              <td className="p-4">
                                <p className="font-bold text-gray-900">{o.orderId}</p>
                                <p className="text-[10px] text-gray-400">{parseDate(o).toLocaleDateString()}</p>
                              </td>
                              <td className="p-4">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${o.status === 'delivered' || o.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {o.status || 'Pending'}
                                </span>
                              </td>
                              <td className="p-4">
                                <p className="font-medium text-gray-700">{o.customer?.name || "Guest"}</p>
                                <p className="text-[10px] text-purple-600 uppercase tracking-widest">{o.customer?.deliveryMethod}</p>
                              </td>
                              <td className="p-4 text-right font-mono font-bold text-gray-900">{(o.total || 0).toFixed(3)}</td>
                              <td className="p-4 text-right font-mono font-bold text-red-500">- {cogs.toFixed(3)}</td>
                              <td className="p-4 text-right font-mono font-bold text-green-600">{profit.toFixed(3)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}


      {/* CATEGORIES TAB (MOBILE OPTIMIZED & COMPACT) */}
      {tab === "categories" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Main Categories Box */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold mb-3 text-sm text-gray-900">Main Categories</h3>
            <div className="flex gap-2 mb-3">
              <input
                className="border p-1.5 rounded-lg flex-1 text-xs outline-none focus:border-purple-300"
                placeholder="New Main Category"
                value={newMainCat}
                onChange={(e) => setNewMainCat(e.target.value)}
              />
              <button
                onClick={addMainCategory}
                className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-700"
              >
                Add
              </button>
            </div>
            <ul className="space-y-1.5 max-h-[200px] md:max-h-full overflow-y-auto">
              {Object.keys(localCategories).map((cat) => (
                <li
                  key={cat}
                  className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100"
                >
                  <span className="font-medium text-xs text-gray-800">{cat}</span>
                  <button
                    onClick={() => deleteMainCategory(cat)}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Subcategories Box */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold mb-3 text-sm text-gray-900">Subcategories</h3>
            <div className="flex flex-col md:flex-row gap-2 mb-3">
              <select
                className="border p-1.5 rounded-lg text-xs bg-white outline-none focus:border-purple-300 w-full md:w-1/3"
                value={newSubCat.main}
                onChange={(e) =>
                  setNewSubCat({ ...newSubCat, main: e.target.value })
                }
              >
                <option value="">Select Main...</option>
                {Object.keys(localCategories).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="flex gap-2 flex-1">
                <input
                  className="border p-1.5 rounded-lg flex-1 text-xs outline-none focus:border-purple-300"
                  placeholder="New Subcategory"
                  value={newSubCat.sub}
                  onChange={(e) =>
                    setNewSubCat({ ...newSubCat, sub: e.target.value })
                  }
                />
                <button
                  onClick={addSubCategory}
                  className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-700"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Subcategory List Display */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {Object.entries(localCategories).map(([main, subs]) => (
                <div key={main}>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-1 sticky top-0 bg-white py-1">
                    {main}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {subs.map((sub) => (
                      <span
                        key={sub}
                        className="bg-purple-50 text-purple-700 px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 border border-purple-100"
                      >
                        {sub}
                        <button
                          onClick={() => deleteSubCategory(main, sub)}
                          className="text-purple-300 hover:text-red-500"
                        >
                          <X size={10} />
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

      {/* PROMOTIONS TAB (CLEANED) */}
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

            {/* 3. RULES ENGINE / EVENT SCHEDULER */}
            {newPromo.type !== 'collection' && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6 space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Discount Rules
                </h4>

                {/* Standard discounts */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500">Value</label>
                    <div className="flex mt-1">
                      <input
                        type="number"
                        className={`w-full p-2 border rounded-l-lg text-sm ${newPromo.discountType === 'free_delivery' ? 'bg-gray-100 text-gray-400' : ''}`}
                        value={newPromo.value}
                        onChange={(e) => setNewPromo({ ...newPromo, value: e.target.value })}
                        disabled={newPromo.discountType === 'free_delivery'}
                      />
                      <select
                        className="bg-gray-100 border-y border-r rounded-r-lg px-3 text-sm font-bold outline-none"
                        value={newPromo.discountType}
                        onChange={(e) => setNewPromo({ ...newPromo, discountType: e.target.value })}
                      >
                        <option value="percentage">% OFF</option>
                        <option value="fixed">BHD OFF</option>
                        {newPromo.type === 'coupon' && <option value="free_delivery">Free Delivery</option>}
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

                {/* Universal Scheduling */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[120px]">
                    <label className="text-xs font-bold text-gray-500">Start Date</label>
                    <input type="date" className="w-full p-2 border rounded-lg mt-1 text-sm" value={newPromo.startDate} onChange={(e) => setNewPromo({ ...newPromo, startDate: e.target.value })} />
                  </div>
                  {newPromo.type === 'auto' && (
                    <div className="flex-1 min-w-[120px] animate-fade-in">
                      <label className="text-xs font-bold text-blue-500 flex items-center gap-1"><Clock size={12} /> Start Time</label>
                      <input type="time" className="w-full p-2 border border-blue-100 rounded-lg mt-1 text-sm focus:border-blue-400 outline-none font-mono" value={newPromo.startTime || ""} onChange={(e) => setNewPromo({ ...newPromo, startTime: e.target.value })} />
                    </div>
                  )}
                  <div className="flex-1 min-w-[120px]">
                    <label className="text-xs font-bold text-gray-500">End Date</label>
                    <input type="date" className="w-full p-2 border rounded-lg mt-1 text-sm" value={newPromo.endDate} onChange={(e) => setNewPromo({ ...newPromo, endDate: e.target.value })} />
                  </div>
                  {newPromo.type === 'coupon' && (
                    <div className="flex-1 min-w-[120px]">
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
                    placeholder="Search products to add..."
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
                {filteredPromoProducts.map((p) => {
                  const isSelected = newPromo.targetSelections.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      className={`flex flex-col gap-2 bg-white p-3 rounded-lg border transition-all ${isSelected
                        ? "border-purple-500 bg-purple-50 ring-1 ring-purple-500"
                        : "border-gray-200 hover:border-purple-300"
                        }`}
                    >
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleTarget(p.id)}
                          className="accent-purple-600 w-4 h-4 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.category}</p>
                        </div>
                      </label>

                      {/* ✨ CUSTOM PRICE OVERRIDE FOR SEASONAL SALES */}
                      {isSelected && newPromo.type === 'auto' && (
                        <div className="mt-2 pl-6 animate-fade-in border-t border-gray-100 pt-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                            Custom Price Override
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            placeholder="e.g. 5.500"
                            className="w-full p-2 text-sm font-bold border rounded outline-none focus:ring-2 text-purple-700 border-purple-200 focus:ring-purple-400"
                            value={newPromo.customPrices?.[p.id] || ''}
                            onChange={(e) => setNewPromo({
                              ...newPromo,
                              customPrices: { ...(newPromo.customPrices || {}), [p.id]: e.target.value }
                            })}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
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
                        {promo.discountType === 'free_delivery'
                          ? ` • Free Delivery`
                          : (promo.value > 0 ? ` • ${promo.value}${promo.discountType === 'percentage' ? '%' : ' BHD'} OFF` : '')}
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

      {/* MARKETING & BROADCAST TAB */}
      {tab === "marketing" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-6 rounded-xl border border-purple-200 shadow-sm">
            <h3 className="font-bold text-xl text-gray-900 flex items-center gap-2 mb-2">
              <Sparkles className="text-purple-600" /> Push Notifications
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Write an announcement here. To securely send it to all subscribed customers, copy your message and use the Firebase Console.
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Side: Composer */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Notification Title</label>
                  <input
                    id="notif-title"
                    type="text"
                    placeholder="e.g. FLASH SALE! 🌸"
                    className="w-full p-3 mt-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Message Body</label>
                  <textarea
                    id="notif-body"
                    rows="3"
                    placeholder="e.g. 50% off all PDRN sets until midnight tonight. Tap to shop!"
                    className="w-full p-3 mt-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                  <h4 className="font-bold text-purple-900 text-sm mb-2">How to Broadcast:</h4>
                  <ol className="text-xs text-purple-800 space-y-2 list-decimal list-inside font-medium">
                    <li>Log into your <b>Firebase Console</b></li>
                    <li>Go to <b>Engage</b> {'>'} <b>Cloud Messaging</b></li>
                    <li>Click <b>New Campaign</b> {'>'} <b>Notifications</b></li>
                    <li>Copy & paste your Title and Body from above</li>
                    <li>Hit <b>Send</b> to blast it to all subscribers!</li>
                  </ol>
                  <a href="https://console.firebase.google.com/project/shepherdess-shop/notification" target="_blank" rel="noreferrer" className="mt-4 block w-full text-center bg-purple-600 text-white py-2 rounded-lg font-bold shadow-md hover:bg-purple-700 transition-colors">
                    Open Firebase Console
                  </a>
                </div>
              </div>

              {/* Right Side: Live Phone Preview */}
              <div className="flex justify-center items-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-6">
                <div className="w-64 h-[400px] bg-white rounded-[2rem] border-8 border-gray-900 shadow-2xl relative overflow-hidden flex flex-col pt-12 px-4">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-xl"></div>

                  {/* Mock Notification Bubble */}
                  <div className="bg-white/80 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-gray-100 mt-4 animate-bounce-in">
                    <div className="flex items-center gap-2 mb-2">
                      <img src={LOGO_URL} className="w-5 h-5 rounded-md" />
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Shepherdess</span>
                      <span className="text-[9px] text-gray-400 ml-auto">Now</span>
                    </div>
                    <p className="font-bold text-sm text-gray-900" id="preview-title">FLASH SALE! 🌸</p>
                    <p className="text-xs text-gray-600 mt-0.5 leading-tight" id="preview-body">50% off all PDRN sets until midnight tonight. Tap to shop!</p>
                  </div>

                  {/* Add simple JS to link the inputs to the preview */}
                  <img src="https://i.ibb.co/cck7F7yq/shepherdess-logo-small.png" className="absolute bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2 w-16 opacity-10 grayscale" />
                </div>
              </div>
            </div>
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

export default AdminDashboard;
