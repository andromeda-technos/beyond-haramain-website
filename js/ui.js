/**
 * UI HELPERS — toast, loading overlay, modal, format angka/tanggal, escape HTML.
 */

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showToast(message, type) {
  let root = document.getElementById("toast-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "toast-root";
    document.body.appendChild(root);
  }
  const el = document.createElement("div");
  el.className = "toast " + (type || "success");
  el.textContent = message;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

function showLoading(show) {
  let el = document.getElementById("loading-overlay");
  if (!el) {
    el = document.createElement("div");
    el.id = "loading-overlay";
    el.innerHTML =
      '<div class="spinner" role="status" aria-label="Memuat"></div>';
    document.body.appendChild(el);
  }
  el.classList.toggle("show", !!show);
}

function formatHarga(row) {
  if (row.tipe_harga === "Via WhatsApp") return "Hubungi via WhatsApp";
  const nilai = Number(row.harga || 0).toLocaleString("id-ID");
  return (
    (row.tipe_harga === "Mulai dari" ? "Mulai dari " : "") +
    row.mata_uang +
    " " +
    nilai
  );
}

function formatTanggal(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function waLink(nomor, pesan) {
  const n = String(nomor || "").replace(/[^0-9]/g, "");
  return "https://wa.me/" + n + "?text=" + encodeURIComponent(pesan || "");
}

function buildWaPesan(template, produk) {
  return String(
    template ||
      "Assalamualaikum, saya ingin konsultasi mengenai {nama_produk}.",
  )
    .replace(/\{nama_produk\}/g, produk?.nama_produk || "")
    .replace(/\{kode_sku\}/g, produk?.id || "")
    .replace(/\{harga_estimasi\}/g, produk ? formatHarga(produk) : "")
    .replace(/\{destinasi_negara\}/g, produk?.destinasi_terkait || "");
}

/** Scroll-reveal ringan via IntersectionObserver (hormati prefers-reduced-motion lewat CSS). */
function initRevealObserver(root) {
  const els = (root || document).querySelectorAll(".reveal:not(.in-view)");
  if (!els.length) return;
  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("in-view"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add("in-view"), i * 100);
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 },
  );
  els.forEach((el) => io.observe(el));
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Kompres & resize foto jadi data: URI yang disimpan langsung di sel Spreadsheet
 * (bukan link Google Drive) — jadi gambar tampil langsung tanpa fetch eksternal
 * dan tidak kena blokir hotlink Drive. Sel Sheets maksimal ~50.000 karakter,
 * jadi hasil dipaksa di bawah itu dengan menurunkan kualitas/ukuran bertahap.
 */
function resizeImageToDataUrl(file, opt) {
  opt = opt || {};
  const maxDim = opt.maxDim || 1280;
  const maxChars = opt.maxChars || 42000;
  const outputMime = opt.outputMime || "image/jpeg";
  const canCompress = outputMime === "image/jpeg"; // PNG di canvas selalu lossless, tidak punya parameter kualitas
  const minDim = opt.minDim || 160;
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      let quality = 0.82;
      let dataUrl = "";
      for (let i = 0; i < 20; i++) {
        canvas.width = w;
        canvas.height = h;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        dataUrl = canvas.toDataURL(outputMime, canCompress ? quality : undefined);
        if (dataUrl.length <= maxChars) break;
        if (canCompress && quality > 0.35) quality -= 0.08;
        else {
          w = Math.max(minDim, Math.round(w * 0.85));
          h = Math.max(minDim, Math.round(h * 0.85));
        }
      }
      if (dataUrl.length > maxChars) {
        reject(new Error("Berkas terlalu kompleks untuk dikompres di bawah batas ukuran. Coba berkas lain."));
        return;
      }
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objUrl);
      reject(new Error("Gagal membaca berkas foto."));
    };
    img.src = objUrl;
  });
}

/**
 * Seperti resizeImageToDataUrl, tapi untuk logo/favicon: SVG & ICO dilewatkan langsung
 * (sudah kecil & vektor/ikon, tidak perlu—dan tidak bisa—diproses lewat canvas tanpa
 * kehilangan kualitas), sedangkan PNG/JPG dirasterisasi ke PNG agar transparansi terjaga.
 */
function fileToStorableDataUrl(file, opt) {
  opt = opt || {};
  const maxChars = opt.maxChars || 45000;
  if (/^image\/(svg\+xml|x-icon|vnd\.microsoft\.icon)$/.test(file.type)) {
    return fileToBase64(file).then((b64) => {
      const dataUrl = "data:" + file.type + ";base64," + b64;
      if (dataUrl.length > maxChars) {
        throw new Error("Berkas terlalu besar. Gunakan berkas yang lebih kecil.");
      }
      return dataUrl;
    });
  }
  return resizeImageToDataUrl(file, Object.assign({ outputMime: "image/png", maxDim: 512, minDim: 32 }, opt));
}

function openModal(id) {
  document.getElementById(id)?.classList.add("show");
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove("show");
}

function applyTheme(setting) {
  if (!setting) return;
  if (setting.favicon_url) {
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = setting.favicon_url;
  }
  if (setting.teks_headline)
    document.title = setting.teks_headline + " — Umroh & Wisata Islami";
}
