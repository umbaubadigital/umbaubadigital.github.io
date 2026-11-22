
document.documentElement.classList.add('js');
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('on');io.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll('.rv').forEach(el=>io.observe(el));
(function(){
 var g=document.getElementById('ticks'); if(!g) return;
 var cx=230,cy=270,n=150,s='';
 for(var i=0;i<n;i++){
  var a=i/n*Math.PI*2, w=.5+.5*Math.sin(a*3-1), r1=150, r2=150+26+42*w;
  var x1=cx+r1*Math.cos(a),y1=cy+r1*Math.sin(a),x2=cx+r2*Math.cos(a),y2=cy+r2*Math.sin(a);
  s+='<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+(w>.55?'#533c27':'#d9c9ae')+'" stroke-width="2.2" stroke-linecap="round" opacity="'+(.45+.55*w).toFixed(2)+'"/>';
 }
 g.innerHTML=s;
})();

(function(){
 var L=document.querySelector('.hist-l'); if(!L) return;
 var caps=[].slice.call(document.querySelectorAll('.cap')), cur=-1;
 var bn=document.getElementById('bn'),bt=document.getElementById('bt'),bp=document.getElementById('bp'),bl=document.getElementById('bl'),blt=document.getElementById('blt');
 var dots=[].slice.call(document.querySelectorAll('.prog button'));
 function mostra(i){ if(i===cur) return; cur=i; var c=caps[i];
  L.classList.add('sai');
  setTimeout(function(){bn.textContent=c.dataset.n;bt.textContent=c.dataset.t;bp.textContent=c.dataset.p;bl.href=c.dataset.href;blt.textContent=c.dataset.lab;L.classList.remove('sai');},180);
  dots.forEach(function(d,k){d.setAttribute('aria-current',k===i?'true':'false')});
 }
 var io2=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting) mostra(caps.indexOf(e.target))})},{rootMargin:'-45% 0px -45% 0px'});
 caps.forEach(function(c){io2.observe(c)});
 dots.forEach(function(d){d.addEventListener('click',function(){caps[+d.dataset.i].scrollIntoView({behavior:'smooth',block:'center'})})});
 /* inclinação suave das pranchas com o mouse */
 if(matchMedia('(hover:hover)').matches&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
  document.querySelectorAll('.prancha').forEach(function(p){
   p.addEventListener('mousemove',function(e){var r=p.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;p.style.transform='perspective(1100px) rotateY('+(x*7)+'deg) rotateX('+(-y*7)+'deg) scale(1.015)'});
   p.addEventListener('mouseleave',function(){p.style.transform=''});
  });
 }
})();

(function(){
 var root=document.getElementById('pn'); if(!root) return;
 var ps=[].slice.call(root.querySelectorAll('.pnl')),bar=document.getElementById('pnBar'),num=document.getElementById('pnNum');
 var cur=0,T=5200,t0=0,raf=0,pausa=false,red=matchMedia('(prefers-reduced-motion:reduce)').matches;
 function vai(i){cur=(i+ps.length)%ps.length;ps.forEach(function(p,k){p.classList.toggle('on',k===cur)});num.textContent=cur+1;t0=performance.now();}
 function loop(now){ if(!pausa&&!red){var k=Math.min(1,(now-t0)/T);bar.style.transform='scaleX('+k+')';if(k>=1)vai(cur+1);} else if(!pausa&&red){bar.style.transform='scaleX(1)'} raf=requestAnimationFrame(loop);}
 ps.forEach(function(p,k){
  p.addEventListener('mouseenter',function(){if(matchMedia('(hover:hover)').matches){pausa=true;if(k!==cur)vai(k)}});
  p.addEventListener('mouseleave',function(){pausa=false;t0=performance.now()});
  p.addEventListener('focus',function(){pausa=true;vai(k)});p.addEventListener('blur',function(){pausa=false;t0=performance.now()});
  p.addEventListener('click',function(e){if(k!==cur&&!matchMedia('(hover:hover)').matches){e.preventDefault();vai(k)}});
 });
 document.getElementById('pnPrev').onclick=function(){vai(cur-1)};document.getElementById('pnNext').onclick=function(){vai(cur+1)};
 vai(0);raf=requestAnimationFrame(loop);
 /* arrastar para os lados */
 var sx=null;root.addEventListener('pointerdown',function(e){sx=e.clientX});root.addEventListener('pointerup',function(e){if(sx===null)return;var d=e.clientX-sx;sx=null;if(Math.abs(d)>60)vai(cur+(d<0?1:-1))});
})();

(function(){
 var ad=document.getElementById('ad'),al=document.getElementById('adAlca'); if(!ad) return;
 var v=50,drag=false,anim=0,red=matchMedia('(prefers-reduced-motion:reduce)').matches;
 function set(x){v=Math.max(4,Math.min(96,x));ad.style.setProperty('--p',v+'%');al.setAttribute('aria-valuenow',Math.round(v))}
 function pos(e){var r=ad.getBoundingClientRect();set((e.clientX-r.left)/r.width*100)}
 ad.addEventListener('pointerdown',function(e){drag=true;cancelAnimationFrame(anim);ad.setPointerCapture(e.pointerId);pos(e)});
 ad.addEventListener('pointermove',function(e){if(drag)pos(e)});
 ad.addEventListener('pointerup',function(){drag=false});
 al.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'){set(v-5);e.preventDefault()}if(e.key==='ArrowRight'){set(v+5);e.preventDefault()}});
 /* varredura inicial, para mostrar que mexe */
 if(!red){var o=new IntersectionObserver(function(es){if(es[0].isIntersecting){o.disconnect();var t0=performance.now();(function f(n){if(drag)return;var k=(n-t0)/2600;if(k>=1){set(50);return}set(50+38*Math.sin(k*Math.PI*2)*(1-k*.3));anim=requestAnimationFrame(f)})(t0)}},{threshold:.5});o.observe(ad)}
})();

(function(){
 var xw=document.getElementById('xw'); if(xw){
  var cs=[].slice.call(xw.querySelectorAll('.xc')),hv=matchMedia('(hover:hover)').matches;
  function ab(c){cs.forEach(function(x){x.classList.toggle('on',x===c)})}
  cs.forEach(function(c){
   c.addEventListener('mouseenter',function(){if(hv)ab(c)});
   c.addEventListener('focus',function(){ab(c)});
   c.addEventListener('click',function(e){if(!c.classList.contains('on')){e.preventDefault();ab(c)}});
  });
 }
 var tl=document.getElementById('tl'); if(tl){
  var its=[].slice.call(tl.querySelectorAll('.ti'));
  function up(){var r=tl.getBoundingClientRect(),mid=innerHeight*.55,h=Math.max(0,Math.min(r.height,mid-r.top));tl.style.setProperty('--h',h+'px');
   its.forEach(function(i){var n=i.querySelector('.tn').getBoundingClientRect();i.classList.toggle('on',n.top+n.height/2<mid)})}
  addEventListener('scroll',up,{passive:true});addEventListener('resize',up);up();
 }
})();
