---
id: frontend-micro-frontend-example-1
title: "什么情况下微前端能解耦团队，什么情况下只会增加复杂度？"
slug: frontend-micro-frontend-example-1
tracks:
  - frontend
category: micro-frontend
stage: scenario
difficulty: intermediate
questionType: system-design
frequency: medium
tags:
  - "微前端"
  - "团队边界"
  - "运行时隔离"
  - "独立发布"
summary: "围绕微前端的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
什么情况下微前端能解耦团队，什么情况下只会增加复杂度？

::candidate level="core"::
当业务边界和团队 ownership 清楚、发布节奏独立时，微前端能减少共同发布。若只是一个小团队维护高度耦合页面，拆分会新增路由、通信、性能和调试成本，模块化单体往往更合适。

::interviewer::
这个微前端方案上线前，怎么用压测或演练验证？

::candidate level="deep"::
监控每个子应用的加载耗时、错误、版本和资源体积，契约测试与跨应用 E2E 要覆盖独立发布组合。

::interviewer::
微前端发生部分失败时，系统怎样收敛？

::candidate::
共享依赖减少体积却增加版本耦合，完全隔离则重复下载。选择应基于真实包大小、缓存和升级节奏。
