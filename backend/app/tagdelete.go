package app

import (
	"github.com/addlete/custom-klotski/backend/models"
	"gorm.io/gorm"
)

type TagDeleteReq struct {
	ID uint `json:"id"`
}

type TagDeleteRes struct {
	Success    bool   `json:"success"`
	ErrMessage string `json:"errMessage"`
}

func (a *App) TagDelete(req TagDeleteReq) TagDeleteRes {
	db := models.GetDB()
	tag := models.Tag{
		ID: req.ID,
	}
	err := db.Transaction(func(tx *gorm.DB) error {
		err := tx.Model(&tag).Association("Games").Clear()
		if err != nil {
			return err
		}
		tx.Delete(&tag)
		return nil
	})
	if err != nil {
		return TagDeleteRes{
			Success:    false,
			ErrMessage: "failedToDeleteTag",
		}
	}
	return TagDeleteRes{
		Success: true,
	}
}
