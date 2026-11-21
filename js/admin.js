/**
 * PANEL ADMIN — login, dashboard, kelola produk/destinasi/itinerary/statistik/
 * kontak & WA/tema/logo & favicon/foto/testimoni. Satu akun admin (Fathurrahman).
 */

let ADMIN_DATA = null;

async function ensureAdminData(force) {
  if (ADMIN_DATA && !force) return ADMIN_DATA;
  showLoading(true);
  const res = await api('adminBootstrap', {});
  showLoading(false);
  if (!res.success) { showToast(res.message || 'Gagal memuat data admin.', 'error'); return null; }
  ADMIN_DATA = res.data;
  return ADMIN_DATA;
}

function logoutAdmin() {
  AppState.token = ''; AppState.adminEmail = ''; AppState.adminNama = '';
  Store.del('token'); Store.del('adminEmail'); Store.del('adminNama');
  ADMIN_DATA = null;
  location.hash = '#/' + ADMIN_PATH + '/login';
}

// ---------------------------------------------------------------- SHELL (sidebar + topbar), dirender sekali di index.html
function renderAdminShellInfo() {
  const nameEl = document.getElementById('admin-user-name');
  if (nameEl) nameEl.textContent = AppState.adminNama || AppState.adminEmail || 'Admin';
}

// ---------------------------------------------------------------- LOGIN
registerPage('admin:login', {
  auth: 'public',
  template: () => `
    <div class="login-wrap">
      <form class="login-card" id="form-login">
        <div class="logo-mark label-tech">BH</div>
        <h1>Masuk Admin</h1>
        <p class="sub">Portal Operasional Khusus — Beyond Haramain</p>
        <div class="field"><label>Email</label><input class="input" type="email" id="login-email" required autocomplete="username"></div>
        <div class="field"><label>Kata Sandi</label><input class="input" type="password" id="login-password" required autocomplete="current-password"></div>
        <button type="submit" class="btn btn-primary btn-block" id="login-submit">Masuk ke Dashboard</button>
        <p class="sub" style="margin-top:var(--space-lg)"><a href="#/beranda">← Kembali ke Katalog Publik</a></p>
      </form>
    </div>`,
  show: (el) => {
    const form = el.querySelector('#form-login');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = el.querySelector('#login-submit');
      btn.disabled = true; btn.textContent = 'Memverifikasi...';
      const res = await api('adminLogin', { email: el.querySelector('#login-email').value, password: el.querySelector('#login-password').value });
      btn.disabled = false; btn.textContent = 'Masuk ke Dashboard';
      if (!res.success) { showToast(res.message, 'error'); return; }
      AppState.token = res.data.token; AppState.adminEmail = res.data.email; AppState.adminNama = res.data.nama;
      Store.set('token', res.data.token); Store.set('adminEmail', res.data.email); Store.set('adminNama', res.data.nama);
      ADMIN_DATA = res.data.boot;
      renderAdminShellInfo();
      showToast('Berhasil masuk. Selamat datang, ' + res.data.nama + '.');
      location.hash = '#/' + ADMIN_PATH + '/dashboard';
    };
  }
});

// ---------------------------------------------------------------- DASHBOARD
registerPage('admin:dashboard', {
  template: () => `
    <h1>Ringkasan Sistem & Katalog</h1>
    <p class="desc">Pantau performa penawaran jasa, destinasi aktif, dan status sinkronisasi data.</p>
    <div class="grid grid-3" id="dash-cards"></div>`,
  show: async (el) => {
    const data = await ensureAdminData();
    if (!data) return;
    const produkAktif = data.produk.filter(p => p.status_tampil === true || p.status_tampil === 'TRUE').length;
    const destAktif = data.destinasi.filter(d => d.status_tampil === true || d.status_tampil === 'TRUE').length;
    el.querySelector('#dash-cards').innerHTML = `
      <div class="card stat-card"><span class="label-tech">Katalog SKU</span><span class="big">${data.produk.length}</span><span class="meta">${produkAktif} tampil publik</span></div>
      <div class="card stat-card"><span class="label-tech">Destinasi</span><span class="big">${data.destinasi.length}</span><span class="meta">${destAktif} halaman aktif</span></div>
      <div class="card stat-card"><span class="label-tech">Testimoni</span><span class="big">${data.testimoni.length}</span><span class="meta">${data.testimoni.filter(t => t.tampil === true || t.tampil === 'TRUE').length} tampil di web</span></div>`;
  }
});

// ---------------------------------------------------------------- KELOLA PRODUK
registerPage('admin:produk', {
  template: () => `
    <h1>Kelola Katalog Produk</h1>
    <p class="desc">Tambah, ubah, sembunyikan produk, dan kaitkan ke negara tujuan (opsional).</p>
    <div class="toolbar">
      <input class="input search" id="produk-search" placeholder="Cari nama produk...">
      <button class="btn btn-accent" id="btn-tambah-produk">+ Tambah Produk Baru</button>
    </div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Foto</th><th>Nama Produk</th><th>Kategori</th><th>Negara</th><th>Harga</th><th>Status</th><th>Aksi</th></tr></thead>
      <tbody id="produk-tbody"></tbody>
    </table></div>

    <div class="modal-overlay" id="modal-produk">
      <form class="modal" id="form-produk">
        <div class="modal-head"><h3 id="modal-produk-title">Tambah Produk</h3><button type="button" class="icon-btn" onclick="closeModal('modal-produk')">✕</button></div>
        <div class="modal-body">
          <input type="hidden" id="p-id">
          <div class="form-grid">
            <div class="field"><label>Kategori *</label><input class="input" id="p-kategori" required placeholder="mis. Hotel & Akomodasi"></div>
            <div class="field"><label>Negara Terkait (opsional)</label><select class="input" id="p-destinasi"><option value="">Umum / Semua</option></select></div>
            <div class="field full"><label>Nama Produk *</label><input class="input" id="p-nama" required></div>
            <div class="field full"><label>Deskripsi</label><textarea class="input" id="p-deskripsi"></textarea></div>
            <div class="field"><label>Tipe Harga *</label><select class="input" id="p-tipe-harga" required>
              <option value="Mulai dari">Mulai dari</option><option value="Tetap">Tetap</option><option value="Via WhatsApp">Via WhatsApp</option>
            </select></div>
            <div class="field"><label>Mata Uang</label><select class="input" id="p-mata-uang"><option>IDR</option><option>USD</option><option>SAR</option></select></div>
            <div class="field"><label>Harga</label><input class="input" type="number" id="p-harga" min="0"></div>
            <div class="field"><label>Unit Harga</label><select class="input" id="p-unit-harga">
              <option value="">Tanpa unit</option><option value="hari">Per Hari</option><option value="sesi">Per Sesi</option><option value="malam">Per Malam</option><option value="__custom">Custom…</option>
            </select></div>
            <div class="field full" id="p-unit-custom-wrap" style="display:none"><label>Unit Custom</label><input class="input" id="p-unit-custom" placeholder="mis. orang, paket, jam"></div>
            <div class="field full">
              <label>Foto Produk</label>
              <div class="dropzone" id="p-dz-foto"><span>Klik atau tarik foto ke sini untuk mengunggah (PNG/JPG/WebP, maks 8MB)</span><input type="file" id="p-file-foto" accept=".png,.jpg,.jpeg,.webp"></div>
              <img id="p-foto-preview" class="row-thumb" style="display:none;margin-top:var(--space-sm);width:96px;height:96px">
              <input type="hidden" id="p-foto">
            </div>
            <div class="field"><label><input type="checkbox" id="p-status" checked> Tampil di katalog publik</label></div>
          </div>
        </div>
        <div class="modal-foot"><button type="button" class="btn btn-secondary" onclick="closeModal('modal-produk')">Batal</button><button type="submit" class="btn btn-primary">Simpan Produk</button></div>
      </form>
    </div>`,
  show: async (el) => {
    const data = await ensureAdminData();
    if (!data) return;
    const select = el.querySelector('#p-destinasi');
    select.innerHTML = '<option value="">Umum / Semua</option>' + data.destinasi.map(d => `<option value="${esc(d.slug)}">${esc(d.nama_negara)}</option>`).join('');
    const pFoto = setupFotoUploadField(el, { dzId: 'p-dz-foto', fileId: 'p-file-foto', previewId: 'p-foto-preview', hiddenId: 'p-foto' });

    const renderTable = (filterQ) => {
      let rows = ADMIN_DATA.produk.slice().sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
      if (filterQ) rows = rows.filter(r => r.nama_produk.toLowerCase().includes(filterQ.toLowerCase()));
      el.querySelector('#produk-tbody').innerHTML = rows.map(p => `
        <tr>
          <td>${p.foto_url ? `<img class="row-thumb" src="${esc(p.foto_url)}" loading="lazy">` : '<div class="row-thumb" style="background:var(--color-surface-high)"></div>'}</td>
          <td><strong>${esc(p.nama_produk)}</strong></td>
          <td>${esc(p.kategori)}</td>
          <td>${p.destinasi_terkait ? `<span class="badge badge-gold">${esc(p.destinasi_terkait)}</span>` : '<span class="badge">Umum</span>'}</td>
          <td>${esc(formatHarga(p))}</td>
          <td>${(p.status_tampil === true || p.status_tampil === 'TRUE') ? '<span class="badge badge-success">Tampil</span>' : '<span class="badge">Sembunyi</span>'}</td>
          <td class="row-actions">
            <button class="icon-btn" data-edit="${p.id}" title="Edit">✎</button>
            <button class="icon-btn danger" data-del="${p.id}" title="Hapus">🗑</button>
          </td>
        </tr>`).join('') || '<tr><td colspan="7" class="text-muted">Belum ada produk.</td></tr>';
    };
    renderTable('');
    const unitSel = el.querySelector('#p-unit-harga');
    const unitWrap = el.querySelector('#p-unit-custom-wrap');
    const syncUnit = () => { unitWrap.style.display = unitSel.value === '__custom' ? '' : 'none'; };
    unitSel.addEventListener('change', syncUnit);
    el.querySelector('#form-produk').addEventListener('reset', () => setTimeout(syncUnit));
    el.querySelector('#produk-search').addEventListener('input', debounce(e => renderTable(e.target.value), 200));

    el.querySelector('#btn-tambah-produk').onclick = () => {
      el.querySelector('#form-produk').reset();
      el.querySelector('#p-id').value = '';
      el.querySelector('#p-status').checked = true;
      pFoto.setPreview('');
      el.querySelector('#modal-produk-title').textContent = 'Tambah Produk';
      openModal('modal-produk');
    };

    el.querySelector('#produk-tbody').addEventListener('click', (e) => {
      const editId = e.target.closest('[data-edit]')?.dataset.edit;
      const delId = e.target.closest('[data-del]')?.dataset.del;
      if (editId) {
        const p = ADMIN_DATA.produk.find(x => String(x.id) === editId);
        el.querySelector('#p-id').value = p.id;
        el.querySelector('#p-kategori').value = p.kategori;
        el.querySelector('#p-destinasi').value = p.destinasi_terkait || '';
        el.querySelector('#p-nama').value = p.nama_produk;
        el.querySelector('#p-deskripsi').value = p.deskripsi || '';
        el.querySelector('#p-tipe-harga').value = p.tipe_harga;
        el.querySelector('#p-mata-uang').value = p.mata_uang || 'IDR';
        el.querySelector('#p-harga').value = p.harga || '';
        const u = String(p.unit_harga || '');
        if (['', 'hari', 'sesi', 'malam'].includes(u)) { unitSel.value = u; el.querySelector('#p-unit-custom').value = ''; }
        else { unitSel.value = '__custom'; el.querySelector('#p-unit-custom').value = u; }
        syncUnit();
        pFoto.setPreview(p.foto_url || '');
        el.querySelector('#p-status').checked = (p.status_tampil === true || p.status_tampil === 'TRUE');
        el.querySelector('#modal-produk-title').textContent = 'Edit Produk';
        openModal('modal-produk');
      }
      if (delId) {
        if (!confirm('Hapus produk ini? Tindakan tidak bisa dibatalkan.')) return;
        api('produkHapus', { id: delId }).then(res => {
          if (!res.success) return showToast(res.message, 'error');
          showToast('Produk dihapus.');
          ensureAdminData(true).then(() => renderTable(el.querySelector('#produk-search').value));
        });
      }
    });

    el.querySelector('#form-produk').onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        id: el.querySelector('#p-id').value || undefined,
        kategori: el.querySelector('#p-kategori').value,
        destinasi_terkait: el.querySelector('#p-destinasi').value,
        nama_produk: el.querySelector('#p-nama').value,
        deskripsi: el.querySelector('#p-deskripsi').value,
        tipe_harga: el.querySelector('#p-tipe-harga').value,
        mata_uang: el.querySelector('#p-mata-uang').value,
        harga: el.querySelector('#p-harga').value,
        unit_harga: unitSel.value === '__custom' ? el.querySelector('#p-unit-custom').value.trim() : unitSel.value,
        foto_url: el.querySelector('#p-foto').value,
        status_tampil: el.querySelector('#p-status').checked
      };
      showLoading(true);
      const res = await api('produkSimpan', payload);
      showLoading(false);
      if (!res.success) return showToast(res.message, 'error');
      showToast('Produk tersimpan.');
      closeModal('modal-produk');
      await ensureAdminData(true);
      renderTable(el.querySelector('#produk-search').value);
    };
  }
});

