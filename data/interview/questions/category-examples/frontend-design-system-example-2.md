---
id: frontend-design-system-example-2
title: "组件库升级后改坏几十个页面，发布机制哪里出了问题？"
slug: frontend-design-system-example-2
tracks:
  - frontend
category: design-system
stage: project
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "设计系统"
  - "设计令牌"
  - "组件 API"
  - "视觉回归"
summary: "围绕设计系统的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
组件库升级后改坏几十个页面，发布机制哪里出了问题？

::candidate level="deep"::
需要语义化版本、变更日志、视觉回归、契约测试和渐进迁移。破坏性变更先提供 codemod 或兼容层，选择代表性业务灰度；只在组件库测试通过，覆盖不了真实组合。

::interviewer::
这项设计系统设计怎么证明不是纸上方案？

::candidate level="deep"::
用组件采用率、重复实现减少量、视觉回归、无障碍测试和升级缺陷统计验证价值，不能只看 Storybook 页面数。

::interviewer::
这个设计的责任边界和取舍是什么？

::candidate::
统一度越高，迁移和治理成本越大。设计系统应明确支持范围和退出机制，特殊业务不必强塞进通用组件。
