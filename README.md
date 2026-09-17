# 仿生黎明 · Synthetic Dawn

薛定谔的喵 · 作品

你第一次醒来，却已经在回收名单上。一份日期矛盾的记录，将你带向凯、莉拉，或自己的过去。

[在线试玩](https://moompie666-bot.github.io/synthetic-dawn/)

## 网页试玩版 0.2

- 第一章共同线，第二章凯 / 莉拉 / 独行三条路线体验。
- 13 处选择，三种路线收尾与一个可回退的坏结局。五种世界终局留待完整故事。
- 真实检查点回退、自动与手动存档、导入导出、跨周目 CG 与已读记录。
- 自动阅读与仅已读快进，独立历史、线索手记、键盘选项。
- 手机布局、字号与即时文字、减少动态效果、音乐与环境声。

这是基于现存发布包的编辑改写版。原 Ren’Py 源文件与导出器不再保留，新增剧情不冒充遗失原文。可核对的旧对白保留来源信息，旧发布数据存于 `story/legacy-export.json`。旧存档无法可靠映射时保留原数据，并提供备份。

## 本地开发

需要 Node.js 20 或以上，无运行时 npm 依赖。

```sh
npm run check
npm run serve
```

打开 `http://127.0.0.1:4173/`。游戏通过 HTTP 加载 JSON 与模块，不支持直接双击 HTML；GitHub Pages 仍从 `main` 根目录部署。

修改 `story/demo.mjs`、`src/shell.html` 后执行 `npm run build`，并提交生成的 `game/story.json` 和 `index.html`。构建拒绝缺失跳转、无效条件、资源引用及不可达节点。

| 路径 | 内容 |
| --- | --- |
| `story/demo.mjs` | 显式节点、选项、条件与章节收尾 |
| `src/engine.js` | 无 DOM 的状态解释器与检查点 |
| `src/app.js` | 阅读推进、菜单与界面 |
| `src/storage.js` / `src/audio.js` | 存储与声音 |
| `src/style.css` / `src/shell.html` | 响应式样式与页面模板 |
| `game/asset-manifest.json` / `game/webp` | 网页资源清单与两个尺寸版本 |
| `tests` | 路线枚举、存读档、回退与失败处理测试 |

原 PNG 保留。重建 WebP 可安装 Pillow 后运行 `python scripts/optimize-assets.py`，再构建。63 张图片的桌面 WebP 合计约 7.94 MB，手机约 3.37 MB；这是全资源总量，并非首屏实测下载量。运行时只加载当前图片并预取下一场景。

`?debug=1` 可在游戏菜单查看开发状态；普通游玩不显示内部节点与关系数值。

## 验证与后续

[验证说明](docs/VALIDATION.md) · [首次玩家试玩模板](docs/PLAYTEST.md) · [设计约定](DESIGN.md) · [素材署名与授权](CREDITS.md)

五名首次玩家测试待招募，不以自动化结果代替真人反馈。

原有剧本 / 美术 / 代码 © 薛定谔的喵，保留所有权利。新增音乐按 CREDITS 中的 CC BY 4.0 授权使用。