// ---------------------------------------------------------------- KELOLA DESTINASI
registerPage('admin:destinasi', {
  template: () => `
    <h1>Kelola Destinasi Negara &amp; Halaman Publik</h1>
    <p class="desc">Tambahkan negara baru untuk membuat halaman publik dinamis otomatis — lengkap dengan identitas visual hero, itinerary, dan filter katalog jasa.</p>
    <div class="toolbar"><div></div><button class="btn btn-accent" id="btn-tambah-destinasi">+ Tambah Destinasi Baru</button></div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Hero</th><th>Negara &amp; Slug</th><th>Produk</th><th>Itinerary</th><th>Status</th><th>Aksi</th></tr></thead>
      <tbody id="destinasi-tbody"></tbody>
    </table></div>

    <div class="modal-overlay" id="modal-destinasi">
      <form class="modal" id="form-destinasi">
        <div class="modal-head"><h3 id="modal-destinasi-title">Tambah Destinasi</h3><button type="button" class="icon-btn" onclick="closeModal('modal-destinasi')">✕</button></div>
        <div class="modal-body">
          <input type="hidden" id="d-id">
          <div class="form-grid">
            <div class="field"><label>Nama Negara *</label><input class="input" id="d-nama" required></div>
            <div class="field"><label>URL Slug *</label><input class="input" id="d-slug" required placeholder="mis. saudi, turki, mesir"></div>
            <div class="field full"><label>Deskripsi Singkat</label><textarea class="input" id="d-deskripsi"></textarea></div>
            <div class="field full">
              <label>Foto Hero</label>
              <div class="dropzone" id="d-dz-foto-hero"><span>Klik atau tarik foto ke sini untuk mengunggah (PNG/JPG/WebP, maks 8MB)</span><input type="file" id="d-file-foto-hero" accept=".png,.jpg,.jpeg,.webp"></div>
              <img id="d-foto-hero-preview" class="row-thumb" style="display:none;margin-top:var(--space-sm);width:96px;height:96px">
              <input type="hidden" id="d-foto-hero">
            </div>
            <div class="field full"><label>Judul Hero (bebas, bukan otomatis nama negara) *</label><input class="input" id="d-judul-hero" required placeholder="mis. Napak Tilas Peradaban Islam Istanbul &amp; Bursa"></div>
            <div class="field full"><label>Subjudul Hero</label><textarea class="input" id="d-subjudul-hero"></textarea></div>
            <div class="field"><label><input type="checkbox" id="d-status" checked> Publikasikan halaman ini</label></div>
          </div>
        </div>
        <div class="modal-foot"><button type="button" class="btn btn-secondary" onclick="closeModal('modal-destinasi')">Batal</button><button type="submit" class="btn btn-primary">Simpan Destinasi</button></div>
      </form>
    </div>`,
  show: async (el) => {
    const data = await ensureAdminData();
    if (!data) return;
    const dFotoHero = setupFotoUploadField(el, { dzId: 'd-dz-foto-hero', fileId: 'd-file-foto-hero', previewId: 'd-foto-hero-preview', hiddenId: 'd-foto-hero' });
    const renderTable = () => {
      el.querySelector('#destinasi-tbody').innerHTML = ADMIN_DATA.destinasi.slice().sort((a, b) => (a.urutan || 0) - (b.urutan || 0)).map(d => {
        const stepCount = ADMIN_DATA.itinerary.filter(s => Number(s.destinasi_id) === Number(d.id)).length;
        const prodCount = ADMIN_DATA.produk.filter(p => String(p.destinasi_terkait).toLowerCase() === d.slug).length;
        return `
        <tr>
          <td>${d.foto_hero_url ? `<img class="row-thumb" src="${esc(d.foto_hero_url)}" loading="lazy">` : '<div class="row-thumb" style="background:var(--color-surface-high)"></div>'}</td>
          <td><strong>${esc(d.nama_negara)}</strong><br><span class="text-muted">/destinasi/${esc(d.slug)}</span></td>
          <td>${prodCount}</td>
          <td>${stepCount ? stepCount + ' langkah' : '<span class="badge">Belum lengkap</span>'}</td>
          <td>${(d.status_tampil === true || d.status_tampil === 'TRUE') ? '<span class="badge badge-success">Tampil</span>' : '<span class="badge">Draf</span>'}</td>
          <td class="row-actions">
            <button class="icon-btn" data-edit="${d.id}" title="Edit">✎</button>
            <button class="icon-btn" data-itinerary="${d.id}" title="Kelola Itinerary">🗺</button>
            <button class="icon-btn danger" data-del="${d.id}" title="Hapus">🗑</button>
          </td>
        </tr>`;
      }).join('') || '<tr><td colspan="6" class="text-muted">Belum ada destinasi.</td></tr>';
    };
    renderTable();

    el.querySelector('#btn-tambah-destinasi').onclick = () => {
      el.querySelector('#form-destinasi').reset();
      el.querySelector('#d-id').value = '';
      el.querySelector('#d-status').checked = true;
      dFotoHero.setPreview('');
      el.querySelector('#modal-destinasi-title').textContent = 'Tambah Destinasi';
      openModal('modal-destinasi');
    };

    el.querySelector('#destinasi-tbody').addEventListener('click', (e) => {
      const editId = e.target.closest('[data-edit]')?.dataset.edit;
      const delId = e.target.closest('[data-del]')?.dataset.del;
      const itId = e.target.closest('[data-itinerary]')?.dataset.itinerary;
      if (editId) {
        const d = ADMIN_DATA.destinasi.find(x => String(x.id) === editId);
        el.querySelector('#d-id').value = d.id;
        el.querySelector('#d-nama').value = d.nama_negara;
        el.querySelector('#d-slug').value = d.slug;
        el.querySelector('#d-deskripsi').value = d.deskripsi_singkat || '';
        dFotoHero.setPreview(d.foto_hero_url || '');
        el.querySelector('#d-judul-hero').value = d.judul_hero || '';
        el.querySelector('#d-subjudul-hero').value = d.subjudul_hero || '';
        el.querySelector('#d-status').checked = (d.status_tampil === true || d.status_tampil === 'TRUE');
        el.querySelector('#modal-destinasi-title').textContent = 'Edit Destinasi';
        openModal('modal-destinasi');
      }
      if (delId) {
        if (!confirm('Hapus destinasi ini beserta seluruh itinerary-nya?')) return;
        api('destinasiHapus', { id: delId }).then(res => {
          if (!res.success) return showToast(res.message, 'error');
          showToast('Destinasi dihapus.');
          ensureAdminData(true).then(renderTable);
        });
      }
      if (itId) openItineraryBuilder(el, itId, renderTable);
    });

    el.querySelector('#form-destinasi').onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        id: el.querySelector('#d-id').value || undefined,
        nama_negara: el.querySelector('#d-nama').value,
        slug: el.querySelector('#d-slug').value,
        deskripsi_singkat: el.querySelector('#d-deskripsi').value,
        foto_hero_url: el.querySelector('#d-foto-hero').value,
        judul_hero: el.querySelector('#d-judul-hero').value,
        subjudul_hero: el.querySelector('#d-subjudul-hero').value,
        status_tampil: el.querySelector('#d-status').checked
      };
      showLoading(true);
      const res = await api('destinasiSimpan', payload);
      showLoading(false);
      if (!res.success) return showToast(res.message, 'error');
      showToast('Destinasi tersimpan.');
      closeModal('modal-destinasi');
      await ensureAdminData(true);
      renderTable();
    };
  }
});

