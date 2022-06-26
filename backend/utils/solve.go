package utils

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
)

var pow10 []uint64
var baseDirs [][]int8 // 基础方向，每个棋子的可移动方向
var flipDir []int8

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
	PieceList    []int8 `json:"pieceList"`
	Board        Board
	PreGameState *GameState
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

}

//var tryCount int

func (gs *GameSolve) Init(game GameData) {
	baseDirs = [][]int8{
		{1, 0},
		{0, 1},
		{-1, 0},
		{0, -1},
	}
	flipDir = []int8{
		2, 3, 0, 1,
	}
	pow10 = []uint64{
		1,
		100,
		10000,
		1000000,
		100000000,
		10000000000,
		1000000000000,
		100000000000000,
		10000000000000000,
		1000000000000000000,
	}

	gs.game = game
	gs.boardRows = game.BoardRows
	gs.boardCols = game.BoardCols
	gs.kingPieceIndex = game.KingPieceIndex
	gs.kingWinPos = game.KingWinPos
	gs.gameStateStrSet = map[string]bool{}

	kingPiece := game.PieceList[game.KingPieceIndex] // 王棋
	gs.pieceKindShapeList = make([]PieceKindShape, len(game.PieceList))
	gs.pieceKindShapeList[game.KingPieceIndex] = PieceKindShape{
		Kind:  0,
		Shape: kingPiece.Shape,
	}
	pieceKindStrMap := make(map[string]int8)
	startGameState := GameState{
		PieceList: make([]int8, len(game.PieceList)),
	} // 开局局面，存储棋子类型和位置，方便后续甄别是否重复局面，[棋子索引:棋子类型+位置]
	startGameState.PieceList[game.KingPieceIndex] = posToPiece(kingPiece.Position) // 将王棋放入局面
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
			startGameState.PieceList[i] = posToPiece(piece.Position)

			gs.pieceKindShapeList[i] = PieceKindShape{
				Kind:  kind,
				Shape: piece.Shape,
			}
		}
	}
	board, boardStr := gs.gameState2Board(startGameState)
	startGameState.Board = board
	gs.gameStateStrSet[boardStr] = true // 将开始局面存入局面字符串集合
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
				//println(tryCount)
				return steps, nil
			}
		}
	}
	return []Step{}, errors.New("no solution")
}

func (gs *GameSolve) tryMove(gameState GameState, pieceIndex int8, banDirsSet map[int8]bool) (bool, []Step) {

	piece := gameState.PieceList[pieceIndex]
	pos := pieceToPos(piece)
	pieceShape := gs.pieceKindShapeList[pieceIndex].Shape
	for dirIndex, dir := range baseDirs {
		if _, isContains := banDirsSet[int8(dirIndex)]; isContains {
			continue
		}
		for rowIndex, row := range pieceShape {
			for colIndex := range row {
				// 此格移动之后在棋盘上
				inBoard := pos[0]+dir[0]+int8(rowIndex) >= 0 &&
					pos[0]+dir[0]+int8(rowIndex) < gs.boardRows &&
					pos[1]+dir[1]+int8(colIndex) >= 0 &&
					pos[1]+dir[1]+int8(colIndex) < gs.boardCols
				if !inBoard {
					goto NextDir
				}
				gridBeforePieceIndex := gameState.Board[pos[0]+dir[0]+int8(rowIndex)][pos[1]+dir[1]+int8(colIndex)]
				// 此格移动之后的位置，棋盘已有棋子，且棋子不是自身，则不能移动
				if gridBeforePieceIndex > 0 && gridBeforePieceIndex != int8(pieceIndex)+1 {
					goto NextDir
				}
			}
		}
		{

			// 可以移动
			newGameState := cloneGameState(gameState)
			newGameState.PieceList[pieceIndex] = posToPiece([]int8{
				pos[0] + dir[0],
				pos[1] + dir[1],
			})
			board, boardStr := gs.gameState2Board(newGameState)
			newGameState.Board = board
			if _, isContains := gs.gameStateStrSet[boardStr]; isContains {
				// 已经存在该局面
				continue
			}

			//tryCount++
			gs.gameStateStrSet[boardStr] = true
			win := gs.isWin(newGameState)
			if win {
				return true, humanSteps(newGameState)
			}

			// 看看这枚棋子是否能够继续移动
			newWin, steps := gs.tryMove(newGameState, pieceIndex, map[int8]bool{
				flipDir[dirIndex]: true,
			})
			if newWin {
				return true, steps
			}
			gs.gameStateList = append(gs.gameStateList, newGameState)
		}
	NextDir:
		continue
	}
	// 如果没有可移动的方向，则返回
	return false, []Step{}
}

