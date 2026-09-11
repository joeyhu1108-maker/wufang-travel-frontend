import test from 'node:test';
import assert from 'node:assert/strict';
import {todayISO,validDate,addDays,monthAt,calendarDays,dateAvailability,bookingTotal,validateSelection,validateTravelers,createDemoOrder,applyPayment,cancelOrder,sanitizeOrders} from './booking.mjs';

const today='2026-09-06';
const draft=()=>({route:'ten',mode:'group',date:'2026-09-22',people:2,travelers:['示例一','示例二'],contact:'演示联系人',phone:'13800000000',note:'不应被持久化',agreed:true});
const makeOrder=()=>createDemoOrder(draft(),'WF-DEMO-12345678',today,1000);

test('dates are calendar-valid and use China time independently of local timezone',()=>{
  assert.equal(todayISO(new Date('2026-09-05T16:01:00Z')),today);
  assert.equal(validDate('2026-02-30'),false);
  assert.equal(validDate('2026-9-6'),false);
  assert.equal(validDate('2028-02-29'),true);
  assert.equal(addDays('2026-12-27',13),'2027-01-09');
  assert.equal(addDays('2028-02-28',1),'2028-02-29');
  assert.equal(monthAt('2026-12-18',2),'2027-02');
  assert.throws(()=>addDays('2026-02-30',1));
});

test('calendar aligns Monday first and contains all actual dates',()=>{
  const days=calendarDays('2026-09');
  assert.equal(days[0],null);assert.equal(days[1],'2026-09-01');
  assert.equal(days.filter(Boolean).length,30);
  assert.equal(calendarDays('2028-02').filter(Boolean).length,29);
});

test('demo dates reject past, full, unscheduled and out-of-window departures',()=>{
  for(const date of ['2026-09-01','2026-09-08','2026-09-15','2026-09-21','2026-12-08'])assert.equal(dateAvailability('ten','group',date,today).seats,0);
  assert.equal(dateAvailability('ten','group','2026-09-22',today).seats,2);
  assert.equal(dateAvailability('ten','private','2026-09-21',today).seats,6);
  assert.equal(dateAvailability('thirteen','group','2026-09-20',today).seats,2);
  assert.equal(dateAvailability('thirteen','group','2026-09-22',today).seats,0);
});

test('selection validates route, date and route-specific capacity',()=>{
  assert.equal(validateSelection(draft(),today),'');
  assert.match(validateSelection({...draft(),date:''},today),/选择集合日期/);
  assert.match(validateSelection({...draft(),people:3},today),/最多可选 2 人/);
  assert.match(validateSelection({...draft(),route:'thirteen'},today),/重新选择/);
  assert.match(validateSelection({...draft(),mode:'bogus'},today),/重新选择/);
});

test('prices are computed in integer cents and never accept fractional or unbounded people',()=>{
  assert.equal(bookingTotal('ten',2),2960000);
  assert.equal(bookingTotal('thirteen',3),5640000);
  for(const count of [0,7,1.5,NaN,'2'])assert.throws(()=>bookingTotal('ten',count));
  assert.throws(()=>bookingTotal('invalid',1));
});

test('contact and each traveler are validated without requiring sensitive identity data',()=>{
  assert.deepEqual(validateTravelers(draft()),{});
  assert.equal(Object.keys(validateTravelers({...draft(),travelers:['',''],contact:' ',phone:'123'})).length,4);
  assert.throws(()=>createDemoOrder({...draft(),agreed:false},'WF-DEMO-12345678',today),/演示预订说明/);
  assert.throws(()=>createDemoOrder({...draft(),phone:''},'WF-DEMO-12345678',today),/出行信息/);
});

test('order snapshots freeze selected dates/prices and do not persist personal information',()=>{
  const source=draft(),order=createDemoOrder(source,'WF-DEMO-12345678',today,1000);
  source.people=6;source.date='2026-10-08';
  assert.equal(order.people,2);assert.equal(order.date,'2026-09-22');assert.equal(order.total,2960000);
  for(const key of ['phone','contact','travelers','note','agreed'])assert.equal(key in order,false);
});

test('failure and cancellation keep orders payable; success is final and cannot double-charge',()=>{
  const order=makeOrder();
  assert.deepEqual(applyPayment(order,'wechat','failure'),order);
  assert.deepEqual(applyPayment(order,'alipay','cancel'),order);
  const paid=applyPayment(order,'alipay','success',2000);
  assert.equal(paid.status,'paid');assert.equal(paid.method,'alipay');assert.equal(paid.paidAt,2000);
  assert.equal(order.status,'pending');
  assert.throws(()=>applyPayment(paid,'wechat','success'));
  assert.throws(()=>cancelOrder(paid));
  assert.throws(()=>applyPayment(order,'other','success'));
});

test('cancelled orders cannot be paid or cancelled again',()=>{
  const cancelled=cancelOrder(makeOrder());assert.equal(cancelled.status,'cancelled');
  assert.throws(()=>applyPayment(cancelled,'wechat','success'));
  assert.throws(()=>cancelOrder(cancelled));
});

test('stored orders tolerate malformed data, remove extra personal fields and duplicate IDs',()=>{
  const order=makeOrder();
  assert.deepEqual(sanitizeOrders(null),[]);
  assert.deepEqual(sanitizeOrders({version:2,orders:[order]}),[]);
  const input={version:1,orders:[null,{...order,total:1},{...order,date:'2026-02-30'},{...order,status:'paid',method:'wrong'},{...order,phone:'13800000000'},order]};
  const stored=sanitizeOrders(input);
  assert.deepEqual(stored,[order]);assert.equal('phone' in stored[0],false);
});
