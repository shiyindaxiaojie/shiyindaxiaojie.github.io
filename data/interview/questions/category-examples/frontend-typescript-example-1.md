---
id: frontend-typescript-example-1
title: "TypeScript 的类型安全边界在哪里，为什么仍要运行时校验？"
slug: frontend-typescript-example-1
tracks:
  - frontend
category: typescript
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "TypeScript"
  - "运行时校验"
  - "泛型"
  - "判别联合"
summary: "围绕TypeScript的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
TypeScript 的类型安全边界在哪里，为什么仍要运行时校验？

::candidate level="core"::
类型在编译后会被擦除，网络响应、localStorage、用户输入和第三方脚本都来自不可信运行时。边界处用 schema 校验并把 unknown 收窄，内部代码再享受静态类型；直接断言只是在关闭检查。

::interviewer::
别停在原理上，TypeScript落到线上先看什么证据？

::candidate level="deep"::
用类型测试、运行时 schema 测试、契约样本和错误监控验证边界；重点检查 any、类型断言和生成接口发生漂移的位置。

::interviewer::
TypeScript这套判断在哪个边界下会失效？

::candidate::
类型过度抽象会让错误信息和维护成本变差。优先表达真实业务不变量，不为追求“零重复”堆叠难读的条件类型。
