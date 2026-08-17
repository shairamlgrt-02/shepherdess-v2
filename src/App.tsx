// V2 Live
// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  addDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";
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
  ChevronDown,
  Trash2,
  CheckCircle,
  Upload,
  ArrowUpDown,
  Copy,
  Download,
  Instagram,
  Facebook,
  MessageCircle,
  ChevronUp,
  Truck,
} from "lucide-react";
import { Routes, Route, useNavigate, useLocation, Link } from "react-router-dom";
import jsPDF from "jspdf";

import { db, messaging } from "./lib/firebase";
import { THEME, LOGO_URL, INITIAL_CONTENT, INITIAL_CATEGORIES } from "./constants";
import { compressImage, slugify, buildSlugMap } from "./lib/utils";
import Notification from "./components/Notification";
import ExpandableTextGroup from "./components/ExpandableTextGroup";
import ProductImage from "./components/ProductImage";
import QuickViewModal from "./components/QuickViewModal";
import OrderReceiptModal from "./components/OrderReceiptModal";
import WhatsAppModal from "./components/WhatsAppModal";
import AnalyticsSummary from "./components/AnalyticsSummary";
import ImagePreviewModal from "./components/ImagePreviewModal";
import AdminDashboard from "./components/AdminDashboard";

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
    const discountValue = order.discount || 0;

    // ✨ TIGHTENED: Reverted back to your exact base height of 150.
    // It will ONLY add a tiny 5mm if a discount line is actually needed!
    const dynamicHeight = 150 + (itemCount * 10) + (hasNote ? 25 : 0) + (discountValue > 0 ? 5 : 0);

    // 2. SETUP PDF WITH CALCULATED HEIGHT
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, dynamicHeight]
    });

    const centerX = 40;
    let y = 10;

    // --- HELPER: Circular Image ---
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

    // 7. 💰 TOTALS (✨ SMART MATH APPLIED)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    const subtotal = order.subtotal !== undefined
      ? order.subtotal
      : (order.items ? Object.values(order.items).reduce((sum, i) => sum + (i.price * i.qty), 0) : 0);
    const deliveryFee = order.deliveryFee || 0;
    const discount = order.discount || 0;
    const promoCode = order.promoCode || null;
    const total = order.total !== undefined ? order.total : Math.max(0, subtotal + deliveryFee - discount);

    doc.text("Subtotal", 6, y);
    doc.text(`${subtotal.toFixed(3)} BHD`, 74, y, null, "right");
    y += 5;

    doc.text("Delivery", 6, y);
    doc.text(`${deliveryFee.toFixed(3)} BHD`, 74, y, null, "right");

    // 🔥 NEW: Explicit Discount Line safely inserted
    if (discount > 0) {
      y += 5;
      doc.setTextColor(239, 68, 68); // Red color
      doc.text(`Discount ${promoCode ? `(${promoCode})` : ''}`, 6, y);
      doc.text(`- ${discount.toFixed(3)} BHD`, 74, y, null, "right");
      doc.setTextColor(0, 0, 0); // Reset to black
    }

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
  const [quickViewProduct, setQuickViewProduct] = useState(null);
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
  // 🧺 STACKING RULES: at most ONE discount code (percentage OR fixed) + ONE free-delivery code.
  const [appliedDiscount, setAppliedDiscount] = useState(null); // { code, discount, id, type } — % or fixed
  const [appliedDelivery, setAppliedDelivery] = useState(null); // { code, discount, id, type: 'free_delivery' }
  const [promoError, setPromoError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const slugMap = useMemo(() => buildSlugMap(categories, promotions), [categories, promotions]);
  useEffect(() => {
    const p = location.pathname;
    if(!p||p==="/"){setSelectedCategory("All");setViewMode("shop");setQuickViewProduct(null);return;}
    if(p.startsWith("/admin")){setViewMode("dashboard");const t=p.replace("/admin","").replace(/^\//,"");if(t)sessionStorage.setItem("shepherdess_admin_tab",t);return;}
    const pm=p.match(/^\/product\/(.+)$/);
    if(pm){setViewMode("shop");const f=products.find(x=>x.id===pm[1]);if(f){setSelectedCategory("All");setQuickViewProduct(f);}return;}
    const s=p.replace(/^\//,"").replace(/\/$/,"");const m=slugMap[s];
    if(m){setViewMode("shop");setQuickViewProduct(null);if(m.type==="category"||m.type==="subcategory")setSelectedCategory(m.value);else if(m.type==="promo")setSelectedCategory(m.value);}
  },[location.pathname,products,slugMap]);
  const navigateCategory = (cat) => {
    if(cat==="All"){navigate("/");return;}
    const pr=promotions.find(x=>x.title===cat&&x.showInMenu!==false&&x.type==="collection");
    if(pr){navigate(`/${slugify(pr.title)}`);return;}
    navigate(`/${slugify(cat)}`);
  };
  const openQuickView = (product) => {
    setQuickViewProduct(product);
    if(product&&product.id)navigate(`/product/${product.id}`,{replace:true});
  };
  const closeQuickView = () => {
    setQuickViewProduct(null);
    if(selectedCategory&&selectedCategory!=="All")navigate(`/${slugify(selectedCategory)}`,{replace:true});
    else navigate("/",{replace:true});
  };

  // A. Helper: Check if a promo is active based on exact dates & times
  const isPromoActive = (promo) => {
    if (!promo.startDate || !promo.endDate) return true;
    const now = new Date();

    // Combine start date and time
    const startString = promo.startTime ? `${promo.startDate}T${promo.startTime}` : `${promo.startDate}T00:00:00`;
    const start = new Date(startString);

    // Combine end date and time
    const endString = promo.endTime ? `${promo.endDate}T${promo.endTime}` : `${promo.endDate}T23:59:59`;
    const end = new Date(endString);

    return now >= start && now <= end;
  };

  // --- 5-B. Helper: UNIVERSAL PRICE ENGINE ---
  const getProductPrice = (product) => {
    // 1. Find an active standard sale
    const relevantPromo = promotions.find(promo =>
      promo.type === 'auto' && promo.active !== false && isPromoActive(promo) &&
      (promo.scope === 'all' ||
        (promo.scope === 'category' && (promo.targetSelections?.includes(product.category) || promo.targetSelections?.includes(product.subcategory))) ||
        (promo.scope === 'specific' && (promo.targetSelections?.includes(product.id) || promo.productIds?.includes(product.id))))
    );

    if (!relevantPromo) return { final: product.price, original: product.originalPrice, isSale: false };

    // 2. ✨ CUSTOM PRICE OVERRIDE (per-product override set in the Promotions tab)
    const customOverride = relevantPromo.customPrices?.[product.id];
    if (customOverride !== undefined && customOverride !== null && customOverride !== '' && !isNaN(parseFloat(customOverride))) {
      return {
        final: parseFloat(customOverride),
        original: product.price,
        isSale: true,
        label: relevantPromo.title,
        isComingSoon: false
      };
    }

    // 3. Calculate simple discount
    let discountedPrice = product.price;
    if (relevantPromo.discountType === 'percentage') {
      discountedPrice = product.price * (1 - (relevantPromo.value / 100));
    } else if (relevantPromo.discountType === 'fixed') {
      discountedPrice = Math.max(0, product.price - relevantPromo.value);
    }

    return {
      final: discountedPrice,
      original: product.price,
      isSale: true,
      label: relevantPromo.title,
      isComingSoon: false
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
    if (promo.discountType === 'free_delivery') {
      discountAmount = 1.000; // Represents the delivery fee
    } else if (promo.discountType === 'percentage') {
      discountAmount = eligibleTotal * (promo.value / 100);
    } else {
      discountAmount = promo.value; // Fixed amount
    }

    // Ensure we don't discount more than the total (unless it's the delivery fee)
    if (promo.discountType !== 'free_delivery') {
      discountAmount = Math.min(discountAmount, cartTotal);
    }

    return { valid: true, discount: discountAmount, promoId: promo.id, type: promo.discountType };
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
  const showNotification = (msg, type = "success", onAction = null, actionLabel = "") => {
    setNotification({ message: msg, type, onAction, actionLabel });
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
    // ✨ Use the pricing engine to get the most current active price
    const priceInfo = getProductPrice(p);

    setCart((prev) => {
      if ((prev[p.id]?.qty || 0) >= p.stock) {
        showNotification("Max stock reached", "error");
        return prev;
      }
      // We save the 'final' price from our engine into the cart item
      return {
        ...prev,
        [p.id]: {
          ...p,
          price: priceInfo.final,
          qty: (prev[p.id]?.qty || 0) + 1
        }
      };
    });

    showNotification("Added to cart!", "success", () => setIsCartOpen(true), "View Bag");
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

  // --- NEW: Handle Promo Code Application (supports stacking) ---
  const handleApplyCode = () => {
    const code = appliedCodeInput.trim();
    if (!code) return;

    const cartItems = Object.values(cart);
    const cartTotal = cartItems.reduce((sum, item) => sum + (getProductPrice(item).final * item.qty), 0);

    // Use the helper from Step 1
    const result = validateCoupon(code, cartTotal, cartItems);

    if (!result.valid) {
      setPromoError(result.error);
      return;
    }

    if (result.type === 'free_delivery') {
      if (appliedDelivery) {
        setPromoError("You already have a free delivery code applied.");
        return;
      }
      setAppliedDelivery({ code, discount: result.discount, id: result.promoId, type: result.type });
      setPromoError("");
      setAppliedCodeInput("");
      showNotification(
        deliveryMethod === 'delivery'
          ? "Free Delivery code applied! 🚚"
          : "Free Delivery code applied — select Delivery to use it."
      );
    } else {
      if (appliedDiscount) {
        setPromoError("You already have a discount code applied. Remove it to use a different one.");
        return;
      }
      setAppliedDiscount({ code, discount: result.discount, id: result.promoId, type: result.type });
      setPromoError("");
      setAppliedCodeInput("");
      showNotification(`Code applied! Saved ${result.discount.toFixed(3)} BHD`);
    }
  };

  // 🛡️ Re-validate applied codes whenever the cart, delivery method, or
  // promotions change, so the discount shown always matches what is charged.
  useEffect(() => {
    const cartItems = Object.values(cart);
    const cartTotal = cartItems.reduce((sum, item) => sum + (getProductPrice(item).final * item.qty), 0);

    // Re-validate the discount code (percentage / fixed)
    if (appliedDiscount) {
      const r = validateCoupon(appliedDiscount.code, cartTotal, cartItems);
      if (r.valid && r.type !== 'free_delivery') {
        setAppliedDiscount((prev) =>
          prev && prev.discount === r.discount && prev.id === r.promoId
            ? prev
            : { ...prev, discount: r.discount, id: r.promoId, type: r.type }
        );
      } else {
        setAppliedDiscount(null);
        setPromoError("Your discount code is no longer valid and was removed.");
      }
    }

    // Re-validate the free delivery code
    if (appliedDelivery) {
      const r = validateCoupon(appliedDelivery.code, cartTotal, cartItems);
      if (r.valid && r.type === 'free_delivery') {
        setAppliedDelivery((prev) =>
          prev && prev.discount === r.discount && prev.id === r.promoId
            ? prev
            : { ...prev, discount: r.discount, id: r.promoId, type: r.type }
        );
      } else {
        setAppliedDelivery(null);
        setPromoError("Your free delivery code is no longer valid and was removed.");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, deliveryMethod, promotions]);

  // --- ✨ PHASE 4: FINAL SECURE CHECKOUT (ANTI-CHEAT + COGS + PROOF) ---
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

      // Fixed Fee
      const deliveryFee = deliveryMethod === 'delivery' ? 1.000 : 0;

      await runTransaction(db, async (transaction) => {
        const validatedItems = [];
        let totalOrderCOGS = 0;
        let verifiedSubtotal = 0;
        const finalOrderItems = {};

        // --- STEP 1: EXECUTE ALL "READS" & PRICE VERIFICATION ---
        for (const item of cartItems) {
          const productRef = doc(db, "products", item.id);
          const productSnap = await transaction.get(productRef);
          if (!productSnap.exists()) throw `Product ${item.name} no longer exists!`;

          const productData = productSnap.data();
          const currentStock = productData.stock || 0;
          const currentCost = productData.cost || 0;

          // 🛡️ BULLETPROOF SOLD-OUT PROTECTION
          if (currentStock < item.qty) {
            throw `Sorry! Only ${currentStock} left of ${item.name}.`;
          }

          // Verify price straight from the database to prevent cart manipulation
          const verifiedPrice = productData.price;

          totalOrderCOGS += (currentCost * item.qty);
          verifiedSubtotal += (verifiedPrice * item.qty);

          finalOrderItems[item.id] = {
            ...item,
            price: verifiedPrice,
            cost: currentCost
          };

          validatedItems.push({ ref: productRef, newStock: currentStock - item.qty });
        }

        // --- STEP 2: PROMO VERIFICATION (stacking: one discount + one free delivery) ---
        let verifiedDiscount = 0;
        let verifiedDeliveryDiscount = 0;
        const appliedPromos = [appliedDiscount, appliedDelivery].filter(Boolean);
        const promoUpdates = [];

        for (const applied of appliedPromos) {
          const promoRef = doc(db, "promotions", applied.id);
          const promoSnap = await transaction.get(promoRef);

          if (!promoSnap.exists()) {
            throw "A promo code is no longer valid. Please remove it and try again.";
          }

          const pData = promoSnap.data();

          // 🛡️ SERVER-SIDE RE-VALIDATION: code, dates, usage limit, min spend
          const codeMatches = (pData.code || "").toUpperCase() === (applied.code || "").toUpperCase();
          const promoIsActive = isPromoActive(pData);
          const withinUsage = !pData.usageLimit || (pData.usedCount || 0) < pData.usageLimit;
          const meetsMinSpend = !pData.minSpend || verifiedSubtotal >= pData.minSpend;

          // Only the items that fall INSIDE the promo's scope count toward the discount
          let eligibleSubtotal = 0;
          Object.values(finalOrderItems).forEach(item => {
            const inScope =
              pData.scope === 'all' ||
              (pData.scope === 'category' && (
                (pData.targetSelections || []).includes(item.category) ||
                (pData.targetSelections || []).includes(item.subcategory)
              )) ||
              (pData.scope === 'specific' && (
                (pData.targetSelections || []).includes(item.id) ||
                (pData.productIds || []).includes(item.id)
              ));
            if (inScope) eligibleSubtotal += (item.price * item.qty);
          });

          if (!codeMatches || !promoIsActive || !withinUsage || !meetsMinSpend || eligibleSubtotal <= 0) {
            throw "A promo code is no longer valid. Please remove it and try again.";
          }

          if (pData.discountType === 'free_delivery') {
            // 🚚 Free delivery only applies when Delivery is the selected method
            verifiedDeliveryDiscount = deliveryMethod === 'delivery' ? 1.000 : 0;
          } else if (pData.discountType === 'percentage') {
            verifiedDiscount = eligibleSubtotal * (pData.value / 100);
          } else {
            verifiedDiscount = Math.min(Number(pData.value) || 0, eligibleSubtotal);
          }

          promoUpdates.push({ ref: promoRef, usedCount: (pData.usedCount || 0) + 1 });
        }

        const finalTotal = Math.max(0, verifiedSubtotal + deliveryFee - verifiedDiscount - verifiedDeliveryDiscount);

        // --- STEP 3: EXECUTE ALL "WRITES" ---
        validatedItems.forEach(update => {
          transaction.update(update.ref, { stock: update.newStock });
        });

        promoUpdates.forEach(u => {
          transaction.update(u.ref, { usedCount: u.usedCount });
        });

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
          items: finalOrderItems,
          totalCOGS: totalOrderCOGS,
          subtotal: verifiedSubtotal,
          deliveryFee: deliveryFee,
          discount: verifiedDiscount + verifiedDeliveryDiscount,
          promoCode: appliedPromos.map(p => p.code).join(" + ") || null,
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
      setAppliedDiscount(null);
      setAppliedDelivery(null);
      setAppliedCodeInput("");
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

  // --- HELPER: CHECK IF NEW (14 DAYS) ---
  const isNewArrival = (createdAt) => {
    if (!createdAt) return false;
    const today = new Date();
    // Handle both Firebase Timestamp (.seconds) and standard Date objects
    const productDate = new Date(
      createdAt.seconds ? createdAt.seconds * 1000 : createdAt
    );
    const diffTime = Math.abs(today - productDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 14; // ✨ UPDATED: 14 Day (2 Week) Limit
  };

  // --- FILTERED PRODUCTS LOGIC ---
  const filteredProducts = useMemo(() => {
    // 1. Start with the initial filter
    let result = products.filter((p) => {
      if (!p.active && !isAdmin) return false;
      if (hideOutOfStock && p.stock === 0) return false;
      const matchesSearch = (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.subcategory || "").toLowerCase().includes(searchQuery.toLowerCase());

      let matchesCategory = false;
      if (selectedCategory === "All") matchesCategory = true;
      else if (categories[selectedCategory]) matchesCategory = p.category === selectedCategory;
      else if (Object.values(categories).flat().includes(selectedCategory)) matchesCategory = p.subcategory === selectedCategory;
      else {
        const promo = promotions.find((pr) => pr.title === selectedCategory);
        if (promo) {
          if (promo.scope === 'all') matchesCategory = true;
          else if (promo.scope === 'category') matchesCategory = (promo.targetSelections || []).includes(p.category) || (promo.targetSelections || []).includes(p.subcategory);
          else matchesCategory = (promo.targetSelections || promo.productIds || []).includes(p.id);
        }
      }

      // ✨ NEW: Strict "New Arrivals" Filter
      // If they selected "New Arrivals", strictly hide any product that doesn't have the "NEW" tag!
      if (sortOption === "newest" && !isNewArrival(p.createdAt)) {
        return false;
      }

      return matchesCategory && matchesSearch;
    });
    // 🌟 INJECT LIVE SALE PRICES GLOBALLY (SYNCED WITH MASTER HELPER)
    result = result.map(p => {
      const priceState = getProductPrice(p);

      // Only apply the discount to the main grid if the sale is ACTIVELY running right now!
      // If it is "Coming Soon", we intentionally ignore the discount here so they cannot buy it early.
      if (priceState.isSale) {
        return {
          ...p,
          originalPrice: priceState.original, // Save old price so the red "Save %" badge appears
          price: priceState.final             // Apply the live, clickable sale price
        };
      }

      // If no active sale, or if it is currently "Coming Soon", return the normal product
      return p;
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
      <div className="min-h-screen relative flex flex-col items-center justify-center bg-[#FDFBF7] p-4 font-sans overflow-hidden">
        {/* Custom Animation Styles just for the loading screen */}
        <style>{`
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

        {/* Subtle background glow behind everything */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-50 via-[#FDFBF7] to-[#FDFBF7] opacity-60 pointer-events-none"></div>

        {/* Centered Content Container */}
        <div className="relative z-10 flex flex-col items-center text-center">

          {/* Logo with pulsing shadow (Animates in immediately) */}
          <div className="relative mb-8 animate-[fade-in-up_0.8s_ease-out_forwards]">
            <div className="absolute inset-0 bg-purple-200 rounded-full blur-xl animate-pulse opacity-40"></div>
            <img
              src={LOGO_URL}
              alt="Shepherdess"
              className="relative w-28 h-28 md:w-32 md:h-32 rounded-full shadow-2xl object-cover border-4 border-white transition-transform hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.nextSibling.style.display = "flex";
              }}
            />
            <div className="hidden relative w-28 h-28 md:w-32 md:h-32 bg-purple-600 rounded-full items-center justify-center text-white font-serif text-4xl shadow-2xl border-4 border-white">
              S
            </div>
          </div>

          {/* Typography (Animates in with a slight delay) */}
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 tracking-tight mb-3 opacity-0 animate-[fade-in-up_0.8s_ease-out_0.2s_forwards]">
            Welcome to Shepherdess
          </h1>
          <p className="text-xs md:text-sm text-purple-600 font-bold tracking-[0.4em] uppercase mb-12 opacity-0 animate-[fade-in-up_0.8s_ease-out_0.4s_forwards]">
            K-Beauty Store
          </p>

          {/* Elegant Loading Buffer (Animates in last) */}
          <div className="flex flex-col items-center gap-4 opacity-0 animate-[fade-in-up_0.8s_ease-out_0.6s_forwards]">
            <div className="relative flex items-center justify-center w-12 h-12">
              {/* Spinning outer ring */}
              <div className="absolute inset-0 border-2 border-purple-100 border-t-purple-500 rounded-full animate-spin"></div>
              {/* Inner pulsing dot */}
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
            </div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest animate-pulse">Loading Collection...</span>
          </div>
        </div>

        {/* ✨ HIDDEN LOGIN KEY (Moved to absolute bottom center) */}
        <button
          onClick={() => setShowAdminLogin(true)}
          className="absolute bottom-8 text-gray-200 hover:text-purple-300 transition-colors p-3 opacity-50 hover:opacity-100 z-20"
          title="Owner Access"
        >
          <Key size={14} />
        </button>

        {/* Refined Admin Login Modal */}
        {showAdminLogin && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md animate-fade-in">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center transform transition-all animate-bounce-in mx-4">
              <div className="bg-purple-50 w-16 h-16 mx-auto rounded-full flex items-center justify-center text-purple-600 mb-4 border border-purple-100">
                <Lock size={24} />
              </div>
              <h3 className="text-xl font-serif font-bold text-gray-900 mb-6">Owner Access</h3>
              <input
                type="password"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                placeholder="Enter PIN"
                className="w-full text-center text-2xl tracking-[0.5em] font-mono p-4 border border-gray-100 bg-gray-50 rounded-xl mb-6 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAdminLogin(false)}
                  className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={toggleAdmin}
                  className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-purple-600 transition-colors shadow-lg"
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
        <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} onAction={notification.onAction} actionLabel={notification.actionLabel} />
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md shadow-sm border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-20">
          <Link
            to="/"
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
          </Link>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <button
                onClick={() => {
                  const next = viewMode === "shop" ? "dashboard" : "shop";
                  setViewMode(next);
                  navigate(next === "dashboard" ? "/admin" : "/");
                }}
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
      <Routes>
        <Route path="/admin/*" element={isAdmin ? (
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
              <div className="min-h-[60vh] flex items-center justify-center"><div className="text-center"><Lock size={48} className="mx-auto text-gray-300 mb-4"/><p className="text-gray-500">Admin access required.</p><button onClick={()=>setShowAdminLogin(true)} className="mt-4 text-purple-600 font-bold hover:underline">Enter PIN</button></div></div>
            )
          }
        />
        <Route path="/*" element={
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center mb-6 md:mb-8">

            {/* ✨ UPDATED: Larger Dynamic Popping Hero Tag with Sparkles */}
            <div className="relative inline-block mb-2 mt-2">
              <style>{`
                @keyframes pop-in {
                  0% { transform: scale(0.3); opacity: 0; }
                  /* ✨ INCREASED: The tag will now zoom to 140% of its size before settling */
                  70% { transform: scale(1.4); opacity: 1; }
                  100% { transform: scale(1); opacity: 1; }
                }
                @keyframes sparkle-burst {
                  0% { transform: scale(0) rotate(0deg); opacity: 0; }
                  /* ✨ INCREASED: Sparkles will also get 40% bigger */
                  50% { transform: scale(1.4) rotate(45deg); opacity: 1; }
                  100% { transform: scale(0.5) rotate(90deg); opacity: 0; }
                }
                .animate-pop-once {
                  /* Adjusted the cubic-bezier to make the bounce feel even punchier */
                  animation: pop-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
                .animate-sparkle-1 {
                  animation: sparkle-burst 0.9s ease-in-out forwards;
                  animation-delay: 0.15s;
                }
                .animate-sparkle-2 {
                  animation: sparkle-burst 0.9s ease-in-out forwards;
                  animation-delay: 0.3s;
                }
              `}</style>

              {/* The Sparkles (Pushed slightly further out to accommodate the bigger tag) */}
              <div className="absolute -top-4 -left-6 text-red-400 opacity-0 animate-sparkle-1 pointer-events-none z-20">
                <Sparkles size={20} />
              </div>
              <div className="absolute -bottom-3 -right-6 text-red-400 opacity-0 animate-sparkle-2 pointer-events-none z-20">
                <Sparkles size={18} />
              </div>

              {/* The Tag Itself (Increased padding, heavier font weight, bigger text) */}
              <span className="relative z-10 inline-block bg-red-100 text-red-600 px-4 py-1.5 rounded-full text-xs md:text-sm font-black uppercase tracking-widest shadow-md animate-pop-once">
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
                  /* Increased from 10s to 25s for a smooth, readable, elegant scroll */
                  animation: marquee 25s linear infinite; 
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
            <div id="product-grid" className="flex flex-col gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
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
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={()=>navigateCategory("All")} className={`px-4 py-1.5 rounded-full text-[11px] md:text-xs font-bold transition-all border ${selectedCategory==="All"?"bg-purple-600 text-white border-purple-600 shadow-sm":"bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600"}`}>All</button>
                {Object.entries(categories).map(([cat])=>{
                  const hp=products.some(p=>p.category===cat&&(p.active||isAdmin));
                  if(!hp)return null;
                  return <button key={cat} onClick={()=>navigateCategory(cat)} className={`px-4 py-1.5 rounded-full text-[11px] md:text-xs font-bold transition-all border ${selectedCategory===cat?"bg-purple-600 text-white border-purple-600 shadow-sm":"bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600"}`}>{cat}</button>;
                })}
                {promotions.filter(pr=>pr.showInMenu!==false&&pr.type==="collection").map(promo=>(
                  <button key={promo.id} onClick={()=>navigateCategory(promo.title)} className={`px-4 py-1.5 rounded-full text-[11px] md:text-xs font-bold transition-all border ${selectedCategory===promo.title?"bg-red-500 text-white border-red-500 shadow-sm":"bg-white text-red-500 border-red-200 hover:border-red-300 hover:bg-red-50"}`}>{promo.title}</button>
                ))}
              </div>
              {(()=>{
                const ac=selectedCategory!=="All"&&categories[selectedCategory]?selectedCategory:null;
                const subs=ac?(categories[ac]||[]):[];
                const vs=subs.filter(sub=>products.some(p=>p.subcategory===sub&&(p.active||isAdmin)));
                if(ac&&vs.length>0)return <div className="flex flex-wrap justify-center gap-1.5 pt-1 border-t border-gray-100">{vs.map(sub=><button key={sub} onClick={()=>navigateCategory(sub)} className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${selectedCategory===sub?"bg-purple-100 text-purple-600 border-purple-200":"bg-gray-50 text-gray-500 border-gray-100 hover:border-purple-200 hover:text-purple-500"}`}>{sub}</button>)}</div>;
                return null;
              })()}
            </div>

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

                    <ProductImage
                      src={p.image}
                      alt={p.name}
                      stock={p.stock}
                      isNew={isNewArrival(p.createdAt)}
                      discount={
                        p.originalPrice
                          ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                          : 0
                      }
                      activePromos={activePromosForProduct}
                      onClick={() => openQuickView(p)}
                    />

                    <div className="flex-1 flex flex-col items-start text-left w-full">
                      {/* Category & Subcategory Tags */}
                      <div className="flex flex-wrap justify-start gap-1 mb-1 w-full">
                        <span className="text-[9px] md:text-[10px] bg-purple-50 text-purple-600 px-1.5 md:px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          {p.category}
                        </span>
                        {p.subcategory && (
                          <span className="text-[9px] md:text-[10px] bg-gray-100 text-gray-500 px-1.5 md:px-2 py-0.5 rounded-full font-medium">
                            {p.subcategory}
                          </span>
                        )}
                      </div>

                      {/* Integrated Expandable Title, Expiry & Description */}
                      <ExpandableTextGroup name={p.name} expiryDate={p.expiryDate} text={p.description} />

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
                              <span className="text-sm md:text-lg font-black leading-none text-purple-600">
                                {p.price.toFixed(3)} BHD
                              </span>
                              {/* Save % Badge next to price */}
                              {p.originalPrice && p.originalPrice > p.price && (
                                <span className="bg-red-50 text-red-600 border-red-100 text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-tight">
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

                        {/* Bottom Row: NEW ARRIVAL & EXACT STOCK TAGS */}
                        {(isNewArrival(p.createdAt) || (p.stock < 3 && p.stock > 0)) && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {isNewArrival(p.createdAt) && (
                              <span className="text-[9px] md:text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 uppercase tracking-tight">
                                <Sparkles size={10} /> NEW
                              </span>
                            )}
                            {p.stock < 3 && p.stock > 0 && (
                              <span className="text-[9px] md:text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-1 italic tracking-tight">
                                Only {p.stock} left!
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
        }
        />
      </Routes>

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
                            <span className="font-bold text-gray-900">
                              {(getProductPrice(i).final * i.qty).toFixed(3)} BHD
                            </span>
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
                          <p><strong>Seef Area:</strong> Sun-Thu (Message to coordinate time)</p>
                          <p><strong>Manama:</strong> Fridays only</p>
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
                          deliveryMethod === 'meetup' ? "e.g. Seef on Tuesday, or Manama on Friday" : "e.g. Tonight, around 8 PM"}
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
                        <span>{Object.values(cart)
                          .reduce((s, i) => s + (getProductPrice(i).final * i.qty), 0)
                          .toFixed(3)} BHD</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Delivery Fee:</span>
                        <span>{(deliveryMethod === 'delivery' ? 1.000 : 0).toFixed(3)} BHD</span>
                      </div>
                      {appliedDiscount && (
                        <div className="flex justify-between text-xs text-green-600 font-bold">
                          <span>Discount ({appliedDiscount.code}):</span>
                          <span>- {appliedDiscount.discount.toFixed(3)} BHD</span>
                        </div>
                      )}
                      {appliedDelivery && (
                        <div className="flex justify-between text-xs text-blue-600 font-bold">
                          <span>Free Delivery ({appliedDelivery.code}):</span>
                          <span>{deliveryMethod === 'delivery' ? '- 1.000 BHD' : '0.000 BHD (Delivery not selected)'}</span>
                        </div>
                      )}
                    </div>

                    {/* PROMO CODE INPUT (stacking: 1 discount + 1 free delivery) */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={
                          appliedDiscount && appliedDelivery
                            ? "Max codes applied"
                            : appliedDiscount
                              ? "Add a free delivery code?"
                              : "Promo Code?"
                        }
                        className="flex-1 p-2 text-xs border border-purple-200 rounded-lg uppercase placeholder:normal-case focus:outline-none focus:border-purple-500 disabled:bg-gray-100 disabled:text-gray-400"
                        value={appliedCodeInput}
                        onChange={(e) => setAppliedCodeInput(e.target.value.toUpperCase())}
                        disabled={!!appliedDiscount && !!appliedDelivery}
                      />
                      <button
                        onClick={handleApplyCode}
                        disabled={!!appliedDiscount && !!appliedDelivery}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${appliedDiscount && appliedDelivery ? 'bg-green-500 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                      >
                        {appliedDiscount && appliedDelivery ? <Check size={14} /> : "Apply"}
                      </button>
                    </div>
                    {promoError && <p className="text-[10px] text-red-500 font-bold">{promoError}</p>}

                    {/* Applied code chips (removable) */}
                    {(appliedDiscount || appliedDelivery) && (
                      <div className="flex flex-col gap-1.5">
                        {appliedDiscount && (
                          <div className="flex items-center justify-between bg-white/80 border border-green-200 rounded-lg px-2.5 py-1.5">
                            <span className="text-[10px] font-bold text-green-700 uppercase">
                              {appliedDiscount.code} — {appliedDiscount.discount.toFixed(3)} BHD off
                            </span>
                            <button onClick={() => { setAppliedDiscount(null); setPromoError(""); }} className="text-gray-400 hover:text-red-500" title="Remove"><X size={12} /></button>
                          </div>
                        )}
                        {appliedDelivery && (
                          <div className="flex items-center justify-between bg-white/80 border border-blue-200 rounded-lg px-2.5 py-1.5">
                            <span className="text-[10px] font-bold text-blue-700 uppercase">
                              {appliedDelivery.code} — {deliveryMethod === 'delivery' ? 'Free Delivery' : 'Select Delivery to use'}
                            </span>
                            <button onClick={() => { setAppliedDelivery(null); setPromoError(""); }} className="text-gray-400 hover:text-red-500" title="Remove"><X size={12} /></button>
                          </div>
                        )}
                      </div>
                    )}


                    {/* FINAL TOTAL */}
                    <div className="flex justify-between items-end pt-2">
                      <span className="text-purple-700 font-bold text-lg">Total:</span>
                      <span className="font-mono text-2xl font-bold text-gray-900">
                        {(() => {
                          const cartSub = Object.values(cart).reduce((s, i) => s + (getProductPrice(i).final * i.qty), 0);
                          const fee = deliveryMethod === 'delivery' ? 1.000 : 0;
                          const discountDeduct = appliedDiscount ? appliedDiscount.discount : 0;
                          const deliveryDeduct = (appliedDelivery && deliveryMethod === 'delivery') ? 1.000 : 0;
                          return Math.max(0, cartSub + fee - discountDeduct - deliveryDeduct).toFixed(3);
                        })()} BHD
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
                      .reduce((s, i) => s + (getProductPrice(i).final * i.qty), 0).toFixed(3)}{" "}
                    BHD
                  </span>
                </div>
                {checkoutStep === "cart" ? (
                  <button
                    onClick={() => {
                      let hasPriceChanged = false;
                      const updatedCart = { ...cart };

                      // 🛡️ SECURITY CHECK: Compare Cart Price vs. The Pricing Engine's Live Price
                      Object.values(updatedCart).forEach(item => {
                        const livePriceInfo = getProductPrice(item);

                        // Compare prices as strings to avoid tiny decimal math errors
                        if (Number(item.price).toFixed(3) !== Number(livePriceInfo.final).toFixed(3)) {
                          hasPriceChanged = true;
                          updatedCart[item.id].price = livePriceInfo.final; // Update to the new price
                        }
                      });

                      if (hasPriceChanged) {
                        setCart(updatedCart); // Force the UI to show the new, corrected prices
                        showNotification("⚠️ Note: Prices have been updated to reflect current store promotions.", "error");
                        return; // ⛔ STOP! They must see the new price before they can proceed.
                      }

                      // Original sold out check
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

      {/* QUICK VIEW POPUP */}
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          promotions={promotions}
          getProductPrice={getProductPrice}
          onClose={closeQuickView}
          onAddToCart={addToCart}
        />
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

      {/* ✨ FLOATING SCROLL BUTTONS */}
      <div className="fixed bottom-6 right-4 md:right-6 z-[90] flex flex-col gap-2 opacity-50 hover:opacity-100 transition-opacity">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-9 h-9 md:w-10 md:h-10 bg-white/80 backdrop-blur border border-gray-200 text-gray-400 rounded-full flex items-center justify-center shadow-sm hover:text-purple-600 hover:border-purple-200 hover:bg-white transition-all"
          title="Scroll to Top"
        >
          <ChevronUp size={18} />
        </button>
        <button
          onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
          className="w-9 h-9 md:w-10 md:h-10 bg-white/80 backdrop-blur border border-gray-200 text-gray-400 rounded-full flex items-center justify-center shadow-sm hover:text-purple-600 hover:border-purple-200 hover:bg-white transition-all"
          title="Scroll to Bottom"
        >
          <ChevronDown size={18} />
        </button>
      </div>

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