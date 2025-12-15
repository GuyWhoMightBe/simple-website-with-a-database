// Static dataset to avoid any installs/servers
const DATA = [
	{ id:1, title:'Heco', author:'jthelms', cover_url:'https://picsum.photos/seed/1/640/400', likes_count:562, views:22204, comments:28, cloneable:true, date:'2025-09-18' },
	{ id:2, title:'Breaking Bad', author:'joaopaulos', cover_url:'https://picsum.photos/seed/2/640/400', likes_count:540, views:27628, comments:37, cloneable:false, date:'2025-09-25' },
	{ id:3, title:'Cards Webflow UI Kit', author:'janlosert', cover_url:'https://picsum.photos/seed/3/640/400', likes_count:538, views:19195, comments:31, cloneable:true, date:'2025-10-01' },
	{ id:4, title:'Webflow wireframe kit', author:'DarioStefanutto', cover_url:'https://picsum.photos/seed/4/640/400', likes_count:526, views:12177, comments:65, cloneable:true, date:'2025-07-07' },
	{ id:5, title:'Start up to lead!', author:'MILK', cover_url:'https://picsum.photos/seed/5/640/400', likes_count:488, views:17560, comments:39, cloneable:false, date:'2025-10-02' },
	{ id:6, title:'Visual Designs UX Wireframes', author:'janlosert', cover_url:'https://picsum.photos/seed/6/640/400', likes_count:472, views:15595, comments:41, cloneable:true, date:'2025-08-15' }
];

// Detect if backend server is running and provide a small API helper
let SERVER = false;
async function detectServer(){
	try{
		const res = await fetch('/healthz', { headers:{ 'Accept':'application/json' } });
		SERVER = res.ok;
	}catch{ SERVER = false; }
}

async function api(path, options={}){
	const res = await fetch(path, { credentials:'same-origin', headers:{ 'Content-Type':'application/json', 'Accept':'application/json' }, ...options });
	if (!res.ok){
		let msg = res.statusText; try{ const j = await res.json(); msg = j.error || msg; }catch{}
		throw new Error(msg);
	}
	return res.json();
}

// LocalStorage helpers
const store = {
	get likes(){ try{ return JSON.parse(localStorage.getItem('likes')||'{}'); }catch{ return {}; } },
	set likes(v){ localStorage.setItem('likes', JSON.stringify(v)); },
	get user(){ try{ return JSON.parse(localStorage.getItem('user')||'null'); }catch{ return null; } },
	set user(v){ localStorage.setItem('user', JSON.stringify(v)); },
	get hidden(){ try{ return JSON.parse(localStorage.getItem('hiddenProducts')||'[]'); }catch{ return []; } },
	set hidden(v){ localStorage.setItem('hiddenProducts', JSON.stringify(v)); },
	get users(){ try{ return JSON.parse(localStorage.getItem('users')||'{}'); }catch{ return {}; } },
		set users(v){ localStorage.setItem('users', JSON.stringify(v)); },
		get userCards(){ try{ return JSON.parse(localStorage.getItem('userCards')||'[]'); }catch{ return []; } },
		set userCards(v){ localStorage.setItem('userCards', JSON.stringify(v)); }
}

function getUserByEmail(email){
	const users = store.users; return users[email?.toLowerCase()] || null;
}
function saveUser(user){
	const users = store.users; users[user.epasts.toLowerCase()] = user; store.users = users;
}

// Simple strong password checks (Google-like principles):
// - at least 8 chars
// - avoid common passwords and email local-part
// - encourage mix of upper/lower/digits/symbols (require 3 of 4)
const COMMON = new Set(['password','12345678','123456789','qwerty','abc123','11111111','iloveyou','admin123','letmein','welcome','monkey','dragon']);
function evaluatePassword(pw, email){
	const reasons = [];
	const s = String(pw||'');
	if (s.length < 8) reasons.push('At least 8 characters');
	const hasLower = /[a-z]/.test(s);
	const hasUpper = /[A-Z]/.test(s);
	const hasDigit = /\d/.test(s);
	const hasSymbol = /[^\w\s]/.test(s);
	const classes = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
	if (classes < 3) reasons.push('Use a mix of upper/lowercase, numbers, symbols (3 of 4)');
	const local = String(email||'').split('@')[0]||'';
	if (local && s.toLowerCase().includes(local.toLowerCase())) reasons.push('Avoid using your email name');
	if (COMMON.has(s.toLowerCase())) reasons.push('Too common');
	// simple repeated char penalty
	if (/(.)\1{2,}/.test(s)) reasons.push('Avoid repeated characters');
	return { valid: reasons.length === 0, reasons };
}

