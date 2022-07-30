package utils

import (
	"errors"
	"fmt"
	"strings"
)

var baseDirs [][]int16 // 基础方向，每个棋子的可移动方向
var flipDir []int16

type Board = [][]int16
type Shape = [][]bool
type Pos = []int16

type Piece struct {
	Shape    Shape `json:"shape"`
	Position Pos   `json:"position"`
}

type Door struct {
	Placement  string `json:"placement"`
	StartIndex int    `json:"startIndex"`
	XSize      int    `json:"xSize"`
	YSize      int    `json:"ySize"`
}

type GameData struct {
	PieceList      []Piece `json:"pieceList"`
	BoardRows      int16   `json:"boardRows"`
	BoardCols      int16   `json:"boardCols"`
	KingPieceIndex int16   `json:"kingPieceIndex"`
	KingWinPos     Pos     `json:"kingWinPos"`
	Door           Door    `json:"door"`
}

type GameState struct {
	PieceList    []int16 `json:"pieceList"`
	Board        Board
	PreGameState *GameState
}

type Step struct {
	PieceIndex int16   `json:"pieceIndex"`
	Direction  []int16 `json:"direction"`
}

type PieceKindShape struct {
	Kind  uint8
	Shape Shape
}

type GameSolve struct {
	boardRows          int16
	boardCols          int16
	kingIndex          int16
	kingWinPos         Pos
	pieceKindShapeList []PieceKindShape
	gameStateStrSet    map[string]bool // 局面字符串集合，将局面转字符串（用棋子排序保证唯一），存入集合，{局面字符串}
	gameStateList      []GameState     // 局面列表，存储所有待计算的局面
	doorPlacement      string
	Times              uint64
}

//var tryCount int

func (gs *GameSolve) Init(game GameData) {
	baseDirs = [][]int16{
		{1, 0},
		{0, 1},
		{-1, 0},
		{0, -1},
	}
	flipDir = []int16{
		2, 3, 0, 1,
	}

	gs.boardRows = game.BoardRows
	gs.boardCols = game.BoardCols
	gs.kingIndex = game.KingPieceIndex
	gs.kingWinPos = game.KingWinPos
	gs.gameStateStrSet = map[string]bool{}
	gs.doorPlacement = game.Door.Placement
	pieceKindStrMap := make(map[string]uint8)
	startGameState := GameState{
		PieceList: make([]int16, 0),
	} // 开局局面，存储棋子类型和位置，方便后续甄别是否重复局面，[棋子索引:棋子类型+位置]
	kindCount := uint8(0)
	// 完善棋子类型列表、棋子形状与类型的映射、开局局面
	for i, piece := range game.PieceList {
		shapeStr := shape2Str(piece.Shape)
		kind, isContains := pieceKindStrMap[shapeStr]
		if !isContains || int16(i) == game.KingPieceIndex {
			kindCount++
			kind = kindCount
			pieceKindStrMap[shapeStr] = kind
		}
		startGameState.PieceList = append(startGameState.PieceList, gs.posToPiece(piece.Position))

		gs.pieceKindShapeList = append(gs.pieceKindShapeList, PieceKindShape{
			Kind:  kind,
			Shape: piece.Shape,
		})

	}

	board, boardStr := gs.gameState2Board(startGameState)
	startGameState.Board = board
	gs.gameStateStrSet[boardStr] = true // 将开始局面存入局面字符串集合
	gs.gameStateList = append(gs.gameStateList, startGameState)
}

func (gs *GameSolve) Solve() ([]Step, error) {
	startGameState := gs.gameStateList[0]
	// 判断开始局面是否已经赢了
	if gs.isWin(startGameState) {
		return []Step{}, nil
	}

	for len(gs.gameStateList) > 0 {

		gameState := gs.gameStateList[0]
		gs.gameStateList = gs.gameStateList[1:]
		for pieceIndex := 0; pieceIndex < len(gameState.PieceList); pieceIndex++ {
			win, steps := gs.tryMove(gameState, int16(pieceIndex), map[int16]bool{})
			if win {
				//println(tryCount)
				return steps, nil
			}
		}
	}
	return []Step{}, errors.New("no solution")
}

