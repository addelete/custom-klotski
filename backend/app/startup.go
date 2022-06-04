package app

import (
	"context"
)

func (a *App) StartUp(ctx context.Context) {
	a.ctx = ctx
}