const grid = document.getElementById('grid');
const tpl = document.getElementById('cardTpl');

function renderCard(p){
	const node = tpl.content.firstElementChild.cloneNode(true);
	node.querySelector('img').src = p.cover_url;
	node.querySelector('.title').textContent = p.title;
	node.querySelector('.byline').textContent = `by ${p.author}`;
	const countEl = node.querySelector('.likeCount');
	const likes = store.likes;
	const extra = SERVER ? 0 : (likes[p.id] ? 1 : 0);
	countEl.textContent = (p.likes_count||0) + extra;
		node.querySelector('.views').textContent = p.views?.toLocaleString() || '0';
		node.querySelector('.comments').textContent = p.comments?.toLocaleString() || '0';
	node.querySelector('.thumb').addEventListener('click', ()=> alert('Open detail (static demo)'));
	const likeBtn = node.querySelector('.like');
	if (!SERVER && likes[p.id]) likeBtn.classList.add('liked');
	likeBtn.setAttribute('aria-pressed', (!SERVER && likes[p.id]) ? 'true' : 'false');
	likeBtn.addEventListener('click', async () => {
		if (SERVER){
			try{
				const currentlyLiked = likeBtn.classList.contains('liked');
				const method = currentlyLiked ? 'DELETE' : 'POST';
				const r = await api(`/api/products/${p.id}/like`, { method });
				countEl.textContent = r.likes;
				likeBtn.classList.toggle('liked', !currentlyLiked);
				likeBtn.setAttribute('aria-pressed', (!currentlyLiked).toString());
				loadProducts();
			}catch(e){ alert(e.message); }
		}else{
			const l = store.likes; const wasLiked = !!l[p.id];
			if (wasLiked) { delete l[p.id]; } else { l[p.id] = 1; }
			store.likes = l;
			const base = (p.likes_count||0);
			countEl.textContent = base + (wasLiked ? 0 : 1);
			likeBtn.classList.toggle('liked', !wasLiked);
			likeBtn.setAttribute('aria-pressed', !wasLiked ? 'true' : 'false');
			loadProducts();
		}
	});

		// Admin controls
		const user = store.user;
			if (user?.is_admin){
			const adminBar = document.createElement('div');
			adminBar.className = 'admin-controls';
			const delBtn = document.createElement('button');
			delBtn.textContent = 'Delete';
			delBtn.className = 'danger';
			delBtn.addEventListener('click', (e)=>{
				e.stopPropagation();
				const hidden = new Set(store.hidden);
				hidden.add(p.id);
				store.hidden = Array.from(hidden);
				loadProducts();
			});
				// Restore hidden toggle appears only once in header; handled outside
			adminBar.appendChild(delBtn);
			node.appendChild(adminBar);
		}
	return node;
}

const storedState = (()=>{ try{ return JSON.parse(localStorage.getItem('filters')||'null') }catch{ return null } })();
let state = storedState || { tab:'popular', sub:'liked', range:'30' };

function applyFilters(){
	const likes = store.likes;
	const arr = (window.__SERVER_PRODUCTS__ || DATA).map(p=>({ ...p, likes_augmented: (p.likes_count||0) + (SERVER ? 0 : (likes[p.id]?1:0)) }));

	// Primary tab filter
	let filtered = arr.slice();
	if (state.tab === 'cloneable') filtered = filtered.filter(p => p.cloneable);
	if (state.tab === 'recent') {
		// Optional date range filter
		if (state.range && state.range !== 'all'){
			const days = parseInt(state.range,10);
			const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-days);
			filtered = filtered.filter(p => new Date(p.date) >= cutoff);
		}
		filtered = filtered.slice().sort((a,b)=> new Date(b.date) - new Date(a.date));
	}

	// Sub filter / sort
		if (state.sub === 'liked') filtered = filtered.slice().sort((a,b)=> b.likes_augmented - a.likes_augmented);
		if (state.sub === 'recent') filtered = filtered.slice().sort((a,b)=> new Date(b.date) - new Date(a.date));
		if (state.sub === 'viewed') filtered = filtered.slice().sort((a,b)=> (b.views||0) - (a.views||0));

	return filtered;
}

function loadProducts(){
	grid.innerHTML = '';
		// Apply admin hidden filter
		const hidden = new Set(store.hidden);
			const items = applyFilters().filter(p => !hidden.has(p.id));
	items.forEach(p => grid.appendChild(renderCard(p)));
}

