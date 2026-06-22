---
id: java-backend-concurrency-example-1
title: Java 线程池参数怎么配，为什么队列不能无限大？
slug: java-backend-concurrency-example-1
tracks:
  - java-backend
category: concurrency
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - 并发编程
  - 线程池
  - AQS
  - 锁竞争
summary: 用任务耗时、线程状态、队列水位和拒绝策略判断线程池参数是否合理。
estimatedRead: 5
---

::interviewer::
你平时配置线程池，会怎么确定核心线程数、最大线程数和队列长度？

::candidate level="core"::
我会先把任务分成 CPU 密集还是 IO 密集，再拿数据校准。CPU 密集型先按 `CPU 核数` 附近估；IO 密集型要看平均耗时里有多少时间在等下游。落地时我会记录任务执行耗时、队列等待时间、activeCount、queueSize、rejectCount，而不是只写一个经验值。

::interviewer::
怎么拿这些数据？不要只说“看监控”。

::candidate::
如果线程池是自己封装的，我会给 `beforeExecute/afterExecute` 或任务包装器埋点，统计提交时间、开始执行时间、结束时间。线上临时排查可以用 `jstack -l <pid>` 看线程是不是大量处于 WAITING/TIMED_WAITING，或者用 Arthas 的 `thread`、`dashboard` 看线程状态和 CPU 热点。容器层面再配合 `top -H -p <pid>` 或 `pidstat -t -p <pid> 1` 看是不是线程切换和 CPU 已经打满。

::interviewer::
为什么不建议直接用无界队列？

::candidate level="deep"::
无界队列会把过载隐藏成排队。用户请求可能已经超时，但任务还在队列里等，最后执行的是一批已经没有业务价值的旧任务。更危险的是队列对象越来越多，堆内存被吃满，触发 Full GC 或 OOM。生产上我更倾向有界队列，配合明确的拒绝策略，让系统知道自己已经超过处理能力。

::interviewer::
拒绝策略你会怎么选？

::candidate::
先看任务能不能丢。日志、埋点可以采样丢弃；用户请求相关任务通常快速失败并返回拥塞提示；不能丢的数据要落库或进 MQ 做补偿。`CallerRunsPolicy` 能反压调用方，但如果调用方是 Tomcat 工作线程，可能把入口线程也拖住，所以我会只在确认调用方可承受时用。

::interviewer::
线上队列开始堆积，你怎么判断是线程不够还是下游慢？

::candidate::
我会同时看四组证据：线程池 active 是否打满、queueSize 是否持续增长、任务执行耗时是否变长、下游接口或数据库耗时是否变长。如果 active 打满且下游慢，盲目加线程只会把下游压得更慢；如果 CPU 很空、下游正常、任务短但线程数太小，才考虑增加线程。判断顺序是先找瓶颈，再调参数。
