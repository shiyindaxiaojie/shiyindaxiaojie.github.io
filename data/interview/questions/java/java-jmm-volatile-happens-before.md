---
id: java-jmm-volatile-happens-before
title: volatile 能解决什么问题，又解决不了什么问题？
slug: java-jmm-volatile-happens-before
tracks:
  - java-backend
category: concurrency
stage: technical
difficulty: senior
questionType: principle
frequency: high
tags:
  - Java
  - JMM 内存模型
  - volatile 可见性
  - happens-before 规则
  - 指令重排
summary: 用停止标记、双重检查、计数累加等场景区分可见性、有序性和原子性。
estimatedRead: 6
related:
  - java-concurrenthashmap-locking
  - java-aqs-reentrantlock
---

::interviewer::
一个线程改了变量，另一个线程一直看不到。你会从 Java 内存模型怎么分析？

::candidate level="core"::
我会先说这不是 CPU 算错了，而是线程之间没有建立可见性关系。每个线程可能从工作内存、寄存器或缓存里读值，如果没有同步手段，另一个线程的写入不一定及时对它可见。JMM 解决的是“什么时候一个线程的写对另一个线程可见、顺序是否可靠”。

::interviewer::
volatile 加上后具体保证了什么？

::candidate::
volatile 主要保证两件事：写入后对其他线程可见，以及禁止相关读写被重排到不合理的位置。典型例子是停止标记，线程 A 把 flag 改成 true，线程 B 循环里能看到变化并退出。它适合表达状态变化，不适合表达复合更新。

::interviewer::
那 volatile int count++ 为什么还是不安全？

::candidate level="deep"::
因为 count++ 不是一次操作，它至少包含读、加一、写回。[[volatile]] 能让每次读写都可见，但不能让这三步合成一个不可打断的整体。两个线程可能都读到 10，各自加到 11，再写回，最后少算一次。这里要用 AtomicInteger、LongAdder，或者锁。

::candidate variant="misconception"::
volatile 已经禁止重排了，所以 `count++` 也不会丢数据。

::interviewer correction="true"::
禁止重排解决的是特定读写的可见性和有序性，不会把读、改、写变成一个原子步骤。并发计数要选原子类、LongAdder 或锁，取决于写入竞争和读取语义。

::interviewer::
happens-before 你怎么理解？别背规则，讲它解决什么问题。

::candidate::
[[happens-before]] 是判断可见性和顺序的规则。它告诉我们：如果 A happens-before B，那么 A 的结果对 B 可见，A 的顺序也不会被 B 看到成乱序。比如解锁 happens-before 后续对同一把锁的加锁，volatile 写 happens-before 后续 volatile 读。它让我们不用猜底层缓存细节，而是按同步关系推导程序是否安全。

::interviewer::
双重检查单例为什么要 volatile？

::candidate::
问题在对象创建可能被拆成分配内存、初始化对象、引用赋值几步。如果引用赋值被其他线程先看到，它可能拿到一个还没初始化完成的对象。volatile 放在实例引用上，可以限制这种重排，同时保证初始化后的状态对其他线程可见。

::interviewer::
线上怀疑是可见性问题，你会怎么验证？

::candidate::
我会先找共享变量是不是没有锁、volatile、原子类或并发容器保护，再看循环条件、状态标记、缓存字段这类位置。验证上不会只靠复现，因为并发问题可能很偶发；我会加压测、打开线程 dump，看线程是否卡在等待状态，同时补一个能稳定暴露竞态的并发测试。

::interviewer::
这种并发可见性问题怎么写测试更靠谱？

::candidate::
普通单元测试不太靠谱，因为它可能跑一万次也碰不到。我会用 `JCStress` 这类并发测试工具，把两个线程的读写结果枚举出来，看是否出现不允许的结果；性能层面再用 `JMH` 避免被 JIT 和预热影响。线上排查则看代码里的共享状态有没有同步边界，`jcmd <pid> Thread.print -l` 只能证明线程卡在哪里，不能直接证明 JMM 语义正确。

::terms::
volatile = 保证共享变量的可见性，并约束相关读写重排；不保证复合操作原子性。 | docs=https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html | knowledge=/knowledge/?mode=search&q=volatile
happens-before = 用同步关系推导跨线程可见性和顺序的规则。 | docs=https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html | knowledge=/knowledge/?mode=search&q=happens-before
