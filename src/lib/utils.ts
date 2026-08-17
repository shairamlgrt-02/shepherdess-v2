// @ts-nocheck

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


// --- URL HELPERS ---
const slugify = (str) =>
  (str || "").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

const buildSlugMap = (cats, proms) => {
  const m = {};
  Object.keys(cats||{}).forEach(cat => {
    m[slugify(cat)] = { type: "category", value: cat };
    (cats[cat]||[]).forEach(sub => { m[slugify(sub)] = { type: "subcategory", value: sub }; });
  });
  (proms||[]).forEach(pr => {
    if(pr.title && pr.showInMenu !== false && pr.type === "collection")
      m[slugify(pr.title)] = { type: "promo", value: pr.title };
  });
  return m;
};


export { compressImage, slugify, buildSlugMap };
