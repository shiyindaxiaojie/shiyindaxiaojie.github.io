---
id: jvm-gc-roots
title: JVM 里 GC Roots 到底是什么，为什么它能决定对象是否存活？
slug: jvm-gc-roots
tracks:
  - java-backend
category: java
stage: technical
difficulty: intermediate
questionType: principle
frequency: medium
tags:
  - JVM
  - GC Roots
  - 可达性分析
  - JVM 内存管理
summary: 常见追问会把可达性分析、引用类型和内存泄漏一起串起来。
estimatedRead: 5
related:
  - mysql-mvcc
---

::interviewer::
GC Roots 是什么？

::candidate level="core"::
它是一组天然存活的起点对象，GC 会从这些根开始向下做可达性分析，能被触达的对象视为存活。

::interviewer::
那哪些对象可以当 GC Roots？

::candidate::
典型包括：

1. 栈帧中的局部变量引用。
2. 方法区里的静态属性引用。
3. 本地方法栈里的 JNI 引用。
4. 某些 JVM 内部持有的活动对象。

::candidate level="deep"::
这题真正容易加分的点，是继续往“为什么循环引用在 JVM 里不是问题”上讲。  
因为 JVM 不是用简单引用计数，而是用可达性分析，所以两个互相引用但整体不可达的对象仍然会被回收。

::interviewer::
如果线上怀疑某个对象不该存活，你怎么用工具证明它被谁引用着？

::candidate::
我会先拿 heap dump，比如 `jcmd <pid> GC.heap_dump /tmp/app.hprof`，低版本可以用 `jmap -dump:live,format=b,file=/tmp/app.hprof <pid>`。然后用 MAT 打开，先看 Dominator Tree 找 retained size 大的对象，再对具体对象看 Path to GC Roots。这里要排除弱引用、软引用路径，重点看静态集合、ThreadLocal、线程栈、本地缓存或队列这些强引用链。能把引用链讲清楚，才算证明对象为什么活着。
