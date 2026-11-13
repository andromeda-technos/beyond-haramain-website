/**
 * KONFIGURASI — satu tempat untuk mengatur URL backend.
 *
 * GANTI nilai di bawah dengan URL hasil Deploy → New deployment → Web app di Apps Script,
 * yang diakhiri "/exec". Jangan tempel apa pun selain URL itu (tanpa teks tambahan di
 * belakang/depannya), dan jangan hapus tanda kutipnya.
 *
 * Contoh URL yang benar:
 * https://script.google.com/macros/s/AKfycbxXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/exec
 */
window.GAS_URL =
  "https://script.google.com/macros/s/AKfycbw4GrGoCfEziuD4UaCP3Z0b-F3lR5wV1JToyJ5Fjs9hZ_nsPyGEV3IUMljDdTfKFpw2-g/exec";

/**
 * PATH ADMIN — ganti "admin" (mudah ditebak bot/scanner) jadi slug rahasia.
 * Bukan pengaman utama (password & token tetap kunci sebenarnya), tapi menghindari
 * tebakan otomatis ke /admin, /login, /cms, dst. Ganti kapan saja, lalu beri tahu
 * sesama admin URL barunya: https://situsanda.com/#/<slug-ini>/login
 */
window.ADMIN_PATH = "akses-7f2x9";
