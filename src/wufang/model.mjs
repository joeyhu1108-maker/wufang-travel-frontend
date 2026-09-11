export {assetUrl} from './assets.mjs';

// Route and hotel references are carried over from the existing 2026 itinerary.
// Elevations describe the overnight stop, never the route's maximum elevation.
export const routes = {
  ten: { title: '10 天 · 阿里大环线', shortTitle: '阿里大环线', latin: 'ALI LOOP', summary: '湖泊、雪山与古格，组成一条从拉萨向西的高原环线。', image: 'route-ali-hero.jpg', imageAlt: '阿里湖岸与远处雪山', daysCount: 10, price: '¥14,800 / 人', mapLabel: 'ALI LOOP / 10 DAYS', days: [
    ['抵达拉萨 · 接机', '3600 m', '自行确认抵达日住宿'],
    ['拉萨—羊卓雍措—普莫雍措—康马', '4300 m', '御煌富氧酒店'],
    ['康马—阿玛直米—宗措湖—定结', '4300 m', '御煌富氧酒店'],
    ['定结—马卡鲁峰—珠峰大本营—扎西宗', '4000 m', '维也纳国际酒店'],
    ['扎西宗—希夏邦马峰—佩枯措—萨嘎', '4600 m', '维也纳 3 好酒店'],
    ['萨嘎—拉昂措—纳木那尼峰—冈仁波齐—塔尔钦', '4700 m', '川北富氧酒店'],
    ['塔尔钦—古格王朝—土林日落—札达', '4500 m', '海纳大酒店'],
    ['札达—札达土林—狮泉河', '4300 m', '鹏润大酒店'],
    ['狮泉河—物玛措—改则', '4700 m', '维也纳国际酒店'],
    ['改则—色林措—班戈', '4700 m', '维也纳国际酒店'],
    ['班戈—纳木措—拉萨', '3600 m', '自行确认返程日住宿']
  ]},
  thirteen: { title: '13 天 · 冈仁波齐转山环线', shortTitle: '冈仁波齐转山环线', latin: 'KAILASH KORA', summary: '在阿里环线之上继续走近冈仁波齐，认真了解转山的每一步。', image: 'region-kora-kailash.jpg', imageAlt: '云层下的冈仁波齐', daysCount: 13, price: '¥18,800 / 人', mapLabel: 'KAILASH KORA / 13 DAYS', days: [
    ['抵达拉萨 · 接机', '3600 m', '自行确认抵达日住宿'],
    ['拉萨—羊卓雍措—普莫雍措—康马', '4300 m', '御煌富氧酒店'],
    ['康马—冲巴雍措—卓木拉日—亚东', '3500 m', '美朵酒店'],
    ['亚东—阿玛直米—宗措湖—定结', '4300 m', '御煌富氧酒店'],
    ['定结—卓奥友峰—远观珠峰—岗嘎', '4500 m', '望山酒店'],
    ['岗嘎—希夏邦马峰—佩枯措—萨嘎', '4600 m', '维也纳 3 好酒店'],
    ['萨嘎—玛旁雍措—纳木那尼峰—冈仁波齐—塔尔钦', '4700 m', '川北富氧酒店'],
    ['塔尔钦—经幡广场—止热寺—天葬台补给点（转山）', '5370 m', '天葬台补给点'],
    ['天葬台补给点—卓玛拉垭口—塔尔钦（转山）', '4700 m', '川北富氧酒店'],
    ['巴嘎—古格王朝—札达', '4500 m', '海纳大酒店'],
    ['札达—札达土林—狮泉河', '4300 m', '鹏润大酒店'],
    ['狮泉河—物玛措—改则', '4700 m', '维也纳国际酒店'],
    ['改则—大地之树—色林措—班戈', '4700 m', '维也纳国际酒店'],
    ['班戈—纳木措—拉萨', '3600 m', '自行确认返程日住宿']
  ]}
};