// ---------------------------------------------------------------- ITINERARY BUILDER (drag & drop)
function openItineraryBuilder(el, destId, onSaved) {
  const dest = ADMIN_DATA.destinasi.find(d => String(d.id) === String(destId));
  let steps = ADMIN_DATA.itinerary.filter(s => Number(s.destinasi_id) === Number(destId))
    .sort((a, b) => a.urutan_step - b.urutan_step)
    .map(s => ({ id: s.id, judul_step: s.judul_step, deskripsi: s.deskripsi, foto_url: s.foto_url }));

  let modal = document.getElementById('modal-itinerary');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modal-itinerary';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="modal" style="width:min(820px,100%)">
      <div class="modal-head"><h3>Susun Itinerary — ${esc(dest.nama_negara)}</h3><button type="button" class="icon-btn" id="itb-close">✕</button></div>
      <div class="modal-body">
        <p class="text-muted" style="margin-bottom:var(--space-md)">Seret (drag) ikon ⠿ untuk mengatur urutan animasi timeline di halaman publik.</p>
        <div class="itb-list" id="itb-list"></div>
        <button type="button" class="btn btn-secondary" id="itb-add">+ Tambah Step Itinerary</button>
      </div>
      <div class="modal-foot"><button type="button" class="btn btn-secondary" id="itb-cancel">Batal</button><button type="button" class="btn btn-primary" id="itb-save">Simpan Itinerary</button></div>
    </div>`;
  modal.classList.add('show');

  const listEl = modal.querySelector('#itb-list');
  let dragIdx = null;

  function renderList() {
    listEl.innerHTML = steps.map((s, i) => `
      <div class="itb-item" draggable="true" data-idx="${i}">
        <span class="handle">⠿</span>
        <span class="num-badge">${i + 1}</span>
        <div class="fields">
          <input class="input" data-f="judul_step" placeholder="Judul step (mis. Hari 1: Kedatangan Jeddah)" value="${esc(s.judul_step)}">
          <textarea class="input" data-f="deskripsi" placeholder="Deskripsi" rows="2">${esc(s.deskripsi || '')}</textarea>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            ${s.foto_url ? `<img src="${esc(s.foto_url)}" class="row-thumb" style="width:40px;height:40px">` : ''}
            <button type="button" class="btn btn-secondary" data-upload="${i}" style="min-height:32px;padding:4px 12px;font-size:12px">${s.foto_url ? 'Ganti Foto' : 'Unggah Foto (opsional)'}</button>
            <input type="file" class="itb-file" data-idx="${i}" accept=".png,.jpg,.jpeg,.webp" hidden>
          </div>
        </div>
        <button type="button" class="icon-btn danger" data-remove="${i}">🗑</button>
      </div>`).join('') || '<p class="text-muted">Belum ada step. Tambahkan minimal 1 step.</p>';
  }
  renderList();

  listEl.addEventListener('input', (e) => {
    const item = e.target.closest('.itb-item'); if (!item) return;
    const idx = Number(item.dataset.idx);
    const f = e.target.dataset.f;
    if (f) steps[idx][f] = e.target.value;
  });
  listEl.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-remove]');
    if (rm) { steps.splice(Number(rm.dataset.remove), 1); renderList(); return; }
    const up = e.target.closest('[data-upload]');
    if (up) listEl.querySelector('.itb-file[data-idx="' + up.dataset.upload + '"]').click();
  });
  listEl.addEventListener('change', async (e) => {
    const fileInput = e.target.closest('.itb-file'); if (!fileInput) return;
    const file = fileInput.files[0]; if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return showToast('Format foto harus PNG, JPG, atau WebP.', 'error');
    const idx = Number(fileInput.dataset.idx);
    showLoading(true);
    try {
      steps[idx].foto_url = await resizeImageToDataUrl(file, { maxDim: 900, maxChars: 30000 });
      showToast('Foto step siap.');
    } catch (err) {
      showToast(err.message || 'Gagal memproses foto.', 'error');
    } finally {
      showLoading(false);
      renderList();
    }
  });
  listEl.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.itb-item'); if (!item) return;
    dragIdx = Number(item.dataset.idx);
    item.classList.add('dragging');
  });
  listEl.addEventListener('dragend', (e) => { e.target.closest('.itb-item')?.classList.remove('dragging'); });
  listEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    const over = e.target.closest('.itb-item'); if (!over || dragIdx === null) return;
    const overIdx = Number(over.dataset.idx);
    if (overIdx === dragIdx) return;
    const moved = steps.splice(dragIdx, 1)[0];
    steps.splice(overIdx, 0, moved);
    dragIdx = overIdx;
    renderList();
  });

  modal.querySelector('#itb-add').onclick = () => { steps.push({ judul_step: '', deskripsi: '', foto_url: '' }); renderList(); };
  modal.querySelector('#itb-close').onclick = modal.querySelector('#itb-cancel').onclick = () => modal.classList.remove('show');
  modal.querySelector('#itb-save').onclick = async () => {
    if (!steps.length) return showToast('Minimal 1 step itinerary diperlukan.', 'error');
    if (steps.some(s => !s.judul_step.trim())) return showToast('Setiap step wajib memiliki judul.', 'error');
    showLoading(true);
    const res = await api('itineraryStepsSimpan', { destinasiId: destId, steps });
    showLoading(false);
    if (!res.success) return showToast(res.message, 'error');
    showToast('Itinerary tersimpan.');
    modal.classList.remove('show');
    await ensureAdminData(true);
    onSaved && onSaved();
  };
}

// ---------------------------------------------------------------- STATISTIK LANDING
registerPage('admin:statistik', {
  template: () => `
    <h1>Pengaturan Statistik Landing</h1>
    <p class="desc">Kelola angka capaian yang tampil di beranda (jumlah jamaah, tingkat kepuasan, mitra armada).</p>
    <div id="statistik-list" style="display:flex;flex-direction:column;gap:var(--space-md)"></div>
    <button class="btn btn-secondary" id="stat-add" style="margin-top:var(--space-md)">+ Tambah Metrik</button>
    <div style="margin-top:var(--space-xl)"><button class="btn btn-primary" id="stat-save">Simpan Perubahan Statistik</button></div>`,
  show: async (el) => {
    const data = await ensureAdminData();
    if (!data) return;
    let items = data.statistik.map(s => ({ label: s.label, angka: s.angka, satuan: s.satuan, tampil: s.tampil === true || s.tampil === 'TRUE' }));
    const render = () => {
      el.querySelector('#statistik-list').innerHTML = items.map((it, i) => `
        <div class="card" style="padding:var(--space-md)">
          <div class="form-grid">
            <div class="field"><label>Label</label><input class="input" data-i="${i}" data-f="label" value="${esc(it.label)}"></div>
            <div class="field"><label>Angka</label><input class="input" type="number" data-i="${i}" data-f="angka" value="${esc(it.angka)}"></div>
            <div class="field"><label>Satuan</label><input class="input" data-i="${i}" data-f="satuan" value="${esc(it.satuan)}"></div>
            <div class="field"><label><input type="checkbox" data-i="${i}" data-f="tampil" ${it.tampil ? 'checked' : ''}> Tampil di web</label></div>
          </div>
          <button type="button" class="btn btn-ghost" data-remove="${i}">Hapus metrik ini</button>
        </div>`).join('');
    };
    render();
    el.querySelector('#statistik-list').addEventListener('input', (e) => {
      const i = Number(e.target.dataset.i), f = e.target.dataset.f;
      if (f === undefined) return;
      items[i][f] = f === 'tampil' ? e.target.checked : e.target.value;
    });
    el.querySelector('#statistik-list').addEventListener('click', (e) => {
      const rm = e.target.closest('[data-remove]');
      if (rm) { items.splice(Number(rm.dataset.remove), 1); render(); }
    });
    el.querySelector('#stat-add').onclick = () => { items.push({ label: '', angka: 0, satuan: '', tampil: true }); render(); };
    el.querySelector('#stat-save').onclick = async () => {
      showLoading(true);
      const res = await api('statistikSimpan', { items });
      showLoading(false);
      if (!res.success) return showToast(res.message, 'error');
      showToast('Statistik tersimpan.');
      await ensureAdminData(true);
    };
  }
});

// ---------------------------------------------------------------- KONTAK & TEMPLATE WA + TEMA + LOGO/FAVICON (digabung di "Pengaturan Umum")
registerPage('admin:pengaturan', {
  template: () => `
    <h1>Pengaturan Kontak, Tema &amp; Identitas Brand</h1>
    <p class="desc">Kelola nomor WhatsApp, Instagram, teks beranda, tema warna, logo, dan favicon tab browser.</p>

    <div class="card" style="padding:var(--space-lg);margin-bottom:var(--space-lg)">
      <h3 style="margin-bottom:var(--space-md)">Kontak &amp; Template WhatsApp</h3>
      <div class="form-grid">
        <div class="field"><label>Nomor WhatsApp (format 62xxx)</label><input class="input" id="set-wa-nomor"></div>
        <div class="field"><label>Link Instagram</label><input class="input" id="set-ig"></div>
        <div class="field full"><label>Template Pesan Default</label><textarea class="input" id="set-wa-template"></textarea>
          <span class="help">Variabel: {nama_produk}, {kode_sku}, {harga_estimasi}, {destinasi_negara}</span></div>
      </div>
    </div>

    <div class="card" style="padding:var(--space-lg);margin-bottom:var(--space-lg)">
      <h3 style="margin-bottom:var(--space-xs)">Komunitas WhatsApp (Grup &amp; Saluran)</h3>
      <p class="text-muted" style="margin-bottom:var(--space-md)">Tombol ini tampil di beranda dan footer. Tempel link undangan, atur teks tombol, lalu aktifkan. Klik "Uji" untuk memastikan link benar.</p>
      <div class="form-grid">
        <div class="field full"><label>Link Grup WhatsApp</label>
          <div style="display:flex;gap:var(--space-sm)"><input class="input" id="set-wa-grup" placeholder="https://chat.whatsapp.com/..." style="flex:1"><button type="button" class="btn btn-secondary" data-test="set-wa-grup">Uji</button></div></div>
        <div class="field"><label>Teks Tombol Grup</label><input class="input" id="set-wa-grup-label" placeholder="Gabung Grup WhatsApp"></div>
        <div class="field"><label><input type="checkbox" id="set-wa-grup-aktif" checked> Tampilkan tombol grup</label></div>
        <div class="field full"><label>Link Saluran WhatsApp</label>
          <div style="display:flex;gap:var(--space-sm)"><input class="input" id="set-wa-saluran" placeholder="https://whatsapp.com/channel/..." style="flex:1"><button type="button" class="btn btn-secondary" data-test="set-wa-saluran">Uji</button></div></div>
        <div class="field"><label>Teks Tombol Saluran</label><input class="input" id="set-wa-saluran-label" placeholder="Ikuti Saluran WhatsApp"></div>
        <div class="field"><label><input type="checkbox" id="set-wa-saluran-aktif" checked> Tampilkan tombol saluran</label></div>
      </div>
    </div>

    <div class="card" style="padding:var(--space-lg);margin-bottom:var(--space-lg)">
      <h3 style="margin-bottom:var(--space-md)">Teks Halaman Depan</h3>
      <div class="form-grid">
        <div class="field full"><label>Headline Beranda (H1)</label><input class="input" id="set-headline"></div>
        <div class="field full"><label>Subheadline</label><textarea class="input" id="set-subheadline"></textarea></div>
      </div>
    </div>

    <div class="card" style="padding:var(--space-lg);margin-bottom:var(--space-lg)">
      <h3 style="margin-bottom:var(--space-md)">Foto Latar Hero Beranda</h3>
      <div class="form-grid">
        <div class="field full">
          <label>Foto Latar (disarankan foto lanskap, landscape, maks 8MB)</label>
          <div class="dropzone" id="hero-dz-foto"><span>Klik atau tarik foto ke sini untuk mengunggah</span><input type="file" id="hero-file-foto" accept=".png,.jpg,.jpeg,.webp"></div>
          <img id="hero-foto-preview" class="row-thumb" style="display:none;margin-top:var(--space-sm);width:100%;max-width:360px;height:140px;object-fit:cover">
          <input type="hidden" id="set-hero-bg">
        </div>
      </div>
    </div>

    <div class="card" style="padding:var(--space-lg);margin-bottom:var(--space-lg)">
      <h3 style="margin-bottom:var(--space-md)">Logo &amp; Favicon</h3>
      <div class="form-grid">
        <div class="field">
          <label>Logo Website (PNG/SVG/JPG, maks 2MB)</label>
          <div class="dropzone" id="dz-logo"><span>Klik atau tarik berkas logo ke sini</span><input type="file" id="file-logo" accept=".png,.svg,.jpg,.jpeg"></div>
          <img id="preview-logo" class="preview-thumb" style="display:none">
        </div>
        <div class="field">
          <label>Favicon Tab Browser (ICO/PNG persegi, 512×512px disarankan)</label>
          <div class="dropzone" id="dz-favicon"><span>Klik atau tarik berkas favicon ke sini</span><input type="file" id="file-favicon" accept=".ico,.png"></div>
          <img id="preview-favicon" class="preview-thumb" style="display:none">
        </div>
      </div>
    </div>

    <div class="card" style="padding:var(--space-lg);margin-bottom:var(--space-lg)">
      <h3 style="margin-bottom:var(--space-md)">Preset Tema &amp; Aksen Warna</h3>
      <div class="grid grid-2" id="theme-swatches"></div>
    </div>

    <button class="btn btn-primary" id="set-save">Simpan Semua Pengaturan</button>`,
  show: async (el) => {
    const data = await ensureAdminData();
    if (!data) return;
    const s = data.setting;
    el.querySelector('#set-wa-nomor').value = s.wa_nomor || '';
    el.querySelector('#set-ig').value = s.instagram_url || '';
    el.querySelector('#set-wa-grup').value = s.wa_grup_url || '';
    el.querySelector('#set-wa-saluran').value = s.wa_saluran_url || '';
    el.querySelector('#set-wa-grup-label').value = s.wa_grup_label || '';
    el.querySelector('#set-wa-saluran-label').value = s.wa_saluran_label || '';
    const isOff = (v) => String(v).toLowerCase() === 'false';
    el.querySelector('#set-wa-grup-aktif').checked = !isOff(s.wa_grup_aktif);
    el.querySelector('#set-wa-saluran-aktif').checked = !isOff(s.wa_saluran_aktif);
    el.querySelectorAll('[data-test]').forEach(btn => btn.onclick = () => {
      const url = el.querySelector('#' + btn.dataset.test).value.trim();
      if (!/^https:\/\//i.test(url)) return showToast('Link harus diawali https://', 'error');
      window.open(url, '_blank', 'noopener');
    });
    el.querySelector('#set-wa-template').value = s.wa_template_default || '';
    el.querySelector('#set-headline').value = s.teks_headline || '';
    el.querySelector('#set-subheadline').value = s.teks_subheadline || '';
    if (s.logo_url) { el.querySelector('#preview-logo').src = s.logo_url; el.querySelector('#preview-logo').style.display = 'block'; }
    if (s.favicon_url) { el.querySelector('#preview-favicon').src = s.favicon_url; el.querySelector('#preview-favicon').style.display = 'block'; }
    const heroFoto = setupFotoUploadField(el, { dzId: 'hero-dz-foto', fileId: 'hero-file-foto', previewId: 'hero-foto-preview', hiddenId: 'set-hero-bg' });
    heroFoto.setPreview(s.hero_bg_url || '');

    const THEMES = [
      { id: 'haramain-sanctuary', nama: 'Haramain Sanctuary (Default)', colors: ['#FAF7F2', '#C9A14A', '#1A1613', '#5A4632'] },
      { id: 'malam-madinah', nama: 'Malam Madinah', colors: ['#12100E', '#C9A14A', '#1A1613', '#F5F1EA'] }
    ];
    el.querySelector('#theme-swatches').innerHTML = THEMES.map(t => `
      <div class="theme-swatch ${t.id === s.tema_aktif ? 'active' : ''}" data-theme="${t.id}">
        <div class="dots">${t.colors.map(c => `<span class="dot" style="background:${c}"></span>`).join('')}</div>
        <strong>${esc(t.nama)}</strong>
      </div>`).join('');
    let temaAktif = s.tema_aktif || 'haramain-sanctuary';
    el.querySelector('#theme-swatches').addEventListener('click', (e) => {
      const sw = e.target.closest('.theme-swatch'); if (!sw) return;
      temaAktif = sw.dataset.theme;
      el.querySelectorAll('.theme-swatch').forEach(x => x.classList.toggle('active', x === sw));
    });

    setupLogoDropzone(el, 'dz-logo', 'file-logo', 'preview-logo', 'logo');
    setupLogoDropzone(el, 'dz-favicon', 'file-favicon', 'preview-favicon', 'favicon');

    el.querySelector('#set-save').onclick = async () => {
      for (const id of ['set-wa-grup', 'set-wa-saluran']) {
        const v = el.querySelector('#' + id).value.trim();
        if (v && !/^https:\/\//i.test(v)) return showToast('Link grup/saluran harus diawali https://', 'error');
      }
      showLoading(true);
      const res = await api('settingSimpan', {
        pairs: {
          wa_grup_label: el.querySelector('#set-wa-grup-label').value.trim(),
          wa_saluran_label: el.querySelector('#set-wa-saluran-label').value.trim(),
          wa_grup_aktif: el.querySelector('#set-wa-grup-aktif').checked,
          wa_saluran_aktif: el.querySelector('#set-wa-saluran-aktif').checked,
          wa_nomor: el.querySelector('#set-wa-nomor').value,
          instagram_url: el.querySelector('#set-ig').value,
          wa_grup_url: el.querySelector('#set-wa-grup').value.trim(),
          wa_saluran_url: el.querySelector('#set-wa-saluran').value.trim(),
          wa_template_default: el.querySelector('#set-wa-template').value,
          teks_headline: el.querySelector('#set-headline').value,
          teks_subheadline: el.querySelector('#set-subheadline').value,
          hero_bg_url: el.querySelector('#set-hero-bg').value,
          tema_aktif: temaAktif
        }
      });
      showLoading(false);
      if (!res.success) return showToast(res.message, 'error');
      showToast('Pengaturan tersimpan.');
      await ensureAdminData(true);
    };
  }
});

/**
 * Dropzone unggah foto lokal generik (dipakai di form Produk, Destinasi, Itinerary).
 * Foto dikompres di browser lalu disimpan sebagai data: URI langsung di sel Spreadsheet
 * (bukan link Google Drive) — jadi gambar selalu tampil, tidak bergantung pada
 * kebijakan hotlink/sharing Drive yang sering berubah dan memblokir akses.
 */
function setupFotoUploadField(el, { dzId, fileId, previewId, hiddenId }) {
  const dz = el.querySelector('#' + dzId);
  const input = el.querySelector('#' + fileId);
  const preview = el.querySelector('#' + previewId);
  const hidden = el.querySelector('#' + hiddenId);

  async function handleFile(file) {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return showToast('Format foto harus PNG, JPG, atau WebP.', 'error');
    showLoading(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      hidden.value = dataUrl;
      preview.src = dataUrl;
      preview.style.display = 'block';
      showToast('Foto siap, klik Simpan untuk menerapkan.');
    } catch (err) {
      showToast(err.message || 'Gagal memproses foto.', 'error');
    } finally {
      showLoading(false);
    }
  }

  if (!dz.dataset.wired) {
    dz.dataset.wired = '1';
    dz.addEventListener('click', () => input.click());
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('dragover'); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
    input.addEventListener('change', () => { if (input.files[0]) handleFile(input.files[0]); });
  }

  return {
    setPreview(url) {
      hidden.value = url || '';
      input.value = '';
      preview.src = url || '';
      preview.style.display = url ? 'block' : 'none';
    }
  };
}

/** Logo/favicon disimpan sebagai data: URI lewat settingSimpan — lihat catatan di setupFotoUploadField. */
function setupLogoDropzone(el, dzId, inputId, previewId, jenis) {
  const dz = el.querySelector('#' + dzId);
  const input = el.querySelector('#' + inputId);
  const preview = el.querySelector('#' + previewId);
  dz.addEventListener('click', () => input.click());
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('dragover'); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
  input.addEventListener('change', () => { if (input.files[0]) handleFile(input.files[0]); });

  async function handleFile(file) {
    const okMime = jenis === 'logo'
      ? /^image\/(png|svg\+xml|jpeg)$/.test(file.type)
      : /^image\/(png|x-icon|vnd\.microsoft\.icon)$/.test(file.type);
    if (!okMime) return showToast(jenis === 'logo' ? 'Logo harus berformat PNG, SVG, atau JPG.' : 'Favicon harus berformat ICO atau PNG persegi.', 'error');
    showLoading(true);
    try {
      const dataUrl = await fileToStorableDataUrl(file, { maxDim: jenis === 'logo' ? 480 : 128 });
      const key = jenis === 'logo' ? 'logo_url' : 'favicon_url';
      const res = await api('settingSimpan', { pairs: { [key]: dataUrl } });
      if (!res.success) { showToast(res.message, 'error'); return; }
      preview.src = dataUrl;
      preview.style.display = 'block';
      showToast((jenis === 'logo' ? 'Logo' : 'Favicon') + ' berhasil diperbarui.');
      await ensureAdminData(true);
    } catch (err) {
      showToast(err.message || 'Gagal memproses berkas.', 'error');
    } finally {
      showLoading(false);
    }
  }
}

// ---------------------------------------------------------------- KELOLA FOTO
registerPage('admin:foto', {
  template: () => `
    <h1>Repositori Foto &amp; Media Aset</h1>
    <p class="desc">Kelola aset visual dokumentasi, armada, testimoni, dan foto hero destinasi.</p>
    <div class="filter-bar" id="foto-kategori-chips">
      ${['produk', 'dokumentasi', 'armada', 'testimoni', 'destinasi'].map((k, i) => `<button class="filter-chip ${i === 0 ? 'active' : ''}" data-k="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}
    </div>
    <div class="dropzone" id="dz-foto" style="margin-bottom:var(--space-lg)"><span>Klik atau tarik foto ke sini untuk mengunggah</span><input type="file" id="file-foto" accept=".png,.jpg,.jpeg,.webp"></div>
    <div class="grid grid-4" id="foto-grid"></div>`,
  show: (el) => {
    let kategori = 'produk';
    const load = async () => {
      el.querySelector('#foto-grid').innerHTML = '<div class="card skeleton" style="aspect-ratio:1"></div>'.repeat(4);
      const res = await api('fotoList', { kategori });
      if (!res.success) return showToast(res.message, 'error');
      el.querySelector('#foto-grid').innerHTML = res.data.map(f => `
        <div class="card" style="overflow:hidden">
          <div style="aspect-ratio:1"><img src="${esc(f.url)}" style="width:100%;height:100%;object-fit:cover" loading="lazy"></div>
          <div style="padding:var(--space-sm);display:flex;justify-content:space-between;align-items:center;gap:var(--space-sm)">
            <span class="text-muted" style="font-size:var(--fs-body-sm);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.namaFile)}</span>
            <button class="icon-btn danger" data-del="${f.fileId}">🗑</button>
          </div>
        </div>`).join('') || '<p class="text-muted">Belum ada foto di kategori ini.</p>';
    };
    el.querySelector('#foto-kategori-chips').addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-chip'); if (!btn) return;
      kategori = btn.dataset.k;
      el.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c === btn));
      load();
    });
    el.querySelector('#foto-grid').addEventListener('click', (e) => {
      const del = e.target.closest('[data-del]'); if (!del) return;
      if (!confirm('Hapus foto ini?')) return;
      api('fotoHapus', { fileId: del.dataset.del }).then(res => { if (!res.success) return showToast(res.message, 'error'); load(); });
    });
    const dz = el.querySelector('#dz-foto'), input = el.querySelector('#file-foto');
    dz.onclick = () => input.click();
    input.onchange = async () => {
      const file = input.files[0]; if (!file) return;
      if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return showToast('Format foto harus PNG, JPG, atau WebP.', 'error');
      showLoading(true);
      try {
        const dataUrl = await resizeImageToDataUrl(file);
        const res = await api('fotoUpload', { kategori, dataUrl, namaFile: file.name });
        if (!res.success) return showToast(res.message, 'error');
        showToast('Foto diunggah.');
        load();
      } catch (err) {
        showToast(err.message || 'Gagal memproses foto.', 'error');
      } finally {
        showLoading(false);
        input.value = '';
      }
    };
    load();
  }
});

