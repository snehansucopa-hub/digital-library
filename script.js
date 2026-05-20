'use strict';

/* ─────────────────────────────────────────────
   CONFIG — paste your ImgBB key here
   Get one free at https://api.imgbb.com
   (free, no account needed for basic use)
────────────────────────────────────────────── */
const IMGBB_API_KEY = 'YOUR_IMGBB_KEY';

/* ─────────────────────────────────────────────
   LOCAL STORAGE KEYS
────────────────────────────────────────────── */
const LS = {
  BOOKS : 'lib_books',
  CATS  : 'lib_cats',
  THEME : 'lib_theme',
  FAVS  : 'lib_favs',
  SESS  : 'lib_session',
};

/* ─────────────────────────────────────────────
   DATABASE  (localStorage — works everywhere)
────────────────────────────────────────────── */
const DB = {
  getBooks() {
    try { return JSON.parse(localStorage.getItem(LS.BOOKS)) || this._seed(); }
    catch { return this._seed(); }
  },
  saveBooks(b) { localStorage.setItem(LS.BOOKS, JSON.stringify(b)); },
  getBook(id) { return this.getBooks().find(b => b.id === id) || null; },
  addBook(book) {
    const books = this.getBooks();
    book.id = Date.now().toString();
    book.addedDate = new Date().toISOString();
    books.unshift(book);
    this.saveBooks(books);
    return book;
  },
  updateBook(id, data) {
    const books = this.getBooks();
    const i = books.findIndex(b => b.id === id);
    if (i !== -1) { books[i] = { ...books[i], ...data }; this.saveBooks(books); return books[i]; }
    return null;
  },
  deleteBook(id) { this.saveBooks(this.getBooks().filter(b => b.id !== id)); },

  getCategories() {
    try { return JSON.parse(localStorage.getItem(LS.CATS)) || this._defaultCats(); }
    catch { return this._defaultCats(); }
  },
  saveCategories(c) { localStorage.setItem(LS.CATS, JSON.stringify(c)); },

  _defaultCats() {
    const c = ['Fiction','Science','Technology','History','Philosophy','Arts & Design','Mathematics','Literature'];
    this.saveCategories(c);
    return c;
  },
  _seed() {
    const books = [
      { id:'s1', title:'Clean Code', category:'Technology', type:'Reference',
        description:'A handbook of agile software craftsmanship by Robert C. Martin.',
        bookLink:'https://www.oreilly.com/library/view/clean-code-a/9780136083238/',
        coverUrl:'', featured:true, visible:true,
        addedDate: new Date(Date.now()-86400000*3).toISOString() },
      { id:'s2', title:'Meditations — Marcus Aurelius', category:'Philosophy', type:'Classic',
        description:'Personal writings of the Roman Emperor Marcus Aurelius on Stoic philosophy.',
        bookLink:'https://standardebooks.org/ebooks/marcus-aurelius/meditations/george-long',
        coverUrl:'', featured:true, visible:true,
        addedDate: new Date(Date.now()-86400000*7).toISOString() },
      { id:'s3', title:'A Brief History of Time', category:'Science', type:'Non-fiction',
        description:'Stephen Hawking explores the nature of time, black holes, and the universe.',
        bookLink:'https://archive.org/details/a-brief-history-of-time',
        coverUrl:'', featured:false, visible:true,
        addedDate: new Date(Date.now()-86400000*14).toISOString() },
      { id:'s4', title:'The Design of Everyday Things', category:'Arts & Design', type:'Reference',
        description:'Don Norman reveals the principles of intuitive design.',
        bookLink:'https://www.basicbooks.com/titles/don-norman/the-design-of-everyday-things/9780465050659/',
        coverUrl:'', featured:true, visible:true,
        addedDate: new Date(Date.now()-86400000*5).toISOString() },
    ];
    this.saveBooks(books);
    return books;
  }
};

/* ─────────────────────────────────────────────
   IMGBB UPLOAD  — cross-device cover images
────────────────────────────────────────────── */
const ImgStore = {
  async upload(file) {
    if (IMGBB_API_KEY === 'YOUR_IMGBB_KEY') {
      return await this._localFallback(file);
    }
    const form = new FormData();
    form.append('image', file);
    const res  = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method:'POST', body:form });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'ImgBB upload failed');
    return json.data.url;
  },
  _localFallback(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const obj = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(obj);
        const MAX = 400, w0 = img.naturalWidth, h0 = img.naturalHeight;
        let w = w0, h = h0;
        if (w > h) { if (w > MAX) { h = Math.round(h*MAX/w); w = MAX; } }
        else        { if (h > MAX) { w = Math.round(w*MAX/h); h = MAX; } }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = () => { URL.revokeObjectURL(obj); reject(new Error('Image load failed')); };
      img.src = obj;
    });
  }
};

