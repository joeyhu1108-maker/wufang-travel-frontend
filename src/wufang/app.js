import {assetUrl,routes,stops,galleries,heroScenes,questions,sanitizeProgress,getProfile,buildInquiry} from './model.mjs';
import {createNavigation} from './navigation.mjs';
import {createBooking} from './booking-ui.js';

const $=(selector,scope=document)=>scope.querySelector(selector);
const $$=(selector,scope=document)=>[...scope.querySelectorAll(selector)];
const storageKey='wufang-traveler-v1';
let progress={answers:[],step:0};
try {progress=sanitizeProgress(JSON.parse(localStorage.getItem(storageKey)));} catch { /* The experience still works without browser storage. */ }
let currentRoute='ten';
let currentStop=3;
let heroIndex=0;
let galleryKey='ali';
let galleryIndex=0;
let toastTimer;
let dialogTrigger;
const quizDialog=$('#quiz-dialog');
const inquiryDialog=$('#inquiry-dialog');
const galleryDialog=$('#gallery-dialog');
const bookingDialog=$('#booking-dialog');
const navigation=createNavigation(history,renderView);
const booking=createBooking({dialog:bookingDialog,visit,replace:(view)=>navigation.replace(view),getRoute:()=>currentRoute,toast});
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let heroPaused=reducedMotion.matches;
let heroVisible=true;

function toast(message) {
  const element=$('#toast');
  element.textContent=message;
  // A live region inside an open dialog remains exposed to assistive technology.
  const host=$('dialog[open]')||document.body;
  host.append(element);
  element.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>element.classList.remove('visible'),4000);
}

function saveProgress() {
  try {localStorage.setItem(storageKey,JSON.stringify({version:1,...progress}));return true;}
  catch {return false;}
}

function rememberScroll() {
  navigation.current.scroll=$('dialog[open]')?.scrollTop??window.scrollY;
}

function visit(view) {
  rememberScroll();
  if(!navigation.current.view)dialogTrigger=document.activeElement;
  navigation.visit(view);
}

function renderView(frame) {
  const view=frame.view;
  const dialog=view?{quiz:quizDialog,inquiry:inquiryDialog,gallery:galleryDialog,booking:bookingDialog}[view.type]:null;
  $$('dialog[open]').forEach((open)=>{if(open!==dialog)open.close();});
  if(!dialog){
    window.scrollTo({top:frame.scroll,behavior:'instant'});
    if(dialogTrigger?.isConnected)dialogTrigger.focus({preventScroll:true});
    return;
  }
  if(view.type==='quiz'){
    if(view.step===null&&getProfile(progress.answers))renderResult();
    else {progress.step=Math.min(view.step??0,progress.answers.length,5);saveProgress();renderQuestion();}
  }else if(view.type==='inquiry'){
    $('#inquiry-form').hidden=view.result;
    $('#inquiry-result').hidden=!view.result;
    $$('[data-inquiry-step]').forEach((step)=>Number(step.dataset.inquiryStep)===(view.result?2:1)?step.setAttribute('aria-current','step'):step.removeAttribute('aria-current'));
  }else if(view.type==='booking'){booking.render(view);}
  else {galleryKey=view.key;galleryIndex=view.index;renderGallery();}
  const previous=navigation.previous?.view;
  $('[data-back]',dialog).textContent=previous?.type==='booking'?'← 返回上一步':previous?.type==='quiz'?(previous.step===null?'← 返回护照':'← 上一题'):previous?.type==='inquiry'?'← 修改信息':'← 返回页面';
  if(!dialog.open)dialog.showModal();
  const title=view.type==='inquiry'&&view.result?$('#inquiry-text'):$('h2',dialog);
  title?.focus({preventScroll:true});
  dialog.scrollTop=frame.scroll;
}

window.addEventListener('popstate',(event)=>{
  rememberScroll();
  // Restore after the browser's own history scroll, so a result-to-route jump is not undone.
  setTimeout(()=>navigation.restore(event.state),0);
});

$$('dialog').forEach((dialog)=>{
  $('[data-back]',dialog).addEventListener('click',()=>navigation.back());
  $('[data-close]',dialog).addEventListener('click',()=>navigation.close());
  dialog.addEventListener('cancel',(event)=>{event.preventDefault();navigation.back();});
  dialog.addEventListener('click',(event)=>{
    if(event.target!==dialog)return;
    const rect=dialog.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)navigation.back();
  });
  dialog.addEventListener('close',()=>{
    const live=$('#toast',dialog);
    if(live){live.classList.remove('visible');document.body.append(live);}
  });
});

