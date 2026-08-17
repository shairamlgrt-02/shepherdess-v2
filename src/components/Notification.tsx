// @ts-nocheck

const Notification = ({ message, type, onClose, onAction, actionLabel }) => {
  if (!message) return null;
  return (
    <div
      className={`fixed top-4 right-4 z-[60] px-6 py-3 rounded-lg shadow-xl animate-bounce-in flex items-center gap-3 ${
        type === "success"
          ? "bg-green-100 text-green-800 border border-green-200"
          : "bg-red-100 text-red-800 border border-red-200"
      }`}
    >
      <span className="text-sm font-medium">{message}</span>
      {actionLabel && (
        <button
          onClick={() => { if (onAction) onAction(); onClose(); }}
          className="underline font-bold text-purple-600 hover:text-purple-800 whitespace-nowrap"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};


export default Notification;
