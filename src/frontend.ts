/**
 * @source cursor @line_count 570
 */

export function renderHTML(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>IdeaPark</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#f8fafc;--surface:#fff;--border:#e2e8f0;--text:#1e293b;--text-s:#64748b;
  --primary:#6366f1;--primary-h:#4f46e5;--danger:#ef4444;--radius:12px;
  --shadow:0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);
  --shadow-lg:0 10px 15px -3px rgba(0,0,0,.08),0 4px 6px -4px rgba(0,0,0,.04);
}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  background:var(--bg);color:var(--text);min-height:100vh}
button{cursor:pointer;border:none;font:inherit}
input,textarea,select{font:inherit;border:1px solid var(--border);border-radius:8px;
  padding:8px 12px;outline:none;width:100%;transition:border .2s}
input:focus,textarea:focus,select:focus{border-color:var(--primary)}
textarea{resize:vertical;min-height:80px}

header{background:var(--surface);border-bottom:1px solid var(--border);
  padding:16px 0;position:sticky;top:0;z-index:100}
header .inner{max-width:1100px;margin:0 auto;padding:0 20px;
  display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
header h1{font-size:22px;font-weight:700;display:flex;align-items:center;gap:8px}
header h1 span{font-size:26px}

.toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.toolbar input[type=search]{width:220px}
.toolbar select{width:auto;min-width:100px}

.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;
  border-radius:8px;font-weight:500;font-size:14px;transition:all .15s}
