---
# 顶部个人信息。这里是全局配置，不是某一页的内容。
# name：封面显示的名字；role：职业身份；headline/summary：封面和摘要会用到的短介绍。
name: 梦想歌
role: 系统架构师
headline: 专注云原生解决方案的系统架构师，擅长 AI Agent、GitOps、OAM 与可观测性。
summary: 专注云原生解决方案的系统架构师，擅长 AI Agent、GitOps、OAM 与可观测性。

# 联系方式配置。contact 页会读取这些字段。
github: https://github.com/shiyindaxiaojie
githubLabel: github.com/shiyindaxiaojie
email: 18820132137@163.com
wechat: 扫码联系，备注姓名 + 公司
wechatQr: /src/assets/wechat.png

# cover 是封面背景图。其他页面不会自动套用这张图。
cover: /data/resume/assets/cover.png
---

<!--
配置说明：
1. 一级标题 # 会生成一张页面。
2. layout 决定页面版式：cover 封面、brief 概览、visual 图文页、flow 流程页、contact 联系页。
3. section 是右侧 rail 目录。同一个 section 可以包含多张页面。
4. ## 是页面里的内容块，后面的 kind 决定列表解析方式。
5. 图片标题写法：![图名](路径 "英文小标签 | 标题 | 一句说明 | 图片裁切位置")
-->

# 关于我
<!-- section: 关于我 -->
<!-- layout: cover -->
<!-- image: /data/resume/assets/cover.png -->
> 专注云原生解决方案的系统架构师，擅长 AI Agent、GitOps、OAM 与可观测性。

# 作品展示
<!-- section: 做过什么 -->
<!-- layout: brief -->
<!-- image: /data/resume/assets/default.png -->
>  把云资源管起来，把发布链路收起来，把排障路径缩短。能交付，比会描述更重要。

## 三条主线
<!-- kind: cards -->
- 云平台 :: 公有云、私有云、Kubernetes 放到同一张视图里，看账、看资源、看风险。
- 交付体系 :: Jenkins、CODING、KubeVela 串起来，研发按权限自己发布。
- 线上排障 :: CAT、Sentinel、Arthas 接进日常流程，出问题先看数据。

## 落地结果
<!-- kind: metrics -->
- 云成本 :: 29w -> 14w / 月 :: 年化节约近 200 万
- 定位效率 :: 小时级 -> 分钟级 :: Trace、告警、诊断直接接上
- 平台建设 :: 0 -> 1 :: 私有云、发布体系、脚手架可复用

# 云原生
<!-- section: 云原生 -->

# 云原生管家
<!-- section: 云原生 -->
<!-- layout: visual -->
> 把云资源、集群、应用和常用运维操作放进同一个控制台。少切系统，少靠消息确认。

## 页面要点
<!-- kind: points -->
- 多云视图 :: 云账号、集群、数据库、应用放在同一张工作台。
- 集群操作 :: 从资源列表直接看到工作负载，定位入口不再散。
- 操作留痕 :: 常用运维动作、审计记录、演练记录留在平台里。

## 视觉材料
<!-- kind: images -->
![云原生管家登录页](/data/resume/github/cloud-native-login.png "Console | 控制台 | 资源、集群、应用从这里进入 | center center")
![云原生管家 Kubernetes 集群页](/data/resume/github/cloud-native-k8s.png "Kubernetes | 集群视图 | 从云资源切到工作负载 | top center")

# 交付体系
<!-- section: CI/CD -->
<!-- layout: flow -->
> 发布最怕凭记忆。模板、环境、灰度、回滚和记录，要走同一条路径。

## 发布链路
<!-- kind: steps -->
- 模板抽象 :: 平台维护组件模板，研发少碰 Deployment、Service 细节。
- 应用编排 :: 用 App 管环境、配置、依赖和版本，交付对象变清楚。
- 自主发布 :: 研发在权限内选版本、发环境、切灰度。
- 回滚记录 :: 构建、部署、告警、回滚都有记录，生产发布能复盘。

## 视觉材料
<!-- kind: images -->
![COLA 组件结构](/data/resume/github/eden-cola-component.png "Template | 组件模板 | 结构和边界直接进模板 | center center")
![COLA 调用时序](/data/resume/github/eden-cola-sequence.png "Workflow | 协作链路 | 发布过程按固定路径走 | center center")

# 平台工程
<!-- section: 平台工程 -->

# CAT 链路追踪
<!-- section: 平台工程 -->
<!-- layout: visual -->
> 开源 CAT 能看指标；生产排障还要知道一次请求怎么穿过多个服务。

## 改造要点
<!-- kind: points -->
- 调用路径 :: traceId 跟到服务边界，先判断问题卡在哪一段。
- 告警消息 :: 慢调用、异常进钉钉，消息里带关键上下文。
- 接入包 :: SDK 封装埋点、上下文传递和上报，项目少写重复代码。

## 视觉材料
<!-- kind: images -->
![CAT 调用链视图](/data/resume/github/cat-tracing.png "CAT | Tracing View | 先看请求路径，再看单点指标 | top center")
![CAT 钉钉告警](/data/resume/github/cat-dingtalk.png "Alert | DingTalk | 异常消息直接进群 | center center")

# Sentinel 流量治理
<!-- section: 平台工程 -->
<!-- layout: visual -->
> 限流不是临时按钮。规则保存、历史曲线和峰值复盘都要留下来。

## 改造要点
<!-- kind: points -->
- 规则落库 :: 控制台配置不随重启丢，变更能持续生效。
- 历史曲线 :: 峰值、通过量、拒绝量可回看，事故后能对账。
- 常规工具 :: 限流、熔断、热点参数从应急操作变成日常开关。

## 视觉材料
<!-- kind: images -->
![Sentinel 控制台](/data/resume/github/sentinel-dashboard.png "Sentinel | Traffic Control | 规则、资源、实时流量放在一起 | top center")
![Sentinel Grafana 面板](/data/resume/github/sentinel-grafana.png "Grafana | Traffic Review | 峰值和拒绝量可回看 | center center")

# Arthas 在线诊断
<!-- section: 平台工程 -->
<!-- layout: visual -->
> 把 Arthas 放进 Kubernetes 场景。先选服务和 Pod，再执行 trace、watch、thread。

## 改造要点
<!-- kind: points -->
- Pod 发现 :: 选服务、选实例，不再手抄容器和命令。
- 权限收口 :: 谁能诊断、能看什么、能执行什么，走 RBAC。
- 常用命令 :: trace、watch、thread 放进控制台，线上少绕路。

## 视觉材料
<!-- kind: images -->
![Arthas 工作台](/data/resume/github/arthas-dashboard.png "Arthas | Online Diagnosis | 先选 Pod，再进诊断动作 | top center")
![Arthas 登录页](/data/resume/github/arthas-login.png "Access | RBAC | 诊断入口先过权限 | center center")

# 脚手架与规范
<!-- section: 平台工程 -->
<!-- layout: brief -->
> 我不喜欢每个项目重搭一遍底座。脚手架负责把边界和默认项放进去。

## 工程底座
<!-- kind: cards -->
- 基础框架 :: 公共依赖、日志、异常、配置，先给出可用默认项。
- COLA 脚手架 :: 领域边界、应用服务、接口层直接进模板。
- 分层脚手架 :: 老业务系统也能按更清楚的层次往前改。
- 研发规范 :: 目录、配置、发布方式保持一致，少靠口头约定。

# 联系我
<!-- section: 联系我 -->
<!-- layout: contact -->
> 扫码添加，请注明公司+来意

## 联系方式
<!-- kind: contact -->
- 微信 :: 扫码联系
