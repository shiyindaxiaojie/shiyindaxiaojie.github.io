---
title: 10 分钟了解 AI 概念和应用
level: 入门
stacks:
  - codex
  - claude-code
summary: 从 LLM、RAG、Agent 到 AI 协同开发，快速建立一张能直接上手的 AI 基础地图。
order: 10
tags:
  - AI
  - LLM
  - Prompt
  - MCP
  - Agent
  - RAG
  - Vibe Engineering
  - Context Engineering
  - Loop Engineering
---

# AI 基础地图

先记住这一条线。

LLM 负责理解和生成。

RAG 负责把资料找出来。

Agent 负责调用工具，把事情往前推进。

工程方法负责让这一套东西在真实项目里不乱跑。

# LLM

LLM 是大语言模型。ChatGPT、Claude、DeepSeek、Gemini、Kimi、Qwen、豆包，都是你会遇到的典型入口。

它能写文章、总结资料、翻译、写代码、做问答、做分析。

它的问题也很直接。

- 没看过你的私有资料，就只能猜
- 信息可能过期
- 事实题会编
- 代码没跑测试，不等于能用
- 没接工具，就不能真正操作系统

所以 LLM 不是万能答案机。它更像一个语言和推理能力很强的大脑。

# Prompt

Prompt 就是任务说明。

别追求玄学模板。写清楚 4 件事就够。

- 要它做什么
- 基于什么材料做
- 输出成什么格式
- 哪些东西不能编、不能省、不能改

Prompt 只能让模型更懂你的要求，不能让模型凭空知道它没见过的资料。

资料问题，交给 RAG。

# RAG

RAG 的核心很简单，回答前先翻资料。

它通常这么跑。

1. 把文档切成小块
2. 把文本变成向量
3. 存进向量数据库
4. 用户提问时检索相关片段
5. 把片段交给模型回答

适合做公司知识库、客服问答、产品文档问答、代码库问答。

它也有坑。

- 文档切得差，答案会断
- 检索召回错，答案会偏
- 资料过期，回答也旧
- 只找相似片段，容易漏掉关系

GraphRAG 适合关系复杂的问题。它会从文档里抽实体和关系，构建知识图谱，再回答跨文档、全局性的问题。缺点是成本高，更新重。

LightRAG 更轻。它保留实体和关系，但减少重型图谱处理。适合想要关系检索，又不想成本太高的场景。

# Agent

Agent 不是更会聊天的模型。

Agent 是 LLM 在循环中使用工具的系统。

它一般需要这些东西。

- LLM，判断下一步
- 规划，拆任务
- 记忆，保存状态
- 工具，搜索、读文件、写代码、查数据库、调 API
- 循环，看结果后继续做

普通 LLM 会告诉你怎么改代码。

Coding Agent 会读仓库、改文件、跑测试、看报错，再继续修。

这就是差别。

# Workflow 和 Agent

Workflow 是代码控制流程。

步骤固定、成本低、好排查，适合稳定业务。

Agent 是模型控制流程。

更灵活，也更贵、更不稳定、更难排查，适合开放任务。

真实项目里不要一上来全 Agent 化。流程固定就用 Workflow，只有不确定的环节再交给 Agent。

# Agent 常见模式

ReAct，边想边做。模型思考一步，调一次工具，看结果，再继续。

Plan-and-Execute，先列计划，再执行。更省，但遇到变化要重新规划。

Reflection，做完再检查。代码、文档、方案都适合加这一层。

Multi-Agent，多 Agent 分工。复杂任务再用，别为了热闹硬拆。

# Function Call、MCP、Skills

Function Call 解决模型怎么调用函数。

MCP 解决外部工具怎么统一接入，比如文件、数据库、GitHub、Slack、浏览器。

Skills 解决做事方法怎么沉淀，比如代码审查规则、写作规则、发布检查清单。

可以这样记。

- Function Call 管调用
- MCP 管连接
- Skills 管方法

# AI 工程方法

Prompt Engineering 解决怎么把任务说清楚。

Context Engineering 解决每次调用该给模型看什么。用户输入、历史对话、检索资料、工具结果、任务状态、系统规则，都算上下文。

Harness Engineering 解决怎么让 Agent 稳定干活。常见做法是 AGENTS.md、测试、lint、权限、日志、Git Hook、CI、代码审查。

Loop Engineering 解决怎么把触发、执行、验证、记录、审批串成循环。它不是写一条 Prompt，而是设计一个能反复跑的系统。

别跳太快。

一次手动任务都没跑稳，就急着自动循环，只会把问题放大。

# 可以直接用什么

日常问答和写作，ChatGPT、Claude、Gemini、DeepSeek、Kimi、Qwen、豆包。

搜索和研究，Perplexity、ChatGPT Deep Research、Gemini Deep Research、Kimi 研究类能力。

写代码和改项目，Codex、Claude Code、Cursor、GitHub Copilot、Windsurf、Trae。

知识库和 RAG，Dify、Coze、FastGPT、LlamaIndex、LangChain。

Agent 应用开发，OpenAI Agents SDK、LangGraph、CrewAI、AutoGen。

自动化流程，n8n、Make、Zapier。

# 怎么开始

别从概念开始，直接拿一个重复任务练。

会议纪要、周报、日志排查、文章总结、小脚本、Excel 分析，都可以。

按这个顺序来。

1. 让模型复述任务
2. 给真实材料
3. 限定输出格式
4. 让它自查事实、遗漏、边界
5. 把好用的 Prompt、资料、检查清单沉淀下来

# 进真实流程前先看

- 能不能接真实资料
- 能不能调用真实系统
- 有没有权限和审批
- 出错后能不能定位
- 能不能回滚
- 有没有日志和测试

这些答不上来，就别急着放进生产。