/* ─────────────────────────────────────────────
   AUTH
────────────────────────────────────────────── */
const Auth = {
  CREDS: { username:'admin', password:'admin123' },
  login(u, p) {
    if (u === this.CREDS.username && p === this.CREDS.password) {
      sessionStorage.setItem(LS.SESS, '1'); return true;
    }
    return false;
  },
  isLoggedIn() { return sessionStorage.getItem(LS.SESS) === '1'; },
  logout()     { sessionStorage.removeItem(LS.SESS); },
  requireAuth(){ if (!this.isLoggedIn()) { location.href='admin-login.html'; return false; } return true; }
};

/* ─────────────────────────────────────────────
   THEME
────────────────────────────────────────────── */
const Theme = {
  get()    { return localStorage.getItem(LS.THEME) || 'dark'; },
  set(t)   { localStorage.setItem(LS.THEME,t); document.documentElement.setAttribute('data-theme', t==='light'?'light':''); },
  toggle() { const t = this.get()==='dark'?'light':'dark'; this.set(t); return t; },
  init()   { if (this.get()==='light') document.documentElement.setAttribute('data-theme','light'); }
};

/* ─────────────────────────────────────────────
   TOAST
────────────────────────────────────────────── */
const Toast = {
  show(msg, type='info', dur=3400) {
    let c = document.getElementById('toast-container');
    if (!c) { c = document.createElement('div'); c.id='toast-container'; document.body.appendChild(c); }
    const icons = { success:'✓', error:'✕', info:'ℹ' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ'}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(()=>{ t.classList.add('fade-out'); setTimeout(()=>t.remove(),350); }, dur);
  },
  success(m){ this.show(m,'success'); },
  error(m)  { this.show(m,'error'); },
  info(m)   { this.show(m,'info'); }
};

/* ─────────────────────────────────────────────
   FAVORITES
────────────────────────────────────────────── */
const Favs = {
  get()     { try { return JSON.parse(localStorage.getItem(LS.FAVS))||[]; } catch { return []; } },
  toggle(id){ const f=this.get(),i=f.indexOf(id); i===-1?f.push(id):f.splice(i,1); localStorage.setItem(LS.FAVS,JSON.stringify(f)); return i===-1; },
  has(id)   { return this.get().includes(id); }
};

/* ─────────────────────────────────────────────
   HELPERS
────────────────────────────────────────────── */
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});
}
function trunc(s, n) { return s&&s.length>n ? s.slice(0,n-1)+'…' : (s||''); }
function catGrad(book) {
  const g = {
    'Fiction':'linear-gradient(135deg,#1a1a2e,#0f3460)',
    'Science':'linear-gradient(135deg,#0d1b2a,#0a6e6e)',
    'Technology':'linear-gradient(135deg,#0a0f1e,#003366)',
    'History':'linear-gradient(135deg,#1a0e00,#6b3a00)',
    'Philosophy':'linear-gradient(135deg,#1a0033,#4a0099)',
    'Arts & Design':'linear-gradient(135deg,#1a0a1a,#660066)',
    'Mathematics':'linear-gradient(135deg,#001a1a,#006666)',
    'Literature':'linear-gradient(135deg,#1a0a00,#663300)',
  };
  return g[book.category]||'linear-gradient(135deg,#0d1628,#1a2a4a)';
}
function catIcon(cat) {
  return {'Fiction':'📖','Science':'🔬','Technology':'💻','History':'🏛','Philosophy':'🧠','Arts & Design':'🎨','Mathematics':'∑','Literature':'✒'}[cat]||'📚';
}
function isValidUrl(s) {
  try { new URL(s); return true; } catch { return false; }
}

function initBackToTop() {
  const b = document.getElementById('back-to-top');
  if (!b) return;
  window.addEventListener('scroll',()=>b.classList.toggle('visible',scrollY>400));
  b.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
}
function hideLoader() {
  const s = document.getElementById('loading-screen');
  if (s) setTimeout(()=>s.classList.add('hidden'),800);
}

document.addEventListener('DOMContentLoaded',()=>{ Theme.init(); initBackToTop(); hideLoader(); });
