---
id: go-backend-team-stack-example-1
title: "团队为什么从原有语言引入 Go，这个决定解决了什么问题？"
slug: go-backend-team-stack-example-1
tracks:
  - go-backend
category: team-stack
stage: intro
difficulty: intermediate
questionType: scenario
frequency: medium
tags:
  - "技术栈演进"
  - "Go 选型"
  - "迁移策略"
  - "工程效能"
summary: "围绕技术栈演进的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
团队为什么从原有语言引入 Go，这个决定解决了什么问题？

::candidate level="core"::
先说明原系统在并发、部署、资源或维护上的具体瓶颈，再比较继续优化与迁移的成本。Go 只是方案之一，回答要包含团队学习、依赖生态、观测和回滚，而不是把语言偏好当结论。

::interviewer::
这段回答怎么用真实材料支撑，而不是只靠口述？

::candidate level="deep"::
用选型记录、试点服务指标、迁移缺陷和开发者反馈形成证据，避免只展示成功案例。

::interviewer::
技术栈演进这段经历还有什么代价或没解决的问题？

::candidate::
双栈期会增加招聘、工具链和运维成本。退出旧栈的条件、不能迁移的系统和长期 owner 都要提前确定。
