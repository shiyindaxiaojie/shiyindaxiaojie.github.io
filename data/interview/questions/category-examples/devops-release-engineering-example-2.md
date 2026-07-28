---
id: devops-release-engineering-example-2
title: "发布系统服务几十个团队时，哪些能力平台统一，哪些留给业务配置？"
slug: devops-release-engineering-example-2
tracks:
  - devops
category: release-engineering
stage: project
difficulty: senior
questionType: scenario
frequency: high
tags:
  - "发布工程"
  - "制品追踪"
  - "平台边界"
  - "审计链"
summary: "围绕发布工程的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
发布系统服务几十个团队时，哪些能力平台统一，哪些留给业务配置？

::candidate level="deep"::
平台应统一制品规范、凭证、审计、灰度能力和回滚接口；业务团队配置健康指标、发布窗口和依赖顺序。平台若把业务判断全部抽象掉，会变成绕不开又不懂业务的瓶颈。

::interviewer::
这项发布工程设计怎么证明不是纸上方案？

::candidate level="deep"::
用一次真实发布记录演示从 commit SHA 到镜像 digest、部署批次和 Pod 标签的闭环，并检查回滚是否仍引用原制品。

::interviewer::
这个设计的责任边界和取舍是什么？

::candidate::
追溯链完整不代表发布安全。配置、数据库和外部开关若不在同一变更单内，应用版本回滚后仍可能处于不兼容状态。
