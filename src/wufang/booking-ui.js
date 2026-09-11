import {routes,assetUrl} from './model.mjs';
import {bookingPrices,paymentMethods,orderStatuses,todayISO,addDays,monthAt,calendarDays,dateAvailability,bookingTotal,validateSelection,validateTravelers,createDemoOrder,applyPayment,cancelOrder,sanitizeOrders,money} from './booking.mjs';

const escape=(text='')=>String(text).replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const dateText=(date)=>date?`${date.slice(0,4)}.${date.slice(5,7)}.${date.slice(8,10)}`:'尚未选择';
const modeText=(mode)=>mode==='private'?'自选日期':'固定团期';
const steps=['date','travelers','review','payment','result'];
const labels=['选择日期','出行信息','确认订单','支付方式','支付结果'];

export function createBooking({dialog,visit,replace,getRoute,toast}) {
  const content=dialog.querySelector('#booking-content');
  const storageKey='wufang-demo-orders-v1';
  let orders=[];
  let storageAvailable=true;
  let savedOrders;
  try{savedOrders=localStorage.getItem(storageKey);}catch{storageAvailable=false;}
  try{orders=sanitizeOrders(JSON.parse(savedOrders||'null'));}catch{/* Ignore malformed demo records. */}
  let draft;
  let view;
  let month=0;
  let method='wechat';
  let errors={};
  let filter='all';
  let busy=false;
  let confirmCancel=false;
  let lastOrderId=null;

  const orderById=(id)=>orders.find((order)=>order.id===id);
  function freshDraft(){return {route:getRoute(),mode:'group',date:'',people:1,travelers:['','','','','',''],contact:'',phone:'',note:'',agreed:false};}
  function persist(){
    try{localStorage.setItem(storageKey,JSON.stringify({version:1,orders:orders.slice(0,30)}));storageAvailable=true;}
    catch{storageAvailable=false;toast('浏览器未允许保存；本次仍可演示，刷新后订单可能丢失。');}
  }
  function go(step,extra={}){errors={};confirmCancel=false;document.getElementById('toast')?.classList.remove('visible');visit({type:'booking',step,...extra});}
  function refresh(focusId){
    const scroll=content.querySelector('.booking-scroll')?.scrollTop||0;
    render(view);
    content.querySelector('.booking-scroll').scrollTop=scroll;
    if(focusId)document.getElementById(focusId)?.focus({preventScroll:true});
  }
  function fail(message){
    const box=content.querySelector('#booking-error');
    box.textContent=message;box.hidden=false;box.focus();
  }
  function saveOrder(order){orders=[order,...orders.filter((item)=>item.id!==order.id)].slice(0,30);persist();}
  function dateRange(item){return `${dateText(item.date)} — ${dateText(addDays(item.date,routes[item.route].daysCount))}`;}
  function footer(action,label,total,extra=''){
    return `<div class="booking-footer ${total===undefined?'is-neutral':''}"><div><small>${total===undefined?'WUFANG / 预订体验':'演示合计 · 不扣款'}</small><strong>${total===undefined?'下一程，待启。':money(total)}</strong></div><button class="button button-dark" data-booking-action="${action}" ${extra}>${label}<span aria-hidden="true">→</span></button></div>`;
  }
  function summary(item){
    const route=routes[item.route];
    return `<aside class="booking-summary"><img src="${assetUrl(route.image)}" alt="${route.imageAlt}"><div><p class="eyebrow">YOUR NEXT CHAPTER</p><h3>${route.shortTitle}</h3><p class="booking-caption">${route.daysCount} 天路线 + 1 天抵达 · 拉萨集合</p><dl><div><dt>出行方式</dt><dd>${modeText(item.mode)}</dd></div><div><dt>集合日期</dt><dd>${dateText(item.date)}</dd></div><div><dt>返程日期</dt><dd>${item.date?dateText(addDays(item.date,route.daysCount)):'待选择日期'}</dd></div><div><dt>出行人数</dt><dd>${item.people} 人</dd></div><div><dt>演示单价</dt><dd>${money(bookingPrices[item.route])} / 人</dd></div></dl><div class="booking-summary-total"><span>演示合计</span><strong>${money(bookingTotal(item.route,item.people))}</strong></div><p class="booking-caption">日期、余位、报价均为交互示例，不锁定真实名额。</p></div></aside>`;
  }
  function title(kicker,heading,description){return `<p class="eyebrow">${kicker}</p><h2 id="booking-title" tabindex="-1">${heading}</h2><p class="booking-intro">${description}</p>`;}
  function selection(){
    const today=todayISO();
    const currentMonth=monthAt(today,month);
    const available=draft.date?dateAvailability(draft.route,draft.mode,draft.date,today).seats:6;
    return `${title('01 / MAKE TIME FOR THE JOURNEY','给远方，留一段时间。','先选路线，再确定集合日。所有日期与余位均为演示。')}
      <div class="booking-route-options" role="group" aria-label="预订路线">${Object.entries(routes).map(([key,route])=>`<button id="book-route-${key}" data-booking-action="route" data-value="${key}" aria-pressed="${draft.route===key}"><b>${route.daysCount}<small> DAYS</small></b><span>${route.shortTitle}</span></button>`).join('')}</div>
      <div class="booking-modes" role="group" aria-label="选择日期方式"><button id="book-mode-group" data-booking-action="mode" data-value="group" aria-pressed="${draft.mode==='group'}">跟随固定团期</button><button id="book-mode-private" data-booking-action="mode" data-value="private" aria-pressed="${draft.mode==='private'}">自己定日期</button></div>
      <div class="booking-calendar"><div class="calendar-heading"><div><span>集合日 / ARRIVAL</span><h3>${currentMonth.slice(0,4)} 年 ${Number(currentMonth.slice(5))} 月</h3></div><div><button class="icon-button" id="book-month-prev" data-booking-action="month" data-value="-1" aria-label="上个月" ${month===0?'disabled':''}>←</button><button class="icon-button" id="book-month-next" data-booking-action="month" data-value="1" aria-label="下个月" ${month===2?'disabled':''}>→</button></div></div>
      <div class="calendar-week" aria-hidden="true">${['一','二','三','四','五','六','日'].map((day)=>`<span>${day}</span>`).join('')}</div><div class="calendar-days" role="group" aria-label="${currentMonth} 集合日期">${calendarDays(currentMonth).map((date)=>{
        if(!date)return '<span></span>';
        const availability=dateAvailability(draft.route,draft.mode,date,today);
        return `<button id="book-date-${date}" data-booking-action="date" data-value="${date}" aria-pressed="${draft.date===date}" aria-label="${date}，${availability.label}${draft.date===date?'，已选择':''}" ${availability.seats?'':'disabled'} class="${availability.label==='已满'?'is-full':''}"><b>${Number(date.slice(-2))}</b><small>${availability.label==='无团期'||availability.label==='未开放'?'—':availability.label}</small></button>`;
      }).join('')}</div><p class="calendar-legend"><i></i> 可选集合日 <span>划线日期为示例满员 · 可查看未来 3 个月</span></p></div>
      <p class="booking-caption">${draft.mode==='private'?'自选日期模拟包团意向，报价暂沿用演示单价；正式出发时间须由团队确认。':'灰色日期无示例团期；也可以切换“自己定日期”，体验自由选择。'}</p>
      <div class="booking-chosen"><span>已选集合日</span><strong>${dateText(draft.date)}</strong><small>${draft.date?`${dateText(addDays(draft.date,routes[draft.route].daysCount))} 返程 · 含独立抵达日`:'点击日历中的日期'}</small></div>
      <div class="booking-people"><div><strong>一起出发的人</strong><p class="booking-caption">${draft.date?`此日期可演示 ${available} 人`:'每单 1–6 人，所选人数适用同一示例单价'}</p></div><div class="booking-stepper"><button id="book-people-less" data-booking-action="people" data-value="-1" aria-label="减少人数" ${draft.people<=1?'disabled':''}>−</button><output aria-live="polite">${draft.people}</output><button id="book-people-more" data-booking-action="people" data-value="1" aria-label="增加人数" ${draft.people>=Math.min(6,available)?'disabled':''}>+</button></div></div>`;
  }
  function field(name,label,value,placeholder,extra=''){
    return `<label class="booking-field" for="book-${name}">${label}<input id="book-${name}" name="${name}" value="${escape(value)}" placeholder="${placeholder}" ${extra} aria-invalid="${Boolean(errors[name])}" aria-describedby="book-error-${name}"><span class="booking-field-error" id="book-error-${name}">${errors[name]||''}</span></label>`;
  }
  function travelers(){
    return `${title('02 / TRAVEL TOGETHER','这一程，和谁同行？','只需体验填写过程。请使用虚构信息，无需真实姓名或证件。')}
      <button class="booking-demo-fill" data-booking-action="fill">一键填入演示信息 <span>↗</span></button>
      <form id="booking-travelers" novalidate><fieldset><legend>出行人 <small>${draft.people} 位 · 仅填写称呼</small></legend><div class="booking-form-grid">${Array.from({length:draft.people},(_,i)=>field(`traveler-${i}`,`出行人 ${String(i+1).padStart(2,'0')}`,draft.travelers[i],'例如：旅行者小林','maxlength="20" autocomplete="off" required')).join('')}</div></fieldset>
      <fieldset><legend>联系信息 <small>仅用于本次演示</small></legend><div class="booking-form-grid">${field('contact','联系人',draft.contact,'例如：演示联系人','maxlength="20" autocomplete="off" required')}${field('phone','演示手机号',draft.phone,'可填 13800000000','type="tel" inputmode="numeric" maxlength="11" autocomplete="off" required')}</div><label class="booking-field" for="book-note">想提前说的事（选填）<textarea id="book-note" name="note" rows="2" maxlength="200" placeholder="例如：希望和朋友同住。请勿填写健康、证件或其他敏感信息。">${escape(draft.note)}</textarea></label></fieldset></form><p class="booking-caption">出行人、联系人和备注仅暂存在本页内存中，刷新即清除；不会上传。订单列表只保存路线、日期、人数和模拟支付状态。</p>`;
  }
  function review(){
    return `${title('03 / BEFORE WE GO','再确认一次，<br>就可以出发了。','核对日期、同行人数和费用，再创建一笔演示订单。')}
      <div class="booking-review-head"><span>行程信息</span><button class="text-button" data-booking-action="edit-date">修改日期 →</button></div><dl class="booking-details"><div><dt>路线</dt><dd>${routes[draft.route].title}</dd></div><div><dt>集合 → 返程</dt><dd>${dateRange(draft)}</dd></div><div><dt>行程说明</dt><dd>含 1 天拉萨抵达 + ${routes[draft.route].daysCount} 天路线</dd></div><div><dt>出行方式</dt><dd>${modeText(draft.mode)} · ${draft.people} 人</dd></div></dl>
      <div class="booking-review-head"><span>同行与联系</span><button class="text-button" data-booking-action="edit-travelers">修改信息 →</button></div><dl class="booking-details"><div><dt>出行人</dt><dd>${draft.travelers.slice(0,draft.people).map(escape).join('、')}</dd></div><div><dt>联系人</dt><dd>${escape(draft.contact)} · ${escape(draft.phone)}</dd></div>${draft.note?`<div><dt>备注</dt><dd>${escape(draft.note)}</dd></div>`:''}</dl>
      <div class="booking-review-head"><span>费用明细</span><small>全额模拟支付</small></div><dl class="booking-details"><div><dt>路线费用 × ${draft.people} 人</dt><dd>${money(bookingPrices[draft.route])} × ${draft.people}</dd></div><div class="booking-total-line"><dt>应付演示金额</dt><dd>${money(bookingTotal(draft.route,draft.people))}</dd></div></dl>
      <details class="booking-terms"><summary>预订、费用与退改 · 演示说明</summary><p>本页不构成旅游合同或真实报价，不承诺出团、酒店或车辆；费用包含／不包含、真实团期、住宿标准与退改条款需由品牌方另行确认。不会收取任何费用。待支付演示订单可取消；模拟支付后的订单仅作流程展示，不产生真实退款。</p></details>
      <label class="booking-agreement"><input type="checkbox" id="book-agreed" ${draft.agreed?'checked':''}><span>我已了解：本次是预订与支付演示，日期、名额和费用均非真实可订信息。</span></label>`;
  }
  function payment(order){
    return `${title('04 / ONE STEP CLOSER','最后一步，<br>把期待留给路上。','选择支付方式，体验收银台。不会唤起真实支付，也不会扣款。')}
      <div class="booking-pay-amount"><span>演示应付金额</span><strong>${money(order.total)}</strong><small>${order.people} 位旅人 · ${dateText(order.date)} 集合</small></div><div class="payment-options" role="group" aria-label="选择模拟支付方式">${Object.entries(paymentMethods).map(([key,label])=>`<button id="book-method-${key}" data-booking-action="method" data-value="${key}" aria-pressed="${method===key}"><span class="payment-symbol ${key}" aria-hidden="true">${key==='wechat'?'微':'支'}</span><span><strong>${label}</strong><small>${key==='wechat'?'模拟微信收银台':'模拟支付宝收银台'}</small></span><i aria-hidden="true">${method===key?'✓':''}</i></button>`).join('')}</div>
      <div class="booking-payment-note"><span>DEMO ONLY</span><p>点击下方按钮进入模拟收银台。可以体验支付成功、失败重试或中途取消，订单状态会同步更新。</p></div><p class="booking-order-id">演示订单 ${escape(order.id)}</p><button class="text-button" data-booking-action="detail" data-id="${order.id}">稍后支付，查看订单 →</button>`;
  }
  function authorize(order){
    return `${title('SIMULATED CHECKOUT','模拟收银台',`${paymentMethods[method]} · 无需扫码、账号、密码或真实付款。`)}
      <div class="demo-cashier"><span class="payment-symbol ${method}" aria-hidden="true">${method==='wechat'?'微':'支'}</span><p>无方旅行 · 演示商户</p><strong>${money(order.total)}</strong><span class="demo-watermark">DEMO / 不会扣款</span><div class="demo-cashier-actions"><button class="button button-dark" data-booking-action="pay" data-outcome="success" ${busy?'disabled':''}>${busy?'正在模拟处理…':'模拟支付成功'} <span>✓</span></button><button class="button button-outline" data-booking-action="pay" data-outcome="failure" ${busy?'disabled':''}>模拟支付失败</button><button class="text-button" data-booking-action="pay" data-outcome="cancel" ${busy?'disabled':''}>取消本次支付</button></div></div><p class="booking-caption" role="status">${busy?'正在更新本地演示订单，请稍候。':'以上按钮只改变本地演示状态，不连接任何支付渠道。'}</p>`;
  }
  function result(order,outcome){
    const paid=order.status==='paid';
    const cancelled=order.status==='cancelled';
    const titleText=paid?'下一段路，<br>有了约定。':cancelled?'这次先暂停，<br>远方还在。':outcome==='failure'?'支付没有完成，<br>可以再试一次。':'不着急，<br>订单还为你留着。';
    return `<div class="booking-result"><span class="booking-result-seal ${paid?'is-paid':''}" aria-hidden="true">${paid?'✓':outcome==='failure'?'!':'—'}</span>${title(paid?'05 / SEE YOU ON THE ROAD':'DEMO ORDER STATUS',titleText,paid?'模拟支付成功。实际扣款 ¥0；未建立真实预订，不可作为出行凭证。':cancelled?'演示订单已取消，没有产生费用。可以重新选择一段旅程。':outcome==='failure'?'演示失败场景：未完成付款，订单仍为待支付。原信息已保留，可重新选择支付方式。':'本次支付已取消，演示订单仍为待支付。没有产生任何费用。')}
      <div class="booking-ticket"><div><span>${routes[order.route].latin}</span><b>${orderStatuses[order.status]}</b></div><h3>${routes[order.route].shortTitle}</h3><p>${dateRange(order)}</p><dl><div><dt>同行</dt><dd>${order.people} 人</dd></div><div><dt>${paid?'已模拟支付':'演示金额'}</dt><dd>${money(order.total)}</dd></div>${paid?`<div><dt>支付方式</dt><dd>${paymentMethods[order.method]}（演示）</dd></div>`:''}</dl><small>${order.id}</small></div>
      <p class="booking-caption">真实预订还需要正式团期、合同、出行适应沟通及人工确认。这一步只展示产品流程。</p></div>`;
  }
  function detail(order){
    return `${title('MY JOURNEY / ORDER DETAILS','行程有迹可循。','这是保存在当前浏览器里的演示记录，不是正式订单或出行凭证。')}
      <p class="order-status status-${order.status}">${orderStatuses[order.status]}</p><dl class="booking-details"><div><dt>订单号</dt><dd>${order.id}</dd></div><div><dt>路线</dt><dd>${routes[order.route].title}</dd></div><div><dt>集合 → 返程</dt><dd>${dateRange(order)}</dd></div><div><dt>方式 / 人数</dt><dd>${modeText(order.mode)} / ${order.people} 人</dd></div><div><dt>演示金额</dt><dd>${money(order.total)}</dd></div><div><dt>实际扣款</dt><dd>¥0</dd></div>${order.status==='paid'?`<div><dt>模拟支付渠道</dt><dd>${paymentMethods[order.method]}</dd></div>`:''}</dl>
      <p class="booking-caption">为保护隐私，此处不保存或回显出行人、联系人和备注。${storageAvailable?'刷新后仍可通过“我的订单”继续查看。':'当前浏览器未允许保存，刷新后可能丢失。'}</p>
      <div class="booking-order-actions"><button class="text-button" data-booking-action="orders">← 我的订单</button>${order.status==='pending'?`<button class="text-button" data-booking-action="cancel-prompt">取消演示订单</button>`:''}</div>
      ${confirmCancel?`<div class="booking-cancel-confirm" role="group" aria-label="确认取消订单"><p>确认取消这笔待支付演示订单？取消后无法继续支付，可以重新选日期。</p><button class="button button-outline" data-booking-action="keep-order">保留订单</button><button class="button button-dark" data-booking-action="cancel-order">确认取消</button></div>`:''}`;
  }
  function orderList(){
    const filtered=orders.filter((order)=>filter==='all'||order.status===filter);
    return `${title('MY JOURNEYS','把下一程，放在这里。','所有记录仅在当前浏览器保存，最多保留最近 30 笔。没有真实付款或名额预留。')}
      <div class="booking-order-filters" role="group" aria-label="筛选演示订单">${[['all','全部'],...Object.entries(orderStatuses)].map(([key,label])=>`<button id="book-filter-${key}" data-booking-action="filter" data-value="${key}" aria-pressed="${filter===key}">${label}<small>${orders.filter((order)=>key==='all'||order.status===key).length}</small></button>`).join('')}</div>
      ${filtered.length?`<div class="booking-order-list">${filtered.map((order)=>`<button class="booking-order-card" data-booking-action="detail" data-id="${order.id}"><img src="${assetUrl(routes[order.route].image)}" alt=""><div><span class="order-status status-${order.status}">${orderStatuses[order.status]}</span><h3>${routes[order.route].shortTitle}</h3><p>${dateRange(order)}</p><small>${modeText(order.mode)} · ${order.people} 人 · ${money(order.total)}</small></div><span aria-hidden="true">↗</span></button>`).join('')}</div>`:`<div class="booking-empty"><span aria-hidden="true">⌁</span><h3>${orders.length?'这里还没有这类订单。':'下一段路，还没写下。'}</h3><p>选一个集合日，体验从预订到支付的完整过程。</p><button class="text-button" data-booking-action="new">去选日期 →</button></div>`}`;
  }
  function render(nextView){
    view=nextView;
    if(!draft)draft=freshDraft();
    const order=orderById(view.orderId);
    let step=view.step;
    if(['date','travelers','review'].includes(step)&&lastOrderId&&orderById(lastOrderId)){
      render({...view,step:'detail',orderId:lastOrderId});return;
    }
    // Browser Back cannot turn a completed order back into a payable order.
    if(['payment','authorize'].includes(step)&&order&&order.status!=='pending')step='detail';
    if(['payment','authorize','result','detail'].includes(step)&&!order)step='orders';
    if(['travelers','review'].includes(step)&&validateSelection(draft))step='date';
    if(step==='review'&&Object.keys(validateTravelers(draft)).length)step='travelers';
    let main='',bottom='';
    const total=bookingTotal(draft.route,draft.people);
    if(step==='date'){main=selection();bottom=footer('continue-date','确认日期，下一步',total);}
    if(step==='travelers'){main=travelers();bottom=footer('continue-travelers','核对订单',total);}
    if(step==='review'){main=review();bottom=footer('create-order','提交演示订单',total);}
    if(step==='payment'){main=payment(order);bottom=footer('authorize',`用${paymentMethods[method]}模拟支付`,order.total);}
    if(step==='authorize'){main=authorize(order);bottom=footer('payment','返回支付方式',order.total,busy?'disabled':'');}
    if(step==='result'){main=result(order,view.outcome);bottom=order.status==='pending'?footer('payment','重新支付',order.total):footer('detail','查看订单',order.total);}
    if(step==='detail'){main=detail(order);bottom=order.status==='pending'?footer('payment','继续支付',order.total):footer('new','再选一段旅程');}
    if(step==='orders'){main=orderList();bottom=footer('new','选择新的旅程');}
    const stepIndex=steps.indexOf(step==='authorize'?'payment':step);
    const showAside=step!=='orders';
    content.innerHTML=`<div class="booking-demo-banner"><span>DEMO</span> 预订全流程演示 · 日期 / 余位 / 价格为示例 · 不会扣款</div>${storageAvailable?'':'<p class="booking-storage-note" role="status">浏览器未允许保存：本次仍可演示，刷新后订单可能丢失。</p>'}${stepIndex>=0?`<ol class="booking-steps" aria-label="预订进度">${labels.map((label,index)=>`<li ${index===stepIndex?'aria-current="step"':''} class="${index<stepIndex?'is-done':''}"><b>${index<stepIndex?'✓':String(index+1).padStart(2,'0')}</b><span>${label}</span></li>`).join('')}</ol>`:''}<div class="booking-scroll ${showAside?'':'orders-wide'}"><div class="booking-main">${main}<p id="booking-error" class="booking-error" role="alert" tabindex="-1" hidden></p></div>${showAside?summary(['date','travelers','review'].includes(step)?draft:order):''}</div>${bottom}`;
    content.dataset.step=step;
    dialog.setAttribute('aria-busy',String(busy));
  }
  function captureFields(){
    if(content.dataset.step!=='travelers')return;
    const form=content.querySelector('#booking-travelers');
    for(let i=0;i<draft.people;i++)draft.travelers[i]=form.elements[`traveler-${i}`].value;
    draft.contact=form.elements.contact.value;
    draft.phone=form.elements.phone.value;
    draft.note=form.elements.note.value;
    draft.agreed=false;
  }
  content.addEventListener('input',(event)=>{
    if(event.target.id==='book-agreed'){draft.agreed=event.target.checked;return;}
    captureFields();
    const name=event.target.name;
    if(errors[name]){delete errors[name];event.target.setAttribute('aria-invalid','false');document.getElementById(`book-error-${name}`).textContent='';}
  });
  content.addEventListener('submit',(event)=>{event.preventDefault();content.querySelector('[data-booking-action="continue-travelers"]')?.click();});
  content.addEventListener('click',async(event)=>{
    const button=event.target.closest('[data-booking-action]');
    if(!button||busy)return;
    const action=button.dataset.bookingAction;
    const value=button.dataset.value;
    const order=orderById(view.orderId);
    try{
      if(action==='route'||action==='mode'){
        draft[action]=value;draft.date='';draft.agreed=false;refresh(button.id);
      }else if(action==='month'){month=Math.max(0,Math.min(2,month+Number(value)));refresh(button.id);}
      else if(action==='date'){
        const available=dateAvailability(draft.route,draft.mode,value);
        if(!available.seats)return;
        draft.date=value;draft.agreed=false;
        if(draft.people>available.seats){draft.people=available.seats;toast(`此示例团期余 ${available.seats} 位，人数已调整。`);}
        refresh(button.id);
      }else if(action==='people'){draft.people=Math.max(1,Math.min(draft.people+Number(value),draft.date?dateAvailability(draft.route,draft.mode,draft.date).seats:6));draft.agreed=false;refresh();}
      else if(action==='continue-date'){const error=validateSelection(draft);if(error)return fail(error);go('travelers');}
      else if(action==='fill'){
        draft.travelers=['旅行者小林','旅行者小周','旅行者小陈','旅行者小方','旅行者小许','旅行者小陆'];draft.contact='演示联系人';draft.phone='13800000000';draft.agreed=false;errors={};refresh();toast('已填入虚构示例，可以继续核对订单。');
      }else if(action==='continue-travelers'){
        captureFields();errors=validateTravelers(draft);
        if(Object.keys(errors).length){refresh(`book-${Object.keys(errors)[0]}`);return;}
        go('review');
      }else if(action==='edit-date'){draft.agreed=false;go('date');}
      else if(action==='edit-travelers'){go('travelers');}
      else if(action==='create-order'){
        if(lastOrderId&&orderById(lastOrderId)){go('detail',{orderId:lastOrderId});return;}
        const created=createDemoOrder(draft,`WF-DEMO-${crypto.randomUUID().toUpperCase()}`);
        lastOrderId=created.id;saveOrder(created);go('payment',{orderId:created.id});
      }else if(action==='method'){method=value;refresh(button.id);}
      else if(action==='authorize'){if(order?.status==='pending')go('authorize',{orderId:order.id});}
      else if(action==='payment'){if(order?.status==='pending')go('payment',{orderId:order.id});}
      else if(action==='pay'){
        if(order?.status!=='pending')return;
        busy=true;refresh();
        // A short local delay only; no request, QR code, account or transaction is created.
        await new Promise((resolve)=>setTimeout(resolve,650));
        const latest=orderById(order.id);
        const updated=applyPayment(latest,method,button.dataset.outcome);
        saveOrder(updated);busy=false;
        if(dialog.open&&view.orderId===order.id&&view.step==='authorize')replace({type:'booking',step:'result',orderId:order.id,outcome:button.dataset.outcome});
      }else if(action==='detail'){go('detail',{orderId:button.dataset.id||order?.id});}
      else if(action==='orders'){filter='all';go('orders');}
      else if(action==='filter'){filter=value;refresh(button.id);}
      else if(action==='cancel-prompt'){confirmCancel=true;refresh();content.querySelector('.booking-cancel-confirm').scrollIntoView({block:'nearest'});}
      else if(action==='keep-order'){confirmCancel=false;refresh();}
      else if(action==='cancel-order'){saveOrder(cancelOrder(order));confirmCancel=false;replace({type:'booking',step:'detail',orderId:order.id});}
      else if(action==='new'){draft=freshDraft();month=0;lastOrderId=null;go('date');}
    }catch(error){busy=false;dialog.setAttribute('aria-busy','false');fail(error.message);}
  });
  return {
    render,
    open(){
      if(lastOrderId){draft=freshDraft();month=0;lastOrderId=null;}
      if(!draft||draft.route!==getRoute()){draft=freshDraft();month=0;}
      go('date');
    },
    openOrders(){filter='all';go('orders');},
  };
}
