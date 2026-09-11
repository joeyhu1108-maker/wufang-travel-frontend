import test from 'node:test';
import assert from 'node:assert/strict';
import {routes,stops,questions,sanitizeProgress,getProfile,buildInquiry} from './model.mjs';

test('both itineraries include every travel day and a separate arrival day',()=>{
  for(const route of Object.values(routes)){
    assert.equal(route.days.length,route.daysCount+1);
    assert.ok(route.shortTitle&&route.latin&&route.summary&&route.image&&route.imageAlt);
  }
  for(const stop of stops)for(const key of Object.keys(routes))assert.ok(routes[key].days[stop.day[key]]);
});
test('corrupted, old, or partial saved answers are safely bounded',()=>{
  assert.deepEqual(sanitizeProgress(null),{answers:[],step:0});
  assert.deepEqual(sanitizeProgress({version:2,answers:[0,0]}),{answers:[],step:0});
  assert.deepEqual(sanitizeProgress({version:1,answers:[0,1,8,0],step:999}),{answers:[0,1],step:2});
  assert.deepEqual(sanitizeProgress({version:1,answers:[0,1,2],step:-8}),{answers:[0,1,2],step:0});
  assert.equal(sanitizeProgress({version:1,answers:[0,1,2,0,1,2,2],step:7}).answers.length,6);
});
test('incomplete or malformed questionnaires never produce a passport',()=>{
  assert.equal(getProfile([0,1]),null);
  assert.equal(getProfile([0,1,2,0,1,-1]),null);
  assert.equal(getProfile([0,1,2,0,1,'1']),null);
});
test('13-day suggestion requires explicit time, hiking, lodging, and planning preferences',()=>{
  const affirmative=[1,1,1,1,1,1];
  assert.equal(getProfile(affirmative).route,'thirteen');
  for(const index of [0,1,4,5]){
    const changed=[...affirmative];changed[index]=0;
    assert.equal(getProfile(changed).route,'ten');
  }
  assert.equal(getProfile([2,1,1,1,1,1]).needsConversation,true);
});
test('every possible answer combination yields explainable, bounded output',()=>{
  for(let n=0;n<3**questions.length;n++){
    const answers=Array.from({length:6},(_,i)=>Math.floor(n/3**i)%3);
    const profile=getProfile(answers);
    assert.ok(routes[profile.route]);assert.ok(profile.reason.length>20);
    assert.match(profile.notice,/不判断/);
  }
});
test('the unplanned-hour preference is reflected in the passport',()=>{
  const tags=[0,1,2].map((pace)=>getProfile([0,0,0,pace,0,0]).tags[2]);
  assert.equal(new Set(tags).size,3);
});
test('consultation summary preserves user text as plain text and distinguishes it from an order',()=>{
  const note='<script>alert(1)</script>';
  const summary=buildInquiry({route:'unsure',date:'',people:'2 人',note,profile:getProfile([0,0,0,0,0,0])});
  assert.match(summary,/尚未确定/);assert.match(summary,/不是订单/);assert.ok(summary.includes(note));assert.match(summary,/旅行偏好/);
  assert.ok(!buildInquiry({route:'ten'}).includes('undefined'));
});
