import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const handlers={},deleted=[],shell=[],cacheWrites=[];
const caches={async keys(){return ['sisal-fc27-studio-9','other-feature-cache','sisal-fc27-arena-12'];},async delete(name){deleted.push(name);},async open(){return {async addAll(urls){shell.push(...urls)},async put(request){cacheWrites.push(request.url)}};},async match(key){return key==='./index.html'?new Response('<html>Offline shell</html>',{headers:{'Content-Type':'text/html'}}):undefined;}};
const self={addEventListener:(name,fn)=>handlers[name]=fn,async skipWaiting(){},clients:{async claim(){}}};
const context=vm.createContext({self,caches,URL,Response,fetch:async()=>{throw Error('offline')}});vm.runInContext(await fs.readFile('sw.js','utf8'),context);
for(const type of ['install','activate']){let promise;handlers[type]({waitUntil:p=>promise=p});await promise;}
assert(shell.some(url=>url.includes('arena-timeline.js?v=arena-12')));assert(deleted.includes('sisal-fc27-studio-9'));assert(!deleted.includes('other-feature-cache'),'cache cleanup is restricted to this app');
async function request(path,mode='cors'){let response;handlers.fetch({request:{url:'https://sisal.test'+path,method:'GET',mode},respondWith:p=>response=p});return response?await response:null;}
assert.equal(await request('/api/account?action=arena&scene=11'),null,'private API requests never enter the service-worker cache');
const module=await request('/arena-ui.js?v=arena-12');assert.equal(module.status,503);assert.match(module.headers.get('Content-Type'),/text\/plain/);assert(!(await module.text()).includes('<html>'),'an offline JS import never receives HTML');
const navigation=await request('/','navigate');assert.match(await navigation.text(),/Offline shell/);
context.fetch=async()=>new Response('export const ok=true',{headers:{'Content-Type':'text/javascript'}});const online=await request('/arena-ui.js?v=arena-12');assert.equal(online.status,200);await new Promise(r=>setImmediate(r));assert(cacheWrites.includes('https://sisal.test/arena-ui.js?v=arena-12'));
console.log('PASS actual service-worker code in isolated worker context: versioned shell, private API exclusion, bounded own-cache cleanup, offline navigation and no HTML-as-JavaScript fallback.');