export const stops = [
  {name:'拉萨', x:84, y:64, image:'01-road.jpg', alt:'通向高原远方的公路', kicker:'所有远方，从这里开始', description:'抵达、休息，把节奏交还给自己。行程开始之前，先和领队把准备工作聊清楚。', day:{ten:0,thirteen:0}},
  {name:'珠峰', x:64, y:76, image:'region-everest-panorama.jpg', alt:'珠峰纳木措路线包中的雪山全景', kicker:'抬起头，看见另一种尺度', description:'雪山给人一个重新理解尺度的机会。10 天线前往珠峰大本营；13 天线按资料安排远观珠峰。配图为区域影像。', day:{ten:3,thirteen:4}},
  {name:'萨嘎', x:49, y:53, image:'proof-ali-vehicle.jpg', alt:'阿里路线中的越野车辆', kicker:'一路向西的中途站', description:'车窗外的地貌慢慢变换。这里连接雪山、湖泊与更西边的阿里，也是补给与停留的一站。', day:{ten:4,thirteen:5}},
  {name:'冈仁波齐', x:28, y:36, image:'region-kora-kailash.jpg', alt:'云层下的冈仁波齐', kicker:'在山前，留一点安静', description:'10 天线看见山，13 天线进一步了解转山。真正走进去之前，行走负荷、适应安排与风险需要单独确认。', day:{ten:5,thirteen:7}},
  {name:'古格', x:14, y:49, image:'region-ali-terrain.jpg', alt:'阿里札达土林地貌', kicker:'顺着地貌，走进时间', description:'土林的褶皱、王朝的遗址。比起匆忙地拍下一张，不如给这片土地留一点时间。', day:{ten:6,thirteen:9}},
  {name:'纳木措', x:74, y:29, image:'region-everest-reflection.jpg', alt:'珠峰纳木措路线包中的湖面与雪峰倒影', kicker:'旅程将尽，目光还在远处', description:'沿湖泊回到拉萨。环线在地图上闭合，路上留下的感受，带回自己的生活。配图为区域影像。', day:{ten:10,thirteen:13}}
];

export const galleries = {
  ali:{title:'阿里 · 自由背后的准备',images:[['proof-ali-vehicle.jpg','雪山前的车辆与现场记录'],['route-ali-hero.jpg','在雪山与湖泊之间行走'],['region-ali-terrain.jpg','札达土林的地貌褶皱']]},
  kora:{title:'冈仁波齐 · 走在自己的节奏里',images:[['region-kora-kailash.jpg','云层下的冈仁波齐'],['proof-kora-seven-day.jpg','经幡、马帮与徒步过程'],['region-kora-journey.jpg','行走与日落的旅程记录']]},
  lake:{title:'库拉岗日 · 给意料之外的片刻',images:[['region-kulagangri-golden.jpg','金色雪峰与光线'],['region-kulagangri-silhouette.jpg','湖岸，人与山的尺度'],['route-kulagangri-lake.jpg','在冰川湖旁停留']]}
};

export const heroScenes = [
  ['route-ali-hero.jpg','阿里 · 在湖岸慢下来','阿里湖岸，一位旅行者走过雪山前'],
  ['region-everest-panorama.jpg','雪峰 · 看见另一种尺度','高原湖泊前的雪山全景'],
  ['region-ali-terrain.jpg','土林 · 顺着地貌走进时间','阿里土林地貌'],
  ['region-kulagangri-golden.jpg','库拉岗日 · 等光落下来','库拉岗日的金色雪峰']
];

export const questions = [
  {title:'这一次，想把多少时间留给远方？', hint:'先按旅行本身选择，往返大交通需要另外预留。', scene:'route-ali-hero.jpg', line:'把日常放下，\n给远方一点时间。', options:[['10 天左右','看一条完整环线，也留出回归生活的时间'],['13 天或更久','不急着回程，想往远处再走深一点'],['还没确定','先看看什么样的旅行让我心动']]},
  {title:'你更向往，哪一种靠近？', hint:'不是挑战等级，只是你想体验的方式。', scene:'region-kora-kailash.jpg', line:'不是走得更远，\n是更像自己。', options:[['沿着公路，看见辽阔','在沿途停留，给风景与摄影留些余地'],['亲自走进山里','想进一步了解冈仁波齐转山'],['都想看看，再做决定','喜欢探索，但不急着给自己一个答案']]},
  {title:'如果只能留下一个画面，会是什么？', hint:'跟着第一感觉，选一个让你愿意停下来的。', scene:'region-everest-reflection.jpg', line:'总有一处风景，\n和你同频。', options:[['湖泊，和水面的光','安静、流动，不需要说太多'],['雪山，和自己的脚步','走近自然，也听见自己'],['土林，和时间的痕迹','比风景更吸引我的，是它背后的故事']]},
  {title:'路上忽然多出一小时，你会……', hint:'计划之外的时间，也可以成为旅程的一部分。', scene:'region-kulagangri-golden.jpg', line:'留一点空白，\n给路上发生。', options:[['找个地方，等光落下来','慢一些，用照片或目光留下此刻'],['安静走一段，只听风声','不赶路，和自己独处一会儿'],['和同行的人聊聊','有些故事，比地图上的目的地更难忘']]},
  {title:'关于旅途的住宿，你更在意什么？', hint:'转山补给点与常规酒店条件不同，要提前说清楚。', scene:'proof-ali-vehicle.jpg', line:'真正的自由，\n从说清楚开始。', options:[['希望每晚尽量舒适','重视休息，倾向常规酒店安排'],['愿意先了解简朴住宿','可讨论转山补给点，但需要知道真实条件'],['想了解差异后再决定','请把房型、条件和边界讲清楚']]},
  {title:'出发前，你希望我们先做什么？', hint:'旅行偏好不是身体条件评估。高原出行需要另行准备。', scene:'region-kulagangri-silhouette.jpg', line:'不急着出发，\n先把顾虑说完。', options:[['先讲讲高原旅行的准备','第一次了解或想从基础开始'],['逐日对齐路线和安排','我做过一些功课，想继续了解执行细节'],['先聊聊我的顾虑','还没想好，沟通清楚比马上决定更重要']]}
];

