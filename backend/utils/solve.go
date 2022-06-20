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

type GameSolve struct {
	game               GameData
	boardRows          int
	boardCols          int
	kingPieceIndex     int
	kingWinPos         Pos
	pieceKindShapeList []Shape
	gameStateStrSet    map[string]bool // 局面字符串集合，将局面转字符串（用棋子排序保证唯一），存入集合，{局面字符串}
	gameStateList      []GameState     // 局面列表，存储所有待计算的局面
	baseDirs           [][]int         // 基础方向，每个棋子的可移动方向
}

func (this *GameSolve) Init(game GameData) {
	this.game = game
	this.boardRows = game.BoardRows
	this.boardCols = game.BoardCols
	this.kingPieceIndex = game.KingPieceIndex
	this.kingWinPos = game.KingWinPos
	this.gameStateStrSet = map[string]bool{}
	this.baseDirs = [][]int{
		{1, 0},
		{0, 1},
		{-1, 0},
		{0, -1},
	}
	kingPiece := game.PieceList[game.KingPieceIndex] // 王棋
	this.pieceKindShapeList = append(this.pieceKindShapeList, kingPiece.Shape)
	pieceKindStrMap := make(map[string]int)
	startGameState := GameState{
		PieceList: make([]GameStatePiece, len(game.PieceList)),
		Steps:     [][]int{},
	} // 开局局面，存储棋子类型和位置，方便后续甄别是否重复局面，[棋子索引:棋子类型+位置]
	startGameState.PieceList[game.KingPieceIndex] = GameStatePiece{
		Kind:     0,
		RowIndex: kingPiece.Position[0],
		ColIndex: kingPiece.Position[1],
	} // 将王棋放入局面
	// 完善棋子类型列表、棋子形状与类型的映射、开局局面
	for i, piece := range game.PieceList {
		if i != game.KingPieceIndex {
			shapeStr := shape2Str(piece.Shape)
			kind, isContains := pieceKindStrMap[shapeStr]
			if !isContains {
				this.pieceKindShapeList = append(this.pieceKindShapeList, piece.Shape)
				kind = len(this.pieceKindShapeList) - 1
				pieceKindStrMap[shapeStr] = kind
			}
			startGameState.PieceList[i] = GameStatePiece{
				Kind:     kind,
				RowIndex: piece.Position[0],
				ColIndex: piece.Position[1],
			}
		}
	}
	this.gameStateStrSet[gameState2Str(startGameState)] = true // 将开始局面存入局面字符串集合
	this.gameStateList = append(this.gameStateList, startGameState)
}

func (this *GameSolve) Solve() ([]Step, error) {
	kingPiece := this.game.PieceList[this.game.KingPieceIndex] // 王棋
	// 判断开始局面是否已经赢了
	if kingPiece.Position[0] == this.kingWinPos[0] && kingPiece.Position[1] == this.kingWinPos[1] {
		return []Step{}, nil
	}

	for len(this.gameStateList) > 0 {
		gameState := this.gameStateList[0]
		this.gameStateList = this.gameStateList[1:]

		// 计算棋盘
		board := this.gameState2Board(gameState)

		for pieceIndex := 0; pieceIndex < len(gameState.PieceList); pieceIndex++ {
			win, steps := this.tryMove(gameState, pieceIndex, board, map[int]bool{})
			if win {
				return steps, nil
			}
		}
	}
	return []Step{}, errors.New("no solution")
}

func (this *GameSolve) tryMove(gameState GameState, pieceIndex int, board [][]bool, banDirsSet map[int]bool) (bool, []Step) {
	piece := gameState.PieceList[pieceIndex]
	pieceShape := this.pieceKindShapeList[piece.Kind]
	for dirIndex, dir := range this.baseDirs {
		if _, isContains := banDirsSet[dirIndex]; isContains {
			continue
		}
		for rowIndex, row := range pieceShape {
			for colIndex := range row {
				// 此格移动之后在棋盘上
				inBoard := piece.RowIndex+dir[0]+rowIndex >= 0 &&
					piece.RowIndex+dir[0]+rowIndex < this.boardRows &&
					piece.ColIndex+dir[1]+colIndex >= 0 &&
					piece.ColIndex+dir[1]+colIndex < this.boardCols
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
			if _, isContains := this.gameStateStrSet[newGameStateStr]; isContains {
				// 已经存在该局面
				continue
			}
			this.gameStateStrSet[newGameStateStr] = true
			if len(newGameState.Steps) > 0 && newGameState.Steps[len(newGameState.Steps)-1][0] == pieceIndex {
				newGameState.Steps[len(newGameState.Steps)-1] = []int{
					pieceIndex,
					newGameState.Steps[len(newGameState.Steps)-1][1] + dir[0],
					newGameState.Steps[len(newGameState.Steps)-1][2] + dir[1],
				}
			} else {
				newGameState.Steps = append(newGameState.Steps, []int{pieceIndex, dir[0], dir[1]})
			}
			win := this.isWin(newGameState)
			if win {
				return true, humanSteps(newGameState.Steps)
			}
			this.gameStateList = append(this.gameStateList, newGameState)
			// 看看这枚棋子是否能够继续移动
			newBoard := this.gameState2Board(newGameState)
			newWin, steps := this.tryMove(newGameState, pieceIndex, newBoard, map[int]bool{
				flipDir(dirIndex): true,
			})
			if newWin {
				return true, steps
			}
		}
	NextDir:
		continue
	}
	// 如果没有可移动的方向，则返回
	return false, []Step{}
}

func (this *GameSolve) isWin(gameState GameState) bool {
	return gameState.PieceList[this.kingPieceIndex].RowIndex == this.kingWinPos[0] &&
		gameState.PieceList[this.kingPieceIndex].ColIndex == this.kingWinPos[1]
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

func (this *GameSolve) gameState2Board(gameState2Board GameState) Shape {
	board := make(Shape, this.boardRows)
	for i := 0; i < this.boardRows; i++ {
		board[i] = make([]bool, this.boardCols)
	}
	for _, piece := range gameState2Board.PieceList {
		pieceShape := this.pieceKindShapeList[piece.Kind]
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

/**
方向翻转
*/
func flipDir(dirIndex int) int {
	switch dirIndex {
	case 0:
		return 2
	case 1:
		return 3
	case 2:
		return 0
	case 3:
		return 1
	default:
		return -1
	}
}

func printBoard(board Shape) {
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
