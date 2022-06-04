package models

import (
	"github.com/mitchellh/go-homedir"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"os"
	"sync"
)

var db *gorm.DB
var once sync.Once

func GetDB() *gorm.DB {
	once.Do(func() {
		homeDir, _ := homedir.Dir()
		dbDir := homeDir + "/Documents/CustomKlotski"
		_ = os.MkdirAll(dbDir, 0755)
		println(dbDir)
		db, _ = gorm.Open(sqlite.Open(dbDir+"/data.db"), &gorm.Config{})
		_ = db.AutoMigrate(&Game{}, &Tag{})
	})
	return db
}
