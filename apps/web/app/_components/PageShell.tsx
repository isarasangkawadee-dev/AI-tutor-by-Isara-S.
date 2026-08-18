import type { ReactNode } from "react";

export function PageShell({title,description,children}:{title:string;description:string;children?:ReactNode}) {
  return <main style={{maxWidth:1100,margin:"0 auto",padding:"32px 20px 64px"}}>
    <a href="/" style={{display:"inline-block",marginBottom:24}}>← Home</a>
    <h1 style={{fontSize:"clamp(2rem,5vw,3rem)",margin:"0 0 12px"}}>{title}</h1>
    <p style={{maxWidth:760,lineHeight:1.7,color:"#4b5563"}}>{description}</p>
    {children}
  </main>;
}
