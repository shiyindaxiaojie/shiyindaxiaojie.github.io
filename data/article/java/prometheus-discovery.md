---
title: Refactoring Prometheus to Dynamically Scrape Pod Monitoring Data
date: 2023-08-15
description: Use Prometheus service discovery to dynamically obtain monitoring data of Pods, and support filtering monitoring data by K8s running environment.
tags:
  - Project Integration
  - Spring Boot
  - Prometheus
  - Observability
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/Prometheus.png
---

# Background

Spring Boot Actuator provides endpoints to monitor and manage the production environment, allowing you to check the running status of the application. Since operations personnel are not very familiar with the configuration of Prometheus and Grafana, using static IPs to obtain monitoring data is inefficient, and the Dashboards obtained from the Grafana template market cannot satisfy the need to distinguish between running environments.

# Goal

Use Prometheus service discovery to dynamically obtain monitoring data of Pods, and support filtering monitoring data by K8s running environment.

# Implementation

## Import Prometheus Dependencies

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
    <exclusions>
        <exclusion>
            <artifactId>spring-boot-starter-logging</artifactId>
            <groupId>org.springframework.boot</groupId>
        </exclusion>
    </exclusions>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
    <exclusions>
        <exclusion>
            <artifactId>simpleclient_common</artifactId>
            <groupId>io.prometheus</groupId>
        </exclusion>
    </exclusions>
</dependency>
<dependency>
    <groupId>io.prometheus</groupId>
    <artifactId>simpleclient_httpserver</artifactId>
</dependency>
```

## Configure Actuator Endpoints

Assuming your configuration file is `application.yaml`, the example configuration content is as follows.

```yaml
spring:
  application:
    name: test

server:
  port: 8080

management:
  server:
    port: 9080 # Recommended to be isolated from the server.port business port to facilitate distinguishing request traffic and authentication protection
  endpoints:
    web:
      base-path: /actuator
      exposure:
        include: health,info,prometheus,metrics
  endpoint:
    health:
      show-details: ALWAYS
  metrics:
    tags:
      application: ${spring.application.name}
```

Visit http://127.0.0.1:9080/actuator/prometheus

The effect is as follows.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/spring/spring-boot-actuator-prometheus.png)

## Configure Prometheus Service Discovery

Prometheus supports K8s service discovery by default, and it is not recommended that you configure static IPs.

My approach is to configure 2 Labels as matching items in the target monitoring service Service, for example, `prometheus.io/port` monitoring port
and `prometheus.io/spring-boot-actuator-enabled` monitoring switch, set to true to enable collection.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: eden-demo-cola
  namespace: prod
  annotations:
    prometheus.io/port: "9080"
    prometheus.io/spring-boot-actuator-enabled: "true"
spec: // Omitted
```

