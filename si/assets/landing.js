const q=(s)=>document.querySelector(s);
const header=q('.site-header');
let last=0;
addEventListener('scroll',()=>{
  const y=scrollY;
  header.style.transform=y>last&&y>180?'translateY(-100%)':'translateY(0)';
  header.style.transition='transform .28s ease';
  last=y;
},{passive:true});

const phone=q('.phone');
if(phone){
  addEventListener('pointermove',(e)=>{
    if(innerWidth<900)return;
    const x=(e.clientX/innerWidth-.5)*4;
    const y=(e.clientY/innerHeight-.5)*-3;
    phone.style.transform='rotate(2.4deg) rotateY('+x+'deg) rotateX('+y+'deg)';
  });
}