// Tabs/Subtabs behavior
document.querySelector('.tabs').addEventListener('click', (e)=>{
	const btn = e.target.closest('.tab'); if(!btn) return;
	document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
	btn.classList.add('active');
	state.tab = btn.dataset.tab;
	// Toggle date filter bar visibility for Recent
	const bar = document.getElementById('dateFilterBar');
	bar.classList.toggle('hidden', state.tab !== 'recent');
	persistState();
	loadProducts();
});

document.querySelector('.subtabs').addEventListener('click', (e)=>{
	const btn = e.target.closest('.subtab'); if(!btn) return;
	document.querySelectorAll('.subtab').forEach(b=>b.classList.remove('active'));
	btn.classList.add('active');
	state.sub = btn.dataset.sub;
		persistState();
	loadProducts();
});

	// Date range change
	const rangeSel = document.getElementById('recentRange');
	rangeSel.addEventListener('change', ()=>{ state.range = rangeSel.value; persistState(); loadProducts(); });

	function persistState(){ localStorage.setItem('filters', JSON.stringify(state)); }

// Fake auth using localStorage
const authDialog = document.getElementById('authDialog');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const logoutBtn = document.getElementById('logoutBtn');
const profile = document.getElementById('profile');
const profileName = document.getElementById('profileName');
const adminLinkEl = document.getElementById('adminLink');
const createBtn = document.getElementById('createCardBtn');
const createDialog = document.getElementById('createDialog');
const createForm = document.getElementById('createForm');

loginBtn?.addEventListener('click', () => authDialog.showModal());
signupBtn?.addEventListener('click', () => authDialog.showModal());
logoutBtn?.addEventListener('click', () => { store.user = null; syncMe(); });

// Close dialog when clicking outside modal content
authDialog?.addEventListener('click', (e)=>{ if (e.target === authDialog) authDialog.close(); });

document.getElementById('doLogin')?.addEventListener('click', (e) => {
	e.preventDefault();
	const f = document.getElementById('loginForm');
	const body = Object.fromEntries(new FormData(f));
	const acct = getUserByEmail(body.epasts);
	if (!acct){
		f.reportValidity();
		alert('Account not found. Please register first.');
		return;
	}
	if (acct.parole !== body.parole){
		alert('Incorrect password.');
		return;
	}
	store.user = { vards: acct.vards || 'User', uzvards: acct.uzvards || '', epasts: acct.epasts, is_admin: !!acct.is_admin };
	authDialog.close();
	syncMe();
});

document.getElementById('doRegister')?.addEventListener('click', (e) => {
	e.preventDefault();
	const f = document.getElementById('registerForm');
	const body = Object.fromEntries(new FormData(f));
	// Validate
	const { valid, reasons } = evaluatePassword(body.parole, body.epasts);
	if (!valid){
		alert('Weak password:\n- ' + reasons.join('\n- '));
		return;
	}
	if (getUserByEmail(body.epasts)){
		alert('User already exists.');
		return;
	}
	const isAdmin = body.epasts?.toLowerCase() === 'admin@example.com';
	const acct = { vards: body.vards || 'User', uzvards: body.uzvards || '', epasts: body.epasts, parole: body.parole, is_admin: isAdmin };
	saveUser(acct);
	alert(isAdmin ? 'Admin account created. You can now log in.' : 'Registered! You can now log in.');
});

function syncMe(){
	const user = store.user;
	// If stored user no longer exists in users registry, sign out
	if (user && !getUserByEmail(user.epasts)){
		store.user = null;
		return syncMe();
	}
	if (user){
		profile.classList.remove('hidden');
		loginBtn.style.display = 'none';
		signupBtn.style.display = 'none';
			profileName.textContent = `${user.vards||'User'}${user.is_admin?' (Admin)':''}`;
			adminLinkEl?.classList.toggle('hidden', !user.is_admin);
			createBtn?.classList.remove('hidden');
	}else{
		profile.classList.add('hidden');
		loginBtn.style.display = '';
		signupBtn.style.display = '';
			adminLinkEl?.classList.add('hidden');
			createBtn?.classList.add('hidden');
	}
}

(async function init(){
	await detectServer();
	if (SERVER){
		try{
			const list = await api('/api/products');
			window.__SERVER_PRODUCTS__ = list.map(p=>({ id:p.id, title:p.title, author:p.author, cover_url:p.cover_url, likes_count:p.likes_count, cloneable:!!p.cloneable, date: (p.created_at||'').slice(0,10), views:0, comments:0 }));
			const me = await api('/api/me'); if (me.user) store.user = me.user;
		}catch(e){ console.warn('Server detected but failed:', e); SERVER = false; }
	}
	// Restore active classes from state
	const tab = document.querySelector(`.tab[data-tab="${state.tab}"]`) || document.querySelector('.tab');
	const sub = document.querySelector(`.subtab[data-sub="${state.sub}"]`) || document.querySelector('.subtab');
	document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active')); tab.classList.add('active');
	document.querySelectorAll('.subtab').forEach(b=>b.classList.remove('active')); sub.classList.add('active');
	const bar = document.getElementById('dateFilterBar'); bar.classList.toggle('hidden', state.tab !== 'recent');
	const rangeSel = document.getElementById('recentRange'); if (state.range) rangeSel.value = state.range;
	syncMe();
	loadProducts();
})();