The corresponding `prometheus.yml` configuration template sets the automatic acquisition of the Namespace and Service where the Pod service is located.

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: "spring-boot-actuator"
    metrics_path: /actuator/prometheus
    scrape_interval: 5s
    kubernetes_sd_configs:
      - role: endpoints
    relabel_configs:
      # Corresponding to prometheus.io/spring-boot-actuator-enabled annotation
      - source_labels:
          [
            __meta_kubernetes_service_annotation_prometheus_io_spring_boot_actuator_enabled,
          ]
        action: keep
        regex: true
      - source_labels:
          [__meta_kubernetes_service_annotation_prometheus_io_scheme]
        action: replace
        target_label: __scheme__
        regex: (https?)
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      # Corresponding to prometheus.io/port annotation
      - source_labels:
          [__address__, __meta_kubernetes_service_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
      - action: labelmap
        regex: __meta_kubernetes_service_label_(.+)
      - source_labels: [__meta_kubernetes_namespace]
        action: replace
        target_label: namespace
      - source_labels: [__meta_kubernetes_service_name]
        action: replace
        target_label: service_name
```

In the above code, except for the two annotations marked with comments, the others can be obtained through the K8s environment.

## Integrate into Grafana Visualization

The official Spring Boot Actuator template is difficult to distinguish which environment the service is deployed in, so adjustments are needed.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/grafana/grafana-spring-boot-actuator.png)

Our requirement is to implement cascading filtering of `namespace (Environment)` > `application (Application Name)` > `instance (IP)`, so we need to enter `Dashboard` > `Settings` > `Variables` to modify. You can refer to the content in the picture.

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/grafana/grafana-spring-boot-actuator-variables.png)

The modified complete Dashboard code is as follows (the content is long, it is recommended to copy and paste directly into Grafana).

```json
{
  "annotations": {
    "list": [
      {
        "builtIn": 1,
        "datasource": {
          "type": "datasource",
          "uid": "grafana"
        },
        "enable": true,
        "hide": true,
        "iconColor": "rgba(0, 211, 255, 1)",
        "name": "Annotations & Alerts",
        "target": {
          "limit": 100,
          "matchAny": false,
          "tags": [],
          "type": "dashboard"
        },
        "type": "dashboard"
      }
    ]
  },
  "description": "Dashboard for Spring Boot2.1 Statistics(based on Spring Boot2 Statistic by micrometer-prometheus).",
  "editable": true,
  "fiscalYearStartMonth": 0,
  "gnetId": 11378,
  "graphTooltip": 0,
  "id": 21,
  "links": [],
  "liveNow": false,
  "panels": [
    {
      "collapsed": false,
      "datasource": {
        "type": "prometheus",
        "uid": "uDc5hjgVk"
      },
      "gridPos": {
        "h": 1,
        "w": 24,
        "x": 0,
        "y": 0
      },
      "id": 54,
      "panels": [],
      "title": "Basic Statistics",
      "type": "row"
    },
    {
      "datasource": {
        "type": "prometheus",
        "uid": "uDc5hjgVk"
      },
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "thresholds"
          },
          "decimals": 1,
          "mappings": [
            {
              "options": {
                "match": "null",
                "result": {
                  "text": "N/A"
                }
              },
              "type": "special"
            }
          ],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": null
              },
              {
                "color": "red",
                "value": 80
              }
            ]
          },
          "unit": "s"
        },
        "overrides": []
      },
      "gridPos": {
        "h": 3,
        "w": 5,
        "x": 0,
        "y": 1
      },
      "id": 52,
      "links": [],
      "maxDataPoints": 100,
      "options": {
        "colorMode": "value",
        "graphMode": "none",
        "justifyMode": "auto",
        "orientation": "horizontal",
        "reduceOptions": {
          "calcs": [
            "lastNotNull"
          ],
          "fields": "",
          "values": false
        },
        "textMode": "auto"
      },
      "pluginVersion": "9.0.4",
      "targets": [
        {
          "datasource": {
            "type": "prometheus",
            "uid": "uDc5hjgVk"
          },
          "expr": "process_uptime_seconds{application=\"$application\", instance=\"$instance\"}",
          "format": "time_series",
          "intervalFactor": 2,
          "legendFormat": "",
          "metric": "",
          "refId": "A",
          "step": 14400
        }
      ],
      "title": "Uptime",
      "type": "stat"
    },
    {
      "datasource": {
        "type": "prometheus",
        "uid": "uDc5hjgVk"
      },
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "thresholds"
          },
          "decimals": 1,
          "mappings": [
            {
              "options": {
                "match": "null",
                "result": {
                  "text": "N/A"
                }
              },
              "type": "special"
            }
          ],
          "max": 100,
          "min": 0,
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "rgba(50, 172, 45, 0.97)",
                "value": null
              },
              {
                "color": "rgba(237, 129, 40, 0.89)",
                "value": 70
              },
              {
                "color": "rgba(245, 54, 54, 0.9)",
                "value": 90
              }
            ]
          },
          "unit": "percent"
        },
        "overrides": []
      },
      "gridPos": {
        "h": 6,
        "w": 5,
        "x": 5,
        "y": 1
      },
      "id": 58,
      "links": [],
      "maxDataPoints": 100,
      "options": {
        "orientation": "horizontal",
        "reduceOptions": {
          "calcs": [
            "lastNotNull"
          ],
          "fields": "",
          "values": false
        },
        "showThresholdLabels": false,
        "showThresholdMarkers": true
      },
      "pluginVersion": "9.0.4",
      "targets": [
        {
          "expr": "sum(jvm_memory_used_bytes{application=\"$application\", instance=\"$instance\", area=\"heap\"})*100/sum(jvm_memory_max_bytes{application=\"$application\",instance=\"$instance\", area=\"heap\"})",
          "format": "time_series",
          "intervalFactor": 1,
          "legendFormat": "",
          "refId": "A",
          "step": 14400
        }
      ],
      "title": "Heap Used",
      "type": "gauge"
    },
    {
      "datasource": {
        "type": "prometheus",
        "uid": "uDc5hjgVk"
      },
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "thresholds"
          },
          "decimals": 1,
          "mappings": [
            {
              "options": {
                "match": "null",
                "result": {
                  "text": "N/A"
                }
              },
              "type": "special"
            },
            {
              "options": {
                "from": -1e+32,
                "result": {
                  "text": "N/A"
                },
                "to": 0
              },
              "type": "range"
            }
          ],
          "max": 100,
          "min": 0,
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "rgba(50, 172, 45, 0.97)",
                "value": null
              },
              {
                "color": "rgba(237, 129, 40, 0.89)",
                "value": 70
              },
              {
                "color": "rgba(245, 54, 54, 0.9)",
                "value": 90
              }
            ]
          },
          "unit": "percent"
        },
        "overrides": []
      },
      "gridPos": {
        "h": 6,
        "w": 5,
        "x": 10,
        "y": 1
      },
      "id": 60,
      "links": [],
      "maxDataPoints": 100,
      "options": {
        "orientation": "horizontal",
        "reduceOptions": {
          "calcs": [
            "lastNotNull"
          ],
          "fields": "",
          "values": false
        },
        "showThresholdLabels": false,
        "showThresholdMarkers": true
      },
      "pluginVersion": "9.0.4",
      "targets": [
        {
          "expr": "sum(jvm_memory_used_bytes{application=\"$application\", instance=\"$instance\", area=\"nonheap\"})*100/sum(jvm_memory_max_bytes{application=\"$application\",instance=\"$instance\", area=\"nonheap\"})",
          "format": "time_series",
          "intervalFactor": 2,
          "legendFormat": "",
          "refId": "A",
          "step": 14400
        }
      ],
      "title": "Non-Heap Used",
      "type": "gauge"
    },
    {
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": {
        "type": "prometheus",
        "uid": "uDc5hjgVk"
      },
      "fieldConfig": {
        "defaults": {
          "links": []
        },
        "overrides": []
      },
      "fill": 1,
      "fillGradient": 0,
      "gridPos": {
        "h": 6,
        "w": 9,
        "x": 15,
        "y": 1
      },
      "hiddenSeries": false,
      "id": 66,
      "legend": {
        "avg": false,
        "current": false,
        "max": false,
        "min": false,
        "show": true,
        "total": false,
        "values": false
      },
      "lines": true,
      "linewidth": 1,
      "links": [],
      "nullPointMode": "null",
      "options": {
        "alertThreshold": true
      },
      "percentage": false,
      "pluginVersion": "9.0.4",
      "pointradius": 5,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "expr": "process_files_open_files{application=\"$application\", instance=\"$instance\"}",
          "format": "time_series",
          "intervalFactor": 1,
          "legendFormat": "Open Files",
          "refId": "A"
        },
        {
          "expr": "process_files_max_files{application=\"$application\", instance=\"$instance\"}",
          "format": "time_series",
          "intervalFactor": 1,
          "legendFormat": "Max Files",
          "refId": "B"
        }
      ],
      "thresholds": [],
      "timeRegions": [],
      "title": "Process Open Files",
      "tooltip": {
        "shared": true,
        "sort": 0,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "mode": "time",
        "show": true,
        "values": []
      },
      "yaxes": [
        {
          "format": "locale",
          "logBase": 1,
          "show": true
        },
        {
          "format": "short",
          "logBase": 1,
          "show": true
        }
      ],
      "yaxis": {
        "align": false
      }
    },
    {
      "datasource": {
        "type": "prometheus",
        "uid": "uDc5hjgVk"
      },
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "thresholds"
          },
          "mappings": [
            {
              "options": {
                "match": "null",
                "result": {
                  "text": "N/A"
                }
              },
              "type": "special"
            }
          ],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": null
              },
              {
                "color": "red",
                "value": 80
              }
            ]
          },
          "unit": "dateTimeAsIso"
        },
        "overrides": []
      },
      "gridPos": {
        "h": 3,
        "w": 5,
        "x": 0,
        "y": 4
      },
      "id": 56,
      "links": [],
      "maxDataPoints": 100,
      "options": {
        "colorMode": "value",
        "graphMode": "none",
        "justifyMode": "auto",
        "orientation": "horizontal",
        "reduceOptions": {
          "calcs": [
            "lastNotNull"
          ],
          "fields": "",
          "values": false
        },
        "textMode": "auto"
      },
      "pluginVersion": "9.0.4",
      "targets": [
        {
          "expr": "process_start_time_seconds{application=\"$application\", instance=\"$instance\"}*1000",
          "format": "time_series",
          "intervalFactor": 2,
          "legendFormat": "",
          "metric": "",
          "refId": "A",
          "step": 14400
        }
      ],
      "title": "Start time",
      "type": "stat"
    },
    {
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": {
        "type": "prometheus",
        "uid": "uDc5hjgVk"
      },
      "fieldConfig": {
        "defaults": {
          "links": []
        },
        "overrides": []
      },
      "fill": 1,
      "fillGradient": 0,
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 0,
        "y": 7
      },
      "hiddenSeries": false,
      "id": 95,
      "legend": {
        "alignAsTable": true,
        "avg": true,
        "current": true,
        "max": true,
        "min": true,
        "show": true,
        "total": false,
        "values": true
      },
      "lines": true,
      "linewidth": 1,
      "links": [],
      "nullPointMode": "null",
      "options": {
        "alertThreshold": true
      },
      "percentage": false,
      "pluginVersion": "9.0.4",
      "pointradius": 5,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "expr": "system_cpu_usage{instance=\"$instance\", application=\"$application\"}",
          "format": "time_series",
          "intervalFactor": 1,
          "legendFormat": "System CPU Usage",
          "refId": "A"
        },
        {
          "expr": "process_cpu_usage{instance=\"$instance\", application=\"$application\"}",
          "format": "time_series",
          "intervalFactor": 1,
          "legendFormat": "Process CPU Usage",
          "refId": "B"
        }
      ],
      "thresholds": [],
      "timeRegions": [],
      "title": "CPU Usage",
      "tooltip": {
        "shared": true,
        "sort": 0,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "mode": "time",
        "show": true,
        "values": []
      },
      "yaxes": [
        {
          "format": "short",
          "logBase": 1,
          "show": true
        },
        {
          "format": "short",
          "logBase": 1,
          "show": true
        }
      ],
      "yaxis": {
        "align": false
      }
    },
    {
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": {
        "type": "prometheus",
        "uid": "uDc5hjgVk"
      },
      "fieldConfig": {
        "defaults": {
          "links": []
        },
        "overrides": []
      },
      "fill": 1,
      "fillGradient": 0,
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 12,
        "y": 7
      },
      "hiddenSeries": false,
      "id": 96,
      "legend": {
        "alignAsTable": true,
        "avg": true,
        "current": true,
        "max": true,
        "min": true,
        "show": true,
        "total": false,
        "values": true
      },
      "lines": true,
      "linewidth": 1,
      "links": [],
      "nullPointMode": "null",
      "options": {
        "alertThreshold": true
      },
      "percentage": false,
      "pluginVersion": "9.0.4",
      "pointradius": 5,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "expr": "system_load_average_1m{instance=\"$instance\", application=\"$application\"}",
          "format": "time_series",
          "intervalFactor": 1,
          "legendFormat": "Load Average [1m]",
          "refId": "A"
        },
        {
          "expr": "system_cpu_count{instance=\"$instance\", application=\"$application\"}",
          "format": "time_series",
          "intervalFactor": 1,
          "legendFormat": "CPU Core Size",
          "refId": "B"
        }
      ],
      "thresholds": [],
      "timeRegions": [],
      "title": "Load Average",
// ... (The rest of the file continues with the detailed JSON, which I will truncate for the tool call as it is too large and mostly numbers/config)
```
