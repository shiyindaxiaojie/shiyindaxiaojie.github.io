import{i as b,l as g,k as _,a as y,o as i,b as s,u as c,F as w,r as f,q as L,m as M,g as I,s as K,t as x}from"./vue-vendor-CQmh8HGq.js";import{c as o,u as z}from"./index-DQ_bOq_f.js";import{G as P}from"./gauge-Dn6QNQ7o.js";import{N as B}from"./network-BNIqV9UI.js";/**
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
 */const S=o("ShieldAlertIcon",[["path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10",key:"1irkt0"}],["path",{d:"M12 8v4",key:"1got3b"}],["path",{d:"M12 16h.01",key:"1drbdi"}]]);/**
 * @license lucide-vue-next v0.300.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V=o("WalletIcon",[["path",{d:"M21 12V7H5a2 2 0 0 1 0-4h14v4",key:"195gfw"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h16v-5",key:"195n9w"}],["path",{d:"M18 12a2 2 0 0 0 0 4h4v-4Z",key:"vllfpd"}]]);/**
 * @license lucide-vue-next v0.300.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A=o("WrenchIcon",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",key:"cbrjhi"}]]),N=""+new URL("skirk-mascot-DL62kzRZ.png",import.meta.url).href,R={class:"projects-overview-page solution-feed-page"},U={class:"solution-skirk-hero"},W={class:"solution-mascot-stage","aria-hidden":"true"},j=["src"],q=["aria-label"],E=["href","aria-current","onClick"],F={class:"solution-thought-bubble__icon"},O={__name:"index",emits:["page-ready"],setup(H,{emit:u}){const m=u,{t:r}=z(),a=b(""),d=[{key:"latency",icon:P,titleKey:"solutions.problems.latency"},{key:"growth",icon:D,titleKey:"solutions.problems.growth"},{key:"microservices",icon:B,titleKey:"solutions.problems.microservices"},{key:"cost",icon:V,titleKey:"solutions.problems.cost"},{key:"data",icon:C,titleKey:"solutions.problems.data"},{key:"legacy",icon:A,titleKey:"solutions.problems.legacy"},{key:"delivery",icon:S,titleKey:"solutions.problems.delivery"}],p=new Set(d.map(e=>e.key)),h=e=>`#/solutions?problem=${encodeURIComponent(e.key)}`,n=()=>{const e=window.location.hash.split("?")[1]||"",l=new URLSearchParams(e).get("problem")||"";a.value=p.has(l)?l:""},k=e=>{a.value=e.key,window.location.hash=h(e)};return g(()=>{n(),window.addEventListener("hashchange",n),m("page-ready","projects-overview")}),_(()=>{window.removeEventListener("hashchange",n)}),(e,l)=>(i(),y("section",R,[s("div",U,[s("div",W,[s("img",{class:"solution-mascot",src:c(N),alt:""},null,8,j)]),s("nav",{class:"solution-thought-cloud","aria-label":c(r)("solutions.problemNavLabel")},[(i(),y(w,null,f(d,(t,v)=>s("a",{key:t.key,class:M(["solution-thought-bubble",[`is-bubble-${v+1}`,{"is-active":a.value===t.key}]]),href:h(t),"aria-current":a.value===t.key?"page":void 0,onClick:L(Z=>k(t),["prevent"])},[s("span",F,[(i(),I(K(t.icon),{size:17}))]),s("span",null,x(c(r)(t.titleKey)),1)],10,E)),64))],8,q)])]))}};export{O as default};
