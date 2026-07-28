---
id: frontend-low-code-example-2
title: "用户拖出一个很慢的页面，平台该在哪一层做性能保护？"
slug: frontend-low-code-example-2
tracks:
  - frontend
category: low-code
stage: project
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "低代码"
  - "Schema 版本"
  - "页面运行时"
  - "扩展安全"
summary: "围绕低代码的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
用户拖出一个很慢的页面，平台该在哪一层做性能保护？

::candidate level="deep"::
编辑时提示组件数量、数据请求和表达式成本，保存时做静态校验，运行时再限制并发、脚本时间和数据量。平台提供诊断视图指出慢组件，不能只把责任推给搭建者。

::interviewer::
这项低代码设计怎么证明不是纸上方案？

::candidate level="deep"::
用 schema 兼容测试、历史页面回放、运行时 Performance trace 和错误率验证；每次迁移记录版本与失败样本。

::interviewer::
这个设计的责任边界和取舍是什么？

::candidate::
表达能力越强，安全与性能越难控制。自定义脚本、外部请求和组件扩展必须沙箱化并分权限开放。
