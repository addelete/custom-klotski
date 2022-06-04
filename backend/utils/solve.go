package utils

import (
	"errors"
	"fmt"
	"sort"
	"strings"
)

type Shape = [][]bool
type Pos = []int

type Piece struct {
	Shape    Shape `json:"shape"`
	Position Pos   `json:"position"`
}

type GameData struct {
	PieceList      []Piece `json:"pieceList"`
	BoardRows      int     `json:"boardRows"`
	BoardCols      int     `json:"boardCols"`
	KingPieceIndex int     `json:"kingPieceIndex"`
	KingWinPos     Pos     `json:"kingWinPos"`
}

type GameStatePiece struct {
	Kind     int
	RowIndex int
	ColIndex int
}

type GameState struct {
	PieceList []GameStatePiece
	Steps     [][]int
}

type Step struct {
	PieceIndex int   `json:"pieceIndex"`
	Direction  []int `json:"direction"`
}

func Solve(game GameData) ([]Step, error) {
	boardRows := game.BoardRows
	boardCols := game.BoardCols
	kingPiece := game.PieceList[game.KingPieceIndex]                 // 王棋
	pieceKindShapeList := make([]Shape, 0)                           // 棋子类型列表，[棋子类型:棋子形状]
	pieceKindShapeList = append(pieceKindShapeList, kingPiece.Shape) // 将王棋加入棋子类型列表，王棋的index为0
	pieceKindStrMap := make(map[string]int)                          // 棋子形状与类型的映射，棋子形状转字符串后，可与棋子类型映射，{棋子形状字符串=>棋子类型}
	startGameState := GameState{
		PieceList: make([]GameStatePiece, len(game.PieceList)),
		Steps:     [][]int{},
	} // 开局局面，存储棋子类型和位置，方便后续甄别是否重复局面，[棋子索引:棋子类型+位置]
	startGameState.PieceList[game.KingPieceIndex] = GameStatePiece{
		Kind:     0,
		RowIndex: kingPiece.Position[0],
		ColIndex: kingPiece.Position[1],
	} // 将王棋放入局面
	gameStateStrSet := make(map[string]bool) // 局面字符串集合，将局面转字符串（用棋子排序保证唯一），存入集合，{局面字符串}

	// 完善棋子类型列表、棋子形状与类型的映射、开局局面
	for i, piece := range game.PieceList {
		if i != game.KingPieceIndex {
			shapeStr := shape2Str(piece.Shape)
			kind, isContains := pieceKindStrMap[shapeStr]
			if !isContains {
				pieceKindShapeList = append(pieceKindShapeList, piece.Shape)
				kind = len(pieceKindShapeList) - 1
				pieceKindStrMap[shapeStr] = kind
			}
			startGameState.PieceList[i] = GameStatePiece{
				Kind:     kind,
				RowIndex: piece.Position[0],
				ColIndex: piece.Position[1],
			}
		}
	}
	gameStateStrSet[gameState2Str(startGameState)] = true // 将开始局面存入局面字符串集合

	gameStateList := make([]GameState, 0)
	gameStateList = append(gameStateList, startGameState)
	for len(gameStateList) > 0 {
		gameState := gameStateList[0]
		gameStateList = gameStateList[1:]
		// 判断是否赢
		if isWin(gameState, game) {
			return humanSteps(gameState.Steps), nil
		}

		// 计算棋盘
		board := gameState2Board(gameState, pieceKindShapeList, boardRows, boardCols)

		for pieceIndex, piece := range gameState.PieceList {
			dirs := [][]int{
				{1, 0},
				{0, 1},
				{-1, 0},
				{0, -1},
			}
			pieceShape := pieceKindShapeList[piece.Kind]
			for _, dir := range dirs {
				for rowIndex, row := range pieceShape {
					for colIndex := range row {
						// 此格移动之后在棋盘上
						inBoard := piece.RowIndex+dir[0]+rowIndex >= 0 &&
							piece.RowIndex+dir[0]+rowIndex < boardRows &&
							piece.ColIndex+dir[1]+colIndex >= 0 &&
							piece.ColIndex+dir[1]+colIndex < boardCols
						if !inBoard {
							goto NextDir
						}
						// 此格移动之后棋盘上是否已有棋子
						isFillInBoard := board[piece.RowIndex+dir[0]+rowIndex][piece.ColIndex+dir[1]+colIndex]
						// 此格移动之后在当前棋子之前的位置之上
						isFillInPiece := rowIndex+dir[0] >= 0 &&
							rowIndex+dir[0] < len(pieceShape) &&
							colIndex+dir[1] >= 0 &&
							colIndex+dir[1] < len(pieceShape[0]) &&
							pieceShape[rowIndex+dir[0]][colIndex+dir[1]]

						if isFillInBoard && !isFillInPiece {
							goto NextDir
						}
					}
				}
				{
					// 可以移动
					newGameState := cloneGameState(gameState)
					newGameState.PieceList[pieceIndex].RowIndex += dir[0]
					newGameState.PieceList[pieceIndex].ColIndex += dir[1]

					newGameStateStr := gameState2Str(newGameState)
					if _, isContains := gameStateStrSet[newGameStateStr]; isContains {
						// 已经存在该局面
						continue
					}
					gameStateStrSet[newGameStateStr] = true
					newGameState.Steps = append(newGameState.Steps, []int{pieceIndex, dir[0], dir[1]})
					win := isWin(newGameState, game)
					if win {
						return humanSteps(newGameState.Steps), nil
					}
					gameStateList = append(gameStateList, newGameState)
				}
			NextDir:
				continue
			}
		}
	}
	return []Step{}, errors.New("no solution")
}

