# WeChat Article Extractor

[![Node.js](https://img.shields.io/badge/Node.js-14+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

一个 Claude Code Skill，用于提取微信公众号文章的元数据和内容，并自动保存为 HTML 和 Markdown 文件。支持多种文章类型，包括图文、视频、图片集、语音和转载文章。

## 功能特性

- 解析微信公众号文章 URL (`mp.weixin.qq.com`)
- 提取文章元数据：标题、作者、摘要、发布时间
- 获取公众号信息：名称、头像、微信号、功能介绍
- 提取文章内容（HTML 格式）
- 获取封面图片 URL
- 自动将文章保存为修复后的 HTML（`data-src` → `src`，浏览器可直接查看）
- 自动将文章转换为 Markdown（含 YAML frontmatter）
- 支持多种文章类型：图文、视频、图片集、语音、纯文字、转载
- 处理各种异常情况：内容删除、链接过期、访问限制、账号迁移等

## 安装

```bash
git clone https://github.com/yourusername/wechat-article-extractor-skill.git
cd wechat-article-extractor-skill
npm install
```

然后在 Claude Code 中将该目录作为 Skill 加载。

## 使用方法

### 基本用法 - 从 URL 提取

```javascript
const { extract } = require('./scripts/extract.js');

const result = await extract('https://mp.weixin.qq.com/s?__biz=...&mid=...&idx=...&sn=...');

if (result.done) {
  console.log('文章标题:', result.data.msg_title);
  console.log('公众号:', result.data.account_name);
  console.log('发布时间:', result.data.msg_publish_time_str);
} else {
  console.error('提取失败:', result.msg);
}
```

### 从 HTML 内容提取

如果你已经获取了页面 HTML，可以直接传入：

```javascript
const { extract } = require('./scripts/extract.js');

const html = await fetch(url).then(r => r.text());
const result = await extract(html, { url: sourceUrl });
```

### 高级选项

```javascript
const result = await extract(url, {
  shouldReturnContent: true,      // 返回 HTML 内容（默认：true）
  shouldReturnRawMeta: false,     // 返回原始元数据（默认：false）
  shouldFollowTransferLink: true, // 自动跟随迁移后的公众号链接（默认：true）
  shouldExtractMpLinks: false,    // 提取内嵌的微信公众号链接（默认：false）
  shouldExtractTags: false,       // 提取文章标签（默认：false）
  shouldExtractRepostMeta: false  // 提取转载来源信息（默认：false）
});
```

### 后处理：保存为 HTML 和 Markdown

提取成功后，可使用 `convert.js` 模块将文章保存为文件：

```javascript
const { convertToFixedHtml, convertToMarkdown } = require('./convert.js');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(process.env.HOME, 'workspace_claude', 'wechat_articles');
fs.mkdirSync(outputDir, { recursive: true });

// 生成安全文件名（中文弯引号等特殊字符会被替换）
const dateStr = result.data.msg_publish_time_str
  ? result.data.msg_publish_time_str.replace(/[\/:]/g, '-').split(' ')[0]
  : 'unknown-date';
const safeName = (result.data.msg_title || 'untitled')
  .replace(/[\/\\:*?"<>|""'']/g, '_')
  .substring(0, 80);
const baseName = `${dateStr}_${safeName}`;

// 保存 HTML（data-src 已替换为 src，浏览器可直接打开查看图片）
fs.writeFileSync(
  path.join(outputDir, baseName + '.html'),
  convertToFixedHtml(result.data),
  'utf8'
);

// 保存 Markdown（含 YAML frontmatter）
fs.writeFileSync(
  path.join(outputDir, baseName + '.md'),
  convertToMarkdown(result.data),
  'utf8'
);
```

#### convertToFixedHtml(data)

将提取结果转换为完整的 HTML 文件。主要处理：
- 将微信文章中的 `data-src` 属性替换为 `src`，使图片在浏览器中正常显示
- 添加基本的 HTML 文档结构和响应式图片样式

#### convertToMarkdown(data)

将提取结果转换为 Markdown 文本。主要特性：
- 自动生成 YAML frontmatter（title, author, date, source, original_url）
- 递归解析微信文章的嵌套 `<section>` 结构
- 支持 h2/h3/h4 标题、加粗、斜体、链接、列表、引用、代码块
- 提取图片的 `data-src` 或 `src` 属性
- 清理多余空行

## 响应格式

### 成功响应

```javascript
{
  done: true,
  code: 0,
  data: {
    // 公众号信息
    account_name: "公众号名称",
    account_alias: "微信号",
    account_avatar: "头像URL",
    account_description: "功能介绍",
    account_id: "原始ID",
    account_biz: "biz参数",
    account_biz_number: 1234567890,
    account_qr_code: "二维码URL",

    // 文章信息
    msg_title: "文章标题",
    msg_desc: "文章摘要",
    msg_content: "HTML内容",
    msg_cover: "封面图URL",
    msg_author: "作者",
    msg_type: "post", // post|video|image|voice|text|repost
    msg_has_copyright: true,
    msg_publish_time: Date,
    msg_publish_time_str: "2024/01/15 10:30:00",

    // 链接参数
    msg_link: "文章链接",
    msg_source_url: "阅读原文链接",
    msg_sn: "sn参数",
    msg_mid: 1234567890,
    msg_idx: 1
  }
}
```

### 错误响应

```javascript
{
  done: false,
  code: 1001,
  msg: "无法获取文章信息"
}
```

## 错误代码表

| 代码 | 错误信息 | 说明 |
|------|----------|------|
| 1000 | 文章获取失败 | 一般性失败 |
| 1001 | 无法获取文章信息 | 缺少标题或发布时间 |
| 1002 | 请求失败 | HTTP 请求失败 |
| 1003 | 响应为空 | 空响应 |
| 1004 | 访问过于频繁 | 被限流 |
| 1005 | 脚本解析失败 | 页面脚本解析错误 |
| 1006 | 公众号已迁移 | 账号已迁移，包含新链接 |
| 2001 | 请提供文章内容或链接 | 缺少输入参数 |
| 2002 | 链接已过期 | 链接已失效 |
| 2003 | 内容涉嫌侵权 | 内容因侵权被移除 |
| 2004 | 无法获取迁移后的链接 | 迁移链接获取失败 |
| 2005 | 内容已被发布者删除 | 作者已删除内容 |
| 2006 | 内容因违规无法查看 | 内容被平台屏蔽 |
| 2007 | 内容发送失败 | 发送失败 |
| 2008 | 系统出错 | 系统错误 |
| 2009 | 不支持的链接 | URL 格式不支持 |
| 2010 | 内容获取失败 | 内容获取失败 |
| 2011 | 涉嫌过度营销 | 营销/垃圾内容 |
| 2012 | 账号已被屏蔽 | 账号被封禁 |
| 2013 | 账号已自主注销 | 账号已注销 |
| 2014 | 内容被投诉 | 内容被举报 |
| 2015 | 账号处于迁移流程中 | 账号正在迁移 |
| 2016 | 冒名侵权 | 冒充侵权 |

## 支持的文章类型

| 类型 | 说明 | msg_type |
|------|------|----------|
| 图文 | 普通图文文章 | `post` |
| 视频 | 视频内容 | `video` |
| 图片集 | 多张图片展示 | `image` |
| 语音 | 音频内容 | `voice` |
| 纯文字 | 无标题文字内容 | `text` |
| 转载 | 转载他人文章 | `repost` |

## 项目结构

```
wechat-article-extractor-skill/
├── scripts/
│   ├── extract.js    # 核心提取逻辑
│   └── errors.js     # 错误代码定义
├── convert.js        # HTML 修复 + Markdown 转换模块
├── SKILL.md          # Skill 定义文件（Claude Skill 格式，含触发条件和后处理流程）
├── package.json      # 项目配置
└── README.md         # 本文件
```

## 依赖项

- `cheerio` - 服务端 HTML 解析（extract.js + convert.js）
- `dayjs` - 日期格式化
- `request-promise` - HTTP 请求
- `qs` - 查询字符串解析
- `lodash.unescape` - HTML 实体解码

## 注意事项

1. **频率限制**: 频繁请求可能会导致 IP 被暂时封禁，建议添加适当的延迟
2. **页面结构**: 微信页面结构可能会变化，如遇问题请检查是否为最新版本
3. **Cookie**: 某些文章可能需要登录才能访问完整内容
4. **反爬措施**: 请遵守微信的使用条款，合理使用本工具
5. **文件名安全化**: 标题中的特殊字符（包括 ASCII 和中文引号 `""''`）会被替换为 `_`，避免同标题文章因引号差异生成不同文件名

## 许可证

[MIT](LICENSE)

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.1.0
- 新增 `convert.js` 模块，将一次性脚本重构为可复用函数
  - `convertToFixedHtml()`: 生成修复后的 HTML（`data-src` → `src`）
  - `convertToMarkdown()`: 将微信文章 HTML 转换为 Markdown（含 YAML frontmatter）
- SKILL.md 新增后处理流程定义：提取成功后自动保存 HTML + Markdown
- 修复文件名安全化正则，补充中文弯引号 `""''`，避免同标题生成不同文件名
- convert.js Markdown 转换支持 h4、`<em>`/`<i>` 斜体、`<a>` 链接
- frontmatter 中的双引号自动转义，字段增加空值兜底

### v1.0.0
- 初始版本发布
- 支持基本的文章信息提取
- 支持多种文章类型
- 完善的错误处理机制
