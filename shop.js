(()=>{
 'use strict';
 const key='joey-downey-cart-v1';
 const products=window.JD_SHOP_PRODUCTS||[];
 const catalog=new Map(products.filter(p=>p.available).map(p=>[p.id,p]));
 const normalize=value=>Array.isArray(value)?[...new Set(value.filter(id=>typeof id==='string'&&catalog.has(id)))]:[];
 const subtotal=ids=>normalize(ids).reduce((sum,id)=>sum+catalog.get(id).price,0);
 // Cart storage contains product IDs only; do not restore prices from storage.
 function checkoutFields(value,fulfillment,email,origin,address={}){
  const selected=normalize(value),config=window.JD_SHOP_CONFIG||{};
  if(!selected.length||!config.merchant||!Number.isFinite(config.shipping))throw Error('Checkout is not ready.');
  if(!['pickup','shipping'].includes(fulfillment))throw Error('Choose pickup or shipping.');
  const fields={cmd:'_cart',upload:'1',business:config.merchant,currency_code:config.currency||'USD',charset:'utf-8',no_shipping:fulfillment==='pickup'?'1':'2',email,custom:fulfillment==='pickup'?'Local pickup: Edinboro, PA':'Ship order',return:new URL('cart.html?payment=returned',origin).href,cancel_return:new URL('cart.html?payment=cancelled',origin).href};
  if(fulfillment==='shipping'){
   for(const name of ['first_name','last_name','address1','city','zip','country'])if(!String(address[name]||'').trim())throw Error('Complete your shipping address.');
   if(String(address.country).toUpperCase()!=='US')throw Error('Shipping is currently available within the USA only.');
   if(!/^[0-9]{5}(-[0-9]{4})?$/.test(String(address.zip).trim()))throw Error('Enter a valid US ZIP code.');
   if(['US','CA'].includes(String(address.country).toUpperCase())&&!String(address.state||'').trim())throw Error('Enter your state or province.');
   for(const name of ['first_name','last_name','address1','address2','city','state','zip','country'])fields[name]=String(address[name]||'').trim();
   fields.country=fields.country.toUpperCase();
  }
  selected.forEach((id,index)=>{const p=catalog.get(id),n=index+1;fields['item_name_'+n]=p.title;fields['item_number_'+n]=p.id;fields['amount_'+n]=p.price.toFixed(2);fields['quantity_'+n]='1';fields['shipping_'+n]=index===0&&fulfillment==='shipping'?config.shipping.toFixed(2):'0.00';fields['shipping2_'+n]='0.00';});
  return fields;
 }
 window.JDShop={normalize,subtotal,checkoutFields};
 let emailComplete=false,deliveryComplete=false;
 let ids=[];try{ids=normalize(JSON.parse(localStorage.getItem(key)||'[]'));}catch{}
 const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
 function save(){try{localStorage.setItem(key,JSON.stringify(ids));}catch{}render();}
 function add(id){if(!catalog.has(id))return false;ids=normalize([...ids,id]);save();return true;}
 function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
 function render(){
  document.querySelectorAll('[data-cart-count]').forEach(el=>{el.textContent=String(ids.length);});
  document.querySelectorAll('.shop-cart-link').forEach(el=>el.setAttribute('aria-label',`Shopping cart, ${ids.length} ${ids.length===1?'item':'items'}`));
  const list=document.getElementById('shop-order-items');if(!list)return;
  list.replaceChildren();
  for(const id of ids){const p=catalog.get(id),row=node('div','shop-order-item'),image=node('img');image.src=p.image;image.alt=p.title;image.width=80;image.height=80;
   const body=node('div','shop-order-item-body');body.append(node('p','shop-product-name',p.title),node('small','', 'Quantity: 1'));
   const remove=node('button','shop-remove','Remove');remove.type='button';remove.setAttribute('aria-label','Remove '+p.title);remove.addEventListener('click',()=>{ids=ids.filter(item=>item!==id);save();document.getElementById('shop-summary-heading').focus();});body.append(remove);
   row.append(image,body,node('strong','shop-line-price',money(p.price)));list.append(row);
  }
  const empty=ids.length===0;document.getElementById('shop-empty').hidden=!empty;document.getElementById('shop-checkout').hidden=empty;
  document.querySelectorAll('[data-cart-subtotal]').forEach(el=>el.textContent=money(subtotal(ids)));
  const config=window.JD_SHOP_CONFIG||{};const ready=!!config.merchant&&Number.isFinite(config.shipping);
  const pay=document.getElementById('shop-paypal');pay.disabled=empty||!ready||!emailComplete||!deliveryComplete;
  document.getElementById('shop-payment-status').hidden=ready;
  const fulfillment=document.querySelector('input[name="fulfillment"]:checked')?.value;
  const pickup=fulfillment==='pickup';
  const shipping=document.getElementById('shop-shipping');shipping.textContent=!fulfillment?'Choose delivery':pickup?'Free pickup — Edinboro, PA':typeof config.shipping==='number'?money(config.shipping):'Calculated for your destination';
  document.getElementById('shop-total-label').textContent=typeof config.shipping==='number'?'Total before any applicable tax':'Items total';
  document.getElementById('shop-total').textContent=money(subtotal(ids)+(fulfillment==='shipping'&&typeof config.shipping==='number'?config.shipping:0));
 }
 document.addEventListener('DOMContentLoaded',()=>{
  const header=document.querySelector('header');
  if(header){const link=node('a','shop-cart-link');link.href='cart.html';link.innerHTML='<svg aria-hidden="true" width="20" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></svg><span class="shop-cart-label">Cart</span><span data-cart-count aria-live="polite" aria-atomic="true">0</span>';document.body.append(link);}
  const lb=document.getElementById('lightbox');let current=null;
  if(lb&&document.querySelector('[data-full^="cups/" ]')){
   const actions=node('div','shop-artwork-actions');const buy=node('button','shop-button shop-primary','Buy Now');const addButton=node('button','shop-button','Add to Cart');buy.type=addButton.type='button';const status=node('p','shop-cart-feedback');status.setAttribute('role','status');actions.append(buy,addButton);
   const caption=document.getElementById('lb-caption');caption.append(actions,status);actions.hidden=true;
   const sync=()=>{current=products.find(p=>p.title===document.getElementById('lb-title').textContent);actions.hidden=!current?.available;status.textContent='';addButton.textContent=current&&ids.includes(current.id)?'In Cart':'Add to Cart';};
   new MutationObserver(sync).observe(document.getElementById('lb-title'),{childList:true,subtree:true,characterData:true});
   addButton.addEventListener('click',()=>{if(current&&add(current.id)){addButton.textContent='In Cart';status.textContent=current.title+' is in your cart.';}});
   buy.addEventListener('click',()=>{if(current&&add(current.id))location.assign('cart.html');});
  }
  const emailForm=document.getElementById('shop-email-form'),deliveryForm=document.getElementById('shop-delivery-form');
  const deliveryStep=document.getElementById('shop-delivery'),paymentStep=document.getElementById('shop-payment');
  const syncGates=()=>{
   for(const [step,unlocked] of [[deliveryStep,emailComplete],[paymentStep,emailComplete&&deliveryComplete]]){
    if(!step)continue;const summary=step.querySelector('summary');summary.setAttribute('aria-disabled',String(!unlocked));summary.tabIndex=unlocked?0:-1;if(!unlocked)step.open=false;
   }render();
  };
  for(const [step,allowed] of [[deliveryStep,()=>emailComplete],[paymentStep,()=>emailComplete&&deliveryComplete]]){
   step?.querySelector('summary').addEventListener('click',event=>{if(!allowed())event.preventDefault();});
   step?.addEventListener('toggle',()=>{if(step.open&&!allowed())step.open=false;});
  }
  emailForm?.addEventListener('input',()=>{emailComplete=false;deliveryComplete=false;syncGates();});
  emailForm?.addEventListener('submit',event=>{event.preventDefault();if(!emailForm.reportValidity())return;emailComplete=true;syncGates();document.getElementById('shop-email-step').open=false;deliveryStep.open=true;deliveryStep.querySelector('summary').focus();});
  const shippingFields=document.getElementById('shop-address');
  const updateAddress=()=>{
   if(!deliveryForm)return;const shipping=deliveryForm.querySelector('input[name="fulfillment"]:checked')?.value==='shipping';
   shippingFields.hidden=!shipping;shippingFields.disabled=!shipping;
   const country=deliveryForm.elements.country.value.trim().toUpperCase();deliveryForm.elements.state.required=['US','CA'].includes(country);
  };
  deliveryForm?.addEventListener('input',()=>{deliveryComplete=false;updateAddress();syncGates();});
  deliveryForm?.addEventListener('change',()=>{deliveryComplete=false;updateAddress();syncGates();});
  deliveryForm?.addEventListener('submit',event=>{
   event.preventDefault();if(!emailComplete)return;updateAddress();if(!deliveryForm.reportValidity())return;
   const mode=deliveryForm.querySelector('input[name="fulfillment"]:checked')?.value;if(!mode)return;
   const fields=Array.from(shippingFields.querySelectorAll('input[required]')).filter(input=>!input.value.trim());if(mode==='shipping'&&fields.length){fields[0].value='';fields[0].reportValidity();fields[0].focus();return;}
   deliveryComplete=true;syncGates();deliveryStep.open=false;paymentStep.open=true;paymentStep.querySelector('summary').focus();
  });
  updateAddress();syncGates();
  document.getElementById('shop-paypal')?.addEventListener('click',()=>{
   const config=window.JD_SHOP_CONFIG||{};if(!ids.length||!config.merchant||!Number.isFinite(config.shipping)||!emailComplete||!deliveryComplete)return;
   const email=document.getElementById('shop-email');if(!email.checkValidity()){email.reportValidity();email.focus();return;}
   // PayPal Payments Standard cart upload. Payment is completed on PayPal.
   // A return URL is not proof of payment; orders are confirmed in PayPal.
   const button=document.getElementById('shop-paypal'),status=document.getElementById('shop-payment-status');button.disabled=true;
   try{
    const fulfillment=document.querySelector('input[name="fulfillment"]:checked')?.value;
    if(!deliveryForm.reportValidity())return;
    const address={};shippingFields.querySelectorAll('input[name],select[name]').forEach(input=>address[input.name]=input.value.trim());
    const fields=checkoutFields(ids,fulfillment,email.value,location.href,address);
    const form=node('form');form.method='POST';form.action='https://www.paypal.com/cgi-bin/webscr';
    Object.entries(fields).forEach(([name,value])=>{const input=node('input');input.type='hidden';input.name=name;input.value=value;form.append(input);});
    document.body.append(form);form.submit();
   }catch(error){status.hidden=false;status.textContent=error.message||'Checkout is unavailable. Please try again.';button.disabled=false;}
  });
  const result=document.getElementById('shop-return-message');if(result){const status=new URLSearchParams(location.search).get('payment');if(status){result.hidden=false;result.textContent=status==='cancelled'?'Checkout was cancelled. Your cart is saved.':'You have returned from PayPal. Check your PayPal receipt for payment confirmation.';}}
  render();
 });
 window.addEventListener('storage',event=>{if(event.key===key){try{ids=normalize(JSON.parse(event.newValue||'[]'));}catch{ids=[];}render();}});
})();
