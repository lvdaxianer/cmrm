# 发布检查清单 (Release Checklist)

每次发布 npm 包前必须逐项检查。

---

## 1. 代码检查

| 检查项 | 命令 | 预期结果 |
|--------|------|----------|
| 构建成功 | `npm run build` | 无错误 |
| 测试通过 | `npm test` | 全部 passed |
| 代码 lint | `npm run lint`（如有） | 无警告 |

---

## 2. 版本确认

| 检查项 | 操作 | 预期结果 |
|--------|------|----------|
| 版本号递增 | 检查 `package.json` version | 符合 semver 规范 |
| CHANGELOG 更新 | 检查 `CHANGELOG.md` | 包含本次所有改动 |
| README 更新 | 检查 `README.md` 和 `README.zh-CN.md` | 与最新功能一致 |
| README 中英同步 | 对比两个文件内容 | 功能描述一致 |

---

## 3. Git 状态

| 检查项 | 命令 | 预期结果 |
|--------|------|----------|
| 暂存区干净 | `git status` | 无 uncommitted changes |
| 提交记录完整 | `git log --oneline -5` | 包含所有预期改动 |
| 分支正确 | `git branch` | 在期望的分支上（通常是 master/main） |
| 无敏感信息 | `git diff` 检查 | 无 hardcoded secrets、API keys 等 |
| 新文件已跟踪 | `git ls-files --others --exclude-standard` | 无预期外未跟踪文件 |

---

## 4. npm 状态

| 检查项 | 命令 | 预期结果 |
|--------|------|----------|
| 已登录 | `npm whoami` | 显示用户名（非 401 Unauthorized） |
| 包名正确 | 检查 `package.json` name | 与 npmjs.com 上一致 |
| description 正确 | 检查 `package.json` | 描述清晰 |
| keywords 完整 | 检查 `package.json` | 包含相关关键词 |
| license 正确 | 检查 `package.json` | MIT/Apache 等 |
| repository 正确 | 检查 `package.json` | 指向正确仓库 |
| homepage 正确 | 检查 `package.json` | 指向正确地址 |

---

## 5. 代码质量（可选但推荐）

| 检查项 | 命令/操作 | 说明 |
|--------|------------|------|
| 无 console.log | grep 检查 | 生产代码中无调试日志 |
| 无 TODO/FIXME | grep 检查 | 无未完成标记 |
| 测试覆盖率 | `npm run test:coverage` | 核心功能有测试覆盖 |

---

## 6. 发布后操作

| 检查项 | 命令 | 说明 |
|--------|------|------|
| 打版本标签 | `git tag v{x.y.z}` | 标记版本号 |
| 推送标签 | `git push origin --tags` | 同步到远程仓库 |
| 验证安装 | `npm install -g <pkg>` | 从 registry 安装验证 |
| 验证版本 | `cmrm --version` 或查看帮助 | 显示正确版本号 |

---

## 快速检查命令

```bash
# 一键检查（按顺序执行）
npm run build && npm test && git status && npm whoami
```

---

## 发布命令

```bash
# 1. 确保检查清单全部通过

# 2. 发布到 npm
npm publish

# 3. 打标签
git tag v0.0.2

# 4. 推送标签
git push origin master --tags

# 5. 验证发布成功
npm view <pkg-name> version
```

---

## 回滚命令（如发布失败）

```bash
# 如果 tag 未推送，删除本地 tag
git tag -d v0.0.2

# 如果已推送，删除远程 tag
git push origin :refs/tags/v0.0.2

# 如果 npm 发布成功，需要 unpublish（有时限）
npm unpublish <pkg-name>@<version>
```

---

*最后更新: 2026-04-27*