// ---------------------------------------------------------------- KELOLA TESTIMONI
registerPage('admin:testimoni', {
  template: () => `
    <h1>Manajemen Testimoni &amp; Ulasan Jamaah</h1>
    <p class="desc">Kelola ulasan jamaah dan hubungkan dengan negara destinasi terkait.</p>
    <div class="toolbar"><div></div><button class="btn btn-accent" id="btn-tambah-testimoni">+ Tambah Testimoni</button></div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Nama</th><th>Rating</th><th>Negara</th><th>Kutipan</th><th>Status</th><th>Aksi</th></tr></thead>
      <tbody id="testimoni-tbody"></tbody>
    </table></div>

    <div class="modal-overlay" id="modal-testimoni">
      <form class="modal" id="form-testimoni">
        <div class="modal-head"><h3 id="modal-testimoni-title">Tambah Testimoni</h3><button type="button" class="icon-btn" onclick="closeModal('modal-testimoni')">✕</button></div>
        <div class="modal-body">
          <input type="hidden" id="t-id">
          <div class="form-grid">
            <div class="field"><label>Nama Jamaah *</label><input class="input" id="t-nama" required></div>
            <div class="field"><label>Negara Terkait</label><select class="input" id="t-negara"><option value="">Umum</option></select></div>
            <div class="field"><label>Rating</label><select class="input" id="t-rating"><option>5</option><option>4</option><option>3</option></select></div>
            <div class="field"><label><input type="checkbox" id="t-tampil" checked> Tampil publik</label></div>
            <div class="field full"><label>Isi Testimoni *</label><textarea class="input" id="t-isi" required></textarea></div>
          </div>
        </div>
        <div class="modal-foot"><button type="button" class="btn btn-secondary" onclick="closeModal('modal-testimoni')">Batal</button><button type="submit" class="btn btn-primary">Simpan Testimoni</button></div>
      </form>
    </div>`,
  show: async (el) => {
    const data = await ensureAdminData();
    if (!data) return;
    el.querySelector('#t-negara').innerHTML = '<option value="">Umum</option>' + data.destinasi.map(d => `<option value="${esc(d.slug)}">${esc(d.nama_negara)}</option>`).join('');

    const renderTable = () => {
      el.querySelector('#testimoni-tbody').innerHTML = ADMIN_DATA.testimoni.map(t => `
        <tr>
          <td><strong>${esc(t.nama)}</strong></td>
          <td>${renderStars(t.rating)}</td>
          <td>${t.negara_terkait ? esc(t.negara_terkait) : '<span class="badge">Umum</span>'}</td>
          <td style="max-width:280px">${esc(String(t.isi).slice(0, 80))}${String(t.isi).length > 80 ? '…' : ''}</td>
          <td>${(t.tampil === true || t.tampil === 'TRUE') ? '<span class="badge badge-success">Tampil</span>' : '<span class="badge">Sembunyi</span>'}</td>
          <td class="row-actions">
            <button class="icon-btn" data-edit="${t.id}">✎</button>
            <button class="icon-btn danger" data-del="${t.id}">🗑</button>
          </td>
        </tr>`).join('') || '<tr><td colspan="6" class="text-muted">Belum ada testimoni.</td></tr>';
    };
    renderTable();

    el.querySelector('#btn-tambah-testimoni').onclick = () => {
      el.querySelector('#form-testimoni').reset();
      el.querySelector('#t-id').value = '';
      el.querySelector('#modal-testimoni-title').textContent = 'Tambah Testimoni';
      openModal('modal-testimoni');
    };
    el.querySelector('#testimoni-tbody').addEventListener('click', (e) => {
      const editId = e.target.closest('[data-edit]')?.dataset.edit;
      const delId = e.target.closest('[data-del]')?.dataset.del;
      if (editId) {
        const t = ADMIN_DATA.testimoni.find(x => String(x.id) === editId);
        el.querySelector('#t-id').value = t.id;
        el.querySelector('#t-nama').value = t.nama;
        el.querySelector('#t-negara').value = t.negara_terkait || '';
        el.querySelector('#t-rating').value = t.rating || 5;
        el.querySelector('#t-tampil').checked = (t.tampil === true || t.tampil === 'TRUE');
        el.querySelector('#t-isi').value = t.isi;
        el.querySelector('#modal-testimoni-title').textContent = 'Edit Testimoni';
        openModal('modal-testimoni');
      }
      if (delId) {
        if (!confirm('Hapus testimoni ini?')) return;
        api('testimoniHapus', { id: delId }).then(res => { if (!res.success) return showToast(res.message, 'error'); ensureAdminData(true).then(renderTable); });
      }
    });
    el.querySelector('#form-testimoni').onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        id: el.querySelector('#t-id').value || undefined,
        nama: el.querySelector('#t-nama').value,
        negara_terkait: el.querySelector('#t-negara').value,
        rating: el.querySelector('#t-rating').value,
        tampil: el.querySelector('#t-tampil').checked,
        isi: el.querySelector('#t-isi').value
      };
      showLoading(true);
      const res = await api('testimoniSimpan', payload);
      showLoading(false);
      if (!res.success) return showToast(res.message, 'error');
      showToast('Testimoni tersimpan.');
      closeModal('modal-testimoni');
      await ensureAdminData(true);
      renderTable();
    };
  }
});


