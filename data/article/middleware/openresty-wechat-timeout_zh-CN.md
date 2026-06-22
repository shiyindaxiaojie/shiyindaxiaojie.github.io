---
title: OpenResty 优化微信推送响应超时问题
date: 2025-04-25
description: 最近生产环境一直提示微信推送超时，内容如下。
tags:
  - OpenResty
  - 高并发
cover: https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/cover/OpenResty.png
---

# 问题描述

最近生产环境一直提示微信推送超时，内容如下。

```txt
Appid: wx123456789
昵称: 梦想歌
时间: 2025-04-21 18:31:15
内容: 微信服务器向公众号推送消息或事件后，开发者5秒内没有返回
次数: 5分钟 17880 次
错误样例: [OpenID=of5mGs6Mg7kvpJkhfOq61a_t_Weg][Stamp=1745231475][OuterIP=][3rdUrl=https://wechat.mengxiangge.com/scrm/api/webhook][IP=123.456.123.456][Event=Template Send Job Finish]
报警排查指引，请见: https://mmbizurl.cn/s/MpkaZb8yg
```

经确认，是运营团队通过用户群体推送微信模板消息，微信回调到我们的后端服务 SCRM 企微系统。由于运营将用户增加到 3W 人，原来的 SCRM 服务无法承载微信突增的 HTTP 请求，导致响应超时。

# 原因分析

首先，对微信推送的消息做业务分类。

SCRM 服务需要处理微信相关的业务，例如**用户点击菜单**、**微信推送模板**、**客服消息**等功能。

微信大量的推送主要是模板消息事件，对应的请求内容示例如下。

```xml
<?xml version="1.0" encoding="utf-8"?>

<xml> 
  <CreateTime>1743476352</CreateTime>  
  <Event>TEMPLATESENDJOBFINISH</Event>  
  <FromUserName>ofemGs0v_Zs1ULsXgJ4N473Ss</FromUserName>  
  <MsgType>event</MsgType>  
  <ToUserName>gh_c54Fgf02d54cf</ToUserName>
</xml>
```

和研发团队确认，这个模板消息推送，SCRM 服务是不需要处理的，他们直接在 Controller 层直接响应 200 状态码和 "success" 字符内容。

SCRM 服务是一个 Java 服务，部署了 8 个 Pod，规格为 0.5 核 2GB，通过腾讯云 CLB 暴露服务。

整个链路依次为：微信 -> 腾讯云CLB -> SCRM 服务

通过 wrk 定向基准测试（固定 TEMPLATESENDJOBFINISH 事件请求），QPS 大概有 4000，在日志层面我们看到微信推送的 QPS 高峰达到 7000，如下图。