func (gs *GameSolve) tryMove(gameState GameState, pieceIndex int16, banDirsSet map[int16]bool) (bool, []Step) {
	//printBoard(gameState.Board)

	piece := gameState.PieceList[pieceIndex]
	pos := gs.pieceToPos(piece)
	pieceShape := gs.pieceKindShapeList[pieceIndex].Shape
	for dirIndex, dir := range baseDirs {
		if _, isContains := banDirsSet[int16(dirIndex)]; isContains {
			continue
		}
		for rowIndex, row := range pieceShape {
			for colIndex := range row {
				// 如果棋子此格本身为空，此格移动不存在覆盖其他棋子的情况，跳过
				if gameState.Board[pos[0]+int16(rowIndex)][pos[1]+int16(colIndex)] == 0 {
					continue
				}
				// 此格移动之后在棋盘上
				inBoard := pos[0]+dir[0]+int16(rowIndex) >= 0 &&
					pos[0]+dir[0]+int16(rowIndex) < gs.boardRows &&
					pos[1]+dir[1]+int16(colIndex) >= 0 &&
					pos[1]+dir[1]+int16(colIndex) < gs.boardCols
				if !inBoard {
					goto NextDir
				}
				gridBeforePieceIndex := gameState.Board[pos[0]+dir[0]+int16(rowIndex)][pos[1]+dir[1]+int16(colIndex)]

				// 此格移动之后的位置，棋盘已有棋子，且棋子不是自身，则不能移动
				if gridBeforePieceIndex > 0 && gridBeforePieceIndex != int16(pieceIndex)+1 {
					goto NextDir
				}
			}
		}
		{

			// 可以移动
			newGameState := cloneGameState(gameState)
			newGameState.PieceList[pieceIndex] = gs.posToPiece([]int16{
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
				return true, gs.humanSteps(newGameState)
			}

			// 看看这枚棋子是否能够继续移动
			newWin, steps := gs.tryMove(newGameState, pieceIndex, map[int16]bool{
				flipDir[dirIndex]: true,
			})
			gs.gameStateList = append(gs.gameStateList, newGameState)
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
	kingPos := gs.pieceToPos(gameState.PieceList[gs.kingIndex])
	if kingPos[0] != gs.kingWinPos[0] || kingPos[1] != gs.kingWinPos[1] {
		return false
	}
	kingPieceShape := gs.pieceKindShapeList[gs.kingIndex].Shape

	for rowIndex, row := range kingPieceShape {
		for colIndex, grid := range row {
			// 假如棋子上此格为空，棋盘上此格不为空，说明是别的棋子
			// 判断此格是否阻挡王棋进入门
			if !grid && gameState.Board[int(kingPos[0])+rowIndex][int(kingPos[1])+colIndex] != 0 {
				switch gs.doorPlacement {
				case "bottom":
					for rowI := rowIndex; rowI >= 0; rowI-- {
						if kingPieceShape[rowI][colIndex] {
							return false
						}
					}
					break
				case "top":
					for rowI := rowIndex; rowI <= len(kingPieceShape); rowI++ {
						if kingPieceShape[rowI][colIndex] {
							return false
						}
					}
					break
				case "left":
					for colI := colIndex; colI <= len(kingPieceShape[0]); colI++ {
						if kingPieceShape[rowIndex][colI] {
							return false
						}
					}
					break
				case "right":
					for colI := colIndex; colI >= 0; colI-- {
						if kingPieceShape[rowIndex][colI] {
							return false
						}
					}
					break
				}
			}
		}
	}
	return true
}

func (gs *GameSolve) gameState2Board(gameState GameState) (Board, string) {
	board := make(Board, gs.boardRows)
	kindList := make([]uint8, gs.boardRows*gs.boardCols) // 准备一个uint8数组表示棋盘的每一格的棋子类型, []unit8可以直转string

	for i := int16(0); i < gs.boardRows; i++ {
		board[i] = make([]int16, gs.boardCols)
	}
	for pieceIndex, piece := range gameState.PieceList {
		pos := gs.pieceToPos(piece)
		pieceKindShape := gs.pieceKindShapeList[pieceIndex]
		for rowIndex, row := range pieceKindShape.Shape {
			for colIndex, grid := range row {
				if grid {
					board[pos[0]+int16(rowIndex)][pos[1]+int16(colIndex)] = int16(pieceIndex) + 1
					kindList[(rowIndex+int(pos[0]))*int(gs.boardCols)+colIndex+int(pos[1])] = pieceKindShape.Kind + 33 // kind字符从33开始
				}
			}
		}
	}
	for i, v := range kindList {
		if v == 0 {
			kindList[i] = 32
		}
	}
	//fmt.Printf("kindList: %+v\n", kindList)
	boardStr := string(kindList)
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

func (gs *GameSolve) humanSteps(gameState GameState) []Step {
	var res []Step
	for gameState.PreGameState != nil {
		//fmt.Println("=============")
		//for _, row := range gameState.Board {
		//	fmt.Printf("%+v\n", row)
		//}
		for pieceIndex, piece := range gameState.PieceList {
			if piece != gameState.PreGameState.PieceList[pieceIndex] {
				diff := piece - gameState.PreGameState.PieceList[pieceIndex]
				dir := make([]int16, 0)
				if diff == 1 || diff == -1 {
					dir = []int16{0, diff}
				} else if diff == gs.boardCols {
					dir = []int16{1, 0}
				} else if diff == -gs.boardCols {
					dir = []int16{-1, 0}
				}
				if len(res) > 0 && int16(pieceIndex) == res[len(res)-1].PieceIndex {
					res[len(res)-1].Direction = []int16{
						res[len(res)-1].Direction[0] + dir[0],
						res[len(res)-1].Direction[1] + dir[1],
					}
				} else {
					res = append(res, Step{
						PieceIndex: int16(pieceIndex),
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
	//fmt.Printf("%+v", res)
	return res
}

func (gs *GameSolve) pieceToPos(piece int16) []int16 {
	return []int16{
		piece / gs.boardCols,
		piece % gs.boardCols,
	}
}

func (gs *GameSolve) posToPiece(pos []int16) int16 {
	return pos[0]*gs.boardCols + pos[1]
}

func cloneGameState(state GameState) GameState {
	gameState := GameState{
		PieceList:    make([]int16, len(state.PieceList)),
		PreGameState: &state,
	}
	copy(gameState.PieceList, state.PieceList)
	return gameState
}

func printBoard(board Board) {
	fmt.Println("=============")
	for _, row := range board {
		fmt.Printf("%+v\n", row)
	}
}
