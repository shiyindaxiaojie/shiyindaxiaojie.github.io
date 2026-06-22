# Eden Go Migration

[![Go Report Card](https://goreportcard.com/badge/github.com/shiyindaxiaojie/eden-go-migration)](https://goreportcard.com/report/github.com/shiyindaxiaojie/eden-go-migration) [![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

[English](README.md) | 中文

一个轻量级、基于 GORM 的 Go 语言数据库迁移工具。它专为简化数据库版本控制和自动迁移流程而设计，支持 SQL 脚本文件的自动执行、版本追踪和校验和验证。

## ✨ 特性

- **自动建库**: 如果数据库不存在，自动尝试创建。
- **版本控制**: 自动维护 `sys_db_version` 表，记录已执行的迁移脚本。
- **校验和验证**: 防止已执行的脚本被篡改。
- **事务支持**: 每个迁移脚本在独立的事务中执行，保证原子性。
- **GORM 集成**: 无缝集成 GORM，复用现有的数据库连接配置。
- **简单易用**: 仅需几行代码即可集成到现有项目中。

## 📦 安装

```bash
go get github.com/shiyindaxiaojie/eden-go-migration
```

## 🚀 快速开始

### 1. 准备 SQL 脚本

在你的项目中创建一个目录（例如 `scripts/sql`），并按照 `V{Version}__{Description}.sql` 的命名格式存放 SQL 文件。

例如：

- `scripts/sql/V1.0.0__Init_Schema.sql`
- `scripts/sql/V1.0.1__Add_Users.sql`

### 2. 代码集成

```go
package main

import (
	"log"
	"github.com/shiyindaxiaojie/eden-go-migration"
)

func main() {
	// 1. 配置数据库
	cfg := &migration.DatabaseConfig{
		Host:         "localhost",
		Port:         3306,
		Username:     "root",
		Password:     "your_password",
		DBName:       "your_dbname",
		MaxIdleConns: 10,
		MaxOpenConns: 100,
	}

	// 2. 初始化数据库连接
	// InitDB 会自动创建数据库（如果不存在）并建立连接
	migDB, err := migration.InitDB(cfg)
	if err != nil {
		log.Fatalf("初始化数据库失败: %v", err)
	}

	// 3. 创建迁移服务
	svc := migration.NewMigrationService(migDB)

	// 4. 执行迁移
	// 指定存放 SQL 脚本的目录路径
	if err := svc.Migrate("scripts/sql"); err != nil {
		log.Fatalf("数据库迁移失败: %v", err)
	}

	log.Println("数据库迁移成功！")
}
```

### 3. 日志配置

默认情况下，日志只显示时间戳和消息。如果你需要调试，可以开启代码行号显示：

```go
svc := migration.NewMigrationService(migDB)
svc.SetIncludeLocation(true) // 开启代码位置显示 (e.g., migration.go:251)
```

## ⚙️ 配置

`DatabaseConfig` 结构体支持以下配置项：

| 字段           | 类型     | 描述           | 默认值     |
| :------------- | :------- | :------------- | :--------- |
| `Host`         | `string` | 数据库主机地址 | -          |
| `Port`         | `int`    | 数据库端口     | -          |
| `Username`     | `string` | 数据库用户名   | -          |
| `Password`     | `string` | 数据库密码     | -          |
| `DBName`       | `string` | 数据库名称     | -          |
| `MaxIdleConns` | `int`    | 最大空闲连接数 | 0 (默认)   |
| `MaxOpenConns` | `int`    | 最大打开连接数 | 0 (无限制) |

## 📄 许可证

本项目采用 Apache License 2.0 许可证。详情请参阅 [LICENSE](LICENSE) 文件。
