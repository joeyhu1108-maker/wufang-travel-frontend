// Demo-only booking rules. Amounts are integer cents; no network or payment SDK.
export const bookingPrices={ten:1480000,thirteen:1880000};
export const paymentMethods={wechat:'微信支付',alipay:'支付宝'};
export const orderStatuses={pending:'待支付',paid:'已模拟支付',cancelled:'已取消'};

export function todayISO(now=new Date()) {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  return ['year','month','day'].map((key)=>parts.find((part)=>part.type===key).value).join('-');
}

export function validDate(value) {
  return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
}

export function addDays(date,days) {
  if(!validDate(date))throw new Error('日期格式不正确');
  const value=new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate()+days);
  return value.toISOString().slice(0,10);
}

export function monthAt(today,offset=0) {
  const date=new Date(`${today.slice(0,7)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth()+offset);
  return date.toISOString().slice(0,7);
}

export function dateAvailability(route,mode,date,today=todayISO()) {
  if(!Object.hasOwn(bookingPrices,route)||!['group','private'].includes(mode)||!validDate(date))return {seats:0,label:'不可选'};
  if(date<addDays(today,3)||date>=`${monthAt(today,3)}-01`)return {seats:0,label:'未开放'};
  if(mode==='private')return {seats:6,label:'可选'};
  const day=Number(date.slice(-2));
  const index=(route==='ten'?[8,15,22,29]:[6,13,20,27]).indexOf(day);
  if(index===-1)return {seats:0,label:'无团期'};
  const seats=[4,0,2,6][index];
  return {seats,label:seats?`余 ${seats} 位`:'已满'};
}

export function calendarDays(month) {
  const first=`${month}-01`;
  const next=`${monthAt(first,1)}-01`;
  const offset=(new Date(`${first}T00:00:00Z`).getUTCDay()+6)%7;
  const dates=Array.from({length:offset},()=>null);
  for(let date=first;date<next;date=addDays(date,1))dates.push(date);
  return dates;
}

export function bookingTotal(route,people) {
  if(!Object.hasOwn(bookingPrices,route)||!Number.isInteger(people)||people<1||people>6)throw new Error('请选择 1–6 位出行人');
  return bookingPrices[route]*people;
}

export function validateSelection(draft,today=todayISO()) {
  if(!Object.hasOwn(bookingPrices,draft.route))return '请先选择路线';
  if(!draft.date)return '请先在日历中选择集合日期';
  const available=dateAvailability(draft.route,draft.mode,draft.date,today);
  if(!available.seats)return '这个日期暂不可选，请重新选择';
  if(!Number.isInteger(draft.people)||draft.people<1||draft.people>Math.min(6,available.seats))return `当前示例团期最多可选 ${available.seats} 人，请调整人数或日期`;
  return '';
}

export function validateTravelers(draft) {
  const errors={};
  for(let i=0;i<draft.people;i++)if(!draft.travelers[i]?.trim())errors[`traveler-${i}`]=`请填写第 ${i+1} 位出行人的演示称呼`;
  if(!draft.contact?.trim())errors.contact='请填写演示联系人';
  if(!/^1[3-9]\d{9}$/.test(draft.phone||''))errors.phone='请填写 11 位演示手机号，可使用上方示例';
  return errors;
}

export function createDemoOrder(draft,id,today=todayISO(),now=Date.now()) {
  const error=validateSelection(draft,today);
  if(error)throw new Error(error);
  if(Object.keys(validateTravelers(draft)).length)throw new Error('请补齐出行信息');
  if(!draft.agreed)throw new Error('请确认已了解演示预订说明');
  // Contact information and traveler names deliberately never enter persisted orders.
  return {id,route:draft.route,mode:draft.mode,date:draft.date,people:draft.people,total:bookingTotal(draft.route,draft.people),status:'pending',createdAt:now,method:null,paidAt:null};
}

export function applyPayment(order,method,outcome,now=Date.now()) {
  if(order.status!=='pending')throw new Error('这笔订单已处理，请查看订单状态');
  if(!Object.hasOwn(paymentMethods,method)||!['success','failure','cancel'].includes(outcome))throw new Error('请选择有效的支付演示方式');
  return outcome==='success'?{...order,status:'paid',method,paidAt:now}:{...order};
}

export function cancelOrder(order) {
  if(order.status!=='pending')throw new Error('仅待支付订单可以取消');
  return {...order,status:'cancelled'};
}

export function sanitizeOrders(value) {
  if(value?.version!==1||!Array.isArray(value.orders))return [];
  const ids=new Set();
  return value.orders.filter((order)=>{
    if(!order||typeof order.id!=='string'||!/^WF-DEMO-[A-Z0-9-]{8,50}$/.test(order.id)||ids.has(order.id))return false;
    if(!Object.hasOwn(bookingPrices,order.route)||!['group','private'].includes(order.mode)||!validDate(order.date))return false;
    if(!Number.isInteger(order.people)||order.people<1||order.people>6||order.total!==bookingTotal(order.route,order.people))return false;
    if(!Object.hasOwn(orderStatuses,order.status)||!Number.isFinite(order.createdAt))return false;
    if(order.status==='paid'&&(!Object.hasOwn(paymentMethods,order.method)||!Number.isFinite(order.paidAt)))return false;
    ids.add(order.id);
    return true;
  }).slice(0,30).map(({id,route,mode,date,people,total,status,createdAt,method,paidAt})=>({id,route,mode,date,people,total,status,createdAt,method:status==='paid'?method:null,paidAt:status==='paid'?paidAt:null}));
}

export const money=(cents)=>`¥${(cents/100).toLocaleString('zh-CN',{maximumFractionDigits:2})}`;
