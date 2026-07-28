---
id: frontend-javascript-example-2
title: "微任务太多为什么会让页面迟迟不更新？"
slug: frontend-javascript-example-2
tracks:
  - frontend
category: javascript
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "JavaScript"
  - "事件循环"
  - "微任务"
  - "页面渲染"
summary: "围绕JavaScript的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
微任务太多为什么会让页面迟迟不更新？

::candidate level="deep"::
微任务检查点会一直执行到队列清空。如果每个 Promise 回调继续创建微任务，浏览器就难以进入渲染阶段。应把大计算切成可让出主线程的任务，或交给 Worker，而不是用更多 Promise 包装。

::interviewer::
如果现场现象和预期不一致，JavaScript怎么继续缩小范围？

::candidate level="deep"::
Performance trace 中查看 Long Task、Event、Microtask 与 Render 的时间关系，并用输入延迟和帧率验证修复。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
setTimeout(0) 也受任务队列和最小延迟影响，切片过细还会增加调度开销。让出频率要围绕交互预算而定。
