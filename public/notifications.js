export function toast(message, type='info'){
  let wrap = document.getElementById('toasts');
  if(!wrap){
    wrap = document.createElement('div');
    wrap.id='toasts';
    Object.assign(wrap.style,{position:'fixed',right:'16px',top:'16px',display:'grid',gap:'8px',zIndex:9999});
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.textContent = message;
  el.style.cssText = 'background:#111;color:#fff;padding:10px 12px;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.2);max-width:280px';
  if(type==='error') el.style.background = '#b91c1c';
  if(type==='success') el.style.background = '#15803d';
  wrap.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(),300); }, 2500);
}
