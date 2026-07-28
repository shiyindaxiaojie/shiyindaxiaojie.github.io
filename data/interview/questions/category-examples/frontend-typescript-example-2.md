---
id: frontend-typescript-example-2
title: "泛型和判别联合怎样表达复杂业务状态？"
slug: frontend-typescript-example-2
tracks:
  - frontend
category: typescript
stage: technical
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - "TypeScript"
  - "运行时校验"
  - "泛型"
  - "判别联合"
summary: "围绕TypeScript的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
泛型和判别联合怎样表达复杂业务状态？

::candidate level="deep"::
泛型表达不同数据之间的约束，判别联合用稳定的 status 字段把 loading、success、error 等状态及其专属字段绑定。配合 exhaustive check，可以让新增状态在编译期暴露遗漏分支。

::interviewer::
如果现场现象和预期不一致，TypeScript怎么继续缩小范围？

::candidate level="deep"::
用类型测试、运行时 schema 测试、契约样本和错误监控验证边界；重点检查 any、类型断言和生成接口发生漂移的位置。

::interviewer::
这个方案会把成本或风险转移到哪里？

::candidate::
类型过度抽象会让错误信息和维护成本变差。优先表达真实业务不变量，不为追求“零重复”堆叠难读的条件类型。