// ---------------------------------------------------------------- INVOICE
// Spesifikasi: Fitur-Invoice-Beyond-Haramain.md. Angka final selalu dihitung ulang di server;
// perhitungan di sini hanya untuk preview real-time.
const INV_BULK_MAX = 25;
const INV_STATUS = ['Belum Lunas', 'Lunas Sebagian', 'Lunas'];
const rpFmt = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');

function isoToday() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function isoAddDays(iso, days) {
  const [y, m, d] = String(iso).split('-').map(Number);
  const t = new Date(y, (m || 1) - 1, (d || 1) + days);
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
}

/** Picu unduhan file dari base64 hasil API (PDF/ZIP tidak disimpan di Sheets). */
function downloadBase64File(base64, filename, mime) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Catatan otomatis dari kombinasi unik mata uang/kurs (identik dengan buildCatatanOtomatis_ di backend). */
function buildCatatanOtomatisClient(items) {
  const seen = {}, lines = [];
  items.forEach(it => {
    if (!it.mata_uang_asli || it.mata_uang_asli === 'IDR' || !(it.kurs > 0)) return;
    const k = it.mata_uang_asli + '|' + it.kurs;
    if (seen[k]) return;
    seen[k] = true;
    lines.push('1 ' + it.mata_uang_asli + ' = ' + rpFmt(it.kurs));
  });
  return lines.length ? 'Kurs yang digunakan:\n' + lines.join('\n') : '';
}

