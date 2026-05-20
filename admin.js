'use strict';

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth()) return;
  App.init();
});

const App = {
  section: 'dashboard',
  editId: null,

  async init() {
    document.getElementById('admin-name').textContent = 'admin';
    this.bindNav();
    this.bindLogout();
    this.bindTheme();
    await this.show('dashboard');
  },

  bindNav() {
    document.querySelectorAll('[data-sec]').forEach(l => {
      l.addEventListener('click', async e => {
        e.preventDefault();
        await this.show(l.dataset.sec);
        document.getElementById('sidebar').classList.remove('open');
      });
    });
    document.getElementById('hamburger')?.addEventListener('click', () =>
      document.getElementById('sidebar').classList.toggle('open')
    );
  },

  async show(name) {
    this.section = name;
    document.querySelectorAll('.asec').forEach(s => s.classList.add('hidden'));
    const t = document.getElementById('sec-' + name);
    if (t) { t.classList.remove('hidden'); t.classList.add('fade-in'); }
    document.querySelectorAll('[data-sec]').forEach(l => l.classList.toggle('active', l.dataset.sec === name));
    const map = {
      dashboard:  () => this.renderDash(),
      add:        () => this.renderForm(),
      books:      () => this.renderBooks(),
      categories: () => this.renderCats(),
    };
    if (map[name]) await map[name]();
  },

  bindLogout() {
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      Auth.logout(); Toast.info('Logged out.'); setTimeout(() => location.href = 'admin-login.html', 600);
    });
  },

  bindTheme() {
    const b = document.getElementById('theme-btn');
    if (!b) return;
    const upd = t => b.textContent = t === 'light' ? '🌙' : '☀';
    upd(Theme.get());
    b.addEventListener('click', () => upd(Theme.toggle()));
  },

  /* ── DASHBOARD ── */
  async renderDash() {
    const el = document.getElementById('sec-dashboard');
    el.innerHTML = '<div class="sec-loading"><div class="spinner"></div><span>Loading…</span></div>';
    const books = DB.getBooks();
    const cats  = DB.getCategories();
    const vis   = books.filter(b => b.visible !== false);
    const week  = books.filter(b => (Date.now() - new Date(b.addedDate).getTime()) < 86400000 * 7);

    el.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-val">${books.length}</div><div class="stat-lbl">Total Books</div></div>
        <div class="stat-card"><div class="stat-val">${vis.length}</div><div class="stat-lbl">Visible</div></div>
        <div class="stat-card"><div class="stat-val">${cats.length}</div><div class="stat-lbl">Categories</div></div>
        <div class="stat-card"><div class="stat-val">${week.length}</div><div class="stat-lbl">Added This Week</div></div>
      </div>
      <div class="dash-grid">
        <div class="card">
          <p class="sl">Recent Activity</p>
          <h3 style="margin-bottom:16px">Latest Additions</h3>
          <div style="overflow-x:auto">
            <table class="atbl">
              <thead><tr><th>Book</th><th>Category</th><th>Type</th><th>Added</th><th>Status</th></tr></thead>
              <tbody>${books.slice(0,6).map(b => `
                <tr>
                  <td><div class="btinfo">
                    <div class="bthumb" style="${b.coverUrl ? `background:none` : `background:${catGrad(b)}`}">
                      ${b.coverUrl ? `<img src="${b.coverUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:4px"/>` : catIcon(b.category)}
                    </div>
                    <span>${trunc(b.title,34)}</span>
                  </div></td>
                  <td><span class="badge bc">${b.category}</span></td>
                  <td><span class="badge ba">${b.type}</span></td>
                  <td style="color:var(--tx2);font-size:.8rem">${fmtDate(b.addedDate)}</td>
                  <td><span class="sdot ${b.visible!==false?'on':'off'}"></span>${b.visible!==false?'Visible':'Hidden'}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <p class="sl">Analytics</p>
          <h3 style="margin-bottom:16px">By Category</h3>
          ${(() => {
            const cc = {};
            books.forEach(b => cc[b.category] = (cc[b.category]||0)+1);
            return Object.entries(cc).map(([c,n]) => `
              <div class="cbar">
                <div class="cbar-lbl"><span>${catIcon(c)} ${c}</span><span class="tx2">${n}</span></div>
                <div class="cbar-track"><div class="cbar-fill" style="width:${Math.min(100,(n/books.length)*100)}%"></div></div>
              </div>`).join('');
          })()}
        </div>
      </div>`;
  },

  /* ── ADD / EDIT FORM ── */
  renderForm(book = null) {
    const isEdit = !!book;
    this.editId = isEdit ? book.id : null;
    const cats = DB.getCategories();
    const types = ['Textbook','Novel','Reference','Essay','Classic','Archive','Non-fiction','Journal','Manual','Comic'];
    const el = document.getElementById('sec-add');

    el.innerHTML = `
      <div class="form-hdr">
        <div>
          <p class="sl">${isEdit ? 'Edit Entry' : 'New Entry'}</p>
          <h2>${isEdit ? 'Edit Book' : 'Add Book Link'}</h2>
        </div>
        ${isEdit ? `<button class="btn btn-outline btn-sm" onclick="App.cancelEdit()">✕ Cancel Edit</button>` : ''}
      </div>

      <div class="form-cols">

        <!-- LEFT column: all text fields -->
        <div class="form-left">
          <div class="fg">
            <label>Book Title *</label>
            <input type="text" id="f-title" placeholder="e.g. Clean Code" value="${isEdit?book.title:''}"/>
          </div>
          <div class="fg">
            <label>Book Link * <span class="tx3" style="font-size:.7rem">(URL to read the book)</span></label>
            <input type="url" id="f-link" placeholder="https://example.com/book" value="${isEdit?(book.bookLink||''):''}"/>
            <span class="field-hint">Paste a link to Google Drive, Open Library, PDF URL, or any readable page.</span>
          </div>
          <div class="form-row2">
            <div class="fg">
              <label>Category *</label>
              <select id="f-cat">
                ${cats.map(c=>`<option value="${c}" ${isEdit&&book.category===c?'selected':''}>${c}</option>`).join('')}
              </select>
            </div>
            <div class="fg">
              <label>Book Type *</label>
              <select id="f-type">
                ${types.map(t=>`<option value="${t}" ${isEdit&&book.type===t?'selected':''}>${t}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row2">
            <div class="fg">
              <label>Visibility</label>
              <select id="f-vis">
                <option value="true"  ${!isEdit||book.visible!==false?'selected':''}>Visible to users</option>
                <option value="false" ${isEdit&&book.visible===false?'selected':''}>Hidden</option>
              </select>
            </div>
            <div class="fg">
              <label>Featured</label>
              <select id="f-feat">
                <option value="false" ${isEdit&&!book.featured?'selected':''}>Not featured</option>
                <option value="true"  ${isEdit&&book.featured?'selected':''}>Featured</option>
              </select>
            </div>
          </div>
          <div class="fg">
            <label>Description *</label>
            <textarea id="f-desc" rows="4" placeholder="Brief description of the book…">${isEdit?book.description:''}</textarea>
          </div>
        </div>

        <!-- RIGHT column: cover photo upload -->
        <div class="form-right">
          <div class="fg" style="height:100%">
            <label>Cover Photo <span class="tx3" style="font-size:.7rem">(optional)</span></label>
            <div class="cover-zone" id="cover-zone">
              <div class="cover-preview-wrap" id="cover-prev-wrap" style="${isEdit&&book.coverUrl?'':'display:none'}">
                <img id="cover-preview-img" src="${isEdit&&book.coverUrl?book.coverUrl:''}" alt="Cover preview"/>
                <button class="remove-cover" id="remove-cover-btn" type="button" title="Remove cover">✕</button>
              </div>
              <div class="cover-placeholder" id="cover-ph" style="${isEdit&&book.coverUrl?'display:none':''}">
                <div class="cover-ph-icon">🖼</div>
                <p>Drag &amp; drop or</p>
                <label class="btn btn-outline btn-sm" for="cover-input" style="cursor:pointer;margin-top:8px">Browse Image</label>
                <p class="tx3" style="font-size:.75rem;margin-top:8px">JPG, PNG, WEBP</p>
              </div>
              <input type="file" id="cover-input" accept="image/*" class="hidden"/>
            </div>
            <input type="hidden" id="f-cover-url" value="${isEdit?book.coverUrl:''}" />
            <div id="cover-upload-status" class="tx2" style="font-size:.8rem;margin-top:6px;min-height:18px"></div>
          </div>
        </div>

      </div><!-- /form-cols -->

      <div class="divider"></div>
      <div class="form-actions">
        <button class="btn btn-primary" id="submit-btn">${isEdit?'💾 Save Changes':'➕ Add Book'}</button>
        <button class="btn btn-outline" onclick="App.renderForm()">Clear Form</button>
      </div>
      <div id="prog-wrap" class="hidden" style="margin-top:14px">
        <div class="prog-track"><div class="prog-fill" id="prog-fill"></div></div>
        <p id="prog-lbl" class="tx2" style="font-size:.8rem;margin-top:5px"></p>
      </div>
    `;

    this._bindCoverZone();
    document.getElementById('submit-btn').addEventListener('click', () => this.submit());
  },

  _pendingCover: null,

  _bindCoverZone() {
    this._pendingCover = null;
    const zone  = document.getElementById('cover-zone');
    const input = document.getElementById('cover-input');
    const prev  = document.getElementById('cover-prev-wrap');
    const ph    = document.getElementById('cover-ph');
    const img   = document.getElementById('cover-preview-img');
    const remBtn= document.getElementById('remove-cover-btn');
    const stat  = document.getElementById('cover-upload-status');

    const showPreview = src => {
      img.src = src; prev.style.display='block'; ph.style.display='none';
    };
    const clearCover = () => {
      this._pendingCover = null;
      document.getElementById('f-cover-url').value = '';
      img.src=''; prev.style.display='none'; ph.style.display=''; stat.textContent='';
    };

    remBtn.addEventListener('click', clearCover);

    const onFile = file => {
      if (!file.type.startsWith('image/')) { Toast.error('Please select an image file.'); return; }
      this._pendingCover = file;
      stat.textContent = '📎 ' + file.name + ' — will upload on save';
      showPreview(URL.createObjectURL(file));
    };

    zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', () => { if (input.files[0]) onFile(input.files[0]); });
  },

  _setProgress(pct, lbl) {
    document.getElementById('prog-wrap')?.classList.remove('hidden');
    const f = document.getElementById('prog-fill'); if (f) f.style.width = pct + '%';
    const l = document.getElementById('prog-lbl');  if (l) l.textContent = lbl;
  },
  _hideProgress() { document.getElementById('prog-wrap')?.classList.add('hidden'); },

  async submit() {
    const title = document.getElementById('f-title').value.trim();
    const link  = document.getElementById('f-link').value.trim();
    const cat   = document.getElementById('f-cat').value;
    const type  = document.getElementById('f-type').value;
    const desc  = document.getElementById('f-desc').value.trim();
    const vis   = document.getElementById('f-vis').value === 'true';
    const feat  = document.getElementById('f-feat').value === 'true';
    let coverUrl = document.getElementById('f-cover-url').value;

    if (!title || !cat || !type || !desc) { Toast.error('Please fill in all required fields.'); return; }
    if (!link)                            { Toast.error('Book Link is required.'); return; }
    if (!isValidUrl(link))                { Toast.error('Please enter a valid URL starting with https://'); return; }

    const btn = document.getElementById('submit-btn');
    btn.disabled = true; btn.textContent = 'Saving…';

    try {
      if (this._pendingCover) {
        this._setProgress(20, 'Uploading cover image…');
        try {
          coverUrl = await ImgStore.upload(this._pendingCover);
          this._setProgress(70, 'Cover uploaded ✓');
        } catch (e) {
          Toast.info('Cover upload failed — book saved without cover. (' + e.message + ')');
          coverUrl = '';
        }
      }

      this._setProgress(90, 'Saving book…');
      const data = { title, bookLink: link, category: cat, type, description: desc, coverUrl, visible: vis, featured: feat };

      if (this.editId) {
        DB.updateBook(this.editId, data);
        Toast.success('Book updated!');
        this.editId = null;
      } else {
        DB.addBook(data);
        Toast.success('Book added to library!');
      }

      this._hideProgress();
      this.renderForm();
      await this.show('books');

    } catch (e) {
      Toast.error('Error: ' + e.message);
      this._hideProgress();
    } finally {
      btn.disabled = false;
      btn.textContent = this.editId ? '💾 Save Changes' : '➕ Add Book';
    }
  },

  cancelEdit() { this.editId = null; this.renderForm(); },

  /* ── BOOKS MANAGER ── */
  renderBooks(q = '') {
    const all = DB.getBooks();
    const list = q ? all.filter(b =>
      b.title.toLowerCase().includes(q.toLowerCase()) ||
      (b.category||'').toLowerCase().includes(q.toLowerCase()) ||
      (b.type||'').toLowerCase().includes(q.toLowerCase())
    ) : all;

    document.getElementById('sec-books').innerHTML = `
      <div class="sec-top">
        <div><p class="sl">Library</p><h2>Manage Books</h2></div>
        <button class="btn btn-primary btn-sm" onclick="App.show('add')">+ Add New Book</button>
      </div>
      <div class="search-row">
        <input type="text" id="bsearch" placeholder="🔍 Search title, category, or type…" value="${q}" oninput="App.renderBooks(this.value)"/>
        <span class="tx2" style="font-size:.85rem;white-space:nowrap">${list.length} book${list.length!==1?'s':''}</span>
      </div>
      <div class="books-grid">
        ${!list.length ? `<div class="empty"><p>📚</p><p>No books found.</p></div>` : ''}
        ${list.map(b => `
          <div class="bcard ${b.visible===false?'bcard-hidden':''}">
            <div class="bcard-cover" style="${b.coverUrl?'background:none':('background:'+catGrad(b))}">
              ${b.coverUrl ? `<img src="${b.coverUrl}" alt="${b.title}"/>` : `<span class="bcard-icon">${catIcon(b.category)}</span>`}
              ${b.visible===false ? `<div class="bcard-badge-hidden">Hidden</div>` : ''}
              ${b.featured        ? `<div class="bcard-badge-feat">★ Featured</div>` : ''}
            </div>
            <div class="bcard-info">
              <p class="bcard-title">${trunc(b.title,48)}</p>
              <div class="flex g2" style="margin:5px 0">
                <span class="badge bc">${b.category}</span>
                <span class="badge ba">${b.type}</span>
              </div>
              <p class="bcard-desc tx3">${trunc(b.description,80)}</p>
              <a href="${b.bookLink}" target="_blank" rel="noopener" class="bcard-link" onclick="event.stopPropagation()">
                🔗 ${trunc(b.bookLink,40)}
              </a>
            </div>
            <div class="bcard-actions">
              <button class="btn btn-outline btn-sm" onclick="App.editBook('${b.id}')">✏ Edit</button>
              <button class="btn btn-outline btn-sm" onclick="App.toggleVis('${b.id}')">${b.visible===false?'👁 Show':'🙈 Hide'}</button>
              <button class="btn btn-danger  btn-sm" onclick="App.confirmDel('${b.id}')">🗑 Delete</button>
            </div>
          </div>`).join('')}
      </div>`;
  },

  editBook(id) {
    const b = DB.getBook(id);
    if (!b) return;
    this.show('add');
    this.renderForm(b);
  },

  toggleVis(id) {
    const b = DB.getBook(id); if (!b) return;
    const v = b.visible === false;
    DB.updateBook(id, { visible: v });
    Toast.info(v ? 'Book is now visible.' : 'Book hidden from users.');
    this.renderBooks();
  },

  confirmDel(id) {
    const b = DB.getBook(id); if (!b) return;
    const m = document.getElementById('del-modal');
    document.getElementById('del-msg').textContent = `Delete "${trunc(b.title,52)}"? This cannot be undone.`;
    document.getElementById('del-ok').onclick = () => {
      DB.deleteBook(id);
      Toast.success('Book deleted.');
      m.classList.remove('open');
      this.renderBooks();
    };
    m.classList.add('open');
  },

  /* ── CATEGORIES ── */
  renderCats() {
    const cats  = DB.getCategories();
    const books = DB.getBooks();
    document.getElementById('sec-categories').innerHTML = `
      <div class="sec-top"><div><p class="sl">Taxonomy</p><h2>Manage Categories</h2></div></div>
      <div class="cats-layout">
        <div class="card">
          <h3 style="margin-bottom:16px">Add Category</h3>
          <div class="fg"><label>Name</label><input type="text" id="new-cat" placeholder="e.g. Biography"/></div>
          <button class="btn btn-primary btn-sm" onclick="App.addCat()">+ Add</button>
        </div>
        <div class="card" style="flex:2">
          <h3 style="margin-bottom:16px">All Categories</h3>
          <div class="cats-list">
            ${cats.map((c,i) => {
              const n = books.filter(b => b.category===c).length;
              return `<div class="cat-row">
                <div class="cat-row-l">
                  <span>${catIcon(c)}</span>
                  <input type="text" class="cat-inp" data-i="${i}" value="${c}"/>
                  <span class="badge bc">${n} book${n!==1?'s':''}</span>
                </div>
                <div class="flex g2">
                  <button class="btn btn-outline btn-sm" onclick="App.saveCat(${i})">Save</button>
                  ${n===0?`<button class="btn btn-danger btn-sm" onclick="App.delCat(${i})">Delete</button>`:''}
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>`;
  },

  addCat() {
    const i = document.getElementById('new-cat'); const n = i.value.trim();
    if (!n) { Toast.error('Enter a name.'); return; }
    const c = DB.getCategories();
    if (c.includes(n)) { Toast.error('Already exists.'); return; }
    c.push(n); DB.saveCategories(c); Toast.success(`"${n}" added!`);
    i.value = ''; this.renderCats();
  },
  saveCat(idx) {
    const inp = document.querySelector(`.cat-inp[data-i="${idx}"]`); const n = inp.value.trim();
    if (!n) { Toast.error('Cannot be empty.'); return; }
    const c = DB.getCategories(); const old = c[idx]; c[idx] = n; DB.saveCategories(c);
    const books = DB.getBooks(); books.forEach(b=>{ if(b.category===old) b.category=n; }); DB.saveBooks(books);
    Toast.success('Renamed!'); this.renderCats();
  },
  delCat(idx) {
    const c = DB.getCategories(); c.splice(idx,1); DB.saveCategories(c);
    Toast.success('Deleted.'); this.renderCats();
  }
};
