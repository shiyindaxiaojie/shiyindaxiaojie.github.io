---
id: devops-ansible-example-1
title: "Ansible Playbook 为什么强调幂等，而不是“能跑完”就行？"
slug: devops-ansible-example-1
tracks:
  - devops
category: ansible
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - "Ansible"
  - "幂等执行"
  - "批量变更"
  - "配置收敛"
summary: "围绕Ansible的真实问题，沿着机制、证据和失败边界继续追问。"
estimatedRead: 3
---

::interviewer::
Ansible Playbook 为什么强调幂等，而不是“能跑完”就行？

::candidate level="core"::
幂等意味着目标已经满足时不会继续产生副作用。应优先用声明式模块表达期望状态，把 command/shell 留给无法建模的动作，并用 changed_when、creates 或条件检查约束它；否则每次重跑都可能重复改配置或重启服务。

::interviewer::
别停在原理上，Ansible落到线上先看什么证据？

::candidate level="deep"::
用 check/diff、执行日志、主机事实和服务健康指标证明变更范围；批量操作前后还应抽样校验配置哈希。

::interviewer::
Ansible这套判断在哪个边界下会失效？

::candidate::
Ansible 对单机状态容易幂等，对跨主机事务并不天然原子。滚动变更要预留容量，并设计失败阈值和回滚 Playbook。
