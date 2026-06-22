---
title: Interview Source
tracks:
  - id: cloud-native
    title:
      zh: 云原生架构师
      en: Cloud Native Architect
    shortTitle:
      zh: 云原生架构
      en: Cloud Native
    summary:
      zh: 面向 Kubernetes、平台工程、GitOps、可观测性和韧性治理的架构型面试路线。
      en: 'Architecture-oriented path for Kubernetes, platform engineering, GitOps, observability, and resilience.'
    accent: '#0ea5e9'
    categories:
      - id: platform-story
        label:
          zh: 平台经历
          en: Platform Story
      - id: production-scale
        label:
          zh: 生产规模
          en: Production Scale
      - id: reliability-impact
        label:
          zh: 稳定性结果
          en: Reliability Impact
      - id: kubernetes
        label:
          zh: Kubernetes
          en: Kubernetes
      - id: container-runtime
        label:
          zh: 容器运行时
          en: Container Runtime
      - id: service-mesh
        label:
          zh: 服务网格
          en: Service Mesh
      - id: cicd
        label:
          zh: CI/CD
          en: CI/CD
      - id: gitops
        label:
          zh: GitOps
          en: GitOps
      - id: oam
        label:
          zh: OAM
          en: OAM
      - id: observability
        label:
          zh: 可观测性
          en: Observability
      - id: platform-engineering
        label:
          zh: 平台工程
          en: Platform Engineering
      - id: chaos-engineering
        label:
          zh: 混沌演练
          en: Chaos Engineering
      - id: multi-cluster
        label:
          zh: 多集群治理
          en: Multi-cluster
      - id: traffic-governance
        label:
          zh: 流量治理
          en: Traffic Governance
      - id: disaster-recovery
        label:
          zh: 容灾恢复
          en: Disaster Recovery
      - id: cost-optimization
        label:
          zh: 成本优化
          en: Cost Optimization
      - id: platform-roadmap
        label:
          zh: 平台规划
          en: Platform Roadmap
      - id: team-maturity
        label:
          zh: 团队成熟度
          en: Team Maturity
    stages:
      - id: intro
        title:
          zh: 自我介绍
          en: Intro
        shortTitle:
          zh: 自我介绍
          en: Intro
        summary:
          zh: 先讲平台边界、集群规模、稳定性目标和架构决策结果。
          en: 'Frame platform scope, cluster scale, reliability goals, and architecture outcomes.'
        filterKind: topic
        filterLabel:
          zh: 主题
          en: Topic
        categories:
          - platform-story
          - production-scale
          - reliability-impact
        questionTypes: []
      - id: technical
        title:
          zh: 技术面试
          en: Technical
        shortTitle:
          zh: 技术面试
          en: Technical
        summary:
          zh: 重点追问 Kubernetes、交付链路、可观测性和平台能力边界。
          en: 'Deep-dives into Kubernetes, delivery flow, observability, and platform boundaries.'
        filterKind: skill
        filterLabel:
          zh: 技术
          en: Skill
        categories:
          - kubernetes
          - cicd
          - gitops
          - oam
          - observability
          - service-mesh
          - container-runtime
        questionTypes:
          - principle
          - troubleshooting
          - scenario
      - id: project
        title:
          zh: 项目经验
          en: Project Deep Dive
        shortTitle:
          zh: 项目经验
          en: Project
        summary:
          zh: 重点看你怎样把平台能力、治理规范和可靠性指标落到组织里。
          en: 'Focus on platform enablement, governance, and reliability outcomes.'
        filterKind: domain
        filterLabel:
          zh: 领域
          en: Domain
        categories:
          - platform-engineering
          - gitops
          - observability
          - oam
          - chaos-engineering
          - cicd
        questionTypes:
          - scenario
          - troubleshooting
      - id: scenario
        title:
          zh: 场景设计
          en: Scenario Design
        shortTitle:
          zh: 场景设计
          en: Scenario
        summary:
          zh: 场景通常围绕多集群、流量治理、容灾、成本和事故恢复展开。
          en: 'Scenarios cover multi-cluster governance, traffic, DR, cost, and incident recovery.'
        filterKind: scenario
        filterLabel:
          zh: 场景
          en: Scenario
        categories:
          - multi-cluster
          - traffic-governance
          - disaster-recovery
          - cost-optimization
          - cicd
          - kubernetes
        questionTypes:
          - scenario
          - troubleshooting
      - id: reverse
        title:
          zh: 反问环节
          en: Closing Questions
        shortTitle:
          zh: 反问环节
          en: Closing
        summary:
          zh: 适合追问平台规划、团队成熟度和稳定性目标。
          en: 'Ask about platform roadmap, team maturity, and reliability goals.'
        filterKind: topic
        filterLabel:
          zh: 主题
          en: Topic
        categories:
          - platform-roadmap
          - team-maturity
          - reliability-impact
        questionTypes: []
  - id: devops
    title:
      zh: DevOps / SRE 工程师
      en: DevOps / SRE Engineer
    shortTitle:
      zh: DevOps/SRE
      en: DevOps/SRE
    summary:
      zh: 面向交付效率、基础设施自动化、监控告警、值班事故和稳定性运营。
      en: 'Delivery efficiency, infrastructure automation, monitoring, on-call, and reliability operations.'
    accent: '#0284c7'
    categories:
      - id: delivery-story
        label:
          zh: 交付经历
          en: Delivery Story
      - id: ops-scale
        label:
          zh: 运维规模
          en: Ops Scale
      - id: incident-story
        label:
          zh: 故障复盘
          en: Incident Story
      - id: linux
        label:
          zh: Linux
          en: Linux
      - id: networking
        label:
          zh: 网络
          en: Networking
      - id: cicd
        label:
          zh: CI/CD
          en: CI/CD
      - id: kubernetes
        label:
          zh: Kubernetes
          en: Kubernetes
      - id: terraform
        label:
          zh: Terraform
          en: Terraform
      - id: ansible
        label:
          zh: Ansible
          en: Ansible
      - id: monitoring
        label:
          zh: 监控告警
          en: Monitoring
      - id: release-engineering
        label:
          zh: 发布工程
          en: Release Engineering
      - id: infra-automation
        label:
          zh: 基础设施自动化
          en: Infrastructure Automation
      - id: incident-management
        label:
          zh: 事故管理
          en: Incident Management
      - id: rollback
        label:
          zh: 回滚止血
          en: Rollback
      - id: capacity-planning
        label:
          zh: 容量规划
          en: Capacity Planning
      - id: pipeline-failure
        label:
          zh: 流水线故障
          en: Pipeline Failure
      - id: oncall-culture
        label:
          zh: 值班文化
          en: On-call Culture
      - id: automation-level
        label:
          zh: 自动化程度
          en: Automation Level
    stages:
      - id: intro
        title:
          zh: 自我介绍
          en: Intro
        shortTitle:
          zh: 自我介绍
          en: Intro
        summary:
          zh: 先讲环境规模、交付链路、自动化成果和一次典型故障。
          en: 'Open with environment scale, delivery flow, automation outcomes, and one incident.'
        filterKind: topic
        filterLabel:
          zh: 主题
          en: Topic
        categories:
          - delivery-story
          - ops-scale
          - incident-story
        questionTypes: []
      - id: technical
        title:
          zh: 技术面试
          en: Technical
        shortTitle:
          zh: 技术面试
          en: Technical
        summary:
          zh: 重点追问系统基础、发布流水线、自动化和可观测性。
          en: 'Deep-dives into system basics, delivery pipelines, automation, and observability.'
        filterKind: skill
        filterLabel:
          zh: 技术
          en: Skill
        categories:
          - linux
          - networking
          - cicd
          - kubernetes
          - terraform
          - ansible
          - monitoring
        questionTypes:
          - principle
          - troubleshooting
          - scenario
      - id: project
        title:
          zh: 项目经验
          en: Project Deep Dive
        shortTitle:
          zh: 项目经验
          en: Project
        summary:
          zh: 看你如何推进发布工程、自动化治理、监控体系和事故机制。
          en: 'Focus on release engineering, automation governance, monitoring, and incident process.'
        filterKind: domain
        filterLabel:
          zh: 领域
          en: Domain
        categories:
          - release-engineering
          - infra-automation
          - monitoring
          - incident-management
          - cicd
        questionTypes:
          - scenario
          - troubleshooting
      - id: scenario
        title:
          zh: 场景设计
          en: Scenario Design
        shortTitle:
          zh: 场景设计
          en: Scenario
        summary:
          zh: 场景常围绕回滚、容量、流水线失败和值班事故。
          en: 'Scenarios usually cover rollback, capacity, pipeline failures, and on-call incidents.'
        filterKind: scenario
        filterLabel:
          zh: 场景
          en: Scenario
        categories:
          - rollback
          - capacity-planning
          - pipeline-failure
          - incident-management
          - cicd
        questionTypes:
          - scenario
          - troubleshooting
      - id: reverse
        title:
          zh: 反问环节
          en: Closing Questions
        shortTitle:
          zh: 反问环节
          en: Closing
        summary:
          zh: 适合追问值班文化、自动化成熟度和事故复盘机制。
          en: 'Ask about on-call culture, automation level, and incident review.'
        filterKind: topic
        filterLabel:
          zh: 主题
          en: Topic
        categories:
          - oncall-culture
          - automation-level
          - incident-story
        questionTypes: []
  - id: java-backend
    title:
      zh: Java 后端工程师
      en: Java Backend Engineer
    shortTitle:
      zh: Java 后端
      en: Java
    summary:
      zh: 围绕 Java、MySQL、Redis、Spring、消息队列和高并发业务链路刷高频。
      en: 'Focus on Java, MySQL, Redis, Spring, messaging, and high-concurrency business flows.'
    accent: '#22c55e'
    categories:
      - id: career-story
        label:
          zh: 职业主线
          en: Career Story
      - id: system-ownership
        label:
          zh: 系统职责
          en: System Ownership
      - id: impact-metrics
        label:
          zh: 结果指标
          en: Impact Metrics
      - id: java
        label:
          zh: Java
          en: Java
      - id: mysql
        label:
          zh: MySQL
          en: MySQL
      - id: redis
        label:
          zh: Redis
          en: Redis
      - id: rocketmq
        label:
          zh: RocketMQ
          en: RocketMQ
      - id: spring-boot
        label:
          zh: Spring Boot
          en: Spring Boot
      - id: spring-cloud
        label:
          zh: Spring Cloud
          en: Spring Cloud
      - id: concurrency
        label:
          zh: 并发编程
          en: Concurrency
      - id: ecommerce
        label:
          zh: 电商
          en: Ecommerce
      - id: social
        label:
          zh: 社交
          en: Social
      - id: payment
        label:
          zh: 支付
          en: Payment
      - id: logistics
        label:
          zh: 履约物流
          en: Logistics
      - id: enterprise-saas
        label:
          zh: 企业 SaaS
          en: Enterprise SaaS
      - id: flash-sale
        label:
          zh: 秒杀
          en: Flash Sale
      - id: order-payment
        label:
          zh: 下单支付
          en: Order & Payment
      - id: inventory-deduction
        label:
          zh: 库存扣减
          en: Inventory Deduction
      - id: cache-consistency
        label:
          zh: 缓存一致性
          en: Cache Consistency
      - id: idempotent-api
        label:
          zh: 接口幂等
          en: Idempotent API
      - id: team-stack
        label:
          zh: 技术栈演进
          en: Stack Evolution
      - id: stability-standard
        label:
          zh: 稳定性要求
          en: Stability Standard
    stages:
      - id: intro
        title:
          zh: 自我介绍
          en: Intro
        shortTitle:
          zh: 自我介绍
          en: Intro
        summary:
          zh: 先讲业务系统、核心职责、技术栈和结果指标。
          en: 'Frame business systems, ownership, stack, and measurable outcomes.'
        filterKind: topic
        filterLabel:
          zh: 主题
          en: Topic
        categories:
          - career-story
          - system-ownership
          - impact-metrics
        questionTypes: []
      - id: technical
        title:
          zh: 技术面试
          en: Technical
        shortTitle:
          zh: 技术面试
          en: Technical
        summary:
          zh: 技术面会围绕 Java、数据库、缓存、消息和微服务基础追问。
          en: 'Technical rounds cover Java, database, cache, messaging, and microservice basics.'
        filterKind: skill
        filterLabel:
          zh: 技术
          en: Skill
        categories:
          - java
          - mysql
          - redis
          - rocketmq
          - spring-boot
          - spring-cloud
          - concurrency
        questionTypes:
          - principle
          - scenario
          - troubleshooting
      - id: project
        title:
          zh: 项目经验
          en: Project Deep Dive
        shortTitle:
          zh: 项目经验
          en: Project
        summary:
          zh: 项目经验按业务领域组织，重点讲链路、难点、取舍和结果。
          en: 'Project deep-dives are grouped by domain, with emphasis on flows, trade-offs, and outcomes.'
        filterKind: domain
        filterLabel:
          zh: 领域
          en: Domain
        categories:
          - ecommerce
          - social
          - payment
          - logistics
          - enterprise-saas
        questionTypes:
          - scenario
          - troubleshooting
      - id: scenario
        title:
          zh: 场景设计
          en: Scenario Design
        shortTitle:
          zh: 场景设计
          en: Scenario
        summary:
          zh: 场景设计围绕秒杀、下单、库存、缓存和幂等这些业务链路展开。
          en: 'Scenario design covers flash sales, ordering, inventory, cache, and idempotency.'
        filterKind: scenario
        filterLabel:
          zh: 场景
          en: Scenario
        categories:
          - flash-sale
          - order-payment
          - inventory-deduction
          - cache-consistency
          - idempotent-api
        questionTypes:
          - system-design
          - scenario
      - id: reverse
        title:
          zh: 反问环节
          en: Closing Questions
        shortTitle:
          zh: 反问环节
          en: Closing
        summary:
          zh: 反问优先围绕技术栈演进、稳定性目标和业务复杂度。
          en: 'Ask about stack evolution, reliability goals, and business complexity.'
        filterKind: topic
        filterLabel:
          zh: 主题
          en: Topic
        categories:
          - team-stack
          - stability-standard
          - system-ownership
        questionTypes: []
  - id: go-backend
    title:
      zh: Go 后端工程师
      en: Go Backend Engineer
    shortTitle:
      zh: Go 后端
      en: Go
    summary:
      zh: 围绕 Go、MySQL、Redis、gRPC、微服务和云原生开发刷通用后端题。
      en: 'Focus on Go, MySQL, Redis, gRPC, microservices, and cloud-native backend work.'
    accent: '#06b6d4'
    categories:
      - id: service-story
        label:
          zh: 服务经历
          en: Service Story
      - id: performance-result
        label:
          zh: 性能结果
          en: Performance Result
      - id: go
        label:
          zh: Go
          en: Go
      - id: mysql
        label:
          zh: MySQL
          en: MySQL
      - id: redis
        label:
          zh: Redis
          en: Redis
      - id: grpc
        label:
          zh: gRPC
          en: gRPC
      - id: microservices
        label:
          zh: 微服务
          en: Microservices
      - id: concurrency
        label:
          zh: 并发编程
          en: Concurrency
      - id: cloud-native-dev
        label:
          zh: 云原生开发
          en: Cloud Native Development
      - id: infra-tooling
        label:
          zh: 基础设施工具
          en: Infrastructure Tooling
      - id: api-gateway
        label:
          zh: API 网关
          en: API Gateway
      - id: order-payment
        label:
          zh: 下单支付
          en: Order & Payment
      - id: job-scheduler
        label:
          zh: 任务调度
          en: Job Scheduler
      - id: traffic-spike
        label:
          zh: 流量突增
          en: Traffic Spike
      - id: service-governance
        label:
          zh: 服务治理
          en: Service Governance
      - id: team-stack
        label:
          zh: 技术栈演进
          en: Stack Evolution
    stages:
      - id: intro
        title:
          zh: 自我介绍
          en: Intro
        shortTitle:
          zh: 自我介绍
          en: Intro
        summary:
          zh: 先讲服务规模、接口链路、性能结果和线上职责。
          en: 'Frame service scale, API paths, performance results, and production ownership.'
        filterKind: topic
        filterLabel:
          zh: 主题
          en: Topic
        categories:
          - service-story
          - performance-result
          - team-stack
        questionTypes: []
      - id: technical
        title:
          zh: 技术面试
          en: Technical
        shortTitle:
          zh: 技术面试
          en: Technical
        summary:
          zh: 技术面关注 Go 语言、数据库缓存、RPC、微服务和并发。
          en: 'Technical rounds cover Go, database/cache, RPC, microservices, and concurrency.'
        filterKind: skill
        filterLabel:
          zh: 技术
          en: Skill
        categories:
          - go
          - mysql
          - redis
          - grpc
          - microservices
          - concurrency
        questionTypes:
          - principle
          - scenario
          - troubleshooting
      - id: project
        title:
          zh: 项目经验
          en: Project Deep Dive
        shortTitle:
          zh: 项目经验
          en: Project
        summary:
          zh: Go 项目更适合按云原生开发、基础设施工具和服务治理来讲。
          en: 'Go projects fit cloud-native development, infrastructure tooling, and service governance.'
        filterKind: domain
        filterLabel:
          zh: 领域
          en: Domain
        categories:
          - cloud-native-dev
          - infra-tooling
          - api-gateway
          - service-governance
        questionTypes:
          - scenario
          - troubleshooting
      - id: scenario
        title:
          zh: 场景设计
          en: Scenario Design
        shortTitle:
          zh: 场景设计
          en: Scenario
        summary:
          zh: 场景围绕服务治理、任务调度、流量突增和下单支付链路。
          en: 'Scenarios cover service governance, scheduling, traffic spikes, and ordering flows.'
        filterKind: scenario
        filterLabel:
          zh: 场景
          en: Scenario
        categories:
          - service-governance
          - job-scheduler
          - traffic-spike
          - order-payment
        questionTypes:
          - system-design
          - scenario
      - id: reverse
        title:
          zh: 反问环节
          en: Closing Questions
        shortTitle:
          zh: 反问环节
          en: Closing
        summary:
          zh: 反问优先围绕服务规模、工程治理和技术栈演进。
          en: 'Ask about service scale, engineering governance, and stack evolution.'
        filterKind: topic
        filterLabel:
          zh: 主题
          en: Topic
        categories:
          - team-stack
          - service-governance
          - service-story
        questionTypes: []
  - id: python-engineer
    title:
      zh: Python 工程师
      en: Python Engineer
    shortTitle:
      zh: Python 后端
      en: Python
    summary:
      zh: 面向 Python Web、数据处理、任务调度、自动化和后端服务工程能力。
      en: 'Python web, data processing, scheduling, automation, and backend service engineering.'
    accent: '#f59e0b'
    categories:
      - id: python-story
        label:
          zh: Python 经历
          en: Python Story
      - id: automation-result
        label:
          zh: 自动化成果
          en: Automation Result
      - id: python
        label:
          zh: Python
          en: Python
      - id: django
        label:
          zh: Django
          en: Django
      - id: fastapi
        label:
          zh: FastAPI
          en: FastAPI
      - id: mysql
        label:
          zh: MySQL
          en: MySQL
      - id: redis
        label:
          zh: Redis
          en: Redis
      - id: celery
        label:
          zh: Celery
          en: Celery
      - id: data-pipeline
        label:
          zh: 数据处理
          en: Data Pipeline
      - id: automation-platform
        label:
          zh: 自动化平台
          en: Automation Platform
      - id: backend-api
        label:
          zh: 后端 API
          en: Backend API
      - id: order-payment
        label:
          zh: 下单支付
          en: Order & Payment
      - id: async-task
        label:
          zh: 异步任务
          en: Async Task
      - id: data-import
        label:
          zh: 数据导入
          en: Data Import
      - id: dependency-management
        label:
          zh: 依赖治理
          en: Dependency Management
    stages:
      - id: intro
        title:
          zh: 自我介绍
          en: Intro
        shortTitle:
          zh: 自我介绍
          en: Intro
        summary:
          zh: 先讲 Python 主要场景、服务规模、自动化收益和工程质量。
          en: 'Frame Python use cases, service scale, automation gains, and engineering quality.'
        filterKind: topic
        filterLabel:
          zh: 主题
          en: Topic
        categories:
          - python-story
          - automation-result
          - backend-api
        questionTypes: []
      - id: technical
        title:
          zh: 技术面试
          en: Technical
        shortTitle:
          zh: 技术面试
          en: Technical
        summary:
          zh: 技术面关注 Python 语言、Web 框架、数据库缓存和异步任务。
          en: 'Technical rounds cover Python, web frameworks, database/cache, and async jobs.'
        filterKind: skill
        filterLabel:
          zh: 技术
          en: Skill
        categories:
          - python
          - django
          - fastapi
          - mysql
          - redis
          - celery
        questionTypes:
          - principle
          - scenario
          - troubleshooting
      - id: project
        title:
          zh: 项目经验
          en: Project Deep Dive
        shortTitle:
          zh: 项目经验
          en: Project
        summary:
          zh: 项目可按数据处理、自动化平台、后端 API 和任务系统组织。
          en: 'Projects can be grouped by data pipelines, automation platforms, APIs, and job systems.'
        filterKind: domain
        filterLabel:
          zh: 领域
          en: Domain
        categories:
          - data-pipeline
          - automation-platform
          - backend-api
          - async-task
        questionTypes:
          - scenario
          - troubleshooting
      - id: scenario
        title:
          zh: 场景设计
          en: Scenario Design
        shortTitle:
          zh: 场景设计
          en: Scenario
        summary:
          zh: 场景围绕异步任务、数据导入、接口幂等和依赖治理。
          en: 'Scenarios cover async jobs, data imports, idempotency, and dependency management.'
        filterKind: scenario
        filterLabel:
          zh: 场景
          en: Scenario
        categories:
          - async-task
          - data-import
          - order-payment
          - dependency-management
        questionTypes:
          - system-design
          - scenario
      - id: reverse
        title:
          zh: 反问环节
          en: Closing Questions
        shortTitle:
          zh: 反问环节
          en: Closing
        summary:
          zh: 反问适合关注 Python 工程规范、任务系统和自动化投入。
          en: 'Ask about Python engineering standards, job systems, and automation investment.'
        filterKind: topic
        filterLabel:
          zh: 主题
          en: Topic
        categories:
          - dependency-management
          - automation-result
          - automation-platform
        questionTypes: []
  - id: ai-agent
    title:
      zh: Agent 开发工程师
      en: Agent Engineer
    shortTitle:
      zh: AI Agent
      en: Agent
    summary:
      zh: 围绕 Agent 编排、工具调用、RAG、提示词、评测、安全边界和线上效果闭环。
      en: 'Agent orchestration, tool use, RAG, prompting, evals, safety boundaries, and online feedback loops.'
    accent: '#8b5cf6'
    categories:
      - id: ai-product-story
        label:
          zh: AI 产品经历
          en: AI Product Story
      - id: model-chain
        label:
          zh: 模型链路
          en: Model Pipeline
      - id: llm
        label:
          zh: LLM / RAG
          en: LLM / RAG
      - id: prompt
        label:
          zh: Prompt
          en: Prompt
      - id: agent-orchestration
        label:
          zh: Agent 编排
          en: Agent Orchestration
      - id: tool-calling
        label:
          zh: 工具调用
          en: Tool Calling
      - id: evaluation
        label:
          zh: 评测
          en: Evaluation
      - id: safety
        label:
          zh: 安全边界
          en: Safety
      - id: customer-service
        label:
          zh: 智能客服
          en: Customer Service
      - id: knowledge-assistant
        label:
          zh: 知识助手
          en: Knowledge Assistant
      - id: workflow-agent
        label:
          zh: 工作流 Agent
          en: Workflow Agent
      - id: multi-agent
        label:
          zh: 多 Agent 协作
          en: Multi-agent
      - id: rag-quality
        label:
          zh: RAG 质量
          en: RAG Quality
      - id: hallucination-control
        label:
          zh: 幻觉控制
          en: Hallucination Control
      - id: cost-latency
        label:
          zh: 成本与延迟
          en: Cost & Latency
      - id: eval-maturity
        label:
          zh: 评测体系
          en: Eval Maturity
    stages:
      - id: intro
        title:
          zh: 自我介绍
          en: Intro
        shortTitle:
          zh: 自我介绍
          en: Intro
        summary:
          zh: 先讲 AI 产品形态、模型链路、评测结果和线上闭环。
          en: 'Frame product shape, model pipeline, eval outcomes, and online loop.'
        filterKind: topic
        filterLabel:
          zh: 主题
          en: Topic
        categories:
          - ai-product-story
          - model-chain
          - eval-maturity
        questionTypes: []
      - id: technical
        title:
          zh: 技术面试
          en: Technical
        shortTitle:
          zh: 技术面试
          en: Technical
        summary:
          zh: 技术面重点追问检索、提示词、Agent 编排、工具调用和评测。
          en: 'Technical rounds cover retrieval, prompting, agent orchestration, tool use, and evals.'
        filterKind: skill
        filterLabel:
          zh: 技术
          en: Skill
        categories:
          - llm
          - prompt
          - agent-orchestration
          - tool-calling
          - evaluation
          - safety
        questionTypes:
          - principle
          - scenario
      - id: project
        title:
          zh: 项目经验
          en: Project Deep Dive
        shortTitle:
          zh: 项目经验
          en: Project
        summary:
          zh: 项目按智能客服、知识助手、工作流 Agent 和多 Agent 协作组织。
          en: 'Projects can be grouped by support bots, knowledge assistants, workflow agents, and multi-agent systems.'
        filterKind: domain
        filterLabel:
          zh: 领域
          en: Domain
        categories:
          - customer-service
          - knowledge-assistant
          - workflow-agent
          - multi-agent
        questionTypes:
          - scenario
      - id: scenario
        title:
          zh: 场景设计
          en: Scenario Design
        shortTitle:
          zh: 场景设计
          en: Scenario
        summary:
          zh: 场景围绕 RAG 质量、幻觉控制、工具调用、成本延迟和安全边界。
          en: 'Scenarios cover RAG quality, hallucination control, tool use, cost/latency, and safety.'
        filterKind: scenario
        filterLabel:
          zh: 场景
          en: Scenario
        categories:
          - rag-quality
          - hallucination-control
          - tool-calling
          - cost-latency
          - safety
          - llm
          - prompt
        questionTypes:
          - scenario
          - system-design
      - id: reverse
        title:
          zh: 反问环节
          en: Closing Questions
        shortTitle:
          zh: 反问环节
          en: Closing
        summary:
          zh: 反问适合关注评测体系、数据闭环、模型权限和安全边界。
          en: 'Ask about eval maturity, data loops, model choices, and safety boundaries.'
        filterKind: topic
        filterLabel:
          zh: 主题
          en: Topic
        categories:
          - eval-maturity
          - model-chain
          - safety
        questionTypes: []
  - id: frontend
    title:
      zh: 前端工程师
      en: Frontend Engineer
    shortTitle:
      zh: 前端工程
      en: Frontend
    summary:
      zh: 围绕浏览器、工程化、性能体验、组件体系和业务交互复杂度展开。
      en: 'Browser internals, engineering, performance, component systems, and product interaction complexity.'
    accent: '#f97316'
    categories:
      - id: product-story
        label:
          zh: 产品经历
          en: Product Story
      - id: ux-impact
        label:
          zh: 体验指标
          en: UX Impact
      - id: browser
        label:
          zh: 浏览器
          en: Browser
      - id: javascript
        label:
          zh: JavaScript
          en: JavaScript
      - id: typescript
        label:
          zh: TypeScript
          en: TypeScript
      - id: vue
        label:
          zh: Vue
          en: Vue
      - id: react
        label:
          zh: React
          en: React
      - id: build-tooling
        label:
          zh: 构建工具
          en: Build Tooling
      - id: performance
        label:
          zh: 性能优化
          en: Performance
      - id: design-system
        label:
          zh: 设计系统
          en: Design System
      - id: low-code
        label:
          zh: 低代码
          en: Low-code
      - id: data-visualization
        label:
          zh: 数据可视化
          en: Data Visualization
      - id: first-screen
        label:
          zh: 首屏优化
          en: First Screen
      - id: cache-strategy
        label:
          zh: 缓存策略
          en: Cache Strategy
      - id: micro-frontend
        label:
          zh: 微前端
          en: Micro-frontend
      - id: collaboration-model
        label:
          zh: 协作模式
          en: Collaboration Model
    stages:
      - id: intro
        title:
          zh: 自我介绍
          en: Intro
        shortTitle:
          zh: 自我介绍
          en: Intro
        summary:
          zh: 先讲产品形态、负责范围、性能体验结果和工程化建设。
          en: 'Frame product shape, ownership scope, UX/perf outcomes, and engineering work.'
        filterKind: topic
        filterLabel:
          zh: 主题
          en: Topic
        categories:
          - product-story
          - ux-impact
          - performance
        questionTypes: []
      - id: technical
        title:
          zh: 技术面试
          en: Technical
        shortTitle:
          zh: 技术面试
          en: Technical
        summary:
          zh: 技术面关注浏览器、语言基础、框架、构建和性能。
          en: 'Technical rounds cover browser internals, language basics, frameworks, build, and performance.'
        filterKind: skill
        filterLabel:
          zh: 技术
          en: Skill
        categories:
          - browser
          - javascript
          - typescript
          - vue
          - react
          - build-tooling
          - performance
        questionTypes:
          - principle
          - scenario
      - id: project
        title:
          zh: 项目经验
          en: Project Deep Dive
        shortTitle:
          zh: 项目经验
          en: Project
        summary:
          zh: 项目按设计系统、低代码、可视化、性能治理和业务中后台组织。
          en: 'Projects can be grouped by design systems, low-code, visualization, perf governance, and dashboards.'
        filterKind: domain
        filterLabel:
          zh: 领域
          en: Domain
        categories:
          - design-system
          - low-code
          - data-visualization
          - performance
        questionTypes:
          - scenario
      - id: scenario
        title:
          zh: 场景设计
          en: Scenario Design
        shortTitle:
          zh: 场景设计
          en: Scenario
        summary:
          zh: 场景围绕首屏优化、缓存策略、微前端和复杂交互稳定性。
          en: 'Scenarios cover first-screen optimization, cache strategy, micro-frontends, and interaction stability.'
        filterKind: scenario
        filterLabel:
          zh: 场景
          en: Scenario
        categories:
          - first-screen
          - cache-strategy
          - micro-frontend
          - browser
        questionTypes:
          - scenario
          - system-design
      - id: reverse
        title:
          zh: 反问环节
          en: Closing Questions
        shortTitle:
          zh: 反问环节
          en: Closing
        summary:
          zh: 反问适合围绕产品复杂度、设计系统、性能预算和协作模式。
          en: 'Ask about product complexity, design systems, perf budgets, and collaboration model.'
        filterKind: topic
        filterLabel:
          zh: 主题
          en: Topic
        categories:
          - collaboration-model
          - design-system
          - performance
        questionTypes: []
difficulties:
  - id: junior
    label:
      zh: 初级
      en: Junior
  - id: intermediate
    label:
      zh: 中级
      en: Intermediate
  - id: senior
    label:
      zh: 高级
      en: Senior
questionTypes:
  - id: principle
    label:
      zh: 原理题
      en: Principle
  - id: scenario
    label:
      zh: 场景题
      en: Scenario
  - id: system-design
    label:
      zh: 系统设计
      en: System Design
  - id: troubleshooting
    label:
      zh: 排障题
      en: Troubleshooting
frequencies:
  - id: high
    label:
      zh: 高频
      en: High
  - id: medium
    label:
      zh: 中频
      en: Medium
  - id: low
    label:
      zh: 低频
      en: Low
---

# Interview Bank Source

`data/interview/index.md` and `data/interview/questions/**/*.md` are the only files meant for hand editing.

Run `npm run build:interview` to regenerate:

- `data/interview/index.json`
- `data/interview/facets.json`
- `data/interview/tracks/*.json`

Question directories under `data/interview/questions/` are source groups, not necessarily UI filters. Use question frontmatter `tracks`, `category`, and `tags` to decide where a question appears.
