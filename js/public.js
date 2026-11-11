/**
 * HALAMAN PUBLIK — Beranda, Semua Jasa, Destinasi (dinamis per negara).
 */

let PUBLIC_DATA = null; // cache bootstrap publik di memori (dipakai lintas halaman tanpa fetch ulang)

async function ensurePublicData() {
  if (PUBLIC_DATA) return PUBLIC_DATA;
  const res = await swr('public_bootstrap', 'publicBootstrap', {}, (data) => {
    PUBLIC_DATA = data;
    applyTheme(data.setting);
  }, { fresh: 5 * 60 * 1000 });
  if (res.success) { PUBLIC_DATA = res.data; applyTheme(res.data.setting); }
  return PUBLIC_DATA;
}

function renderStars(rating) {
  const r = Math.round(Number(rating) || 5);
  return '★★★★★☆☆☆☆☆'.slice(5 - r, 10 - r);
}

function produkCardHtml(p, waNomor, waTemplate) {
  const foto = p.foto_url ? `<img src="${esc(p.foto_url)}" alt="${esc(p.nama_produk)}" loading="lazy">` : '';
  return `
    <article class="card produk-card">
      <div class="thumb">${foto}</div>
      <div class="body">
        <span class="kategori">${esc(p.kategori)}</span>
        <h3>${esc(p.nama_produk)}</h3>
        <p class="desc">${esc(p.deskripsi || '')}</p>
        <div class="harga-row">
          <span class="harga">${esc(formatHarga(p))}</span>
        </div>
        <a class="btn btn-primary btn-block" target="_blank" rel="noopener"
           href="${waLink(waNomor, buildWaPesan(waTemplate, p))}">Tanya via WhatsApp</a>
      </div>
    </article>`;
}

function destinasiCardHtml(d) {
  const foto = d.foto_hero_url ? `<img src="${esc(d.foto_hero_url)}" alt="${esc(d.nama_negara)}" loading="lazy">` : '<div class="img-ph" style="background:var(--color-surface-high)"></div>';
  return `
    <a class="destinasi-card" href="#/destinasi/${esc(d.slug)}">
      ${foto}
      <div class="body">
        <span class="badge">${esc(d.nama_negara)}</span>
        <h3>${esc(d.judul_hero || d.nama_negara)}</h3>
        <p>${esc(d.deskripsi_singkat || '')}</p>
        <span class="link">Lihat Destinasi →</span>
      </div>
    </a>`;
}

function testimoniCardHtml(t) {
  return `
    <div class="card testimoni-card">
      <div class="stars">${renderStars(t.rating)}</div>
      <p class="quote">"${esc(t.isi)}"</p>
      <p class="who">${esc(t.nama)}</p>
    </div>`;
}

// ---------------------------------------------------------------- BERANDA
registerPage('public:beranda', {
  template: () => `
    <section class="hero" id="hero-beranda">
      <div class="container hero-content">
        <span class="label-tech hero-eyebrow">Platform Terakreditasi Resmi</span>
        <h1 id="hero-headline">BEYOND HARAMAIN</h1>
        <p id="hero-subheadline">Katalog Terpadu Kebutuhan Ibadah Umroh &amp; Wisata Sejarah Islam Mandiri &amp; Terpercaya.</p>
        <div class="hero-actions">
          <a href="#katalog-jasa" class="btn btn-accent">Lihat Semua Jasa</a>
          <a href="#" id="hero-wa-btn" target="_blank" rel="noopener" class="btn btn-secondary" style="background:transparent;border-color:rgba(255,255,255,.3);color:#fff">Tanya Admin via WhatsApp</a>
        </div>
      </div>
    </section>

    <section class="stat-strip">
      <div class="container grid grid-3" id="stat-strip-grid"></div>
    </section>

    <section class="section container">
      <div class="section-head">
        <div><span class="label-tech">Destinasi Tujuan</span><h2>Jelajahi Layanan di Berbagai Negara</h2></div>
      </div>
      <div class="grid grid-3" id="destinasi-grid"><div class="card skeleton" style="aspect-ratio:4/5"></div><div class="card skeleton" style="aspect-ratio:4/5"></div><div class="card skeleton" style="aspect-ratio:4/5"></div></div>
    </section>

    <section class="section container" id="katalog-jasa">
      <div class="section-head">
        <div><span class="label-tech">Katalog Jasa Unggulan</span><h2>Solusi Ibadah &amp; Logistik Terpadu</h2></div>
        <a href="#/jasa" class="btn btn-secondary">Lihat Semua Jasa →</a>
      </div>
      <div class="grid grid-4" id="produk-grid-beranda"><div class="card skeleton" style="aspect-ratio:3/4"></div><div class="card skeleton" style="aspect-ratio:3/4"></div><div class="card skeleton" style="aspect-ratio:3/4"></div><div class="card skeleton" style="aspect-ratio:3/4"></div></div>
    </section>

    <section class="section container">
      <div class="section-head"><div><span class="label-tech">Pengalaman Otentik</span><h2>Dipercaya Ribuan Jamaah &amp; Tour Leader</h2></div></div>
      <div class="grid grid-3" id="testimoni-grid"></div>
    </section>

    <section class="cta-band">
      <div class="container">
        <h2>Konsultasikan Rencana Perjalanan Ibadah Anda Bersama Kami</h2>
        <a href="#" id="cta-wa-btn" target="_blank" rel="noopener" class="btn btn-accent">Hubungi Admin via WhatsApp</a>
        <div class="trust-row">
          <span>✓ Respons Cepat &lt; 5 Menit</span><span>✓ Konsultasi Tanpa Biaya Komitmen</span><span>✓ Legalitas Resmi PPIU</span>
        </div>
      </div>
    </section>`,
  show: async (el) => {
    const data = await ensurePublicData();
    if (!data) return;
    renderBerandaContent(el, data);
  }
});

