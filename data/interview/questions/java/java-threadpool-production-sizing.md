---
id: java-threadpool-production-sizing
title: 线程池参数怎么定，队列积压后怎么处理？
slug: java-threadpool-production-sizing
tracks:
  - java-backend
category: concurrency
difficulty: senior
questionType: troubleshooting
frequency: high
tags:
  - Java
  - 线程池
  - 队列积压
  - 拒绝策略
  - 生产调优
summary: 从任务类型、核心线程数、队列长度、拒绝策略、监控指标和隔离设计理解线程池生产选型。
estimatedRead: 6
related:
  - java-aqs-reentrantlock
  - java-threadlocal-context-leak
---

::interviewer::
你创建线程池时，会先考虑哪些参数？

::candidate level="core"::
我不会先背核心线程数公式，而是先看任务类型：CPU 密集、IO 密集，还是混合任务。落地时我会要求线程池暴露 `activeCount`、`queueSize`、`completedTaskCount`、`rejectCount`、任务执行耗时和排队耗时。没有这些指标，线程池参数只能算经验配置，不能算经过验证的生产参数。

::interviewer::
核心线程数和最大线程数怎么定？

::candidate::
CPU 密集任务通常接近 CPU 核数，避免线程太多导致上下文切换；可以用 `top -H -p <pid>` 或 `pidstat -t -p <pid> 1` 看线程级 CPU。IO 密集任务可以更多，但要同时看下游延迟和连接池水位。最终我会用压测校准：增加线程后吞吐不涨、P99 变差或下游错误率升高，就说明线程不是瓶颈。

::interviewer::
队列选无界队列有什么风险？

::candidate level="deep"::
无界队列会把压力藏起来。请求进来时看起来没有被拒绝，但任务越积越多，延迟会越来越高，最后可能把内存吃满。更糟的是最大线程数可能根本派不上用场，因为任务都排进队列了。生产里我更倾向有界队列，并明确超过承载能力时怎么降级或拒绝。

::interviewer::
拒绝策略你怎么选？

::candidate::
先看业务语义。能快速失败的接口可以 Abort 或自定义返回拥塞提示；日志、埋点这类非核心任务可以丢弃或降采样；不能丢的任务要落库、进 MQ，靠异步补偿，而不是硬塞在线程池里。CallerRunsPolicy 能反压调用方，但也可能拖慢入口线程，要谨慎用。

::interviewer::
线上发现线程池队列持续增长，你会怎么处理？

::candidate::
我会先拿线程栈和指标。`jstack -l <pid>` 或 `jcmd <pid> Thread.print -l` 看线程都在执行什么；Arthas 可以用 `thread`、`dashboard` 看线程状态。如果大量线程卡在同一个下游调用，就先降级、限流或缩短超时；如果线程都在本地计算且 CPU 满，再考虑扩容或拆任务。长期要按业务隔离线程池，避免一个慢下游拖死所有异步任务。

::interviewer::
为什么不建议多个业务共用一个全局线程池？

::candidate::
因为故障会互相传染。比如报表任务突然变慢，占满线程后，原本很轻的通知任务也执行不了。线程池应该按资源和业务重要性隔离，核心链路、低优先级批处理、下游调用最好分开配额。这样出问题时能牺牲低优先级任务，保住关键路径。
