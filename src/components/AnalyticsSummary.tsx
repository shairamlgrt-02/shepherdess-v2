// @ts-nocheck
import { Database, Package, Clock } from "lucide-react";

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


export default AnalyticsSummary;