function renderRoute() {
  const route=routes[currentRoute];
  $$('[data-route]').forEach((button)=>button.setAttribute('aria-pressed',String(button.dataset.route===currentRoute)));
  $$('[data-route] .route-state').forEach((label)=>label.textContent=label.closest('[data-route]').dataset.route===currentRoute?'正在查看':'点击切换');
  $$('[data-route-card]').forEach((card)=>card.toggleAttribute('data-selected',card.dataset.route===currentRoute));
  $('#route-detail-latin').textContent=route.latin;
  $('#route-detail-title').textContent=route.shortTitle;
  $('#route-detail-summary').textContent=route.summary;
  $('#route-detail-image').src=assetUrl(route.image);
  $('#route-detail-image').alt=route.imageAlt;
  $('#route-detail-days').textContent=String(route.daysCount).padStart(2,'0');
  $('#route-duration').textContent=`${route.daysCount} 天`;
  $('#route-price').textContent=route.price;
  $('#map-route-label').textContent=route.mapLabel;
  $('#itinerary-count').textContent=`${route.daysCount} 天路线 + 抵达日`;
  $('#day-list').innerHTML=route.days.map((day,index)=>`<article class="day" id="route-day-${index}"><span class="day-number">${index===0?'抵达日':`DAY ${String(index).padStart(2,'0')}`}</span><h4>${day[0]}</h4><p>当晚停留 · ${day[1]}<br>住宿参考 · ${day[2]}</p></article>`).join('');
  renderStop();
}

function renderStop() {
  const stop=stops[currentStop];
  $('#map-pins').innerHTML=stops.map((point,index)=>`<button class="map-pin" style="left:${point.x}%;top:${point.y}%" data-stop="${index}" aria-label="探索${point.name}" aria-pressed="${index===currentStop}"><span>${point.name}</span></button>`).join('');
  $('#stop-image').src=assetUrl(stop.image);
  $('#stop-image').alt=stop.alt;
  $('#stop-count').textContent=`${String(currentStop+1).padStart(2,'0')} / 06`;
  $('#stop-kicker').textContent=stop.kicker;
  $('#stop-title').textContent=stop.name;
  $('#stop-description').textContent=stop.description;
}

function openStopDay() {
  const index=stops[currentStop].day[currentRoute];
  $('#itinerary').open=true;
  $$('.day').forEach((day)=>day.classList.remove('is-highlighted'));
  const day=$(`#route-day-${index}`);
  day.classList.add('is-highlighted');
  day.setAttribute('tabindex','-1');
  day.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  day.focus({preventScroll:true});
}

function moveHero(delta) {
  heroIndex=(heroIndex+delta+heroScenes.length)%heroScenes.length;
  const scene=heroScenes[heroIndex];
  $('#hero-image').src=assetUrl(scene[0]);
  $('#hero-image').alt=scene[2];
  $('#hero-count').textContent=`0${heroIndex+1} / 04`;
  $('#hero-caption').textContent=scene[1];
}

function pauseHero(paused=true) {
  heroPaused=paused||reducedMotion.matches;
  const button=$('[data-action="hero-play"]');
  button.textContent=reducedMotion.matches?'手动':heroPaused?'播放':'暂停';
  button.setAttribute('aria-label',reducedMotion.matches?'已关闭自动轮播':heroPaused?'播放风景轮播':'暂停风景轮播');
  button.disabled=reducedMotion.matches;
}

setInterval(()=>{
  if(!heroPaused&&heroVisible&&!document.hidden&&!$('dialog[open]'))moveHero(1);
},6000);
reducedMotion.addEventListener('change',()=>pauseHero());
let swipeStart;
$('#home').addEventListener('touchstart',(event)=>{const point=event.touches[0];swipeStart={x:point.clientX,y:point.clientY};},{passive:true});
$('#home').addEventListener('touchend',(event)=>{
  if(!swipeStart)return;
  const point=event.changedTouches[0],dx=point.clientX-swipeStart.x,dy=point.clientY-swipeStart.y;
  if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5){pauseHero();moveHero(dx<0?1:-1);}
  swipeStart=null;
},{passive:true});
$('#home').addEventListener('touchcancel',()=>{swipeStart=null;});

function renderGallery() {
  const gallery=galleries[galleryKey];
  const picture=gallery.images[galleryIndex];
  $('#gallery-title').textContent=gallery.title;
  $('#gallery-image').src=assetUrl(picture[0]);
  $('#gallery-image').alt=picture[1];
  $('#gallery-caption').textContent=picture[1];
  $('#gallery-count').textContent=`0${galleryIndex+1} / 0${gallery.images.length}`;
}