export function sanitizeProgress(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.answers)) return {answers:[],step:0};
  const answers=[];
  for(let i=0;i<Math.min(value.answers.length,questions.length);i++) {
    const answer=value.answers[i];
    if(!Number.isInteger(answer)||answer<0||answer>=questions[i].options.length) break;
    answers.push(answer);
  }
  const maxStep=Math.min(answers.length,questions.length-1);
  const step=Number.isInteger(value.step)?Math.max(0,Math.min(value.step,maxStep)):maxStep;
  return {answers,step};
}

export function getProfile(answers) {
  if(answers.length!==questions.length||answers.some((a,i)=>!Number.isInteger(a)||a<0||a>=questions[i].options.length)) return null;
  const profiles=[
    {title:'与湖泊同频的人',quote:'你不急着抵达，愿意把时间留给一束光。',image:'region-everest-reflection.jpg',tags:['湖泊与光','慢一点','认真感受']},
    {title:'向山而行的人',quote:'你想靠近的，不只是山，也是更真实的自己。',image:'region-kora-kailash.jpg',tags:['雪山与脚步','向内探索','按自己的节奏']},
    {title:'追着时间走的人',quote:'你看见地貌，也想听见时间留下的故事。',image:'region-ali-terrain.jpg',tags:['地貌与人文','带着好奇','慢慢理解']}
  ];
  const portrait=profiles[answers[2]];
  const paceTags=['等光慢下来','留一点独处','喜欢路上相遇'];
  const thirteen=answers[0]===1&&answers[1]===1&&answers[4]===1&&answers[5]===1;
  const needsConversation=answers[0]===2||answers[5]!==1;
  let reason=thirteen?'你预留了更长时间、想了解转山，也愿意沟通简朴住宿。可以进一步了解 13 天路线的执行细节。':'先从湖泊、雪山与古格组成的 10 天环线了解无方，不把转山作为默认选项。';
  if(!thirteen&&answers[0]===0) reason='你希望把旅行放在 10 天左右，阿里大环线可以作为进一步沟通的起点。';
  if(!thirteen&&answers[1]===1) reason='你对转山感兴趣，但时间、住宿或准备诉求还需要对齐。先了解 10 天环线，再和领队讨论是否进一步转山。';
  return {...portrait,tags:[...portrait.tags.slice(0,2),paceTags[answers[3]]],route:thirteen?'thirteen':'ten',needsConversation,reason,notice:'此结果仅整理旅行偏好，不判断高原或转山适应性，也不代表预订或安全承诺。出发前需与领队沟通，并按需要咨询专业人员。'};
}

export function buildInquiry({route,date,people,note,profile}) {
  const routeTitle=routes[route]?.title||'还没决定，想先聊聊';
  return ['你好，无方，我想聊聊这次旅行。','',`想了解：${routeTitle}`,`预计时间：${date||'尚未确定'}`,`同行人数：${people||'尚未确定'}`,note?`想聊的事：${note}`:'想聊的事：团期、逐日安排、住宿、费用与出发前准备。',profile?`旅行偏好：${profile.title}（${profile.tags.join(' / ')}）`:'',profile?`进一步了解的路线：${routes[profile.route].title}`:'','','希望先确认可用团期、最终费用、服务边界与退改规则。','这是一份咨询清单，不是订单，也未提交到任何服务端。'].filter((line,index,arr)=>line||arr[index-1]!=='').join('\n');
}