function renderBerandaContent(el, data) {
  const s = data.setting || {};
  el.querySelector('#hero-headline').textContent = s.teks_headline || 'BEYOND HARAMAIN';
  el.querySelector('#hero-subheadline').textContent = s.teks_subheadline || '';
  const heroWa = waLink(s.wa_nomor, s.wa_template_default);
  el.querySelector('#hero-wa-btn').href = heroWa;
  el.querySelector('#cta-wa-btn').href = heroWa;

  el.querySelector('#stat-strip-grid').innerHTML = (data.statistik || []).map(st => `
    <div class="stat-item"><div class="num">${esc(st.angka)}${esc(st.satuan || '')}</div><div class="label">${esc(st.label)}</div></div>
  `).join('');

  el.querySelector('#destinasi-grid').innerHTML = (data.destinasi || []).map(destinasiCardHtml).join('') || '<p class="text-muted">Belum ada destinasi aktif.</p>';

  el.querySelector('#produk-grid-beranda').innerHTML = (data.produk || []).slice(0, 8)
    .map(p => produkCardHtml(p, s.wa_nomor, s.wa_template_default)).join('') || '<p class="text-muted">Belum ada produk.</p>';

  el.querySelector('#testimoni-grid').innerHTML = (data.testimoni || []).slice(0, 3).map(testimoniCardHtml).join('') || '<p class="text-muted">Belum ada testimoni.</p>';
}

// ---------------------------------------------------------------- SEMUA JASA
registerPage('public:jasa', {
  template: () => `
    <div class="container section">
      <div class="section-head"><div><span class="label-tech">Master Service Inventory</span><h2>Semua Penawaran Jasa</h2></div></div>
      <div class="filter-bar" id="jasa-filter-destinasi"></div>
      <div class="toolbar">
        <input class="input search" id="jasa-search" type="search" placeholder="Cari hotel, visa, muthowwif, tiket, atau paket...">
      </div>
      <div class="grid grid-3" id="jasa-grid"></div>
    </div>`,
  show: async (el) => {
    const data = await ensurePublicData();
    if (!data) return;
    let filterDestinasi = '';
    const render = () => {
      let produk = data.produk || [];
      if (filterDestinasi) produk = produk.filter(p => String(p.destinasi_terkait).toLowerCase() === filterDestinasi);
      const q = el.querySelector('#jasa-search').value.trim().toLowerCase();
      if (q) produk = produk.filter(p => p.nama_produk.toLowerCase().includes(q) || (p.deskripsi || '').toLowerCase().includes(q));
      el.querySelector('#jasa-grid').innerHTML = produk.map(p => produkCardHtml(p, data.setting.wa_nomor, data.setting.wa_template_default)).join('')
        || '<p class="text-muted">Tidak ada jasa yang cocok dengan pencarian.</p>';
    };
    const chips = ['', ...(data.destinasi || []).map(d => d.slug)];
    el.querySelector('#jasa-filter-destinasi').innerHTML = chips.map(slug => {
      const label = slug ? (data.destinasi.find(d => d.slug === slug)?.nama_negara || slug) : 'Semua Negara';
      return `<button class="filter-chip ${slug === filterDestinasi ? 'active' : ''}" data-slug="${esc(slug)}">${esc(label)}</button>`;
    }).join('');
    el.querySelector('#jasa-filter-destinasi').addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-chip'); if (!btn) return;
      filterDestinasi = btn.dataset.slug;
      el.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c === btn));
      render();
    });
    el.querySelector('#jasa-search').addEventListener('input', debounce(render, 250));
    render();
  }
});

