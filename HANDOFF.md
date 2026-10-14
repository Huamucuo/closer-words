# 开源版交接

当前版本允许商业用途：原创源码 MIT，原创内容 CC BY 4.0。字体和运行依赖仍按自己的许可使用。

本版本在独立目录中准备。默认音频生成已去除外部歌曲，只渲染原工程的全部 157 个程序音效；原音效音量、声像、混响和剪辑时间轴保留。说明及证据见 `AUDIO-RIGHTS.md`。

运行顺序：安装锁定依赖 → `node export.mjs --cues` → `python -B music.py --report` → `node export.mjs --out out/closer-words-sfx-only.mp4` → `node tools/covers.mjs`。不需要准备《We Never》或执行歌曲分析。

源码在本地预览、封面生成、音效导出和短片段导出中核验。随发行提供的完整成片使用原视频编码流替换音轨，画面不重编码。

生成的 `out/audio.wav`、MP4、检查图和依赖目录不会进入源码仓库。只分发核对清单列出的源码、字体、封面、许可与文档；去歌成片和无损音效作为独立发行附件。