![](https://cdn.jsdelivr.net/gh/shiyindaxiaojie/cdn/tencent/wechat-webhook-cls.png)

好，看看扩容 Pod 就能解决？我们把 SCRM 服务扩容到 16 个 Pod。

结果，微信仍然告警，只是提示响应超时的次数相对少了 30%

```txt
Appid: wx123456789
昵称: 梦想歌
时间: 2025-04-22 18:31:15
内容: 微信服务器向公众号推送消息或事件后，开发者5秒内没有返回
次数: 5分钟 13120 次
错误样例: [OpenID=of5mGs6Mg7kvpJkhfOq61a_t_Weg][Stamp=1745231475][OuterIP=][3rdUrl=https://wechat.mengxiangge.com/scrm/api/webhook][IP=123.456.123.456][Event=Template Send Job Finish]
报警排查指引，请见: https://mmbizurl.cn/s/MpkaZb8yg
```

仅仅是为了处理微信推送来扩容 SCRM 服务，成本太高了，应该是由网关负责扛住这波流量。前面提到，SCRM 服务的前置网关为腾讯云负载均衡 CLB，但这个 CLB 不支持对这些请求做配置处理，只能做简单的负载均衡。

# 解决方案

笔者提出的思路是在 SCRM 服务增加一层 OpenResty 网关，通过 Lua 脚本做请求预处理，匹配到微信推送模板事件时直接 return success OK，否则放行到 SCRM 服务。

原来的链路：微信 -> 腾讯云CLB -> SCRM 服务

优化后的链路：微信 -> 腾讯云CLB -> 自建OpenResty -> SCRM 服务

## 创建 OpenResty 服务

创建 Deployment 工作负载，容器为 `openResty` + `logrotate` 组合，总规格为 0.5核 2GB，共部署 2 个 Pod。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    description: 微信回调
  labels:
    k8s-app: openresty-wechat
    qcloud-app: openresty-wechat
  name: openresty-wechat
  namespace: proxy
spec:
  replicas: 2
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      k8s-app: openresty-wechat
      qcloud-app: openresty-wechat
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
    type: RollingUpdate
  template:
    metadata:
      labels:
        k8s-app: openresty-wechat
        qcloud-app: openresty-wechat
    spec:
      affinity: {}
      containers:
      - env:
        - name: TZ
          value: Asia/Shanghai
        image: openresty/openresty:centos
        imagePullPolicy: IfNotPresent
        name: openresty
        ports:
        - containerPort: 80
          name: http
          protocol: TCP
        - containerPort: 443
          name: https
          protocol: TCP
        resources:
          limits:
            cpu: 1950m
            memory: 1900Mi
          requests:
            cpu: 1950m
            memory: 1900Mi
        securityContext:
          privileged: false
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
        volumeMounts:
        - mountPath: /usr/local/openresty/nginx/conf/nginx.conf
          name: nginx-conf
          readOnly: true
          subPath: nginx.conf
        - mountPath: /etc/nginx/conf.d/default.conf
          name: default-conf
          readOnly: true
          subPath: default.conf
        - mountPath: /etc/nginx/keys/
          name: ssl-config
        - mountPath: /usr/local/openresty/nginx/logs
          name: nginx-log
      - env:
        - name: TZ
          value: Asia/Shanghai
        - name: LOGS_DIRECTORIES
          value: /usr/local/openresty/nginx/logs/*.log
        - name: LOGROTATE_CRONSCHEDULE
          value: 0 * * * *
        - name: LOGROTATE_INTERVAL
          value: hourly
        - name: LOGROTATE_DATEFORMAT
          value: -%Y%m%d%H
        - name: LOGROTATE_SIZE
          value: 20M
        - name: LOGROTATE_COPIES
          value: "20"
        - name: LOGROTATE_COMPRESSION
          value: compress
        image: blacklabelops/logrotate
        imagePullPolicy: IfNotPresent
        name: logrotate
        resources:
          limits:
            cpu: 50m
            memory: 148Mi
          requests:
            cpu: 50m
            memory: 148Mi
        securityContext:
          privileged: false
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
      volumes:
      - configMap:
          defaultMode: 420
          items:
          - key: nginx.conf
            mode: 420
            path: nginx.conf
          name: openresty-wechat
        name: nginx-conf
      - configMap:
          defaultMode: 420
          items:
          - key: default.conf
            mode: 420
            path: default.conf
          name: openresty-wechat
        name: default-conf
```


## OpenResty 核心配置

上文我们配置了 `nginx.conf` 和 `default.conf` 文件。

`nginx.conf` 主要负责设置 NG 的 worker 进程、events 处理机制、http 协议层以及 lua 初始配置，配置内容如下：

```conf
worker_processes 4;
worker_rlimit_nofile 102400;

error_log /usr/local/openresty/nginx/logs/error.log info;
pid /var/run/nginx.pid;

events {
    use epoll;
    worker_connections 102400;
    multi_accept on;
    accept_mutex off; 
}

http {
    charset utf-8;
    server_tokens off;
    more_clear_headers 'Server';

    # 设置 lua 加载类库和本地缓存
    lua_package_path "/usr/local/openresty/lualib/?.lua;;";
    lua_shared_dict wechat_cache 256m;
    lua_code_cache on;

    # 日志格式化
    log_format main escape=json '{'
        '"timestamp": "$time_iso8601",'
        '"remote_addr": "$remote_addr",'
        '"request_method": "$request_method",'
        '"request_uri": "$request_uri",'
        '"status": $status,'
        '"body_bytes_sent": $body_bytes_sent,'
        '"request_time": $request_time,'
        '"http_user_agent": "$http_user_agent",'
        '"upstream_addr":"$upstream_addr",'
        '"upstream_response_time":"$upstream_response_time"'
    '}';

    # 全局日志
    access_log /usr/local/openresty/nginx/logs/access.log main;

    # 网络优化
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 10s;
    keepalive_requests 10000;

    # 代理超时控制（确保 5 秒内响应）
    proxy_http_version 1.1;
    proxy_buffering off;
    proxy_connect_timeout 3s;
    proxy_read_timeout 4s;
    proxy_send_timeout 3s;
    proxy_set_header Connection "";

    include /etc/nginx/conf.d/*.conf;
}
```

## OpenResty 拦截配置

根据 NG include 的路径 `/etc/nginx/conf.d/*.conf`，我们主要配置了 `default.conf`，用于设置 upstream 负载均衡、server 层的路由和 lua 脚本，配置内容如下；

```conf
upstream scrm {
    zone backend 10m;
    keepalive 512;
    keepalive_requests 100000;
    server scrm.prd1.svc.cluster.local:8080 weight=3 max_fails=1 fail_timeout=5s;
    server scrm.prd2.svc.cluster.local:8080 weight=3 max_fails=1 fail_timeout=5s;
    server scrm.prd3.svc.cluster.local:8080 weight=3 max_fails=1 fail_timeout=5s;
    server scrm.prd4.svc.cluster.local:8080 weight=1 backup;
}

server {
    listen 80 reuseport;
    listen 443 ssl reuseport;
    server_name wechat.mengxiangge.com;

    ssl_certificate /etc/nginx/keys/mengxiangge.com_bundle.crt;
    ssl_certificate_key /etc/nginx/keys/mengxiangge.com.key;
    ssl_session_timeout 5m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    add_header Strict-Transport-Security "max-age=31536000";

    # 只接受 GET 和 POST 请求
    if ($request_method !~ ^(GET|POST)$ ) {
        return 405;
    }

    # 微信回调入口
    location = /scrm/api/webhook {
        access_by_lua_block { 
            local function handle_request()
                local request_method = ngx.req.get_method()
                local client_ip = ngx.var.remote_addr
                local cache = ngx.shared.wechat_cache

                if request_method == "POST" then
                    ngx.req.read_body()
                    local body = ngx.req.get_body_data() or ""

                    if body:find("TEMPLATESENDJOBFINISH") then
                        local hash_key = ngx.md5(client_ip .. body)
                        if not cache:get(hash_key) then
                            cache:set(hash_key, 1, 60)
                            ngx.log(ngx.INFO, "[WX] Intercepted: ", hash_key)
                        else
                            ngx.log(ngx.WARN, "[WX] Duplicate: ", hash_key)
                        end

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

    location / {
        deny all;
        access_log off;
        return 403;
    }

    # 内部代理到后端
    location @scrm {
        proxy_pass http://scrm;
        proxy_pass_request_headers on;
        proxy_set_header Host $host;
        proxy_set_header X-Original-URI $request_uri;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        proxy_next_upstream error timeout http_500;
        proxy_next_upstream_tries 1;
    }
}
```

相关代码解释：
1. 使用 `access_by_lua_block` 预处理，而不是 `content_by_lua_block` 重定向，否则性能大打折扣。
2. 因为微信在 5 秒内未响应会重试 3 次，我们使用 `lua_shared_dict wechat_cache 256m` 配置共享缓存，通过 `local hash_key = ngx.md5(client_ip .. body)` 记录是否有重复的请求。
3. 为增加安全性，对 `location /` 路由直接返回 403，只匹配 `location = /scrm/api/webhook` 用于处理微信回调。

## OpenResty 基准测试

单个 Pod，规格为 2核 2GB，压测结果如下，QPS 为 24318。

```bash
> wrk -t4 -c10000 -d30s --latency -s wechat_fundmobile_pressure.lua http://10.2.0.1/scrm/api/webhook

Running 30s test @ http://10.2.0.1/scrm/api/webhook
  4 threads and 10000 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency   405.27ms   87.72ms   1.12s    81.47%
    Req/Sec     6.17k     1.89k   14.56k    76.37%
  Latency Distribution
     50%  410.21ms
     75%  446.79ms
     90%  489.66ms
     99%  701.94ms
  732000 requests in 30.10s, 147.99MB read
Requests/sec:  24318.01
Transfer/sec:      4.92MB
```

使用腾讯云 CLB 绑定 2个 Pod，规格为 2核 2GB * 2，压测结果如下，QPS 为 51487。

```bash
> wrk -t4 -c10000 -d30s --latency -s wechat_fundmobile_pressure.lua http://172.28.0.1/scrm/api/webhook

Running 30s test @ http://172.28.0.1/scrm/api/webhook
  4 threads and 10000 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency   191.95ms   48.58ms 433.49ms   72.55%
    Req/Sec    12.99k     2.73k   30.94k    75.92%
  Latency Distribution
     50%  192.86ms
     75%  221.91ms
     90%  249.25ms
     99%  312.60ms
  1549761 requests in 30.10s, 313.33MB read
Requests/sec:  51487.50
Transfer/sec:     10.41MB
```

好，QPS 5W 远远超过了微信推送 7000 的请求量，即使加上公网损耗，理论上是扛得住的。部署到生产环境验证，结果，微信报警仍然出现。

```txt
Appid: wx123456789
昵称: 梦想歌
时间: 2025-04-23 18:31:15
内容: 微信服务器向公众号推送消息或事件后，开发者5秒内没有返回
次数: 5分钟 4120 次
错误样例: [OpenID=of5mGs6Mg7kvpJkhfOq61a_t_Weg][Stamp=1745231475][OuterIP=][3rdUrl=https://wechat.mengxiangge.com/scrm/api/webhook][IP=123.456.123.456][Event=Template Send Job Finish]
报警排查指引，请见: https://mmbizurl.cn/s/MpkaZb8yg
```

回顾一下优化的链路：微信 -> 腾讯云CLB -> 自建OpenResty -> SCRM 服务

前面我们已经从腾讯云CLB 做了基准测试，QPS 至少有 5W 级别，为什么部署到生产就出问题了呢？关于微信和腾讯云的网络探测，我们无法从腾讯云给出真实的答案。

笔者从 OpenResty 的监控面板（腾讯云提供）并没有发现 CPU、内存、IO 异常，波动最高就 30%...好吧，也许腾讯云的监控是假的。笔者将 Pod 副本数增加到 6 个时（总规格达到 12核 12GB），wrk 基准测试下的 QPS 接近 15W，果然，微信报警就没有了。艾琳：原来是这样解决的啊！

整体来看，扩容 OpenResty 的成本比扩容 Java 应用要低得多。因为运营推送的时间可以固定在某一时段做，我们可以设置 HPC 定时伸缩 Pod，内容如下。

```yaml
apiVersion: autoscaling.cloud.tencent.com/v1
kind: HorizontalPodCronscaler
metadata:
  name: openresty-wechat-hpc
  namespace: proxy
spec:
  crons:
  - excludeDates:
    - '* * * 1-7 10 *'
    - '* * * 1-3 5 *'
    name: scale-out-pm
    schedule: 0 15 18  * * 1-5
    targetSize: 6
  - name: scale-in-pm
    schedule: 0 45 18  * * 1-5
    targetSize: 2
  scaleTarget:
    apiVersion: apps/v1
    kind: Deployment
    name: openresty-wechat
    namespace: proxy
```

问题顺利解决。