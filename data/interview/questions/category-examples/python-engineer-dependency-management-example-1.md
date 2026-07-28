---
id: python-engineer-dependency-management-example-1
title: "Python 依赖升级怎样避免“本机能跑、生产崩掉”？"
slug: python-engineer-dependency-management-example-1
tracks:
  - python-engineer
category: dependency-management
stage: scenario
difficulty: intermediate
questionType: system-design
frequency: medium
tags:
  - "依赖治理"
  - "锁文件"
  - "供应链安全"
  - "版本升级"
summary: "围绕依赖治理的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Python 依赖升级怎样避免“本机能跑、生产崩掉”？

::candidate level="core"::
用锁文件固定直接与传递依赖，在与生产一致的 Python 和系统库环境构建不可变制品。升级由 CI 做单测、契约、启动和关键链路回归，并先灰度；不要在生产启动时临时 pip install。

::interviewer::
这个依赖治理方案上线前，怎么用压测或演练验证？

::candidate level="deep"::
保存 SBOM、锁文件 diff、漏洞扫描、测试与灰度指标；生产镜像能反查具体 wheel 和来源。

::interviewer::
依赖治理发生部分失败时，系统怎样收敛？

::candidate::
锁版本能复现但也会积累陈旧风险。需要定期小步升级，而不是等到多个大版本与安全修复一起爆发。
