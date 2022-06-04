package main

import (
	"embed"
	"github.com/addlete/custom-klotski/backend/app"
	"github.com/jeandeaual/go-locale"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"strings"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
)

//go:embed frontend/dist
var assets embed.FS

func main() {
	userLocales, _ := locale.GetLocales()
	// Create an instance of the app structure
	application := app.NewApp()
	menus := menu.NewMenu()
	appMenu := menu.AppMenu()
	menus.Append(appMenu)

	title := "Custom Klotski"
	if len(userLocales) > 0 && strings.Contains(userLocales[0], "zh") {
		title = "华容道"
	}
	// Create application with options
	err := wails.Run(&options.App{
		Title:      title,
		Width:      1600,
		Height:     1080,
		Assets:     assets,
		OnStartup:  application.StartUp,
		Menu:       menus,
		Fullscreen: true,
		Bind: []interface{}{
			application,
		},
	})

	if err != nil {
		println("Error:", err)
	}
}