func (gs *GameSolve) isWin(gameState GameState) bool {
	pos := pieceToPos(gameState.PieceList[gs.kingPieceIndex])
	return pos[0] == gs.kingWinPos[0] && pos[1] == gs.kingWinPos[1]
}

func (gs *GameSolve) gameState2Board(gameState GameState) (Board, string) {
	board := make(Board, gs.boardRows)
	boardForStr := make([]uint64, gs.boardRows) // 准备一个数组表示棋盘的每一行

	for i := int8(0); i < gs.boardRows; i++ {
		board[i] = make([]int8, gs.boardCols)
		boardForStr[i] = pow10[gs.boardCols]
	}
	for pieceIndex, piece := range gameState.PieceList {
		pos := pieceToPos(piece)
		pieceKindShape := gs.pieceKindShapeList[pieceIndex]
		for rowIndex, row := range pieceKindShape.Shape {
			for colIndex, grid := range row {
				if grid {
					board[pos[0]+int8(rowIndex)][pos[1]+int8(colIndex)] = int8(pieceIndex) + 1
					boardForStr[int(pos[0])+rowIndex] += (uint64(pieceKindShape.Kind) + 1) * pow10[colIndex+int(pos[1])]
				}
			}
		}
	}
	boardStr := ""
	for i := 0; i < len(boardForStr); i++ {
		boardStr += strconv.FormatUint(boardForStr[i], 10)
	}
	return board, boardStr

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

func humanSteps(gameState GameState) []Step {
	var res []Step
	dirMap := map[int8][]int8{
		1:   {0, 1},
		-1:  {0, -1},
		10:  {1, 0},
		-10: {-1, 0},
	}

	for gameState.PreGameState != nil {
		for pieceIndex, piece := range gameState.PieceList {
			if piece != gameState.PreGameState.PieceList[pieceIndex] {
				diff := piece - gameState.PreGameState.PieceList[pieceIndex]
				dir := dirMap[diff]
				if len(res) > 0 && int8(pieceIndex) == res[len(res)-1].PieceIndex {
					res[len(res)-1].Direction = []int8{
						res[len(res)-1].Direction[0] + dir[0],
						res[len(res)-1].Direction[1] + dir[1],
					}
				} else {
					res = append(res, Step{
						PieceIndex: int8(pieceIndex),
						Direction:  dir,
					})
				}
			}
		}
		gameState = *gameState.PreGameState
	}
	var temp Step
	length := len(res)
	for i := 0; i < length/2; i++ {
		temp = res[i]
		res[i] = res[length-1-i]
		res[length-1-i] = temp
	}
	return res
}

func pieceToPos(piece int8) []int8 {
	return []int8{
		piece / 10,
		piece % 10,
	}
}

func posToPiece(pos []int8) int8 {
	return pos[0]*10 + pos[1]
}

func cloneGameState(state GameState) GameState {
	gameState := GameState{
		PieceList:    make([]int8, len(state.PieceList)),
		PreGameState: &state,
	}
	copy(gameState.PieceList, state.PieceList)
	return gameState
}
