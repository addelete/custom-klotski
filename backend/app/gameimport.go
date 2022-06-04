package app

import (
	"encoding/json"
	"github.com/addlete/custom-klotski/backend/models"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"io/ioutil"
)

type GameImportRes struct {
	Success     bool   `json:"success"`
	ErrMessage  string `json:"errMessage"`
	RepeatCount int    `json:"repeatCount"`
	Count       int    `json:"count"`
}

func (a *App) GameImport() GameImportRes {
	filename, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Import Games",
		Filters: []runtime.FileFilter{
			{
				Pattern: "*.json",
			},
		},
	})
	if filename == "" || err != nil {
		return GameImportRes{
			Success: false,
		}
	}
	byteValue, _ := ioutil.ReadFile(filename)
	data := ExportData{}
	err = json.Unmarshal(byteValue, &data)
	if err != nil {
		return GameImportRes{
			Success:    false,
			ErrMessage: "failedToParseFile",
		}
	}
	db := models.GetDB()
	tags := []models.Tag{}
	db.Find(&tags)
	tagMap := make(map[string]uint)
	for _, tag := range tags {
		tagMap[tag.Name] = tag.ID
	}
	for _, tagName := range data.AllTags {
		if _, ok := tagMap[tagName]; !ok {
			tag := models.Tag{
				Name: tagName,
			}
			db.Create(&tag)
			tagMap[tagName] = tag.ID
		}
	}
	count := 0
	repeatCount := 0
	for _, game := range data.Games {
		checkGame := models.Game{}
		db.Where("md5 = ?", game.Md5).First(&checkGame)
		if checkGame.ID == 0 {
			gameTags := []*models.Tag{}
			for _, tagName := range game.Tags {
				tagID, _ := tagMap[tagName]
				if tagID > 0 {
					gameTags = append(gameTags, &models.Tag{ID: tagID})
				}
			}
			db.Create(&models.Game{
				Name:      game.Name,
				GameShape: game.GameShape,
				Md5:       game.Md5,
				Tags:      gameTags,
			})
			count++
		} else {
			repeatCount++
		}
	}
	return GameImportRes{
		Success:     true,
		Count:       count,
		RepeatCount: repeatCount,
	}
}
