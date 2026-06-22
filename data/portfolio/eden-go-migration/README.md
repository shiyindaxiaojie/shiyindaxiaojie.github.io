# Eden Go Migration

[![Go Report Card](https://goreportcard.com/badge/github.com/shiyindaxiaojie/eden-go-migration)](https://goreportcard.com/report/github.com/shiyindaxiaojie/eden-go-migration) [![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

English | [中文](README_zh-CN.md)

a lightweight, GORM-based database migration tool for Go. It is designed to simplify database version control and automatic migration processes, supporting automatic execution of SQL script files, version tracking, and checksum verification.

## ✨ Features

- **Automatic Database Creation**: Automatically attempts to create the database if it does not exist (MySQL/PostgreSQL).
- **Multi-Database Support**: Supports MySQL, PostgreSQL, SQLite, and MariaDB.
- **Version Control**: Automatically maintains the `sys_db_version` table to track executed migration scripts.
- **Checksum Verification**: Prevents tampering with executed scripts.
- **Transaction Support**: Each migration script is executed in an independent transaction to ensure atomicity.
- **GORM Integration**: Seamlessly integrates with GORM, reusing existing database connection configurations.
- **Easy to Use**: Integrate into existing projects with just a few lines of code.

## 📦 Installation

```bash
go get github.com/shiyindaxiaojie/eden-go-migration
```

## 🚀 Quick Start

### 1. Prepare SQL Scripts

Create a directory in your project (e.g., `scripts/sql`) and place SQL files named in the format `V{Version}__{Description}.sql`.

Examples:

- `scripts/sql/V1.0.0__Init_Schema.sql`
- `scripts/sql/V1.0.1__Add_Users.sql`

### 2. Code Integration

#### MySQL Example

```go
package main

import (
	"log"
	"github.com/shiyindaxiaojie/eden-go-migration"
)

func main() {
	// Configure MySQL Database
	cfg := &migration.DatabaseConfig{
		Driver:       "mysql",
		Host:         "localhost",
		Port:         3306,
		Username:     "root",
		Password:     "your_password",
		DBName:       "your_dbname",
		MaxIdleConns: 10,
		MaxOpenConns: 100,
	}

	// Initialize Database Connection and run migrations
	migDB, err := migration.InitDB(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Create Migration Service
	svc := migration.NewMigrationService(migDB)

	// Execute Migration
	if err := svc.Migrate("scripts/sql"); err != nil {
		log.Fatalf("Database migration failed: %v", err)
	}

	log.Println("Database migration successful!")
}
```

#### SQLite Example

```go
cfg := &migration.DatabaseConfig{
	Driver: "sqlite",
	DBName: "app.db", // SQLite database file
}
```

#### PostgreSQL Example

```go
cfg := &migration.DatabaseConfig{
	Driver:   "postgres",
	Host:     "localhost",
	Port:     5432,
	Username: "postgres",
	Password: "your_password",
	DBName:   "your_dbname",
}
```

### 3. Logging Configuration

By default, logs only show timestamp and message. For debugging, you can enable code line numbers:

```go
svc := migration.NewMigrationService(migDB)
svc.SetIncludeLocation(true) // Enable code location (e.g., migration.go:251)
```

## ⚙️ Configuration

The `DatabaseConfig` struct supports the following options:

| Field          | Type     | Description                                 | Default       |
| :------------- | :------- | :------------------------------------------ | :------------ |
| `Driver`       | `string` | Database driver: mysql, postgres, sqlite    | mysql         |
| `Host`         | `string` | Database host address                       | localhost     |
| `Port`         | `int`    | Database port (3306 for MySQL, 5432 for PG) | -             |
| `Username`     | `string` | Database username                           | -             |
| `Password`     | `string` | Database password                           | -             |
| `DBName`       | `string` | Database name (or file path for SQLite)     | -             |
| `MaxIdleConns` | `int`    | Maximum idle connections                    | 0 (default)   |
| `MaxOpenConns` | `int`    | Maximum open connections                    | 0 (unlimited) |

## 📄 License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.
