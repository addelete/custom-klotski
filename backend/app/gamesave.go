package app

import (
	"github.com/addlete/custom-klotski/backend/models"
	"gorm.io/gorm"
)

type GameSaveRes struct {
	Success    bool        `json:"success"`
	ErrMessage string      `json:"errMessage"`
	Game       models.Game `json:"game"`
}

func (a *App) GameSave(game models.Game) GameSaveRes {
	db := models.GetDB()
	if game.ID != 0 {
		err := db.Transaction(func(tx *gorm.DB) error {
			err := tx.Model(&game).Association("Tags").Replace(game.Tags)
			if err != nil {
				return err
			}
			tx.Model(&game).Updates(&game)
			return nil
		})
		if err != nil {
			return GameSaveRes{
				Success:    false,
				ErrMessage: "failedToSaveGame",
			}
		}
	} else {
		checkHasGame := models.Game{}
		db.First(&checkHasGame, "md5 = ?", game.Md5)
		if checkHasGame.ID != 0 {
			return GameSaveRes{
				Success:    false,
				ErrMessage: "gameAlreadyExists",
				Game:       checkHasGame,
			}
		}
		db.Create(&game)
	}
	return GameSaveRes{
		Success: true,
		Game:    game,
	}
}
