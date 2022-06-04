<p style="text-align: center;">
<img src="logo.png" style="width: 256px;" alt="华容道" />
</p>

<p style="text-align: center;">
<a href="https://github.com/addelete/custom-klotski/blob/master/README.en.md">English</a> | <a href="https://github.com/addelete/custom-klotski/blob/master/README.md">中文</a>
</p>

## About

This is a klotski chess game，developing with [Wails](https://wails.io).

## Features
- Game List
- Play Game
- Design Game
- Solve Game
- Support for Irregular shaped pieces
- Import/Export Game

## Live Development
```shell
# install wails cli (Detail:https://wails.io)
go install github.com/wailsapp/wails/v2/cmd/wails@latest
# clone project
git clone https://github.com/addelete/custom-klotski.git
cd custom-klotski-desktop
# run project
wails dev -nogen
```

## Building

```shell
wails build
```
The compiled app will be in the build directory
