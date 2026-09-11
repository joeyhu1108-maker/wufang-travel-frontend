import test from 'node:test';
import assert from 'node:assert/strict';
import {createNavigation} from './navigation.mjs';

function setup(){
  const entries=[{host:'preserved'}];let cursor=0,nav;
  const history={get state(){return entries[cursor];},replaceState(state){entries[cursor]=state;},pushState(state){entries.splice(cursor+1);entries.push(state);cursor++;},back(){this.go(-1);},go(delta){cursor+=delta;nav.restore(entries[cursor]);}};
  const rendered=[];
  nav=createNavigation(history,(frame)=>rendered.push(frame));
  return {nav,history,entries,rendered};
}

test('back returns from consultation result to form, passport, then page',()=>{
  const {nav,history}=setup();
  nav.visit({type:'quiz',step:null});nav.current.scroll=360;
  nav.visit({type:'inquiry',result:false});nav.current.scroll=120;
  nav.visit({type:'inquiry',result:true});
  nav.back();assert.deepEqual(nav.current,{view:{type:'inquiry',result:false},scroll:120});
  nav.back();assert.deepEqual(nav.current,{view:{type:'quiz',step:null},scroll:360});
  nav.back();assert.equal(nav.current.view,null);
  nav.back();assert.equal(nav.current.view,null);
  assert.equal(history.state.host,'preserved');
});
test('question history retains step and revisiting replaces only the forward branch',()=>{
  const {nav,entries}=setup();
  nav.visit({type:'quiz',step:0});nav.visit({type:'quiz',step:1});nav.visit({type:'quiz',step:2});
  nav.back();assert.equal(nav.current.view.step,1);
  nav.visit({type:'quiz',step:2});assert.equal(entries.length,4);
});
test('close unwinds the whole overlay chain without leaving dead back entries',()=>{
  const {nav,entries}=setup();
  nav.visit({type:'quiz',step:0});nav.visit({type:'quiz',step:1});nav.visit({type:'inquiry'});
  let closed=false;nav.close(()=>{closed=true;});
  assert.equal(nav.current.view,null);assert.equal(closed,true);
  nav.visit({type:'gallery'});assert.equal(entries.length,2);
  nav.back();assert.equal(nav.current.view,null);
});
test('browser forward restores a view and unrelated page history stays on the page',()=>{
  const {nav,history}=setup();nav.visit({type:'gallery'});nav.back();history.go(1);
  assert.equal(nav.current.view.type,'gallery');
  nav.restore(null);assert.equal(nav.current.view,null);
});
test('a resumed questionnaire can edit an earlier step without adding a reverse loop',()=>{
  const {nav,entries}=setup();nav.visit({type:'quiz',step:3});nav.replace({type:'quiz',step:2});
  assert.equal(nav.current.view.step,2);assert.equal(entries.length,2);
  nav.visit({type:'quiz',step:3});nav.back();assert.equal(nav.current.view.step,2);
  nav.close();assert.equal(nav.current.view,null);
});
test('page-to-page anchor history never restores stale modal scroll positions',()=>{
  const {nav,history,rendered}=setup();
  nav.current.scroll=1800;nav.restore(null);nav.restore(history.state);
  assert.equal(rendered.length,0);
  nav.visit({type:'gallery'});nav.back();assert.equal(rendered.length,2);
  nav.restore(null);assert.equal(rendered.length,2);
});
