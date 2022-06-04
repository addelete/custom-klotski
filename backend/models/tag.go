package models

type Tag struct {
	ID   uint   `gorm:"primaryKey" json:"id"`
	Name string `gorm:"type:varchar(30);not null;uniqueIndex" json:"name"`
	// Games []*Game `gorm:"many2many:game_tags;" json:"games"`
}
