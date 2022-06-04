package app

import "github.com/addlete/custom-klotski/backend/models"

type TagListRes struct {
	Tags []models.Tag `json:"tags"`
}

func (a *App) TagList() TagListRes {
	var tags []models.Tag
	db := models.GetDB()
	db.Find(&tags)
	return TagListRes{
		Tags: tags,
	}
}
