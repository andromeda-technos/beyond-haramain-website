/**
 * UI HELPERS — toast, loading overlay, modal, format angka/tanggal, escape HTML.
 */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function showToast(message, type) {
  let root = document.getElementById('toast-root');
  if (!root) { root = document.createElement('div'); root.id = 'toast-root'; document.body.appendChild(root); }
  const el = document.createElement('div');
  el.className = 'toast ' + (type || 'success');
  el.textContent = message;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3500);
}

function showLoading(show) {
  let el = document.getElementById('loading-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loading-overlay';
    el.innerHTML = '<div class="spinner" role="status" aria-label="Memuat"></div>';
    document.body.appendChild(el);
  }
  el.classList.toggle('show', !!show);
}

function formatHarga(row) {
  if (row.tipe_harga === 'Via WhatsApp') return 'Hubungi via WhatsApp';
  const nilai = Number(row.harga || 0).toLocaleString('id-ID');
  return (row.tipe_harga === 'Mulai dari' ? 'Mulai dari ' : '') + row.mata_uang + ' ' + nilai;
}

function formatTanggal(v) {
  if (!v) return '-';
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function waLink(nomor, pesan) {
  const n = String(nomor || '').replace(/[^0-9]/g, '');
  return 'https://wa.me/' + n + '?text=' + encodeURIComponent(pesan || '');
}

function buildWaPesan(template, produk) {
  return String(template || 'Assalamualaikum, saya ingin konsultasi mengenai {nama_produk}.')
    .replace(/\{nama_produk\}/g, produk?.nama_produk || '')
    .replace(/\{kode_sku\}/g, produk?.id || '')
    .replace(/\{harga_estimasi\}/g, produk ? formatHarga(produk) : '')
    .replace(/\{destinasi_negara\}/g, produk?.destinasi_terkait || '');
}

/** Scroll-reveal ringan via IntersectionObserver (hormati prefers-reduced-motion lewat CSS). */
function initRevealObserver(root) {
  const els = (root || document).querySelectorAll('.reveal:not(.in-view)');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('in-view')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('in-view'), i * 100);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  els.forEach(el => io.observe(el));
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function openModal(id) { document.getElementById(id)?.classList.add('show'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('show'); }

function applyTheme(setting) {
  if (!setting) return;
  if (setting.favicon_url) {
    let link = document.querySelector('link[rel="icon"]');
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = setting.favicon_url;
  }
  if (setting.teks_headline) document.title = setting.teks_headline + ' — Umroh & Wisata Islami';
}
