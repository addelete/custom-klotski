package app

import (
	"github.com/addlete/custom-klotski/backend/models"
	"gorm.io/gorm"
)

type GameDeleteReq struct {
	ID uint `json:"id"`
}

type GameDeleteRes struct {
	Success    bool   `json:"success"`
	ErrMessage string `json:"errMessage"`
}

func (a *App) GameDelete(req GameDeleteReq) GameDeleteRes {
	game := models.Game{
		ID: req.ID,
	}
	db := models.GetDB()
	err := db.Transaction(func(tx *gorm.DB) error {
		err := tx.Model(&game).Association("Tags").Clear()
		if err != nil {
			return err
		}
		tx.Delete(&game)
		return nil
	})
	if err != nil {
		return GameDeleteRes{
			Success:    false,
			ErrMessage: "failedToDeleteGame",
		}
	}
	return GameDeleteRes{
		Success: true,
	}
}
