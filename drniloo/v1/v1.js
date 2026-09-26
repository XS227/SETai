(() => {
  const items = document.querySelectorAll('.enter');
  const io = new IntersectionObserver(entries => entries.forEach(e => { if(e.isIntersecting)e.target.classList.add('in'); }), {threshold:.14});
  items.forEach((el,i)=>{ el.style.transitionDelay=`${Math.min(i%4,3)*80}ms`; io.observe(el); });
  const bar=document.getElementById('bar');
  const onScroll=()=>{const m=document.documentElement.scrollHeight-innerHeight;bar.style.width=`${m?scrollY/m*100:0}%`;};
  addEventListener('scroll',onScroll,{passive:true});onScroll();
})();
