# 20. External Technical Sources & Version Notes

> 本项目的产品/领域设计是自有设计；本页只记录会随外部软件变化的 Pi 技术依据。实施时必须再次核对 pinned Pi revision。

## 1. Pi Upstream (checked 2026-09-09)

### Coding Agent README

- https://github.com/earendil-works/pi/blob/main/packages/coding-agent/README.md

当前上游文档说明：

- Pi 是 minimal terminal coding harness，可通过 TypeScript Extensions、Skills、Prompt Templates、Pi Packages 扩展；
- 默认提供基础工具 `read`, `write`, `edit`, `bash`，其他版本/配置还可提供 `grep/find/ls`；
- 提供 SDK embedding，README 示例使用 `createAgentSession(...)`；
- Extensions 可注册 custom tools/commands/events/UI，并可实现 sub-agents、permission gates、custom compaction 等；
- Skills 遵循 Agent Skills 形式，使用 `SKILL.md` progressive disclosure；
- Session 使用 JSONL，支持 compaction；
- Pi 本身刻意不内建单一 sub-agent/workflow 方式，而鼓励用 extensions/packages 组合。

### Official/Upstream Subagent Example

- https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/subagent/README.md

该 example 使用 separate `pi` process 隔离 subagent context。Career Agent v1 不直接照搬该运行形态，而采用 same-process independent AgentSession；example 只作为 extension/delegation/tool isolation 的参考。

### Skills Docs

- https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md

如果具体 URL/repository ownership 变化，以 pinned package 所带 docs 为准。

## 2. Version Pinning Rule

代码仓库中必须记录：

```json
{
  "distribution": "chosen-pi-distribution",
  "package": "exact-package-name",
  "version": "exact-semver-or-git-sha",
  "verifiedAt": "YYYY-MM-DD"
}
```

本文档中的 import/package 示例不得被视为比 lockfile 更高权威。

## 3. Agent Skills Standard

Pi Skills 使用 Agent Skills 风格的 `SKILL.md`。具体 frontmatter/allowed-tools 等字段以当前 pinned Pi docs 和 Agent Skills standard 为准，不把易变化的字段定义成 Career Agent domain contract。
