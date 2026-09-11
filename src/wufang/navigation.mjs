// Only modal views create entries. At the page level, Back remains the browser's own action.
export function createNavigation(history,onChange) {
  const session=String(Date.now());
  const frames=[{view:null,scroll:0}];
  let index=0;
  let pending=false;
  let afterClose;
  const state=()=>({...history.state,wufangView:{session,index}});
  history.replaceState(state(),'');
  return {
    get current(){return frames[index];},
    get previous(){return frames[index-1];},
    replace(view){
      if(pending)return;
      frames[index]={view,scroll:0};
      history.replaceState(state(),'');
      onChange(frames[index]);
    },
    visit(view){
      if(pending)return;
      frames.splice(index+1);
      frames.push({view,scroll:0});
      index++;
      history.pushState(state(),'');
      onChange(frames[index]);
    },
    back(){
      if(!index||pending)return;
      pending=true;
      history.back();
    },
    close(callback){
      if(pending)return;
      if(!index){callback?.();return;}
      pending=true;
      afterClose=callback;
      history.go(-index);
    },
    restore(nextState){
      const next=nextState?.wufangView;
      const wasOpen=index>0;
      index=next?.session===session&&frames[next.index]?next.index:0;
      pending=false;
      // Page anchors also emit popstate; leave their scrolling to the browser.
      if(wasOpen||index>0)onChange(frames[index]);
      const callback=afterClose;
      afterClose=undefined;
      callback?.();
    },
  };
}
