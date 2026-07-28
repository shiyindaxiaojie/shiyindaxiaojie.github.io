---
id: frontend-design-system-example-1
title: "设计系统怎样保证一致性，又不压死业务差异？"
slug: frontend-design-system-example-1
tracks:
  - frontend
category: design-system
stage: project
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "设计系统"
  - "设计令牌"
  - "组件 API"
  - "视觉回归"
summary: "围绕设计系统的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
设计系统怎样保证一致性，又不压死业务差异？

::candidate level="core"::
把颜色、间距、排版等稳定规则沉淀为 token，把高频交互做成可组合组件，业务语义留在上层。组件 API 应围绕可访问性和状态约束，而不是给每个差异增加布尔参数。

::interviewer::
这条设计系统链路上线后，用什么证据验证设计？

::candidate level="deep"::
用组件采用率、重复实现减少量、视觉回归、无障碍测试和升级缺陷统计验证价值，不能只看 Storybook 页面数。

::interviewer::
设计系统里最容易漏掉的失败分支是什么？

::candidate::
统一度越高，迁移和治理成本越大。设计系统应明确支持范围和退出机制，特殊业务不必强塞进通用组件。
