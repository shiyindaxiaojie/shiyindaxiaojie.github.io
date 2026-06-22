import{i as v,c as g,l as w,k as b,a as h,o as c,b as a,F as f,r as _,q as L,m as M,g as I,s as x,t as P,n as S}from"./vue-vendor-CQmh8HGq.js";import{G as z}from"./gauge-p0Wx4I_5.js";import{c as o}from"./index-B0VBy1is.js";import{N as B}from"./network-Ddsuz-jo.js";/**
 * @license lucide-vue-next v0.300.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=o("DatabaseIcon",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]]);/**
 * @license lucide-vue-next v0.300.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const D=o("LayersIcon",[["path",{d:"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",key:"8b97xw"}],["path",{d:"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65",key:"dd6zsq"}],["path",{d:"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65",key:"ep9fru"}]]);/**
 * @license lucide-vue-next v0.300.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V=o("ShieldAlertIcon",[["path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10",key:"1irkt0"}],["path",{d:"M12 8v4",key:"1got3b"}],["path",{d:"M12 16h.01",key:"1drbdi"}]]);/**
 * @license lucide-vue-next v0.300.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A=o("WalletIcon",[["path",{d:"M21 12V7H5a2 2 0 0 1 0-4h14v4",key:"195gfw"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h16v-5",key:"195n9w"}],["path",{d:"M18 12a2 2 0 0 0 0 4h4v-4Z",key:"vllfpd"}]]);/**
 * @license lucide-vue-next v0.300.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F=o("WrenchIcon",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",key:"cbrjhi"}]]),H=""+new URL("skirk-thinking-hero-DFJLNMyP.png",import.meta.url).href,N={class:"projects-overview-page solution-feed-page"},U={class:"solution-thought-cloud","aria-label":"常见架构问题"},W=["href","aria-current","onClick"],$={class:"solution-thought-bubble__icon"},J={__name:"index",emits:["page-ready"],setup(j,{emit:d}){const y=d,s=v(""),l=[{key:"latency",icon:z,title:"系统越来越慢，瓶颈找不到"},{key:"growth",icon:D,title:"业务增长后，架构撑不住"},{key:"microservices",icon:B,title:"微服务拆了，但复杂度失控"},{key:"cost",icon:A,title:"云成本越来越高，账单没人说得清"},{key:"data",icon:C,title:"数据链路混乱，报表和业务口径不一致"},{key:"legacy",icon:F,title:"老系统难改、难测、难上线"},{key:"delivery",icon:V,title:"团队交付慢，线上事故频繁"}],k=new Set(l.map(e=>e.key)),p=g(()=>({"--solution-hero-image":`url(${H})`})),r=e=>`#/solutions?problem=${encodeURIComponent(e.key)}`,n=()=>{const e=window.location.hash.split("?")[1]||"",i=new URLSearchParams(e).get("problem")||"";s.value=k.has(i)?i:""},u=e=>{s.value=e.key,window.location.hash=r(e)};return w(()=>{n(),window.addEventListener("hashchange",n),y("page-ready","projects-overview")}),b(()=>{window.removeEventListener("hashchange",n)}),(e,i)=>(c(),h("section",N,[a("div",{class:"solution-skirk-hero",style:S(p.value)},[a("nav",U,[(c(),h(f,null,_(l,(t,m)=>a("a",{key:t.key,class:M(["solution-thought-bubble",[`is-bubble-${m+1}`,{"is-active":s.value===t.key}]]),href:r(t),"aria-current":s.value===t.key?"page":void 0,onClick:L(q=>u(t),["prevent"])},[a("span",$,[(c(),I(x(t.icon),{size:17}))]),a("span",null,P(t.title),1)],10,W)),64))])],4)]))}};export{J as default};
