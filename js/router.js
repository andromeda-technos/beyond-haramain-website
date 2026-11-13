/**
 * ROUTER — SPA hash router. Halaman dibuat sekali lalu disembunyikan/ditampilkan (DOM tidak dibuang).
 * Rute: #/, #/jasa, #/destinasi/:slug, #/<ADMIN_PATH>/login, #/<ADMIN_PATH>/:page
 * ADMIN_PATH (lihat js/config.js) sengaja bukan "admin" agar tidak mudah ditebak bot/scanner.
 */
const ADMIN_PATH = window.ADMIN_PATH || 'admin';
const Pages = {};
function registerPage(name, def) { Pages[name] = Object.assign({ auth: 'public' }, def); }

function go(name, param) {
  const h = '#/' + name + (param ? '/' + encodeURIComponent(param) : '');
  if (location.hash === h) route(); else location.hash = h;
}

function currentRoute() {
  const raw = location.hash.replace(/^#\/?/, '');
  const parts = raw.split('/');
  const isAdmin = parts[0] === ADMIN_PATH;
  return { isAdmin, page: isAdmin ? (parts[1] || 'dashboard') : (parts[0] || 'beranda'), param: isAdmin ? parts[2] : parts[1] };
}

function route() {
  const { isAdmin, page, param } = currentRoute();
  const appRoot = document.getElementById('app');
  const shellId = isAdmin ? 'admin-shell' : 'public-shell';

  document.getElementById('public-shell').hidden = isAdmin;
  document.getElementById('admin-shell').hidden = !isAdmin;
  // Sidebar & menu admin cuma tampil setelah login — di layar login, hanya form-nya saja.
  document.querySelector('#admin-shell .admin-shell').classList.toggle('is-login-screen', isAdmin && page === 'login');

  if (isAdmin && page !== 'login' && !AppState.token) {
    location.hash = '#/' + ADMIN_PATH + '/login';
    return;
  }
  if (isAdmin && page === 'login' && AppState.token) {
    location.hash = '#/' + ADMIN_PATH + '/dashboard';
    return;
  }

  const container = document.getElementById(shellId).querySelector('.route-outlet');
  const key = (isAdmin ? 'admin:' : 'public:') + page;
  const def = Pages[key] || Pages[isAdmin ? 'admin:dashboard' : 'public:beranda'];
  if (!def) { container.innerHTML = '<div class="not-found"><h2>Halaman tidak ditemukan</h2></div>'; return; }

  let el = container.querySelector('[data-page="' + key + '"]');
  if (!el) {
    el = document.createElement('section');
    el.className = 'page';
    el.dataset.page = key;
    el.innerHTML = def.template ? def.template() : '';
    container.appendChild(el);
  }
  container.querySelectorAll('.page').forEach(p => { p.hidden = p !== el; });

  if (isAdmin) setActiveNav(page);
  if (typeof closeAdminSidebar === 'function') closeAdminSidebar();
  def.show && def.show(el, param && decodeURIComponent(param));
  window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
}

function setActiveNav(page) {
  document.querySelectorAll('.admin-nav a').forEach(a => a.classList.toggle('active', a.dataset.page === page));
}

window.addEventListener('hashchange', route);
document.addEventListener('DOMContentLoaded', () => { if (!location.hash) location.hash = '#/beranda'; route(); });
