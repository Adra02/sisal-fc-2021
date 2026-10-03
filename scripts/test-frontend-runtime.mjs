import fs from 'node:fs/promises';
import vm from 'node:vm';

const source = await fs.readFile(new URL('../index-inline.js', import.meta.url), 'utf8');
const elements = new Map();
function element() {
  return {
    innerHTML: '', textContent: '', value: '', disabled: false, files: [], className: '', style: {}, dataset: {}, children: [],
    addEventListener() {}, click() {}, focus() {}, prepend() {}, remove() {}, appendChild() {}
  };
}
const document = {
  getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
  querySelectorAll() { return []; },
  createElement() { return element(); },
  addEventListener() {}
};
const localStore = new Map();
const localStorage = { getItem(k){return localStore.has(k)?localStore.get(k):null;}, setItem(k,v){localStore.set(k,String(v));}, removeItem(k){localStore.delete(k);} };
const sessionStorage = { getItem(){return null;}, setItem(){}, removeItem(){} };
const fakeResponse = { ok:false, status:503, async json(){return {ok:false,error:'stub'};} };
const navigator = { serviceWorker: { register: async()=>({}) } };
const window = { addEventListener(){}, scrollTo(){} };
const location = { protocol:'http:', href:'http://localhost/' };
const alerts = [];
const ctx = { document, localStorage, sessionStorage, navigator, window, location, fetch: async()=>fakeResponse, console, Intl, Date, Number, String, Boolean, Object, Array, Map, Set, Math, JSON, Error, Promise, encodeURIComponent, decodeURIComponent, URL, Intl, setTimeout, clearTimeout, alert: x=>alerts.push(x), confirm:()=>false, prompt:()=>'' };
ctx.globalThis = ctx;
vm.createContext(ctx);
let error = null;
try { vm.runInContext(source, ctx, { filename:'index-inline.js' }); } catch (e) { error = e; }
if (error) throw error;
await new Promise(r=>setTimeout(r,20));
console.log('test-frontend-runtime: OK');
