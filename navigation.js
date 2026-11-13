(()=> {
  const root=document.documentElement;
  const key="joey-navigation";
  const isHome=path=>/\/(?:index\.html)?$/.test(path);
  const reduced=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
  function takeNavigation(){
    try{
      const value=JSON.parse(sessionStorage.getItem(key)||"null");
      sessionStorage.removeItem(key);
      if(value&&value.to===location.pathname&&Date.now()-value.time<15000)return value;
    }catch{}
    return null;
  }
  function animateArrival(fromHome){
    root.classList.remove("home-nav-enter","home-nav-leave","home-nav-pending");
    if(!fromHome||isHome(location.pathname)||reduced())return;
    root.classList.add("home-nav-pending");
    const start=()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
      root.classList.remove("home-nav-pending");
      root.classList.add("home-nav-enter");
    }));
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
    else start();
  }
  const arrival=takeNavigation();
  let fromHome=arrival?isHome(arrival.from):false;
  if(!arrival){
    try{
      const previous=new URL(document.referrer);
      const navigation=performance.getEntriesByType("navigation")[0];
      fromHome=previous.origin===location.origin&&isHome(previous.pathname)&&(!navigation||navigation.type==="navigate");
    }catch{}
  }
  animateArrival(fromHome);
  let leaving=false;
  document.addEventListener("click",event=>{
    const link=event.target.closest?.("a");
    if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.hasAttribute("download")||(link.target&&link.target!=="_self"))return;
    const destination=new URL(link.href,location.href);
    if(destination.origin!==location.origin||(!/\.html$/.test(destination.pathname)&&!isHome(destination.pathname)))return;
    try{sessionStorage.setItem(key,JSON.stringify({from:location.pathname,to:destination.pathname,time:Date.now()}))}catch{}
    if(isHome(location.pathname)||!isHome(destination.pathname)||!link.matches(".home-nav,header>.brand")||reduced())return;
    event.preventDefault();
    if(leaving)return;
    leaving=true;
    root.classList.remove("home-nav-enter","home-nav-pending");
    void root.offsetWidth;
    root.classList.add("home-nav-leave");
    setTimeout(()=>location.assign(destination.href),400);
  });
  window.addEventListener("pageshow",event=>{
    leaving=false;
    root.classList.remove("home-nav-leave");
    if(event.persisted){
      const navigation=takeNavigation();
      animateArrival(!!navigation&&isHome(navigation.from));
    }
  });
})();
// Keep the Portfolio dropdown usable with touch, keyboard, and outside clicks.
document.addEventListener("DOMContentLoaded",()=>{
 const menu=document.querySelector(".portfolio-menu");if(!menu)return;
 document.addEventListener("click",event=>{if(!menu.contains(event.target))menu.open=false;});
 document.addEventListener("keydown",event=>{if(event.key==="Escape"&&menu.open){menu.open=false;menu.querySelector("summary").focus();}});
 menu.addEventListener("focusout",()=>{setTimeout(()=>{if(!menu.contains(document.activeElement))menu.open=false;},0);});
 document.querySelector(".menu")?.addEventListener("click",()=>{if(!document.querySelector(".nav")?.classList.contains("open"))menu.open=false;});
});
