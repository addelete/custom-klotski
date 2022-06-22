package utils

import (
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"
)

type Board = [][]int8
type Shape = [][]bool
type Pos = []int8

type Piece struct {
	Shape    Shape `json:"shape"`
	Position Pos   `json:"position"`
}

type GameData struct {
	PieceList      []Piece `json:"pieceList"`
	BoardRows      int8    `json:"boardRows"`
	BoardCols      int8    `json:"boardCols"`
	KingPieceIndex int8    `json:"kingPieceIndex"`
	KingWinPos     Pos     `json:"kingWinPos"`
}

type GameState struct {
	PieceList [][]int8
	Steps     [][]int8
	Board     Board
}

type Step struct {
	PieceIndex int8   `json:"pieceIndex"`
	Direction  []int8 `json:"direction"`
}

type PieceKindShape struct {
	Kind  int8
	Shape Shape
}

type GameSolve struct {
	game               GameData
	boardRows          int8
	boardCols          int8
	kingPieceIndex     int8
	kingWinPos         Pos
	pieceKindShapeList []PieceKindShape
	gameStateStrSet    map[string]bool // 局面字符串集合，将局面转字符串（用棋子排序保证唯一），存入集合，{局面字符串}
	gameStateList      []GameState     // 局面列表，存储所有待计算的局面
	baseDirs           [][]int8        // 基础方向，每个棋子的可移动方向
	flipDirList        []int8
}

func (gs *GameSolve) Init(game GameData) {
	gs.game = game
	gs.boardRows = game.BoardRows
	gs.boardCols = game.BoardCols
	gs.kingPieceIndex = game.KingPieceIndex
	gs.kingWinPos = game.KingWinPos
	gs.gameStateStrSet = map[string]bool{}
	gs.baseDirs = [][]int8{
		{1, 0},
		{0, 1},
		{-1, 0},
		{0, -1},
	}
	gs.flipDirList = []int8{
		2, 3, 0, 1,
	}
	kingPiece := game.PieceList[game.KingPieceIndex] // 王棋
	gs.pieceKindShapeList = make([]PieceKindShape, len(game.PieceList))
	gs.pieceKindShapeList[game.KingPieceIndex] = PieceKindShape{
		Kind:  0,
		Shape: kingPiece.Shape,
	}
	pieceKindStrMap := make(map[string]int8)
	startGameState := GameState{
		PieceList: make([][]int8, len(game.PieceList)),
		Steps:     [][]int8{},
	} // 开局局面，存储棋子类型和位置，方便后续甄别是否重复局面，[棋子索引:棋子类型+位置]
	startGameState.PieceList[game.KingPieceIndex] = kingPiece.Position // 将王棋放入局面
	kindCount := int8(0)
	// 完善棋子类型列表、棋子形状与类型的映射、开局局面
	for i, piece := range game.PieceList {
		if int8(i) != game.KingPieceIndex {
			shapeStr := shape2Str(piece.Shape)
			kind, isContains := pieceKindStrMap[shapeStr]
			if !isContains {
				kindCount++
				kind = kindCount
				pieceKindStrMap[shapeStr] = kind
			}
			startGameState.PieceList[i] = piece.Position

			gs.pieceKindShapeList[i] = PieceKindShape{
				Kind:  kind,
				Shape: piece.Shape,
			}
		}
	}
	startGameState.Board = gs.gameState2Board(startGameState)
	gs.gameStateStrSet[gs.board2Str(startGameState.Board)] = true // 将开始局面存入局面字符串集合
	gs.gameStateList = append(gs.gameStateList, startGameState)
}

func (gs *GameSolve) Solve() ([]Step, error) {
	kingPiece := gs.game.PieceList[gs.game.KingPieceIndex] // 王棋
	// 判断开始局面是否已经赢了
	if kingPiece.Position[0] == gs.kingWinPos[0] && kingPiece.Position[1] == gs.kingWinPos[1] {
		return []Step{}, nil
	}

	for len(gs.gameStateList) > 0 {
		gameState := gs.gameStateList[0]
		gs.gameStateList = gs.gameStateList[1:]

		for pieceIndex := 0; pieceIndex < len(gameState.PieceList); pieceIndex++ {
			win, steps := gs.tryMove(gameState, int8(pieceIndex), map[int8]bool{})
			if win {
				return steps, nil
			}
		}
	}
	return []Step{}, errors.New("no solution")
}

