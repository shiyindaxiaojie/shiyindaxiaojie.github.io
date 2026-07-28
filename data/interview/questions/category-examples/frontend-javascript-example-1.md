---
id: frontend-javascript-example-1
title: "JavaScript 事件循环和页面渲染之间是什么关系？"
slug: frontend-javascript-example-1
tracks:
  - frontend
category: javascript
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "JavaScript"
  - "事件循环"
  - "微任务"
  - "页面渲染"
summary: "围绕JavaScript的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
JavaScript 事件循环和页面渲染之间是什么关系？

::candidate level="core"::
一个任务执行完后，浏览器会清空微任务队列，再获得渲染机会。定时器、用户事件属于任务来源，Promise 回调进入微任务；长任务或持续追加微任务都会占住主线程，让输入和绘制排队。

::interviewer::
别停在原理上，JavaScript落到线上先看什么证据？

::candidate level="deep"::
Performance trace 中查看 Long Task、Event、Microtask 与 Render 的时间关系，并用输入延迟和帧率验证修复。

::interviewer::
JavaScript这套判断在哪个边界下会失效？

::candidate::
setTimeout(0) 也受任务队列和最小延迟影响，切片过细还会增加调度开销。让出频率要围绕交互预算而定。