// Live password feedback for register form using constraint API
(function setupPasswordHints(){
	const regPw = document.querySelector('#registerForm input[name="parole"]');
	const regEmail = document.querySelector('#registerForm input[name="epasts"]');
	const submit = document.getElementById('doRegister');
	if (!regPw || !submit) return;
	function validate(){
		const { valid, reasons } = evaluatePassword(regPw.value, regEmail?.value);
		regPw.setCustomValidity(valid ? '' : reasons.join('. '));
		submit.disabled = !valid;
	}
	regPw.addEventListener('input', validate);
	regEmail?.addEventListener('input', validate);
	validate();
})();

// Create card flow (client-side)
createBtn?.addEventListener('click', ()=>{
	if (!store.user){ alert('Please log in to create a card.'); return; }
	createDialog.showModal();
});
createDialog?.addEventListener('click', (e)=>{ if (e.target === createDialog) createDialog.close(); });
document.getElementById('doCreate')?.addEventListener('click', (e)=>{
	e.preventDefault();
	const data = Object.fromEntries(new FormData(createForm));
	if (!data.title || !data.cover_url){ createForm.reportValidity(); return; }
	const nextId = Math.max(...DATA.map(p=>p.id), 0) + Math.floor(Math.random()*1000+1);
	const newCard = {
		id: nextId,
		title: data.title,
		author: store.user?.vards || 'User',
		cover_url: data.cover_url,
		description: data.description || '',
		cloneable: !!data.cloneable,
		date: new Date().toISOString().slice(0,10),
		views: 0, comments: 0, likes_count: 0,
		owner: store.user?.epasts
	};
	const cards = store.userCards; cards.push(newCard); store.userCards = cards;
	// Merge user cards into runtime dataset for rendering
	DATA.push(newCard);
	createDialog.close();
	loadProducts();
});

// Admin toolbar: simple restore and user deletion controls injected above the grid
(function injectAdminToolbar(){
	const ctr = document.createElement('div');
	ctr.id = 'adminToolbar';
	ctr.style.cssText = 'display:none;justify-content:space-between;align-items:center;margin:8px 0;padding:8px 12px;border:1px solid #e5e7eb;border-radius:10px;background:#fafafa';
	ctr.innerHTML = `
		<div><strong>Admin tools</strong></div>
		<div style="display:flex;gap:8px;align-items:center">
			<button id="restoreAll" class="primary">Restore Deleted Cards</button>
			<button id="manageUsers" class="primary" style="background:#ef4444;border-color:#ef4444">Delete User</button>
		</div>`;
	const container = document.querySelector('.container');
	container.insertBefore(ctr, document.getElementById('grid'));

	function refresh(){
		const u = store.user; ctr.style.display = (u && u.is_admin) ? 'flex' : 'none';
	}
	refresh();
	// Hook into syncMe to refresh toolbar visibility as well
	const origSync = syncMe;
	syncMe = function(){ origSync(); refresh(); }

	document.getElementById('restoreAll').addEventListener('click', ()=>{
		store.hidden = [];
		loadProducts();
	});
	document.getElementById('manageUsers').addEventListener('click', ()=>{
		const users = store.users; const emails = Object.keys(users);
		const choice = prompt('Enter email to delete:\n' + emails.join('\n'));
		if (!choice) return;
		const confirmed = confirm('Delete user and their cards?');
		if (!confirmed) return;
		// Remove user and sign them out if current
		const u = store.users; delete u[choice.toLowerCase()]; store.users = u;
		if (store.user?.epasts?.toLowerCase() === choice.toLowerCase()) store.user = null;
		// Remove their cards
		const remaining = (store.userCards || []).filter(c => (c.owner||'').toLowerCase() !== choice.toLowerCase());
		store.userCards = remaining;
		// Remove from runtime DATA as well
		for (let i = DATA.length-1; i>=0; i--){ if ((DATA[i].owner||'').toLowerCase() === choice.toLowerCase()) DATA.splice(i,1); }
		loadProducts(); syncMe();
	});
})();