func (gs *GameSolve) tryMove(gameState GameState, pieceIndex int8, banDirsSet map[int8]bool) (bool, []Step) {
	piece := gameState.PieceList[pieceIndex]
	pieceShape := gs.pieceKindShapeList[pieceIndex].Shape
	for dirIndex, dir := range gs.baseDirs {
		if _, isContains := banDirsSet[int8(dirIndex)]; isContains {
			continue
		}
		for rowIndex, row := range pieceShape {
			for colIndex := range row {
				// 此格移动之后在棋盘上
				inBoard := piece[0]+dir[0]+int8(rowIndex) >= 0 &&
					piece[0]+dir[0]+int8(rowIndex) < gs.boardRows &&
					piece[1]+dir[1]+int8(colIndex) >= 0 &&
					piece[1]+dir[1]+int8(colIndex) < gs.boardCols
				if !inBoard {
					goto NextDir
				}
				gridBeforePieceIndex := gameState.Board[piece[0]+dir[0]+int8(rowIndex)][piece[1]+dir[1]+int8(colIndex)]
				// 此格移动之后的位置，棋盘已有棋子，且棋子不是自身，则不能移动
				if gridBeforePieceIndex > 0 && gridBeforePieceIndex != int8(pieceIndex)+1 {
					goto NextDir
				}
			}
		}
		{
			// 可以移动
			newGameState := cloneGameState(gameState)
			newGameState.PieceList[pieceIndex][0] += dir[0]
			newGameState.PieceList[pieceIndex][1] += dir[1]
			newGameState.Board = gs.gameState2Board(newGameState)
			newGameStateStr := gs.board2Str(newGameState.Board)
			if _, isContains := gs.gameStateStrSet[newGameStateStr]; isContains {
				// 已经存在该局面
				continue
			}
			gs.gameStateStrSet[newGameStateStr] = true
			if len(newGameState.Steps) > 0 && newGameState.Steps[len(newGameState.Steps)-1][0] == pieceIndex {
				newGameState.Steps[len(newGameState.Steps)-1] = []int8{
					pieceIndex,
					newGameState.Steps[len(newGameState.Steps)-1][1] + dir[0],
					newGameState.Steps[len(newGameState.Steps)-1][2] + dir[1],
				}
			} else {
				newGameState.Steps = append(newGameState.Steps, []int8{pieceIndex, dir[0], dir[1]})
			}
			win := gs.isWin(newGameState)
			if win {
				return true, humanSteps(newGameState.Steps)
			}
			gs.gameStateList = append(gs.gameStateList, newGameState)
			// 看看这枚棋子是否能够继续移动
			newWin, steps := gs.tryMove(newGameState, pieceIndex, map[int8]bool{
				gs.flipDirList[dirIndex]: true,
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

func (gs *GameSolve) isWin(gameState GameState) bool {
	return gameState.PieceList[gs.kingPieceIndex][0] == gs.kingWinPos[0] &&
		gameState.PieceList[gs.kingPieceIndex][1] == gs.kingWinPos[1]
}

func cloneGameState(state GameState) GameState {
	gameState := GameState{
		PieceList: make([][]int8, len(state.PieceList)),
		Steps:     make([][]int8, len(state.Steps)),
	}
	for i, piece := range state.PieceList {
		gameState.PieceList[i] = []int8{
			piece[0],
			piece[1],
		}
	}
	for i, step := range state.Steps {
		gameState.Steps[i] = step
	}
	return gameState
}

func (gs *GameSolve) gameState2Board(gameState GameState) Board {
	board := make(Board, gs.boardRows)
	for i := int8(0); i < gs.boardRows; i++ {
		board[i] = make([]int8, gs.boardCols)
	}
	for pieceIndex, piece := range gameState.PieceList {
		pieceShape := gs.pieceKindShapeList[pieceIndex].Shape
		for rowIndex, row := range pieceShape {
			for colIndex, grid := range row {
				if grid {
					board[piece[0]+int8(rowIndex)][piece[1]+int8(colIndex)] = int8(pieceIndex) + 1
				}
			}
		}
	}
	return board
}

/**
棋盘转字符串
*/
func (gs *GameSolve) board2Str(board Board) string {
	res := ""
	for _, row := range board {
		for _, grid := range row {
			if grid > 0 {
				res += strconv.Itoa(int(gs.pieceKindShapeList[grid-1].Kind + 1))
			} else {
				res += "0"
			}
		}
	}
	return res
}

/**
游戏局面转成唯一字符串
*/
func (gs *GameSolve) gameState2Str(gameState GameState) string {
	strArr := make([]string, len(gameState.PieceList))
	for i, piece := range gameState.PieceList {
		strArr[i] = fmt.Sprintf("%d%d%d", gs.pieceKindShapeList[i].Kind, piece[0], piece[1])
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

func humanSteps(steps [][]int8) []Step {
	res := make([]Step, len(steps))
	for i, step := range steps {
		res[i] = Step{
			PieceIndex: step[0],
			Direction:  []int8{step[1], step[2]},
		}
	}
	return res
}