// ---------------------------------------------------------------- DESTINASI DETAIL (dinamis per negara)
registerPage('public:destinasi', {
  template: () => `
    <section class="hero destinasi-hero" id="destinasi-hero">
      <div class="container hero-content">
        <div class="breadcrumb"><a href="#/beranda">Beranda</a> / <a href="#/beranda">Destinasi</a> / <span id="dest-breadcrumb-nama"></span></div>
        <h1 id="dest-judul-hero"></h1>
        <p id="dest-subjudul-hero"></p>
      </div>
    </section>
    <div class="container section" id="destinasi-body">
      <div class="section-head"><div><span class="label-tech">Rencana Perjalanan Umroh Rekomendasi</span><h2>Itinerary Perjalanan</h2></div></div>
      <div class="itinerary" id="itinerary-list"></div>

      <div class="section-head" style="margin-top: var(--space-2xl)">
        <div><span class="label-tech" id="dest-jasa-label">Jasa Kami</span><h2 id="dest-jasa-heading">Katalog Jasa Terkait</h2></div>
      </div>
      <div class="grid grid-3" id="dest-produk-grid"></div>

      <div class="section-head" style="margin-top: var(--space-2xl)">
        <div><span class="label-tech">Pengalaman Jamaah</span><h2>Testimoni Khusus</h2></div>
      </div>
      <div class="grid grid-3" id="dest-testimoni-grid"></div>
    </div>`,
  show: async (el, slug) => {
    const base = await ensurePublicData();
    const setting = base?.setting || {};
    el.dataset.currentSlug = slug;
    const res = await api('destinasiDetail', { slug });
    if (!res.success) {
      el.querySelector('#destinasi-body').innerHTML = `<div class="not-found"><h2>${esc(res.message || 'Destinasi tidak ditemukan.')}</h2><a href="#/beranda" class="btn btn-primary">Kembali ke Beranda</a></div>`;
      el.querySelector('#dest-judul-hero').textContent = '';
      return;
    }
    const { destinasi, itinerary, produk, testimoni } = res.data;
    const heroEl = el.querySelector('#destinasi-hero');
    heroEl.style.backgroundImage = destinasi.foto_hero_url ? `url('${destinasi.foto_hero_url}')` : '';
    el.querySelector('#dest-breadcrumb-nama').textContent = destinasi.nama_negara;
    el.querySelector('#dest-judul-hero').textContent = destinasi.judul_hero || destinasi.nama_negara;
    el.querySelector('#dest-subjudul-hero').textContent = destinasi.subjudul_hero || '';
    el.querySelector('#dest-jasa-label').textContent = 'Jasa Kami di ' + destinasi.nama_negara;
    el.querySelector('#dest-jasa-heading').textContent = 'Katalog Jasa ' + destinasi.nama_negara;

    el.querySelector('#itinerary-list').innerHTML = itinerary.map(step => `
      <div class="itinerary-step reveal">
        <div class="num">${esc(step.urutan_step)}</div>
        ${step.foto_url ? `<div class="thumb"><img src="${esc(step.foto_url)}" alt="${esc(step.judul_step)}" loading="lazy"></div>` : ''}
        <h4>${esc(step.judul_step)}</h4>
        <p>${esc(step.deskripsi || '')}</p>
      </div>`).join('') || '<p class="text-muted">Itinerary belum tersedia.</p>';

    el.querySelector('#dest-produk-grid').innerHTML = produk.map(p => produkCardHtml(p, setting.wa_nomor, setting.wa_template_default)).join('')
      || '<p class="text-muted">Belum ada jasa untuk destinasi ini.</p>';

    el.querySelector('#dest-testimoni-grid').innerHTML = testimoni.map(testimoniCardHtml).join('')
      || '<p class="text-muted">Belum ada testimoni khusus destinasi ini.</p>';

    initRevealObserver(el);
  }
});