function updateQuizLabels() {
  $$('[data-passport-label]').forEach((label)=>label.textContent=getProfile(progress.answers)?'查看旅人护照':'生成旅人护照');
}

function openQuiz() {
  visit({type:'quiz',step:getProfile(progress.answers)?null:progress.step});
}

function renderQuestion() {
  const question=questions[progress.step];
  const answer=progress.answers[progress.step];
  $('#quiz-content').innerHTML=`<div class="quiz-layout"><div class="quiz-scene"><img src="${assetUrl(question.scene)}" alt=""><div class="quiz-scene-copy"><span>0${progress.step+1}</span><p>${question.line.replace('\n','<br>')}</p></div></div><div class="quiz-panel reveal"><div class="quiz-meta"><span>找到自己的旅行方式</span><span>0${progress.step+1} / 06</span></div><div class="quiz-progress" aria-hidden="true">${questions.map((_,i)=>`<i class="${i<=progress.step?'done':''}"></i>`).join('')}</div><h2 id="quiz-title" tabindex="-1">${question.title}</h2><p class="quiz-hint">${question.hint}</p><div class="quiz-options" role="group" aria-labelledby="quiz-title">${question.options.map((option,i)=>`<button class="quiz-option" data-answer="${i}" aria-pressed="${answer===i}"><span class="option-letter">${String.fromCharCode(65+i)}</span><span><strong>${option[0]}</strong><small>${option[1]}</small></span></button>`).join('')}</div><div class="quiz-controls"><button class="text-button" data-action="quiz-back" ${progress.step===0?'disabled':''}>← 上一个选择</button><button class="button button-dark" data-action="quiz-next" ${answer===undefined?'disabled':''}>${progress.step===5?'生成我的护照':'继续'} <span aria-hidden="true">→</span></button></div><p class="quiz-privacy">选择仅保存在当前浏览器，可中途关闭后继续。不收集身份或联系方式；这不是健康评估。</p></div></div>`;
}

function updateChoice(index) {
  progress.answers[progress.step]=index;
  saveProgress();
  $$('[data-answer]',quizDialog).forEach((button)=>button.setAttribute('aria-pressed',String(Number(button.dataset.answer)===index)));
  $('[data-action="quiz-next"]').disabled=false;
}

function nextQuestion() {
  if(progress.answers[progress.step]===undefined)return;
  if(progress.step<questions.length-1)visit({type:'quiz',step:progress.step+1});
  else {saveProgress();visit({type:'quiz',step:null});}
}

function renderResult() {
  const profile=getProfile(progress.answers);
  if(!profile)return renderQuestion();
  updateQuizLabels();
  $('#quiz-content').innerHTML=`<div class="result-layout reveal"><article class="passport-card" aria-label="我的旅人护照"><div class="passport-head"><img src="./media/wufang-mark-v36-inkgrain.svg" alt="无方"><span>无方 · 旅人护照<br>TRAVELER, NOT TOURIST.</span></div><img class="passport-photo" src="${assetUrl(profile.image)}" alt="${questions[2].options[progress.answers[2]][0]}"><p class="passport-kicker">这一程，你是</p><h3>${profile.title}</h3><p class="passport-quote">${profile.quote}</p><div class="passport-tags">${profile.tags.map((tag)=>`<span>${tag}</span>`).join('')}</div><div class="passport-foot"><span>ON YOUR OWN TERMS<br>旅行偏好 · 非健康评估</span><b>↗</b></div></article><div class="result-copy"><p class="eyebrow">YOUR JOURNEY STARTS WITH YOU</p><h2 id="quiz-title" tabindex="-1">这次的远方，<br>有了你的形状。</h2><p>你不需要成为某一种旅行者。<br>这张护照，记录此刻你想要的方式。<br>保存图片，或把偏好附进咨询清单。</p><div class="result-route"><span>${profile.needsConversation?'沟通起点 · 先聊清楚再决定':'基于这次偏好的路线建议'}</span><h3>${routes[profile.route].title}</h3><p>${profile.reason}</p><p class="recommendation-note">这是一条了解路线的起点，不是唯一选择，也不判断你的身体适应情况。</p><button class="text-button" data-action="other-routes">也看看其他路线 →</button></div><div class="result-actions"><button class="button button-dark" data-action="result-route">查看建议路线 <span aria-hidden="true">↗</span></button><button class="button button-outline" data-action="save-passport">保存护照图片 <span aria-hidden="true">↓</span></button></div><div class="result-links"><button class="text-button" data-action="result-inquiry">行程咨询 ↗</button><button class="text-button" data-action="quiz-restart">重新选择 ↻</button></div><p class="quiz-privacy">${profile.notice}</p></div></div>`;
}

