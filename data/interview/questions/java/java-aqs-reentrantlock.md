---
id: java-aqs-reentrantlock
title: ReentrantLock 背后的 AQS 是怎么让线程排队的？
slug: java-aqs-reentrantlock
tracks:
  - java-backend
category: concurrency
stage: technical
difficulty: senior
questionType: principle
frequency: high
tags:
  - Java
  - AQS
  - ReentrantLock 可重入锁
  - 公平锁
  - 条件队列
summary: 从 state、CAS、同步队列、park/unpark、可重入和公平性理解 ReentrantLock 的实现边界。
estimatedRead: 6
related:
  - java-jmm-volatile-happens-before
  - java-threadpool-production-sizing
---

::interviewer::
ReentrantLock 已经能用，为什么还要理解 AQS？

::candidate level="core"::
因为很多并发工具的底层思路都类似：用一个 state 表示同步状态，用 CAS 抢状态，抢不到就进队列等待。理解 AQS 后，ReentrantLock、Semaphore、CountDownLatch 这些工具就不是孤立 API，而是一套“状态 + 队列 + 唤醒”的模型。

::interviewer::
线程抢 ReentrantLock 时，没抢到会怎样？

::candidate::
没抢到不会一直空转烧 CPU，而是被包装成队列节点放进 AQS 的同步队列。它会在合适时机 park 挂起，前驱释放锁后再 unpark 唤醒。这里的关键是把竞争从“所有线程乱抢”变成“队列里有秩序地等待”。

::interviewer::
可重入是怎么做到的？

::candidate level="deep"::
锁里会记录当前持有锁的线程，同时用 state 记录重入次数。同一个线程再次加锁时，不需要排队，只把 state 加一；释放时逐次减一，减到零才真正释放锁并唤醒后继线程。如果忘了 unlock，state 就归不了零，其他线程会一直等，所以通常要放在 finally 里。

::interviewer::
公平锁和非公平锁的差别是什么？线上你会怎么选？

::candidate::
公平锁会更尊重等待队列，避免线程长期饥饿；非公平锁允许新来的线程插队抢一下，吞吐通常更高。大多数业务我会默认非公平，因为锁持有时间短时插队能减少上下文切换。只有在确实出现饥饿、排队顺序有业务意义，或者延迟尾部很难接受时，才考虑公平锁。

::candidate variant="misconception"::
公平锁一定更好，因为它不会插队，吞吐和延迟都会更稳定。

::interviewer correction="true"::
公平锁减少饥饿，但排队和唤醒会增加竞争路径成本。默认选非公平锁；只有业务需要顺序、公平性，或已确认饥饿问题时，再用公平锁并观察吞吐和尾延迟。

::interviewer::
Condition 和 Object.wait 有什么不同？

::candidate::
Condition 可以给一把锁拆出多个等待队列，比如“队列不空”和“队列不满”分开等。Object.wait 只有对象监视器上的一个等待集合，表达能力弱一些。用 Condition 时也要在循环里判断条件，因为线程被唤醒只代表可以重新竞争锁，不代表业务条件一定成立。

::interviewer::
如果线上线程都卡在一把 ReentrantLock 上，你怎么排查？

::candidate::
我会先连续抓线程 dump：`jcmd <pid> Thread.print -l` 或 `jstack -l <pid>`，看哪些线程 WAITING 在 `AbstractQueuedSynchronizer`，再找持锁线程的业务栈。Arthas 可以用 `thread -b` 快速找阻塞源，再用 `thread <id>` 看它是不是在锁里做了慢 IO、远程调用或复杂计算。优化时先缩短临界区，再考虑分段锁、读写锁或不可变快照，而不是直接把锁改成公平锁。

::terms::
AQS = 用同步状态、CAS、等待队列和 park/unpark 构建同步器的基础框架。 | knowledge=/knowledge/?mode=search&q=AQS
ReentrantLock = 基于 AQS 的可重入显式锁，支持公平策略、可中断获取和多个 Condition。 | docs=https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html | knowledge=/knowledge/?mode=search&q=ReentrantLock