func isWin(state GameState, game GameData) bool {
	return state.PieceList[game.KingPieceIndex].RowIndex == game.KingWinPos[0] && state.PieceList[game.KingPieceIndex].ColIndex == game.KingWinPos[1]
}

func cloneGameState(state GameState) GameState {
	gameState := GameState{
		PieceList: make([]GameStatePiece, len(state.PieceList)),
		Steps:     [][]int{},
	}
	for i, piece := range state.PieceList {
		gameState.PieceList[i] = GameStatePiece{
			Kind:     piece.Kind,
			RowIndex: piece.RowIndex,
			ColIndex: piece.ColIndex,
		}
	}
	for _, step := range state.Steps {
		gameState.Steps = append(gameState.Steps, step)
	}
	return gameState
}

func gameState2Board(state GameState, pieceKindShapeList []Shape, boardRows int, boardCols int) Shape {
	board := make(Shape, boardRows)
	for i := 0; i < boardRows; i++ {
		board[i] = make([]bool, boardCols)
	}
	for _, piece := range state.PieceList {
		pieceShape := pieceKindShapeList[piece.Kind]
		for rowIndex, row := range pieceShape {
			for colIndex, grid := range row {
				if grid {
					board[piece.RowIndex+rowIndex][piece.ColIndex+colIndex] = true
				}
			}
		}
	}
	return board
}

/**
游戏局面转成唯一字符串
*/
func gameState2Str(gameState GameState) string {
	strArr := make([]string, len(gameState.PieceList))
	for i, piece := range gameState.PieceList {
		strArr[i] = fmt.Sprintf("%d%d%d", piece.Kind, piece.RowIndex, piece.ColIndex)
	}
	sort.Sort(sort.StringSlice(strArr))
	return strings.Join(strArr, "")
}

/**
棋子形状转字符串
*/
func shape2Str(shape Shape) string {
	strArr := make([]string, 0)
	for ri, row := range shape {
		for ci, grid := range row {
			if grid {
				strArr = append(strArr, fmt.Sprintf("%d%d1", ri, ci))
			} else {
				strArr = append(strArr, fmt.Sprintf("%d%d0", ri, ci))
			}
		}
	}
	return strings.Join(strArr, "")
}

func humanSteps(steps [][]int) []Step {
	res := make([]Step, len(steps))
	for i, step := range steps {
		res[i] = Step{
			PieceIndex: step[0],
			Direction:  []int{step[1], step[2]},
		}
	}
	return res
}

func printPieceboard(board Shape) {
	for _, row := range board {
		for _, grid := range row {
			if grid {
				fmt.Print("1")
			} else {
				fmt.Print("0")
			}
		}
		fmt.Println()
	}
}