function kursObjToLines(raw) {
  try { return Object.entries(JSON.parse(raw || '{}')).map(([k, v]) => k + '=' + v).join('\n'); } catch (e) { return ''; }
}
function kursLinesToJson(text) {
  const o = {};
  String(text || '').split('\n').forEach(line => {
    const m = /^\s*([A-Za-z]{2,6})\s*[=:]\s*([\d.]+)\s*$/.exec(line);
    if (m && Number(m[2]) > 0) o[m[1].toUpperCase()] = Number(m[2]);
  });
  return JSON.stringify(o);
}

registerPage('admin:invoice', {
  template: () => `
    <h1>Invoice</h1>
    <p class="desc">Buat invoice manual, hitung otomatis ke Rupiah dari mata uang asing, lalu unduh sebagai PDF (satuan atau massal dalam ZIP).</p>
    <div class="toolbar">
      <input class="input search" id="inv-search" placeholder="Cari nomor / pelanggan...">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-secondary" id="btn-inv-setting">⚙ Pengaturan Invoice</button>
        <button class="btn btn-secondary" id="btn-inv-bulk" disabled>Generate Terpilih (Bulk)</button>
        <button class="btn btn-accent" id="btn-inv-baru">+ Invoice Baru</button>
      </div>
    </div>
    <div class="filter-bar" style="align-items:center">
      <select class="input" id="inv-f-status" style="width:auto;min-height:40px"><option value="">Semua status</option>${INV_STATUS.map(s => `<option>${s}</option>`).join('')}</select>
      <label class="text-muted" style="font-size:13px">Dari <input class="input" type="date" id="inv-f-dari" style="width:auto;min-height:40px;display:inline-block"></label>
      <label class="text-muted" style="font-size:13px">Sampai <input class="input" type="date" id="inv-f-sampai" style="width:auto;min-height:40px;display:inline-block"></label>
    </div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th style="width:36px"><input type="checkbox" id="inv-check-all" aria-label="Pilih semua"></th><th>Nomor</th><th>Tanggal</th><th>Pelanggan</th><th>Total</th><th>Sisa</th><th>Status</th><th>Aksi</th></tr></thead>
      <tbody id="inv-tbody"></tbody>
    </table></div>

    <!-- Form invoice -->
    <div class="modal-overlay" id="modal-invoice">
      <form class="modal" id="form-invoice" style="width:min(1040px,100%)">
        <div class="modal-head"><h3 id="modal-invoice-title">Invoice Baru</h3><button type="button" class="icon-btn" onclick="closeModal('modal-invoice')">✕</button></div>
        <div class="modal-body">
          <input type="hidden" id="i-id">
          <div class="form-grid">
            <div class="field"><label>Nama Pelanggan *</label><input class="input" id="i-nama" required></div>
            <div class="field"><label>Kontak (telp/email)</label><input class="input" id="i-kontak"></div>
            <div class="field full"><label>Alamat</label><textarea class="input" id="i-alamat" style="min-height:64px"></textarea></div>
            <div class="field"><label>Tanggal</label><input class="input" type="date" id="i-tanggal"></div>
            <div class="field"><label>Jatuh Tempo</label><input class="input" type="date" id="i-jatuh"></div>
          </div>

          <h4 style="margin:8px 0">Item</h4>
          <div class="table-wrap" style="margin-bottom:8px"><table class="data-table" style="min-width:900px">
            <thead><tr><th>Produk / Deskripsi</th><th>Qty</th><th>Mata Uang</th><th>Harga Asli</th><th>Kurs → IDR</th><th style="text-align:right">Harga IDR</th><th style="text-align:right">Jumlah</th><th></th></tr></thead>
            <tbody id="i-items"></tbody>
          </table></div>
          <datalist id="inv-mu-list"></datalist>
          <button type="button" class="btn btn-secondary" id="i-add-item">+ Tambah Baris</button>

          <div class="form-grid" style="margin-top:20px">
            <div>
              <div class="field"><label>Catatan otomatis (dari kurs yang dipakai)</label><pre id="i-catatan-auto" class="text-muted" style="white-space:pre-wrap;font:inherit;margin:0;padding:8px 0">-</pre></div>
              <div class="field"><label>Catatan tambahan</label><textarea class="input" id="i-catatan"></textarea><span class="help">Kosong = memakai catatan footer default dari Pengaturan Invoice.</span></div>
            </div>
            <div>
              <div class="card" style="padding:16px">
                <div style="display:flex;justify-content:space-between"><span>Subtotal</span><strong id="i-subtotal">Rp 0</strong></div>
                <div style="display:flex;justify-content:space-between;margin-top:6px"><span>Total</span><strong id="i-total">Rp 0</strong></div>
                <div class="field" style="margin:12px 0 0"><label>Jumlah dibayar (IDR)</label><input class="input" type="number" min="0" step="any" id="i-dibayar" value="0"></div>
                <div style="display:flex;justify-content:space-between;margin-top:10px"><span>Sisa tagihan</span><strong id="i-sisa">Rp 0</strong></div>
                <div class="field" style="margin:12px 0 0"><label>Status bayar</label><select class="input" id="i-status"><option value="">Otomatis (dari sisa tagihan)</option>${INV_STATUS.map(s => `<option>${s}</option>`).join('')}</select></div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn btn-ghost" id="i-duplikat" style="margin-right:auto" hidden>Duplikat sebagai Invoice Baru</button>
          <button type="button" class="btn btn-secondary" onclick="closeModal('modal-invoice')">Batal</button>
          <button type="submit" class="btn btn-primary">Simpan Invoice</button>
        </div>
      </form>
    </div>

    <!-- Pengaturan invoice -->
    <div class="modal-overlay" id="modal-inv-setting">
      <form class="modal" id="form-inv-setting">
        <div class="modal-head"><h3>Pengaturan Invoice</h3><button type="button" class="icon-btn" onclick="closeModal('modal-inv-setting')">✕</button></div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="field full"><label>Nama Perusahaan Penagih</label><input class="input" id="s-nama"><span class="help">Bisa berbeda dari brand "Beyond Haramain" bila badan usaha penagih berbeda.</span></div>
            <div class="field full"><label>Alamat</label><textarea class="input" id="s-alamat" style="min-height:64px"></textarea></div>
            <div class="field"><label>Telepon</label><input class="input" id="s-telp"></div>
            <div class="field"><label>Email</label><input class="input" id="s-email" type="email"></div>
            <div class="field full">
              <label>Logo Invoice (PNG/JPG/SVG)</label>
              <input type="file" id="s-logo-file" accept=".png,.jpg,.jpeg,.svg">
              <img id="s-logo-preview" class="preview-thumb" style="display:none;margin-left:0">
              <input type="hidden" id="s-logo">
            </div>
            <div class="field"><label>Prefix Nomor</label><input class="input" id="s-prefix" placeholder="INV/"></div>
            <div class="field"><label>Nomor Berikutnya</label><input class="input" type="number" min="1" id="s-counter"><span class="help">Otomatis bertambah. Ubah hanya bila ingin melompat ke nomor tertentu.</span></div>
            <div class="field"><label>Jatuh Tempo Default (hari)</label><input class="input" type="number" min="0" id="s-hari"></div>
            <div class="field full"><label>Kurs Default ke IDR (satu per baris, mis. SAR=4740)</label><textarea class="input" id="s-kurs" style="min-height:72px"></textarea></div>
            <div class="field full"><label>Info Rekening Pembayaran</label><textarea class="input" id="s-rekening" style="min-height:72px" placeholder="Bank, no. rekening, a.n."></textarea></div>
            <div class="field full"><label>Catatan Footer Default</label><textarea class="input" id="s-footer" style="min-height:64px"></textarea></div>
          </div>
        </div>
        <div class="modal-foot"><button type="button" class="btn btn-secondary" onclick="closeModal('modal-inv-setting')">Batal</button><button type="submit" class="btn btn-primary">Simpan Pengaturan</button></div>
      </form>
    </div>`,

  show: async (el) => {
    const $ = (sel) => el.querySelector(sel);

    // ---- state (di-reset tiap pemanggilan show; wiring event hanya sekali)
    el._inv = el._inv || { list: [], defaults: { kurs_default: {}, jatuh_tempo_hari: 30 }, selected: new Set(), jatuhManual: false };
    const S = el._inv;

    const loadList = async () => {
      $('#inv-tbody').innerHTML = '<tr><td colspan="8"><div class="skeleton" style="height:40px"></div></td></tr>';
      const res = await api('invoiceList', {});
      if (!res.success) { $('#inv-tbody').innerHTML = '<tr><td colspan="8" class="text-muted">Gagal memuat invoice.</td></tr>'; return showToast(res.message, 'error'); }
      S.list = res.data.invoices || [];
      S.defaults = res.data.defaults || S.defaults;
      const ids = new Set(S.list.map(i => i.id));
      S.selected.forEach(id => { if (!ids.has(id)) S.selected.delete(id); });
      renderTable();
    };

    const filtered = () => {
      const q = $('#inv-search').value.trim().toLowerCase();
      const st = $('#inv-f-status').value, dari = $('#inv-f-dari').value, sampai = $('#inv-f-sampai').value;
      return S.list.filter(i =>
        (!q || i.pelanggan_nama.toLowerCase().includes(q) || i.nomor_invoice.toLowerCase().includes(q)) &&
        (!st || i.status_bayar === st) && (!dari || i.tanggal >= dari) && (!sampai || i.tanggal <= sampai));
    };

    const statusBadge = (s) => `<span class="badge ${s === 'Lunas' ? 'badge-success' : s === 'Lunas Sebagian' ? 'badge-gold' : ''}">${esc(s)}</span>`;

    const updateBulkBtn = () => {
      const n = S.selected.size, b = $('#btn-inv-bulk');
      b.disabled = n === 0;
      b.textContent = n ? 'Generate Terpilih (' + n + ')' : 'Generate Terpilih (Bulk)';
    };

    const renderTable = () => {
      const rows = filtered();
      $('#inv-tbody').innerHTML = rows.map(i => `
        <tr>
          <td><input type="checkbox" data-sel="${i.id}" ${S.selected.has(i.id) ? 'checked' : ''} aria-label="Pilih ${esc(i.nomor_invoice)}"></td>
          <td><strong>${esc(i.nomor_invoice)}</strong></td>
          <td>${esc(formatTanggal(i.tanggal))}</td>
          <td>${esc(i.pelanggan_nama)}</td>
          <td>${rpFmt(i.total)}</td>
          <td>${rpFmt(i.sisa_tagihan)}</td>
          <td>${statusBadge(i.status_bayar)}</td>
          <td class="row-actions">
            <button type="button" class="icon-btn" data-pdf="${i.id}" title="Generate PDF">⬇</button>
            <button type="button" class="icon-btn" data-edit="${i.id}" title="Edit">✎</button>
            <button type="button" class="icon-btn danger" data-del="${i.id}" title="Hapus">🗑</button>
          </td>
        </tr>`).join('') || '<tr><td colspan="8" class="text-muted">Belum ada invoice.</td></tr>';
      $('#inv-check-all').checked = rows.length > 0 && rows.every(i => S.selected.has(i.id));
      updateBulkBtn();
    };

    // ---- form invoice
    const currencyOptions = () => {
      const set = new Set(['IDR', 'SAR', 'USD']);
      Object.keys(S.defaults.kurs_default || {}).forEach(k => set.add(k));
      $('#inv-mu-list').innerHTML = [...set].map(k => `<option value="${esc(k)}">`).join('');
    };

    const itemRowHtml = (it) => `
      <tr class="inv-row">
        <td style="padding:6px"><input class="input ir-produk" required placeholder="Produk / jasa" value="${esc(it.produk || '')}" style="min-height:40px;padding:0 10px;min-width:200px"><input class="input ir-desk" placeholder="Deskripsi (opsional)" value="${esc(it.deskripsi || '')}" style="min-height:40px;padding:0 10px;margin-top:4px"></td>
        <td style="padding:6px"><input class="input ir-qty" type="number" min="0" step="any" value="${esc(it.kuantitas ?? 1)}" style="min-height:40px;padding:0 8px;width:72px"></td>
        <td style="padding:6px"><input class="input ir-mu" list="inv-mu-list" maxlength="6" value="${esc(it.mata_uang_asli || 'IDR')}" style="min-height:40px;padding:0 8px;width:84px;text-transform:uppercase"></td>
        <td style="padding:6px"><input class="input ir-harga" type="number" min="0" step="any" value="${esc(it.harga_asli ?? '')}" style="min-height:40px;padding:0 8px;width:120px"></td>
        <td style="padding:6px"><input class="input ir-kurs" type="number" min="0" step="any" value="${esc(it.kurs ?? 1)}" style="min-height:40px;padding:0 8px;width:100px"></td>
        <td class="ir-satuan" style="padding:6px;text-align:right;white-space:nowrap"></td>
        <td class="ir-jumlah" style="padding:6px;text-align:right;white-space:nowrap"></td>
        <td style="padding:6px"><button type="button" class="icon-btn danger ir-del" title="Hapus baris">✕</button></td>
      </tr>`;

    const readItems = () => [...el.querySelectorAll('#i-items .inv-row')].map(tr => {
      const mu = (tr.querySelector('.ir-mu').value.trim().toUpperCase()) || 'IDR';
      return {
        produk: tr.querySelector('.ir-produk').value.trim(),
        deskripsi: tr.querySelector('.ir-desk').value.trim(),
        kuantitas: Number(tr.querySelector('.ir-qty').value),
        mata_uang_asli: mu,
        harga_asli: Number(tr.querySelector('.ir-harga').value),
        kurs: mu === 'IDR' ? 1 : Number(tr.querySelector('.ir-kurs').value)
      };
    });

    const recalc = () => {
      let subtotal = 0;
      const items = readItems();
      el.querySelectorAll('#i-items .inv-row').forEach((tr, idx) => {
        const it = items[idx];
        const idr = tr.querySelector('.ir-mu').value.trim().toUpperCase() === 'IDR' || !tr.querySelector('.ir-mu').value.trim();
        const kursEl = tr.querySelector('.ir-kurs');
        kursEl.disabled = idr;
        if (idr) kursEl.value = 1;
        const satuan = Math.round((it.harga_asli || 0) * (it.kurs || 0));
        const jumlah = Math.round(satuan * (it.kuantitas || 0));
        subtotal += jumlah;
        tr.querySelector('.ir-satuan').textContent = rpFmt(satuan);
        tr.querySelector('.ir-jumlah').textContent = rpFmt(jumlah);
      });
      const dibayar = Number($('#i-dibayar').value) || 0;
      $('#i-subtotal').textContent = rpFmt(subtotal);
      $('#i-total').textContent = rpFmt(subtotal);
      $('#i-sisa').textContent = rpFmt(Math.max(0, subtotal - dibayar));
      $('#i-catatan-auto').textContent = buildCatatanOtomatisClient(items) || '-';
    };

    const addItemRow = (it) => { $('#i-items').insertAdjacentHTML('beforeend', itemRowHtml(it || {})); recalc(); };

    const openForm = (inv, prefill) => {
      currencyOptions();
      $('#form-invoice').reset();
      $('#i-id').value = inv ? inv.id : '';
      const src = inv || prefill || {};
      $('#i-nama').value = src.pelanggan_nama || '';
      $('#i-alamat').value = src.pelanggan_alamat || '';
      $('#i-kontak').value = src.pelanggan_kontak || '';
      const tgl = inv ? inv.tanggal : isoToday();
      $('#i-tanggal').value = tgl;
      $('#i-jatuh').value = inv ? inv.tanggal_jatuh_tempo : isoAddDays(tgl, S.defaults.jatuh_tempo_hari);
      S.jatuhManual = !!inv;
      $('#i-catatan').value = inv ? inv.catatan_tambahan : '';
      $('#i-dibayar').value = inv ? inv.jumlah_dibayar : 0;
      $('#i-status').value = '';
      $('#i-items').innerHTML = '';
      (inv && inv.items.length ? inv.items : [{ kuantitas: 1, mata_uang_asli: 'IDR', kurs: 1 }]).forEach(it => addItemRow(it));
      $('#modal-invoice-title').textContent = inv ? 'Edit ' + inv.nomor_invoice : (prefill ? 'Invoice Baru (duplikat pelanggan)' : 'Invoice Baru');
      $('#i-duplikat').hidden = !inv;
      recalc();
      openModal('modal-invoice');
    };

    if (!el.dataset.wired) {
      el.dataset.wired = '1';

      $('#inv-search').addEventListener('input', debounce(renderTable, 200));
      ['#inv-f-status', '#inv-f-dari', '#inv-f-sampai'].forEach(s => $(s).addEventListener('change', renderTable));

      $('#inv-check-all').addEventListener('change', (e) => {
        filtered().forEach(i => e.target.checked ? S.selected.add(i.id) : S.selected.delete(i.id));
        renderTable();
      });

      $('#inv-tbody').addEventListener('click', async (e) => {
        const sel = e.target.closest('[data-sel]');
        if (sel) { const id = Number(sel.dataset.sel); sel.checked ? S.selected.add(id) : S.selected.delete(id); return renderTable(); }

        const editId = e.target.closest('[data-edit]')?.dataset.edit;
        const delId = e.target.closest('[data-del]')?.dataset.del;
        const pdfId = e.target.closest('[data-pdf]')?.dataset.pdf;
        if (editId) return openForm(S.list.find(i => String(i.id) === editId));
        if (delId) {
          const inv = S.list.find(i => String(i.id) === delId);
          if (!confirm('Hapus invoice ' + inv.nomor_invoice + '? Tindakan tidak bisa dibatalkan.')) return;
          showLoading(true);
          const res = await api('invoiceHapus', { id: Number(delId) });
          showLoading(false);
          if (!res.success) return showToast(res.message, 'error');
          showToast(res.message || 'Invoice dihapus.');
          return loadList();
        }
        if (pdfId) {
          showLoading(true);
          const res = await api('invoiceGenerate', { id: Number(pdfId) }, { tries: 1, timeout: 180000 });
          showLoading(false);
          if (!res.success) return showToast(res.message, 'error');
          downloadBase64File(res.data.base64, res.data.filename, 'application/pdf');
          showToast('PDF diunduh: ' + res.data.filename);
          loadList();
        }
      });

      $('#btn-inv-bulk').onclick = async () => {
        const ids = [...S.selected];
        if (ids.length > INV_BULK_MAX) return showToast('Maksimal ' + INV_BULK_MAX + ' invoice per generate, pilih lebih sedikit atau generate bertahap.', 'error');
        if (!ids.length) return;
        showLoading(true);
        const res = await api('invoiceGenerateBulk', { ids }, { tries: 1, timeout: 330000 });
        showLoading(false);
        if (!res.success) return showToast(res.message, 'error');
        downloadBase64File(res.data.base64, res.data.filename, 'application/zip');
        showToast(res.message || 'ZIP diunduh.');
        S.selected.clear();
        loadList();
      };

      $('#btn-inv-baru').onclick = () => openForm(null);

      // form: baris item & kalkulasi live
      $('#i-add-item').onclick = () => addItemRow({ kuantitas: 1, mata_uang_asli: 'IDR', kurs: 1 });
      $('#i-items').addEventListener('click', (e) => {
        if (!e.target.closest('.ir-del')) return;
        if (el.querySelectorAll('#i-items .inv-row').length <= 1) return showToast('Minimal 1 item.', 'error');
        e.target.closest('.inv-row').remove();
        recalc();
      });
      $('#i-items').addEventListener('input', (e) => { if (!e.target.classList.contains('ir-mu')) recalc(); });
      $('#i-items').addEventListener('change', (e) => {
        if (!e.target.classList.contains('ir-mu')) return;
        const tr = e.target.closest('.inv-row');
        const mu = e.target.value.trim().toUpperCase();
        e.target.value = mu;
        const def = (S.defaults.kurs_default || {})[mu];
        tr.querySelector('.ir-kurs').value = mu === 'IDR' || !mu ? 1 : (def || '');
        recalc();
      });
      $('#i-dibayar').addEventListener('input', recalc);
      $('#i-tanggal').addEventListener('change', () => { if (!S.jatuhManual) $('#i-jatuh').value = isoAddDays($('#i-tanggal').value || isoToday(), S.defaults.jatuh_tempo_hari); });
      $('#i-jatuh').addEventListener('change', () => { S.jatuhManual = true; });

      $('#i-duplikat').onclick = () => openForm(null, {
        pelanggan_nama: $('#i-nama').value, pelanggan_alamat: $('#i-alamat').value, pelanggan_kontak: $('#i-kontak').value
      });

      $('#form-invoice').onsubmit = async (e) => {
        e.preventDefault();
        const items = readItems();
        for (let i = 0; i < items.length; i++) {
          if (!(items[i].kuantitas > 0)) return showToast('Item #' + (i + 1) + ': kuantitas harus lebih dari 0.', 'error');
          if (!(items[i].harga_asli >= 0)) return showToast('Item #' + (i + 1) + ': harga belum diisi.', 'error');
          if (!(items[i].kurs > 0)) return showToast('Item #' + (i + 1) + ': kurs ' + items[i].mata_uang_asli + ' belum diisi.', 'error');
        }
        const payload = {
          id: $('#i-id').value ? Number($('#i-id').value) : undefined,
          pelanggan_nama: $('#i-nama').value, pelanggan_alamat: $('#i-alamat').value, pelanggan_kontak: $('#i-kontak').value,
          tanggal: $('#i-tanggal').value, tanggal_jatuh_tempo: $('#i-jatuh').value,
          catatan_tambahan: $('#i-catatan').value,
          jumlah_dibayar: Number($('#i-dibayar').value) || 0,
          status_override: $('#i-status').value || undefined,
          items
        };
        showLoading(true);
        const res = await api('invoiceSimpan', payload);
        showLoading(false);
        if (!res.success) return showToast(res.message, 'error');
        showToast(res.message || 'Invoice tersimpan.');
        closeModal('modal-invoice');
        loadList();
      };

      // ---- pengaturan invoice
      $('#btn-inv-setting').onclick = async () => {
        const data = await ensureAdminData(true);
        if (!data) return;
        const s = data.setting || {};
        $('#s-nama').value = s.invoice_perusahaan_nama || '';
        $('#s-alamat').value = s.invoice_perusahaan_alamat || '';
        $('#s-telp').value = s.invoice_perusahaan_telp || '';
        $('#s-email').value = s.invoice_perusahaan_email || '';
        $('#s-prefix').value = s.invoice_nomor_prefix || 'INV/';
        $('#s-counter').value = s.invoice_nomor_counter || 100;
        $('#s-counter').dataset.orig = String(s.invoice_nomor_counter || 100);
        $('#s-hari').value = s.invoice_default_jatuh_tempo_hari || 30;
        $('#s-kurs').value = kursObjToLines(s.invoice_kurs_default || '{"SAR":4740,"USD":17770}');
        $('#s-rekening').value = s.invoice_rekening_bank || '';
        $('#s-footer').value = s.invoice_catatan_footer_default || '';
        $('#s-logo').value = s.invoice_logo_url || '';
        $('#s-logo-file').value = '';
        $('#s-logo-preview').src = s.invoice_logo_url || '';
        $('#s-logo-preview').style.display = s.invoice_logo_url ? 'block' : 'none';
        openModal('modal-inv-setting');
      };

      $('#s-logo-file').addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        if (!/^image\/(png|svg\+xml|jpeg)$/.test(file.type)) return showToast('Logo harus berformat PNG, SVG, atau JPG.', 'error');
        showLoading(true);
        try {
          const dataUrl = await fileToStorableDataUrl(file, { maxDim: 320 });
          $('#s-logo').value = dataUrl;
          $('#s-logo-preview').src = dataUrl;
          $('#s-logo-preview').style.display = 'block';
        } catch (err) { showToast(err.message || 'Gagal memproses logo.', 'error'); }
        finally { showLoading(false); }
      });

      $('#form-inv-setting').onsubmit = async (e) => {
        e.preventDefault();
        const pairs = {
          invoice_perusahaan_nama: $('#s-nama').value.trim(),
          invoice_perusahaan_alamat: $('#s-alamat').value.trim(),
          invoice_perusahaan_telp: $('#s-telp').value.trim(),
          invoice_perusahaan_email: $('#s-email').value.trim(),
          invoice_logo_url: $('#s-logo').value,
          invoice_nomor_prefix: $('#s-prefix').value.trim() || 'INV/',
          invoice_default_jatuh_tempo_hari: Number($('#s-hari').value) || 30,
          invoice_kurs_default: kursLinesToJson($('#s-kurs').value),
          invoice_rekening_bank: $('#s-rekening').value.trim(),
          invoice_catatan_footer_default: $('#s-footer').value.trim()
        };
        // Counter hanya dikirim bila admin sengaja mengubahnya (hindari menimpa counter yang sudah bertambah)
        if ($('#s-counter').value !== $('#s-counter').dataset.orig) pairs.invoice_nomor_counter = Math.max(1, Math.floor(Number($('#s-counter').value) || 100));
        showLoading(true);
        const res = await api('settingSimpan', { pairs });
        showLoading(false);
        if (!res.success) return showToast(res.message, 'error');
        showToast('Pengaturan invoice tersimpan.');
        closeModal('modal-inv-setting');
        await ensureAdminData(true);
        loadList();
      };
    }

    loadList();
  }
});
