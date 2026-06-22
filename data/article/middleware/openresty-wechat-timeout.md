---
title: OpenResty Optimization for WeChat Push Response Timeout
date: 2025-04-25
description: Production environment constantly showing WeChat push timeout alerts, indicating developer didn't respond within 5 seconds after WeChat server pushed ...
tags:
  - OpenResty
  - High Concurrency
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/OpenResty.png
---

# Problem Description

Production environment constantly showing WeChat push timeout alerts, indicating developer didn't respond within 5 seconds after WeChat server pushed messages or events.

After investigation, operations team was pushing WeChat template messages to user groups. With users increased to 30K, original SCRM service couldn't handle the burst HTTP requests, causing response timeouts.

# Root Cause Analysis

SCRM service handles WeChat-related business like **menu clicks**, **template pushes**, **customer service messages**.

The bulk of WeChat pushes are template message events. Development confirmed these don't require processing - they simply return 200 status with "success" string at Controller layer.

SCRM is a Java service with 8 Pods (0.5 core 2GB each) exposed via Tencent Cloud CLB.

Link: WeChat -> Tencent CLB -> SCRM Service

Benchmark testing showed ~4000 QPS, but WeChat push peak reached 7000 QPS. Scaling to 16 Pods only reduced timeout alerts by 30% - too costly just for handling WeChat pushes.

# Solution

Add OpenResty gateway layer before SCRM service. Use Lua scripts to preprocess requests - directly return "success" for template message events, otherwise proxy to SCRM.

Optimized link: WeChat -> Tencent CLB -> Self-hosted OpenResty -> SCRM Service

## Create OpenResty Service

Create Deployment with `openResty` + `logrotate` containers, 0.5 core 2GB total, 2 Pods.

## OpenResty Core Configuration

`nginx.conf` configures worker processes, events, HTTP layer and Lua initialization:

```conf
worker_processes 4;
worker_rlimit_nofile 102400;

events {
    use epoll;
    worker_connections 102400;
    multi_accept on;
}

http {
    lua_package_path "/usr/local/openresty/lualib/?.lua;;";
    lua_shared_dict wechat_cache 256m;
    lua_code_cache on;

    proxy_connect_timeout 3s;
    proxy_read_timeout 4s;
    proxy_send_timeout 3s;

    include /etc/nginx/conf.d/*.conf;
}
```

## OpenResty Interception Configuration

`default.conf` configures upstream, routing and Lua scripts:

```conf
upstream scrm {
    keepalive 512;
    server scrm.prd1.svc.cluster.local:8080;
}

server {
    location = /scrm/api/webhook {
        access_by_lua_block {
            local function handle_request()
                if ngx.req.get_method() == "POST" then
                    ngx.req.read_body()
                    local body = ngx.req.get_body_data() or ""

                    if body:find("TEMPLATESENDJOBFINISH") then
                        ngx.header["Content-Type"] = "text/plain"
                        ngx.say("success")
                        return ngx.exit(ngx.HTTP_OK)
                    end
                end
                ngx.exec("@scrm")
            end
            handle_request()
        }
    }

    location @scrm {
        proxy_pass http://scrm;
    }
}
```

## Benchmark Testing

Single 2-core 2GB Pod: QPS 24,318
Two Pods with CLB: QPS 51,487

After deploying 6 Pods (12-core 12GB total), QPS reached ~150K, and WeChat alerts stopped.

Overall, scaling OpenResty is much cheaper than scaling Java applications. Used HPA scheduled scaling for peak push times - problem solved.
