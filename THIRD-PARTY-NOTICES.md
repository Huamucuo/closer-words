# 第三方声明

本项目的原创代码使用 MIT，原创内容使用 CC BY 4.0。以下第三方材料继续使用其原许可。源码交付包不包含 Node / Python 依赖目录、浏览器程序或 FFmpeg 可执行文件。

## 随仓库分发的字体

| 字体 | 官方来源 | 版权及许可全文 |
|---|---|---|
| Noto Sans SC | [Google Fonts](https://github.com/google/fonts/tree/main/ofl/notosanssc) | [OFL](fonts/licenses/notosanssc-OFL.txt) |
| Noto Serif SC | [Google Fonts](https://github.com/google/fonts/tree/main/ofl/notoserifsc) | [OFL](fonts/licenses/notoserifsc-OFL.txt) |
| Noto Serif | [Google Fonts](https://github.com/google/fonts/tree/main/ofl/notoserif) | [OFL](fonts/licenses/notoserif-OFL.txt) |
| JetBrains Mono | [Google Fonts](https://github.com/google/fonts/tree/main/ofl/jetbrainsmono) | [OFL](fonts/licenses/jetbrainsmono-OFL.txt) |

以上 10 个 WOFF2 文件来自原工程的 Google Fonts 下载脚本，文件本身保持原样。四份原始 OFL 文件保留各自版权人声明；许可来源及许可文件哈希见 [许可来源记录](licenses/sources.json)。使用、嵌入、再分发和修改字体时遵守 OFL 1.1。

## 运行依赖

`puppeteer-core` 23.11.1 的包元数据声明 Apache-2.0。它用于本机浏览器渲染，安装时从包管理器获取，不打入本源码包。锁定的 84 个 Node 依赖均声明商业用途兼容的 MIT、Apache-2.0、BSD-2-Clause、BSD-3-Clause、ISC 或 0BSD 许可。完整包名、版本、许可及来源见 [依赖清单](licenses/node-dependencies.json)；这项检查核对包元数据，不是对依赖全部源码的独立权利审计。

Python 使用 NumPy 2.5.4 和 SciPy 1.18.1。NumPy 的已安装发行元数据给出 `BSD-3-Clause AND 0BSD AND MIT AND Zlib AND CC0-1.0`；SciPy 及其打包的第三方组件声明见各自发行包许可。二者作为外部依赖安装，不随本源码包分发：

- [NumPy 许可](https://numpy.org/doc/stable/license.html)
- [SciPy 项目及许可](https://github.com/scipy/scipy/blob/main/LICENSE.txt)
- [Puppeteer 项目及许可](https://github.com/puppeteer/puppeteer/blob/main/LICENSE)
- [FFmpeg 许可说明](https://ffmpeg.org/legal.html)

如后续另行打包或分发依赖和工具的二进制文件，需按实际构建版本保留适用的第三方声明和义务。

## 不分发的歌曲

《We Never》（世纪Official）的版权归其权利人。歌曲、含歌曲的历史混音和历史视频均不包含在本次开源交付中，MIT / CC BY 4.0 不对该歌曲授予任何许可。详见 [音频说明](AUDIO-RIGHTS.md)。
