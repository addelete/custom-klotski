package app

import "github.com/addlete/custom-klotski/backend/utils"

type GameSolveRes struct {
	Success    bool         `json:"success"`
	ErrMessage string       `json:"errMessage"`
	Solution   []utils.Step `json:"solution"`
}

func (a *App) GameSolve(gameData utils.GameData) GameSolveRes {
	solution, err := utils.Solve(gameData)
	if err != nil {
		return GameSolveRes{
			Success:    false,
			ErrMessage: "noSolution",
		}
	}
	return GameSolveRes{
		Success:  true,
		Solution: solution,
	}
}
