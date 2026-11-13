/**
 * API LAYER — fetch ke GAS REST API, dengan timeout, retry, idempotensi, dan SWR cache.
 * Pola diadaptasi dari skill gas-instant-ux-pro.
 */

// GANTI dengan URL /exec hasil deploy GAS Anda.
const GAS_URL =
  window.GAS_URL ||
  "https://script.google.com/macros/s/AKfycbw4GrGoCfEziuD4UaCP3Z0b-F3lR5wV1JToyJ5Fjs9hZ_nsPyGEV3IUMljDdTfKFpw2-g/exec";

const LS_PREFIX = "bh:v1:";
const READ_ACTIONS =
  /^(publicBootstrap|destinasiDetail|produkList|adminBootstrap|batch|fotoList)$/;

const AppState = {
  token: localStorage.getItem(LS_PREFIX + "token") || "",
  adminEmail: localStorage.getItem(LS_PREFIX + "adminEmail") || "",
  adminNama: localStorage.getItem(LS_PREFIX + "adminNama") || "",
};

const Perf = {
  rows: [],
  add(action, total, server) {
    this.rows.push({
      action,
      total,
      server: server ?? null,
      net: server != null ? total - server : null,
    });
    if (this.rows.length > 100) this.rows.shift();
  },
  table() {
    console.table(this.rows.slice(-30));
  },
};

const Store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(LS_PREFIX + k);
      return v ? JSON.parse(v) : d;
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(LS_PREFIX + k, JSON.stringify(v));
    } catch (e) {
      /* kuota penuh — abaikan, app tetap jalan tanpa cache */
    }
  },
  del(k) {
    try {
      localStorage.removeItem(LS_PREFIX + k);
    } catch (e) {}
  },
};

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h + ":" + s.length;
}

async function apiOnce(action, data, timeoutMs, reqId) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const t0 = performance.now();
  try {
    const res = await fetch(GAS_URL, {
      method: "POST",
      redirect: "follow",
      cache: "no-store",
      signal: ctrl.signal,
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // wajib: hindari CORS preflight
      body: JSON.stringify({
        action,
        token: AppState.token || "",
        reqId,
        data: data || {},
      }),
    });
    const text = await res.text();
    try {
      const j = JSON.parse(text);
      Perf.add(action, Math.round(performance.now() - t0), j.ms);
      return j;
    } catch (e) {
      return {
        success: false,
        network: true,
        retryable: res.status >= 500 || res.status === 429,
        message:
          "Server membalas tidak sesuai format (HTTP " + res.status + ").",
      };
    }
  } catch (err) {
    return {
      success: false,
      network: true,
      retryable: true,
      message:
        err.name === "AbortError"
          ? "Server terlalu lama merespons."
          : "Koneksi terputus. Periksa jaringan Anda.",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function waitOnline(ms) {
  return new Promise((resolve) => {
    if (navigator.onLine !== false) return resolve();
    const t = setTimeout(done, ms);
    function done() {
      clearTimeout(t);
      window.removeEventListener("online", done);
      resolve();
    }
    window.addEventListener("online", done);
  });
}

async function api(action, data, opt) {
  opt = opt || {};
  const isRead = READ_ACTIONS.test(action);
  const reqId = isRead
    ? ""
    : opt.reqId ||
      (crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now() + "-" + Math.random());
  const tries = isRead ? 3 : 2;
  let res;
  for (let i = 0; i < tries; i++) {
    if (i) {
      await new Promise((r) => setTimeout(r, 1200 * i));
      if (navigator.onLine === false) await waitOnline(15000);
    }
    res = await apiOnce(
      action,
      data,
      isRead ? (i ? 40000 : 25000) : 90000,
      reqId,
    );
    if (res.success || !res.retryable) break;
  }
  if (!res.success && res.code === "AUTH") onSessionExpired();
  return res;
}

function onSessionExpired() {
  AppState.token = "";
  AppState.adminEmail = "";
  AppState.adminNama = "";
  Store.del("token");
  Store.del("adminEmail");
  Store.del("adminNama");
  const adminPrefix = "#/" + ADMIN_PATH;
  if (location.hash.startsWith(adminPrefix) && location.hash !== adminPrefix + "/login") {
    showToast("Sesi berakhir, silakan login kembali.", "error");
    location.hash = adminPrefix + "/login";
  }
}

/** Stale-while-revalidate: tampilkan cache dulu, lalu segarkan di latar bila lewat TTL. */
async function swr(key, action, payload, render, opt) {
  opt = opt || {};
  const fresh = opt.fresh ?? 60000;
  const c = Store.get(key, null);
  if (c) render(c.data, true);
  if (c && !opt.force && Date.now() - c.t < fresh)
    return { success: true, data: c.data, cached: true };
  const res = await api(action, payload);
  if (res.success) {
    const h = hashStr(JSON.stringify(res.data));
    Store.set(key, { t: Date.now(), h, data: res.data });
    if (!c || c.h !== h) render(res.data, false);
  } else if (!c && opt.onError) opt.onError(res);
  return res;
}

function warmUpServer() {
  fetch(GAS_URL + "?action=ping", { mode: "no-cors", cache: "no-store" }).catch(
    () => {},
  );
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") warmUpServer();
});
warmUpServer();
