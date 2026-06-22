# Eden Go Logger

[![Go Report Card](https://goreportcard.com/badge/github.com/shiyindaxiaojie/eden-go-logger)](https://goreportcard.com/report/github.com/shiyindaxiaojie/eden-go-logger) [![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

[English](README.md) | 中文

一个高性能、无依赖、经过生产验证的 Go 语言日志库。设计灵感源自 Log4j2，旨在提供企业级的日志处理能力，支持异步写入、日志滚动、复杂过滤等高级特性。

## 🌟 特性

- **高性能异步 IO**: 内置 `AsyncAppender`，通过原生 Channel + Worker 模式实现无锁异步写入，在高并发下对业务性能几乎无损。
- **企业级日志滚动**: 支持按照文件大小 (`20MB`) 或 时间 (`0 0 4 * * ?` Cron 表达式) 进行自动滚动和压缩。
- **强大的过滤器**:
    - **Level**: 传统的级别过滤。
    - **Marker**: 业务标记过滤（如 `AccessLog`, `SQL`），实现日志分流。
    - **Burst**: 突发流量控制，防止错误日志风暴打满磁盘。
- **优雅的配置**:
    - **Fluent Builder API**: 类型安全的链式调用。
    - **YAML/JSON 配置**: 支持从配置文件动态加载，兼容性好。
- **上下文增强**: 支持 MDC (Mapped Diagnostic Context) 链路追踪。

## 📦 安装

```bash
go get github.com/shiyindaxiaojie/eden-go-logger
```

## 🚀 快速开始

### 1. 基础用法

最简单的控制台日志：

```go
package main

import "github.com/shiyindaxiaojie/eden-go-logger"

func main() {
    // 默认输出到控制台
    logger.Info("Hello, Eden Logger!")
    logger.Error("Something went wrong: %v", "timeout")
}
```

### 2. 高级配置 (Fluent API)

使用 Builder 模式构建复杂的生产级配置：

```go
func initLogger() {
    logger.NewBuilder().
        Level("INFO").
        // 1. 控制台输出 (开发环境)
        Console(func(c *logger.ConsoleAppender) {
            c.Pattern("%d{2006-01-02 15:04:05} [%p] %c - %m%n")
        }).
        // 2. 业务日志 (异步 + 滚动 + 压缩)
        RollingFile("logs/app.log", func(f *logger.RollingFileAppender) {
            f.WithName("AppLog")
            f.SizePolicy("100MB")        // 单文件最大 100MB
            f.CronPolicy("0 0 0 * * ?")  // 每天滚动
            f.MaxBackups(30)             // 保留 30 个备份
            f.Retention("30d")           // 过期时间 30 天
            f.Compress(true)             // 滚动后自动 gzip 压缩
        }).
        // 3. 全局开启异步模式 (性能关键)
        Async(4096).
        Init() // 初始化并替换全局 Logger
}
```

### 3. 配置文件驱动 (YAML)

适合云原生环境，通过 ConfigMap 挂载配置：

```yaml
log:
    level: INFO
    appenders:
        - name: AppLog
          type: RollingFile
          file_name: "logs/app.log"
          file_pattern: "app-%i.log.gz"
          async: true # 开启异步
          rollover:
              max_file: 30
              retention: 30d
          filter: # 错误风暴防护
              type: burst
              level: ERROR
              rate: 10
              max_burst: 100
```

## 📖 详细指南

### 1. 异步日志 (Async)

在高并发生产环境中，**必须**开启异步日志。Eden Go Logger 使用缓冲通道 (`Buffered Channel`) 将日志写入操作从主程解耦。

- **配置**: 在 Builder 中调用 `.Async(bufferSize)` 或 YAML 中设置 `async: true`。
- **优势**: 将 I/O 延迟从 毫秒级(ms) 降低到 微秒级(µs)。

### 2. 日志分流 (Marker)

如何将 `Access Log` (HTTP请求) 和 `App Log` (业务逻辑) 分离？使用 **Marker**。

1.  **配置 Appender 拦截 Marker**:

    ```yaml
    - name: AccessLog
      file_name: "logs/access.log"
      filter:
          type: marker
          marker: API
          on_match: ACCEPT # 匹配 API 标记的写入此文件
          on_mismatch: DENY # 其他的不写
    ```

2.  **代码中打标**:
    ```go
    logger.WithMarker("API").Info("GET /users/1 200 OK")
    ```

### 3. 上下文追踪 (MDC)

在微服务链路中跟踪 Request ID：

```go
// 中间件中设置
l := logger.WithContext("request_id", "req-123456")

// 业务逻辑中使用携带上下文的 logger
l.Info("Processing order") // 日志中会自动带上 request_id
```

配置输出格式包含上下文：

```go
c.Pattern("%d [%p] [%X{request_id}] %m%n")
```

### 4. 格式化变量 (Pattern Layout)

当通过 Builder API 的 `.Pattern(...)` 或 YAML 配置中的 `pattern: ...` 指定输出格式时，支持以下变量：

| 变量         | 说明                                                             | 示例                      |
| ------------ | ---------------------------------------------------------------- | ------------------------- |
| `%d{format}` | 日期/时间，使用 Go 时间格式模板 (默认 `2006-01-02 15:04:05.000`) | `2026-02-26 14:00:00.000` |
| `%p`         | 日志级别                                                         | `INFO`, `ERROR`           |
| `%c`         | 日志器名称                                                       | `AppLog`                  |
| `%m`         | 日志内容                                                         | `Hello World`             |
| `%n`         | 换行符 (根据平台)                                                | `\n`                      |
| `%F`         | 调用所在的文件名                                                 | `main.go`                 |
| `%L`         | 调用所在的行号                                                   | `42`                      |
| `%M`         | 方法/函数名称                                                    | `main.main`               |
| `%X{key}`    | MDC (上下文) 中的指定键值对                                      | `req-123456`              |
| `%marker`    | Marker 标记名称                                                  | `API`                     |
| `%t`         | UnixNano 毫秒时间戳                                              | `1677649500000000000`     |
| `%T`         | Thread (协程 / Goroutine) ID                                     | `35`                      |

## 🧩 性能测试

在 i5-1135G7 @ 2.40GHz 环境下基准测试结果：

- **Log Overload (Discard)**: ~1,500,000 ops/sec (692 ns/op) - 纯业务逻辑处理能力
- **Sync File IO**: ~120,000 ops/sec (8016 ns/op) - 依赖磁盘写入速度
- **Async File IO**: 提供微秒级的写延迟，直到缓冲区写满。在持续高压测试中（缓冲区饱和），吞吐量受限于磁盘 I/O。

> **最佳实践**: 生产环境强烈建议开启 `async: true` 并配置合理的 `buffer_size` (如 4096)，以应对突发流量，避免主业务线程因 I/O 抖动而阻塞。\_

## 📄 许可证

本项目采用 Apache License 2.0 许可证。详情请参阅 [LICENSE](LICENSE) 文件。
