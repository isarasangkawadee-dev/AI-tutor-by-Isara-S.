declare const Buffer: any;
declare module "node:crypto" { export function createHash(name:string): any; export function randomBytes(size:number): any; export function scryptSync(password:string,salt:string,keylen:number): any; export function timingSafeEqual(a:any,b:any): boolean; export function randomUUID(): string; }
