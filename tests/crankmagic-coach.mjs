/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../crankmagic-coach.js', import.meta.url), 'utf8');
const scope = vm.createContext({}); vm.runInContext(source, scope);
const {render, bind} = scope.CrankCoach;
let checks = 0;
const ok = (value, message) => {assert.ok(value, message); checks++;};
const eq = (actual, expected, message) => {assert.deepEqual(actual, expected, message); checks++;};
eq(render({open:false, available:true}), '', 'the caller can close the presenter without moving its state');
for (const available of [false, undefined, 'true']) {
  const html = render({available});
  ok(html.includes("The Coach isn't at this table yet.") && html.includes('data-action="page-help" data-help="table"'), 'an unavailable service has an honest Help state');
  ok(!html.includes('<textarea') && !html.includes('data-coach-form'), 'no composer is manufactured without explicit backend availability');
}
const html = render({available:true, context:'Sees your board (hand withheld) <script>', tableId:'"<&', prompts:['Explain the stack', '<img onerror="bad">'],
  thread:[{from:'you',text:'<script>alert(1)</script>'},{from:'coach',text:'Try [[Sol Ring]] <img>',show:['Sol Ring'],plays:[{action:'Cast',card:'<A>',why:'<reason>'}],threat:{seat:'<seat>',why:'<why>'},open:true},{divider:'<turn>'},{from:'coach',text:'Sign in',signIn:true}],typing:true});
eq((html.match(/CrankMagic Coach/g)||[]).length, 1, 'the one-line title appears once');
ok(html.includes('h2 class="cm-section-title"') && !/<header[^>]*>[\s\S]*?<p>/.test(html.slice(0,html.indexOf('</header>'))), 'the compact header has no subtitle');
ok(html.includes('<b>Sol Ring</b>') && html.includes('&lt;img&gt;'), 'card brackets have limited bold formatting after escaping');
ok(!html.includes('<script>') && !html.includes('<img') && html.includes('&lt;turn&gt;') && html.includes('&lt;reason&gt;'), 'all message, divider, reasoning and context text is escaped');
ok(html.includes('data-q="&lt;img onerror=&quot;bad&quot;&gt;"'), 'question values cannot escape their attribute');
for (const hook of ['board-coach-show','board-coach-why','board-coach-clear','board-coach-ask','data-action="board-coach"','data-coach-form','cm-coach-input','cm-coach-thread','cm-coach-more']) ok(html.includes(hook), `existing board hook retained: ${hook}`);
ok(html.includes('/api/ai/login?to=') && !html.includes('id="<&'), 'the existing sign-in path safely encodes the return fragment');
ok(html.includes('id="cm-coach-context"') && html.includes('aria-describedby="cm-coach-context"'), 'the hand-sharing disclosure remains visible and associated with input');
ok(html.includes('<details class="cm-coach-questions"') && html.includes('aria-expanded="false"'), 'Questions starts as a native collapsed disclosure');
ok(!html.includes('cm-coach-prompts'), 'persistent prompt chips are replaced by the disclosure');
const attrs = {}, listeners = []; let focused = 0, inputFocused = 0;
const summary = {setAttribute:(key,value)=>attrs[key]=value,focus:()=>focused++};
const details = {open:true,querySelector:()=>summary};
const panel = {querySelector:()=>({focus:()=>inputFocused++}),querySelectorAll:()=>[details],addEventListener:(type,callback,capture)=>listeners.push({type,callback,capture})};
bind(panel); bind(panel);
eq(listeners.length, 3, 'binding the same host after redraw adds no duplicate listeners');
eq(attrs['aria-expanded'], 'true', 'bind synchronizes the native open state');
details.open = false; listeners.find(l=>l.type==='toggle').callback();
eq(attrs['aria-expanded'], 'false', 'native click/keyboard toggles synchronize the accessible state');
details.open = true; let prevented = 0, stopped = 0;
listeners.find(l=>l.type==='keydown').callback({key:'Escape',target:{closest:()=>details},preventDefault:()=>prevented++,stopPropagation:()=>stopped++});
eq([details.open, focused, prevented, stopped, attrs['aria-expanded']], [false,1,1,1,'false'], 'Escape closes the active disclosure, restores summary focus and preserves the containing Coach');
details.open = true; listeners.find(l=>l.type==='click').callback({target:{closest:()=>({closest:()=>details})}});
eq([details.open,inputFocused], [false,1], 'choosing a question folds the overlay and returns focus to the composer while retaining the delegated action');
/* Execute the real app's Help dispatcher with the real table Help entry; there is no #help route. */
const opened = [], tableSource = readFileSync(new URL('../crankmagic-table.js',import.meta.url),'utf8'), appSource = readFileSync(new URL('../crankmagic-app.js',import.meta.url),'utf8');
/* Help has tabs since 2026-10-28 (Rob; 701f5180): the dispatcher's slice starts at `helpTabs`, which it calls, and binds one
   document-level keydown for the tab bar's arrow keys, so the scope has a document that records what is bound. */
