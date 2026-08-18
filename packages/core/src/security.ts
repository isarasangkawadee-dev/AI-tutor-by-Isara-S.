import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Role } from "./types";
export class Forbidden extends Error{}
export class Unauthorized extends Error{}
export function requireRole(role:Role,allowed:Role[]){if(!allowed.includes(role))throw new Forbidden("FORBIDDEN")}
export function sameOwner(actorId:string,ownerId:string){if(actorId!==ownerId)throw new Forbidden("IDOR_BLOCKED")}
export function hashSecret(v:string){return createHash("sha256").update(v.trim().toUpperCase()).digest("hex")}
export function hashPassword(password:string,salt=randomBytes(16).toString("hex")){if(password.length<8)throw new Error("WEAK_PASSWORD");const digest=scryptSync(password,salt,64).toString("hex");return `scrypt:${salt}:${digest}`}
export function verifyPassword(password:string,stored:string){const [scheme,salt,d]=stored.split(":");if(scheme!=="scrypt"||!salt||!d)return false;const actual=scryptSync(password,salt,64);const expected=Buffer.from(d,"hex");return actual.length===expected.length&&timingSafeEqual(actual,expected)}
export function sanitizeText(input:string){return input.replace(/[<>]/g,c=>c==="<"?"&lt;":"&gt;").replace(/javascript:/gi,"")}
export function assertSameOrigin(origin:string|undefined,appUrl:string){if(!origin)throw new Forbidden("CSRF_ORIGIN_REQUIRED");const a=new URL(origin);const b=new URL(appUrl);if(a.origin!==b.origin)throw new Forbidden("CSRF_ORIGIN_REJECTED")}
export class FixedWindowRateLimiter{private hits=new Map<string,{count:number;reset:number}>();constructor(private limit:number,private windowMs:number){}check(key:string,now=Date.now()){const x=this.hits.get(key);if(!x||now>=x.reset){this.hits.set(key,{count:1,reset:now+this.windowMs});return true}if(x.count>=this.limit)return false;x.count++;return true}}