function openInquiry() {
  const form=$('#inquiry-form');
  const profile=getProfile(progress.answers);
  form.elements.route.value=currentRoute;
  form.elements.includeProfile.disabled=!profile;
  form.elements.includeProfile.checked=Boolean(profile);
  $('#profile-availability').textContent=profile?`（${profile.title}）`:'（尚未生成）';
  form.hidden=false;
  $('#inquiry-result').hidden=true;
  visit({type:'inquiry',result:false});
}

async function copyInquiry() {
  const text=$('#inquiry-text').value;
  try {await navigator.clipboard.writeText(text);toast('咨询清单已复制，请自行发送给品牌联系人。');}
  catch {$('#inquiry-text').focus();$('#inquiry-text').select();toast('未获得剪贴板权限，已选中文本，可长按或手动复制。');}
}

function downloadBlob(blob,name) {
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}

function loadImage(src) {
  return new Promise((resolve,reject)=>{const image=new Image();image.crossOrigin='anonymous';image.onload=()=>resolve(image);image.onerror=reject;image.src=src;});
}

async function savePassport(button) {
  const profile=getProfile(progress.answers);
  if(!profile)return;
  button.disabled=true;
  const original=button.innerHTML;
  button.textContent='正在制作护照…';
  try {
    const [photo,mark]=await Promise.all([loadImage(assetUrl(profile.image)),loadImage(assetUrl('wufang-mark-v36-inkgrain.svg'))]);
    await document.fonts.ready;
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1560;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('Canvas unavailable');
    const theme=getComputedStyle(document.documentElement);
    const color=(name)=>theme.getPropertyValue(name).trim();
    ctx.fillStyle=color('--paper');ctx.fillRect(0,0,1080,1560);
    ctx.strokeStyle=color('--line');ctx.lineWidth=2;ctx.strokeRect(40,40,1000,1480);
    ctx.fillStyle=color('--clay');ctx.fillRect(40,40,1000,8);
    ctx.drawImage(mark,88,93,120,88);
    ctx.fillStyle=color('--ink');ctx.font='26px "PingFang SC", sans-serif';ctx.fillText('无方 · 旅人护照',690,130);
    ctx.font='16px Georgia,serif';ctx.fillText('TRAVELER, NOT TOURIST.',690,169);
    const box={x:88,y:230,w:904,h:510};
    const ratio=Math.max(box.w/photo.width,box.h/photo.height);
    const cropW=box.w/ratio,cropH=box.h/ratio;
    ctx.drawImage(photo,(photo.width-cropW)/2,(photo.height-cropH)/2,cropW,cropH,box.x,box.y,box.w,box.h);
    ctx.fillStyle=color('--muted');ctx.font='23px "PingFang SC",sans-serif';ctx.fillText('这一程，你是',88,810);
    ctx.fillStyle=color('--clay');ctx.font='64px "Songti SC","STSong",serif';ctx.fillText(profile.title,88,912);
    ctx.fillStyle=color('--muted');ctx.font='26px "PingFang SC",sans-serif';
    // Wrap by measured width so Chinese copy never clips the poster edge.
    function drawWrapped(text,x,y,maxWidth,lineHeight){let line='';for(const char of text){if(ctx.measureText(line+char).width>maxWidth){ctx.fillText(line,x,y);line=char;y+=lineHeight;}else line+=char;}ctx.fillText(line,x,y);return y;}
    drawWrapped(profile.quote,88,978,885,44);
    ctx.font='22px "PingFang SC",sans-serif';ctx.fillText(profile.tags.join('   /   '),88,1094);
    ctx.strokeStyle=color('--line');ctx.setLineDash([7,7]);ctx.beginPath();ctx.moveTo(88,1150);ctx.lineTo(992,1150);ctx.stroke();ctx.setLineDash([]);
    ctx.font='21px "PingFang SC",sans-serif';ctx.fillText('基于这次偏好的路线建议',88,1208);
    ctx.fillStyle=color('--ink');ctx.font='32px "Songti SC",serif';ctx.fillText(routes[profile.route].title,88,1262);
    ctx.fillStyle=color('--muted');ctx.font='19px "PingFang SC",sans-serif';drawWrapped('旅行偏好不是健康评估。路线、团期与安全准备需另行确认。',88,1344,890,31);
    ctx.font='17px Georgia,serif';ctx.fillText('WUFANG TRAVEL / ON YOUR OWN TERMS',88,1444);
    ctx.fillStyle=color('--clay');ctx.font='48px Georgia,serif';ctx.fillText('↗',945,1450);
    const blob=await new Promise((resolve)=>canvas.toBlob(resolve,'image/png'));
    if(!blob)throw new Error('Export unavailable');
    downloadBlob(blob,`无方旅人护照-${profile.title}.png`);
    toast('护照已生成并发起下载。若手机未保存，请用系统浏览器打开。');
  }catch{toast('护照图片暂未导出，请重试；仍可保留当前结果或复制咨询清单。');}
  finally {button.disabled=false;button.innerHTML=original;}
}