const bound = [], dialogClasses = [];
const helpScope = vm.createContext({C:{HELP:{}},actions:{},modal:(...args)=>opened.push(args),button:label=>label,esc:value=>value,dialog:{classList:{add:name=>dialogClasses.push(name)}},document:{addEventListener:(type,callback)=>bound.push({type,callback})}});
vm.runInContext(tableSource.slice(tableSource.indexOf('C.HELP.table ='),tableSource.indexOf('  const cloudPlay')),helpScope);
helpScope.HELP=helpScope.C.HELP;
const helpFrom = appSource.indexOf('const helpTabs='), helpTo = appSource.indexOf('/* THE GLOSSARY');
ok(helpFrom > 0 && helpFrom < appSource.indexOf("actions['page-help']=") && appSource.indexOf("actions['page-help']=") < helpTo, 'the Help dispatcher and its tab bar are where the suite reads them');
vm.runInContext(appSource.slice(helpFrom,helpTo),helpScope);
const helpHook=/data-action="([^"]+)" data-help="([^"]+)"/.exec(render({available:false}));
ok(helpHook && typeof helpScope.actions[helpHook[1]]==='function','unavailable Coach uses a registered Help action');
helpScope.actions[helpHook[1]]({dataset:{help:helpHook[2]}});
const helpHtml=opened[0]?.[1]||'', keysPanel=helpHtml.slice(helpHtml.indexOf('id="cm-help-panel-keys"'));
ok(opened[0]?.[0].includes('Play: the table and the board')&&helpHtml.includes('data-action="help-tab" data-tab="keys">Keys</button>')&&helpHtml.includes('id="cm-help-panel-keys"')&&/<kbd>/.test(keysPanel),'Coach Help opens actual table rules and bound keys (the Keys tab since 2026-10-28)');
eq([(helpHtml.match(/role="tab" /g)||[]).length,(helpHtml.match(/role="tabpanel"/g)||[]).length-(helpHtml.match(/role="tabpanel"[^>]* hidden>/g)||[]).length,dialogClasses],[5,1,['cm-slideover','cm-help-tabbed']],'as a tabbed slide-over: five tabs, one panel showing');
eq(bound.map(l=>l.type),['keydown'],"and the tab bar's arrow keys are bound once, on the document");
/* The arrow keys move along the tab bar, and only there. */
{const tabs=[0,1,2].map(i=>({i,focused:0,focus(){this.focused++;}})),picked=[];helpScope.actions['help-tab']=el=>picked.push(el.i);
  for(const t of tabs){t.parentElement={querySelectorAll:()=>tabs};t.closest=()=>t;}
  const press=(key,target)=>{let prevented=0;bound[0].callback({key,target,preventDefault:()=>prevented++});return prevented;};
  eq([press('ArrowRight',tabs[2]),press('ArrowLeft',tabs[0]),press('Home',tabs[1]),press('End',tabs[1]),picked],[1,1,1,1,[0,2,0,2]],'Right from the last tab wraps to the first, Left from the first to the last, Home and End go to the ends');
  eq([press('a',tabs[1]),press('ArrowRight',{closest:()=>null}),picked.length],[0,0,4],'any other key, or an arrow outside the tab bar, is left alone');}
console.log(`crankmagic-coach: ${checks} checks passed`);
