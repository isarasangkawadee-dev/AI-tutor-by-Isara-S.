export type Role="ADMIN"|"TEACHER"|"STUDENT";
export type Subject="MATHEMATICS"|"SCIENCE"|"THAI"|"SOCIAL_STUDIES"|"ENGLISH";
export type Difficulty="BASIC"|"INTERMEDIATE"|"ADVANCED"|"COMPETITIVE"|"OLYMPIAD";
export type ExamMode="PRACTICE"|"EXAM";
export interface User{id:string;email:string;passwordHash:string;role:Role;status:"ACTIVE"|"SUSPENDED";points:number;level:number;subscriptionExpiresAt?:number;}
export interface Question{id:string;subject:Subject;grade:number;difficulty:Difficulty;stem:string;choices:{id:string;text:string}[];correctChoiceIds:string[];explanation:string;status:"DRAFT"|"REVIEW"|"PUBLISHED"|"ARCHIVED";version:number;}
export interface Attempt{id:string;userId:string;questionIds:string[];mode:ExamMode;answers:Record<string,string[]>;submitted:boolean;score?:number;percent?:number;startedAt:number;}
export interface RedeemCode{id:string;hash:string;durationDays:number;maxUses:number;uses:number;perUserLimit:number;active:boolean;validFrom:number;validUntil:number;}
