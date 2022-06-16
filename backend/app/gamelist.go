package app

import (
	"github.com/addlete/custom-klotski/backend/models"
)

type GameListReq struct {
	Page       int    `json:"page"`
	NameFilter string `json:"nameFilter"`
	TagsFilter []uint `json:"tagsFilter"`
	OrderAsc   bool   `json:"orderAsc"`
}

type GameListRes struct {
	Games []models.Game `json:"games"`
	Total int64         `json:"total"`
}

func (a *App) GameList(req GameListReq) GameListRes {
	db := models.GetDB()
	var games []models.Game
	var total int64
	pageSize := 4
	if req.NameFilter != "" {
		db = db.Where("name LIKE ?", "%"+req.NameFilter+"%")
	}
	if len(req.TagsFilter) > 0 {
		db = db.Where("id IN (SELECT game_id FROM game_tags WHERE tag_id IN (?))", req.TagsFilter)
	}
	db.Model(&models.Game{}).Count(&total)
	orderBy := "DESC"
	if !req.OrderAsc {
		orderBy = "ASC"
	}
	db.Limit(pageSize).Offset((req.Page - 1) * pageSize).Order("id " + orderBy).Preload("Tags").Find(&games)
	return GameListRes{
		Games: games,
		Total: total,
	}

}