.btn-primary{background:var(--primary);color:#fff}
.btn-primary:hover{background:var(--primary-h)}
.btn-ghost{background:transparent;color:var(--text-s)}
.btn-ghost:hover{background:#f1f5f9}
.btn-danger{background:transparent;color:var(--danger)}
.btn-danger:hover{background:#fef2f2}
.btn-sm{padding:5px 10px;font-size:13px}

main{max-width:1100px;margin:0 auto;padding:24px 20px}

.stats{display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap}
.stat{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
  padding:16px 20px;flex:1;min-width:120px;box-shadow:var(--shadow)}
.stat .num{font-size:28px;font-weight:700;color:var(--primary)}
.stat .label{font-size:13px;color:var(--text-s);margin-top:2px}

.layout{display:grid;grid-template-columns:220px 1fr;gap:24px}
@media(max-width:768px){.layout{grid-template-columns:1fr}.sidebar{display:none}}

.sidebar section{background:var(--surface);border:1px solid var(--border);
  border-radius:var(--radius);padding:16px;margin-bottom:16px;box-shadow:var(--shadow)}
.sidebar h3{font-size:13px;text-transform:uppercase;letter-spacing:.05em;
  color:var(--text-s);margin-bottom:10px}
.sidebar ul{list-style:none}
.sidebar li{padding:6px 10px;border-radius:6px;cursor:pointer;font-size:14px;
  display:flex;justify-content:space-between;align-items:center;transition:background .15s}
.sidebar li:hover,.sidebar li.active{background:#f1f5f9}
.sidebar li.active{font-weight:600;color:var(--primary)}
.sidebar .dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.sidebar .count{font-size:12px;color:var(--text-s);background:#f1f5f9;
  padding:1px 7px;border-radius:10px}

#ideas-list{display:flex;flex-direction:column;gap:12px}
.idea-card{background:var(--surface);border:1px solid var(--border);
  border-radius:var(--radius);padding:20px;box-shadow:var(--shadow);
  transition:box-shadow .2s;cursor:pointer}
.idea-card:hover{box-shadow:var(--shadow-lg)}
.idea-card .top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.idea-card h3{font-size:16px;font-weight:600;flex:1}
.idea-card .content{color:var(--text-s);font-size:14px;margin-top:8px;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.idea-card .meta{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center}
.badge{font-size:12px;padding:2px 10px;border-radius:20px;font-weight:500}
.badge-status{background:#ede9fe;color:#6366f1}
.badge-status[data-s=active]{background:#dcfce7;color:#16a34a}
.badge-status[data-s=archived]{background:#f1f5f9;color:#64748b}
.badge-status[data-s=done]{background:#dbeafe;color:#2563eb}
.badge-tag{background:#f1f5f9;color:#475569}
.badge-cat{font-size:12px;padding:2px 10px;border-radius:20px;color:#fff}
.priority-dots{display:flex;gap:3px;margin-left:auto}
.priority-dots i{width:8px;height:8px;border-radius:50%;background:#e2e8f0}
.priority-dots i.on{background:#f59e0b}
.idea-card .time{font-size:12px;color:var(--text-s);margin-left:auto}

.empty{text-align:center;padding:60px 20px;color:var(--text-s)}
.empty p{font-size:15px;margin-top:8px}

.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:200;
  display:none;align-items:center;justify-content:center;padding:20px}
.modal-overlay.open{display:flex}
.modal{background:var(--surface);border-radius:16px;width:100%;max-width:520px;
  box-shadow:var(--shadow-lg);overflow:hidden;animation:slideUp .2s ease}
@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
.modal-header{padding:20px 24px;border-bottom:1px solid var(--border);
  display:flex;justify-content:space-between;align-items:center}
.modal-header h2{font-size:18px}
.modal-body{padding:24px;display:flex;flex-direction:column;gap:14px}
.modal-body label{font-size:13px;font-weight:600;color:var(--text-s);display:block;margin-bottom:4px}
.modal-footer{padding:16px 24px;border-top:1px solid var(--border);
  display:flex;justify-content:flex-end;gap:8px}
.field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}

.cat-form{display:flex;gap:8px;margin-top:8px}
.cat-form input{flex:1}
</style>
</head>
<body>

<header>
  <div class="inner">
    <h1><span>💡</span> IdeaPark</h1>
    <div class="toolbar">
      <input type="search" id="search" placeholder="搜索想法...">
      <select id="filter-status">
        <option value="">全部状态</option>
        <option value="draft">草稿</option>
        <option value="active">进行中</option>
        <option value="done">已完成</option>
        <option value="archived">已归档</option>
      </select>
      <button class="btn btn-primary" onclick="openModal()">+ 新想法</button>
    </div>
  </div>
</header>

<main>
  <div class="stats" id="stats"></div>
  <div class="layout">
    <aside class="sidebar">
      <section>
        <h3>分类</h3>
        <ul id="cat-list"></ul>
        <div class="cat-form">
          <input id="new-cat" placeholder="新分类名">
          <button class="btn btn-primary btn-sm" onclick="addCategory()">添加</button>
        </div>
      </section>
      <section>
        <h3>标签</h3>
        <ul id="tag-list"></ul>
      </section>
    </aside>
    <div>
      <div id="ideas-list"></div>
      <div id="ideas-empty" class="empty" style="display:none">
        <p style="font-size:36px">💡</p>
        <p>还没有想法，点击「+ 新想法」开始记录吧</p>
      </div>
    </div>
  </div>
</main>

<div class="modal-overlay" id="modal">
  <div class="modal">
    <div class="modal-header">
      <h2 id="modal-title">新建想法</h2>
      <button class="btn btn-ghost" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div>
        <label>标题 *</label>
        <input id="f-title" placeholder="给你的想法起个名字">
      </div>
      <div>
        <label>内容</label>
        <textarea id="f-content" placeholder="详细描述你的想法..." rows="4"></textarea>
      </div>
      <div class="field-row">
        <div>
          <label>分类</label>
          <select id="f-category"><option value="">无分类</option></select>
        </div>
        <div>
          <label>状态</label>
          <select id="f-status">
            <option value="draft">草稿</option>
            <option value="active">进行中</option>
            <option value="done">已完成</option>
            <option value="archived">已归档</option>
          </select>
        </div>
      </div>
      <div class="field-row">
        <div>
          <label>优先级</label>
          <select id="f-priority">
            <option value="0">普通</option>
            <option value="1">低</option>
            <option value="2">中</option>
            <option value="3">高</option>
          </select>
        </div>
        <div>
          <label>标签（逗号分隔）</label>
          <input id="f-tags" placeholder="标签1, 标签2">
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-danger" id="btn-delete" style="display:none" onclick="deleteCurrentIdea()">删除</button>
      <button class="btn btn-primary" id="btn-save" onclick="saveIdea()">保存</button>
    </div>
  </div>
</div>

<script>
const API = '/api';
let editingId = null;
let currentFilter = {};
const statusLabels = {draft:'草稿',active:'进行中',done:'已完成',archived:'已归档'};

async function api(path, opts) {
  const r = await fetch(API + path, {
    headers: {'Content-Type':'application/json'}, ...opts,
    body: opts?.body ? JSON.stringify(opts.body) : undefined
  });
  return r.json();
}

async function loadAll() {
  await Promise.all([loadIdeas(), loadCategories(), loadTags(), loadStats()]);
}

async function loadStats() {
  const [all, active, done] = await Promise.all([
    api('/ideas?page_size=1'),
    api('/ideas?status=active&page_size=1'),
    api('/ideas?status=done&page_size=1'),
  ]);
  document.getElementById('stats').innerHTML =
    stat(all.meta?.total ?? 0, '全部想法') +
    stat(active.meta?.total ?? 0, '进行中') +
    stat(done.meta?.total ?? 0, '已完成');
}

function stat(n, l) {
  return '<div class="stat"><div class="num">' + n + '</div><div class="label">' + l + '</div></div>';
}

async function loadIdeas() {
  const params = new URLSearchParams();
  if (currentFilter.status) params.set('status', currentFilter.status);
  if (currentFilter.category_id) params.set('category_id', currentFilter.category_id);
  if (currentFilter.tag) params.set('tag', currentFilter.tag);
  if (currentFilter.search) params.set('search', currentFilter.search);
  params.set('page_size', '50');

  const res = await api('/ideas?' + params);
  const list = document.getElementById('ideas-list');
  const empty = document.getElementById('ideas-empty');
  const ideas = res.data || [];

  if (!ideas.length) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  list.innerHTML = ideas.map(cardHTML).join('');
}

function cardHTML(idea) {
  let meta = '<span class="badge badge-status" data-s="' + idea.status + '">' +
    (statusLabels[idea.status] || idea.status) + '</span>';
  if (idea.category_name) {
    meta += '<span class="badge badge-cat" style="background:' + esc(idea.category_color || '#6366f1') + '">' +
      esc(idea.category_name) + '</span>';
  }
  (idea.tags || []).forEach(function(t) { meta += '<span class="badge badge-tag">' + esc(t) + '</span>'; });
  let dots = '<span class="priority-dots">';
  for (let i = 1; i <= 3; i++) dots += '<i' + (i <= idea.priority ? ' class="on"' : '') + '></i>';
  dots += '</span>';
  const time = idea.updated_at ? new Date(idea.updated_at + 'Z').toLocaleDateString('zh-CN') : '';
  return '<div class="idea-card" onclick="openModal(' + idea.id + ')">' +
    '<div class="top"><h3>' + esc(idea.title) + '</h3>' + dots + '</div>' +
    (idea.content ? '<div class="content">' + esc(idea.content) + '</div>' : '') +
    '<div class="meta">' + meta + '<span class="time">' + time + '</span></div></div>';
}

function esc(s) {
  const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML;
}

async function loadCategories() {
  const res = await api('/categories');
  const cats = res.data || [];
  const ul = document.getElementById('cat-list');
  const sel = document.getElementById('f-category');

  ul.innerHTML = '<li class="' + (!currentFilter.category_id ? 'active' : '') +
    '" onclick="filterCat(null)">全部</li>' +
    cats.map(function(c) {
      return '<li class="' + (currentFilter.category_id == c.id ? 'active' : '') +
        '" onclick="filterCat(' + c.id + ')">' +
        '<span style="display:flex;align-items:center;gap:6px">' +
        '<span class="dot" style="background:' + esc(c.color) + '"></span>' + esc(c.name) +
        '</span></li>';
    }).join('');

  sel.innerHTML = '<option value="">无分类</option>' +
    cats.map(function(c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('');
}

async function loadTags() {
  const res = await api('/tags');
  const tags = res.data || [];
  const ul = document.getElementById('tag-list');
  if (!tags.length) {
    ul.innerHTML = '<li style="color:var(--text-s);font-size:13px">暂无标签</li>';
    return;
  }
  ul.innerHTML = tags.map(function(t) {
    return '<li class="' + (currentFilter.tag === t.name ? 'active' : '') +
      '" data-tag="' + esc(t.name).replace(/"/g, '&quot;') + '">' + esc(t.name) +
      '<span class="count">' + t.count + '</span></li>';
  }).join('');
  ul.querySelectorAll('[data-tag]').forEach(function(li) {
    li.addEventListener('click', function() { filterTag(li.getAttribute('data-tag')); });
  });
}

function filterCat(id) { currentFilter.category_id = id; currentFilter.tag = null; loadAll(); }
function filterTag(name) {
  currentFilter.tag = currentFilter.tag === name ? null : name;
  currentFilter.category_id = null;
  loadAll();
}

document.getElementById('filter-status').onchange = function() {
  currentFilter.status = this.value || null; loadAll();
};

let searchTimer;
document.getElementById('search').oninput = function() {
  clearTimeout(searchTimer);
  const v = this.value;
  searchTimer = setTimeout(function() { currentFilter.search = v || null; loadIdeas(); }, 300);
};

async function openModal(id) {
  editingId = id || null;
  document.getElementById('modal-title').textContent = id ? '编辑想法' : '新建想法';
  document.getElementById('btn-delete').style.display = id ? 'inline-flex' : 'none';

  if (id) {
    const res = await api('/ideas/' + id);
    const d = res.data;
    document.getElementById('f-title').value = d.title;
    document.getElementById('f-content').value = d.content || '';
    document.getElementById('f-category').value = d.category_id || '';
    document.getElementById('f-status').value = d.status;
    document.getElementById('f-priority').value = d.priority;
    document.getElementById('f-tags').value = (d.tags || []).join(', ');
  } else {
    document.getElementById('f-title').value = '';
    document.getElementById('f-content').value = '';
    document.getElementById('f-category').value = '';
    document.getElementById('f-status').value = 'draft';
    document.getElementById('f-priority').value = '0';
    document.getElementById('f-tags').value = '';
  }
  document.getElementById('modal').classList.add('open');
  document.getElementById('f-title').focus();
}

function closeModal() { document.getElementById('modal').classList.remove('open'); }

async function saveIdea() {
  const title = document.getElementById('f-title').value.trim();
  if (!title) { alert('请输入标题'); return; }
  const body = {
    title: title,
    content: document.getElementById('f-content').value,
    category_id: document.getElementById('f-category').value ? Number(document.getElementById('f-category').value) : null,
    status: document.getElementById('f-status').value,
    priority: Number(document.getElementById('f-priority').value),
    tags: document.getElementById('f-tags').value.split(',').map(function(s){return s.trim()}).filter(Boolean)
  };
  if (editingId) {
    await api('/ideas/' + editingId, { method: 'PUT', body: body });
  } else {
    await api('/ideas', { method: 'POST', body: body });
  }
  closeModal();
  loadAll();
}

async function deleteCurrentIdea() {
  if (!editingId || !confirm('确定要删除这个想法吗？')) return;
  await api('/ideas/' + editingId, { method: 'DELETE' });
  closeModal();
  loadAll();
}

async function addCategory() {
  const input = document.getElementById('new-cat');
  const name = input.value.trim();
  if (!name) return;
  await api('/categories', { method: 'POST', body: { name: name } });
  input.value = '';
  loadCategories();
}

document.getElementById('modal').onclick = function(e) {
  if (e.target === this) closeModal();
};
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeModal();
});

loadAll();
<\/script>
</body>
</html>`;
}
