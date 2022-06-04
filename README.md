<p style="text-align: center;">
<img src="logo.png" style="width: 256px;" alt="华容道" />
</p>

<p style="text-align: center;">
<a href="https://github.com/addelete/custom-klotski/blob/master/README.en.md">English</a> | <a href="https://github.com/addelete/custom-klotski/blob/master/README.md">中文</a>
</p>

## 项目介绍

一个华容道游戏，使用[Wails](https://wails.io)开发。

## 功能

- 布局列表
- 运行布局
- 设计布局
- 布局求解
- 支持不规则棋子
- 导出/导入布局

## 开发环境

```shell
# 安装wails cli (详细：https://wails.io)
go install github.com/wailsapp/wails/v2/cmd/wails@latest
# clone项目
git clone https://github.com/addelete/custom-klotski.git
cd custom-klotski-desktop
# 运行项目
wails dev -nogen
```

### 编译
```shell
wails build
```
编译好的程序在build目录下

