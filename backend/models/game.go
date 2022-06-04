package models

type Game struct {
	ID        uint   `gorm:"primaryKey" json:"id"`
	Name      string `gorm:"type:varchar(30);not null" json:"name"`
	GameShape string `gorm:"type:TEXT;not null" json:"gameShape"`
	Md5       string `gorm:"type:varchar(32);not null;uniqueIndex" json:"md5"`
	Tags      []*Tag `gorm:"many2many:game_tags;" json:"tags"`
}
