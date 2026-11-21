/* faixa de azulejo no fim da página: formas simples, na paleta da marca */
(function(){
  var svg=document.getElementById('padrao'),S=64,BG=['#f6f0e7','#ede4d6','#d9c9ae','#f6f0e7'],FG=['#28361b','#533c27','#031d1c','#d9c9ae','#28361b'],s=41,h='';
  var F=[function(c){return '<path d="M0 0H64A64 64 0 0 1 0 64Z" fill="'+c+'"/>'},function(c){return '<path d="M0 64A32 32 0 0 1 64 64Z" fill="'+c+'"/>'},function(c){return '<path d="M0 0H64V64Z" fill="'+c+'"/>'},function(c){return '<circle cx="32" cy="32" r="21" fill="'+c+'"/>'},function(c){return '<path d="M0 0H32A32 32 0 0 1 0 32Z M64 64H32A32 32 0 0 1 64 32Z" fill="'+c+'"/>'}];
  function r(){s=(s*1664525+1013904223)%4294967296;return s/4294967296}
  for(var y=0;y<2;y++)for(var x=0;x<20;x++){var bg=BG[Math.floor(r()*BG.length)],fg=FG[Math.floor(r()*FG.length)];if(fg===bg)fg='#28361b';
    h+='<g transform="translate('+x*S+','+y*S+')"><g class="tl" style="--c:'+(x+(y%2))+'"><rect width="64" height="64" fill="'+bg+'"/><g transform="rotate('+Math.floor(r()*4)*90+' 32 32)">'+F[Math.floor(r()*F.length)](fg)+'</g></g></g>'}
  svg.innerHTML=h})();

(function(){
  var topo=document.getElementById('topo'),bt=document.getElementById('bt-serv'),mega=document.getElementById('mega'),mb=document.getElementById('menu-bt'),gv=document.getElementById('gaveta');
  function fechaMega(){bt.setAttribute('aria-expanded','false');mega.classList.remove('on')}
  function fechaGaveta(){mb.setAttribute('aria-expanded','false');gv.classList.remove('on');document.body.style.overflow=''}
  bt.addEventListener('click',function(e){e.stopPropagation();var a=bt.getAttribute('aria-expanded')==='true';a?fechaMega():(bt.setAttribute('aria-expanded','true'),mega.classList.add('on'))});
  mb.addEventListener('click',function(){var a=mb.getAttribute('aria-expanded')==='true';if(a){fechaGaveta()}else{mb.setAttribute('aria-expanded','true');gv.classList.add('on');document.body.style.overflow='hidden'}});
  gv.addEventListener('click',function(e){if(e.target.closest('a'))fechaGaveta()});
  mega.addEventListener('click',function(e){if(e.target.closest('a'))fechaMega()});
  document.addEventListener('click',function(e){if(!e.target.closest('#mega')&&!e.target.closest('#bt-serv'))fechaMega()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){fechaMega();fechaGaveta()}});
  /* painel de serviços: passar o mouse, focar ou tocar abre o descritivo; as setas do teclado trocam de serviço */
  var abas=[].slice.call(mega.querySelectorAll('.mg-it')),paineis=[].slice.call(mega.querySelectorAll('.mg-p'));
  function escolhe(k,foco){abas.forEach(function(a){var on=a.dataset.mg===k;a.setAttribute('aria-selected',on?'true':'false');a.tabIndex=on?0:-1;if(on&&foco)a.focus()});paineis.forEach(function(p){p.classList.toggle('on',p.id==='mg-p-'+k)})}
  abas.forEach(function(a,i){
    a.addEventListener('mouseenter',function(){escolhe(a.dataset.mg)});
    a.addEventListener('focus',function(){escolhe(a.dataset.mg)});
    a.addEventListener('click',function(){escolhe(a.dataset.mg)});
    a.addEventListener('keydown',function(e){if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();escolhe(abas[(i+(e.key==='ArrowDown'?1:abas.length-1))%abas.length].dataset.mg,true)}});
  });
  function rol(){topo.classList.toggle('solido',scrollY>40)}addEventListener('scroll',rol,{passive:true});rol();
  var q=new URLSearchParams(location.search);if(q.get('abrir')==='servicos'){bt.setAttribute('aria-expanded','true');mega.classList.add('on')}if(q.get('abrir')==='menu'){mb.setAttribute('aria-expanded','true');gv.classList.add('on')}
  /* animação de rolagem: as seções brotam */
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('on');io.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -6% 0px'});
  document.querySelectorAll('.brota,#azulejo').forEach(function(el){io.observe(el)});
  if(/[?&]todos/.test(location.search))document.querySelectorAll('.brota,#azulejo').forEach(function(el){el.classList.add('on')});
})();
/* estatísticas: eventos de clique e aviso de cookies (mesmo comportamento do site anterior) */
(function(){
  var d=document;
  d.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[data-ev]');if(a&&window.dataLayer){dataLayer.push({event:'clique_'+a.getAttribute('data-ev'),pagina:location.pathname})}});
  var ck=d.getElementById('cookies');if(!ck)return;
  function esc(v){try{localStorage.setItem('ub-consent',v)}catch(e){}ck.hidden=true;if(v==='sim'&&window.gtag){gtag('consent','update',{analytics_storage:'granted'})}}
  var s=null;try{s=localStorage.getItem('ub-consent')}catch(e){}
  if(!s)ck.hidden=false;
  d.getElementById('ck-sim').addEventListener('click',function(){esc('sim')});
  d.getElementById('ck-nao').addEventListener('click',function(){esc('nao')});
})();