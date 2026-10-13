import {AsyncLocalStorage} from 'node:async_hooks';
import {rpc,hasStorageConfig} from './supabase.js';
export {hasStorageConfig};
export const ROLES=['own','opponent'];
export const CATEGORIES=['totals','season','clubInfo','overallStats','players','career','league','playoffs','friendlies','playoffAchievements'];
export function assertRole(value){if(!ROLES.includes(value))throw Error('Ruolo dati non valido');return value;}
export function assertCategory(value){if(!CATEGORIES.includes(value))throw Error('Categoria non valida');return value;}
// Cache only within one HTTP request: independent Vercel instances never serve stale rows.
const requests=new AsyncLocalStorage();
export const withStoreRequest=work=>requests.run(new Map(),work);
async function readRoleBundle(role,{fresh=false}={}){
 assertRole(role);const cache=requests.getStore();
 if(fresh&&cache?.get(role)?.settled)cache.delete(role);
 if(cache?.has(role))return cache.get(role);
 const promise=rpc('sisal_team_read',{p_role:role});cache?.set(role,promise);
 try{const result=await promise;promise.settled=true;return result}catch(e){cache?.delete(role);throw e;}
}
async function change(role,kind,value,category=null){
 const base=await readRoleBundle(role);
 const next=await rpc('sisal_team_write',{p_role:role,p_kind:kind,p_value:value,p_category:category,p_revision:base.revision});
 const saved=Promise.resolve(next);saved.settled=true;requests.getStore()?.set(role,saved);return next;
}
export async function readAllFiles(role,opts){return (await readRoleBundle(role,opts)).files;}
export async function readRoleTotals(role,opts){return (await readRoleBundle(role,opts)).totals;}
export async function readRoleMemory(role,opts){return (await readRoleBundle(role,opts)).memory;}
export async function writeFile({role,category,payload}){assertCategory(category);return change(role,'file',payload,category);}
export const writeRoleTotals=(role,value)=>change(role,'totals',value);
export const writeRoleMemory=(role,value)=>change(role,'memory',value);
export const deleteRole=role=>change(role,'delete',null);
