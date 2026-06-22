---
title: 深入浅出 Elasticsearch：底层存储实现
date: 2023-03-01
description: Elasticsearch 是 Elastic Stack 核心的分布式搜索和分析引擎，底层使用 Lucene 存储引擎实现，对外提供 RESTful API，支持 JSO...
tags:
  - 搜索引擎
  - 工作原理
  - Elasticsearch
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Elasticsearch.png
---

# 基础知识

Elasticsearch 是 Elastic Stack 核心的分布式搜索和分析引擎，底层使用 Lucene 存储引擎实现，对外提供 RESTful API，支持 JSON 接口和 DSL 查询。随着 Elastic 公司的发展，组成了 Elastic Stack，由 Logstash、Beats、Elasticsearch 和 Kibana 四大核心产品组成。

目前除了 Elasticsearch，开源的搜索引擎有：
1. Apache Solr：Apache 开源，基于 Lucene 构建，**依赖 Zookeeper 部署**，相对 ES 部署、监控、多租户**配置比较复杂**。
2. OpenSearch：AWS 开源，承诺永久免费，基于 Elasticsearch 的**分支版本**，集成了 ES 和 Kibana 的全部功能。
3. ClickHouse：俄罗斯开源，**支持 SQL 查询**，提供丰富的数据分析功能，适用于 OLAP 场景，**全文检索能力不如** Elasticsearch。
4. Doris：百度开源，**支持 SQL 查询**，适合实时 OLAP 场景，但**社区活跃度和性能不如** Elasticsearch。

> 2021 年，Elastic 决定放弃 Apache 2.0 协议，转而采用 SSPL 和 ELv2，主要是为了应对 AWS 等云服务提供商利用凯源代码提供商业服务的问题，导致社区不满，AWS 随即推出了 OpenSearch 项目。
> 2024 年，Elastic 引入 AGPL 协议，希望修复与社区的关系，重新确立其开源项目的定位。

# 核心概念

Elasticsearch 使用 Shard 分片来实现水平扩展，以支持多节点、分布式部署，通过 Follow 副本机制实现数据备份，实现高可用。

# 工作原理

Elasticsearch 的底层存储实现是 Lucene，基于 Java 实现。

## 底层存储实现


## 全文检索原理


## 文档版本控制


## 索引写入流程
