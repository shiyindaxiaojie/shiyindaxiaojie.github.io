---
title: "Deep Dive into Elasticsearch: Storage Internals"
date: 2023-03-01
description: Elasticsearch is the core distributed search and analytics engine of Elastic Stack.
tags:
  - Search Engine
  - Internals
  - Elasticsearch
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Elasticsearch.png
---

# Fundamentals

Elasticsearch is the core distributed search and analytics engine of Elastic Stack. Built on Lucene storage engine, it provides RESTful API with JSON interface and DSL queries. As Elastic company evolved, Elastic Stack formed with four core products: Logstash, Beats, Elasticsearch, and Kibana.

Besides Elasticsearch, open-source search engines include:

1. Apache Solr: Apache open source, built on Lucene, **requires Zookeeper**, more **complex deployment and configuration** compared to ES.
2. OpenSearch: AWS open source, permanently free, **forked from Elasticsearch**, integrates ES and Kibana functionality.
3. ClickHouse: Russian open source, **supports SQL queries**, rich analytics for OLAP scenarios, but **full-text search inferior** to Elasticsearch.
4. Doris: Baidu open source, **supports SQL queries**, suits real-time OLAP, but **community and performance not as good** as Elasticsearch.

> In 2021, Elastic abandoned Apache 2.0 license for SSPL and ELv2 to address cloud providers using source code commercially, causing community dissatisfaction. AWS then launched OpenSearch.
> In 2024, Elastic introduced AGPL license hoping to repair community relations and reestablish open-source positioning.

# Core Concepts

Elasticsearch uses Shards for horizontal scaling to support multi-node distributed deployment, and Follow replicas for data backup achieving high availability.

# How It Works

Elasticsearch's underlying storage is Lucene, implemented in Java.

## Storage Implementation

## Full-Text Search Principles

## Document Version Control

## Index Write Process