document.addEventListener('click',(event)=>{
  const routeButton=event.target.closest('[data-route]');
  if(routeButton){
    currentRoute=routeButton.dataset.route;
    renderRoute();
    if(routeButton.hasAttribute('data-open-route'))$('#routes').scrollIntoView({block:'start',behavior:reducedMotion.matches?'instant':'smooth'});
    return;
  }
  const stopButton=event.target.closest('[data-stop]');
  if(stopButton){currentStop=Number(stopButton.dataset.stop);renderStop();$(`[data-stop="${currentStop}"]`).focus({preventScroll:true});return;}
  const answerButton=event.target.closest('[data-answer]');
  if(answerButton){updateChoice(Number(answerButton.dataset.answer));return;}
  const galleryButton=event.target.closest('[data-gallery]');
  if(galleryButton){visit({type:'gallery',key:galleryButton.dataset.gallery,index:0});return;}
  const button=event.target.closest('[data-action]');
  if(!button)return;
  switch(button.dataset.action){
    case 'hero-prev':pauseHero();moveHero(-1);break;
    case 'hero-next':pauseHero();moveHero(1);break;
    case 'hero-play':pauseHero(!heroPaused);break;
    case 'quiz':openQuiz();break;
    case 'quiz-next':nextQuestion();break;
    case 'quiz-back':if(navigation.previous?.view?.type==='quiz')navigation.back();else if(progress.step>0)navigation.replace({type:'quiz',step:progress.step-1});break;
    case 'quiz-restart':navigation.close(()=>{progress={answers:[],step:0};saveProgress();updateQuizLabels();openQuiz();});break;
    case 'result-route':navigation.close(()=>{currentRoute=getProfile(progress.answers).route;renderRoute();$('#routes').scrollIntoView({block:'start'});});break;
    case 'other-routes':navigation.close(()=>{$('#routes').scrollIntoView({block:'start'});});break;
    case 'result-inquiry':currentRoute=getProfile(progress.answers).route;renderRoute();openInquiry();break;
    case 'save-passport':savePassport(button);break;
    case 'inquiry':openInquiry();break;
    case 'booking':booking.open();break;
    case 'orders':booking.openOrders();break;
    case 'copy-inquiry':copyInquiry();break;
    case 'save-inquiry':downloadBlob(new Blob(['\uFEFF'+$('#inquiry-text').value],{type:'text/plain;charset=utf-8'}),'无方旅行-出发咨询清单.txt');toast('已发起清单下载；内容没有提交到服务端。');break;
    case 'edit-inquiry':navigation.back();break;
    case 'view-stop-day':openStopDay();break;
    case 'gallery-prev':moveGallery(-1);break;
    case 'gallery-next':moveGallery(1);break;
  }
});

$('#inquiry-form').addEventListener('submit',(event)=>{
  event.preventDefault();
  const form=event.currentTarget;
  const fields=new FormData(form);
  const profile=fields.has('includeProfile')?getProfile(progress.answers):null;
  $('#inquiry-text').value=buildInquiry({route:fields.get('route'),date:fields.get('date'),people:fields.get('people'),note:fields.get('note').trim(),profile});
  visit({type:'inquiry',result:true});
});

function moveGallery(delta) {
  galleryIndex=(galleryIndex+delta+galleries[galleryKey].images.length)%galleries[galleryKey].images.length;
  navigation.current.view.index=galleryIndex;
  renderGallery();
}
galleryDialog.addEventListener('keydown',(event)=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();moveGallery(event.key==='ArrowLeft'?-1:1);}});

if('IntersectionObserver' in window){
  const observer=new IntersectionObserver((entries)=>{
    for(const entry of entries){if(!entry.isIntersecting)continue;$$('[data-nav]').forEach((link)=>{if(link.dataset.nav===entry.target.id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});}
  },{rootMargin:'-10% 0px -60% 0px'});
  ['home','routes','discover','field','about'].forEach((id)=>observer.observe($('#'+id)));
  const heroObserver=new IntersectionObserver(([entry])=>{heroVisible=entry.isIntersecting;});
  heroObserver.observe($('#home'));
}

renderRoute();
updateQuizLabels();
pauseHero(heroPaused);
