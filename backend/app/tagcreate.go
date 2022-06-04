package app

import "github.com/addlete/custom-klotski/backend/models"

type TagCreateRes struct {
	Success    bool       `json:"success"`
	ErrMessage string     `json:"errMessage"`
	Tag        models.Tag `json:"tag"`
}

func (a *App) TagCreate(tag models.Tag) TagCreateRes {
	db := models.GetDB()
	checkTag := models.Tag{}
	db.First(&checkTag, "name = ?", tag.Name)
	if checkTag.ID != 0 {
		return TagCreateRes{
			Success:    false,
			ErrMessage: "tagAlreadyExists",
		}
	}
	db.Create(&tag)
	return TagCreateRes{
		Success: true,
		Tag:     tag,
	}
}
