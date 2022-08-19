import { KonvaEventObject } from "konva/lib/Node";
import produce from "immer";
import { MyAlert, MyAlertRef } from "../components/MyAlert";
import { IconButton } from "@mui/material";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useMemoizedFn, useSetState, useUpdateEffect } from "ahooks";
import { useNavigate } from "react-router-dom";
import { Layer, Rect, Stage } from 'react-konva';
import { PieceItem } from '@/src/components/PieceItem';
import GameUtils from "@/src/utils/game";
import { useEffect, useMemo, useRef } from "react";
import { currentGame } from "@/src/stores/currentGame";
import { useTranslation } from "react-i18next";
import './GamePlayer.less'
import { MyButton } from "../components/MyButton";
import { Vector2d } from "konva/lib/types";
import { Group } from "konva/lib/Group";


export default function GamePlayerPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [state, setState] = useSetState<{
    name: string;
    stepIndex: number;
    pieceList: Piece[];
    solution: Solution;
    rows: number;
    cols: number;
    kingPieceIndex: number;
    door: Door;
    kingWinPos: Pos;
    gridSize: number;
    piecesNextPostions: number[][][];
    undoSolution: Solution;
  }>({
    name: currentGame.game.name || t("GamePlayer.unnamed"),
    stepIndex: 0,
    pieceList: (currentGame.gameData as GameData).pieceList,
    solution: [],
    rows: (currentGame.gameData as GameData).boardRows,
    cols: (currentGame.gameData as GameData).boardCols,
    kingPieceIndex: (currentGame.gameData as GameData).kingPieceIndex,
    door: (currentGame.gameData as GameData).door,
    kingWinPos: (currentGame.gameData as GameData).kingWinPos,
    gridSize: 0,
    piecesNextPostions: [],
    undoSolution: [],
  })

  const alertRef = useRef<MyAlertRef>({} as MyAlertRef)
  const lastDragMove = useRef<{ x: number, y: number }>({ x: 0, y: 0 })

  useEffect(() => {
    const onResize = () => {
      const gridSize = GameUtils.calcGridSize(state.rows, state.cols)
      setState({
        gridSize
      })
    }
    window.addEventListener('resize', onResize)
    onResize()
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [state.cols, state.rows])

  useEffect(() => {
    // 构造棋盘，-1为空，其他值为棋子索引
    const board = Array(state.rows).fill(0).map(() => Array(state.cols).fill(-1))
    for (let i = 0; i < state.pieceList.length; i++) {
      const piece = state.pieceList[i]
      for (let ri = 0; ri < piece.shape.length; ri++) {
        const row = piece.shape[ri]
        for (let ci = 0; ci < row.length; ci++) {
          const grid = row[ci]
          if (grid) {
            board[ri + piece.position[0]][ci + piece.position[1]] = i
          }
        }
      }
    }
    // 计算每个棋子可拖动的位置
    const piecesNextPostions = Array(state.pieceList.length).fill(0).map(() => []) as number[][][];
    for (let i = 0; i < state.pieceList.length; i++) {
      piecesNextPostions[i] = GameUtils.calcPieceNextPostions(board, state.pieceList[i], i);
    }
    setState({
      piecesNextPostions,
    })
  }, [state.pieceList])

  useUpdateEffect(() => {
    const kingPos = state.pieceList[state.kingPieceIndex].position
    if (kingPos[0] === state.kingWinPos[0] && kingPos[1] === state.kingWinPos[1]) {
      alertRef.current.open({
        message: t("GamePlayer.win"),
        type: 'success',
      })
    }
  }, [state.pieceList[state.kingPieceIndex].position, state.kingWinPos])

  const routeBack = useMemoizedFn(() => {
    navigate(-1)
  })

  /**
 * 布局情况
 */
  const board = useMemo(() => {
    return Array(state.rows).fill(0).map(() => Array(state.cols).fill(false))
  }, [state.rows, state.cols])

  const doorStyle = useMemo(() => {
    return GameUtils.door2Style(state.door, state.gridSize)
  }, [state.door, state.gridSize])

  const piecesDragBoundFuncs = useMemo(() => {
    const piecesDragXYRanges = state.piecesNextPostions.map((nextPostions, pieceIndex) => {
      return [{
        x: [0, state.gridSize],
        y: [0, state.gridSize],
      }, ...nextPostions.map((nextPostion) => {
        const startX = (nextPostion[1] - state.pieceList[pieceIndex].position[1]) * state.gridSize
        const startY = (nextPostion[0] - state.pieceList[pieceIndex].position[0]) * state.gridSize
        return {
          x: [startX, startX + state.gridSize],
          y: [startY, startY + state.gridSize],
        }
      })]
    })

    const result: (((pos: Vector2d) => Vector2d) | undefined)[] = []
    for (let i = 0; i < state.piecesNextPostions.length; i++) {
      if (state.piecesNextPostions[i].length > 0) {
        result[i] = function (pos: Vector2d) {
          const points = [
            { x: 0, y: 0, inRange: false }, // 左上角
            { x: state.gridSize, y: 0, inRange: false }, // 右上角
            { x: state.gridSize, y: state.gridSize, inRange: false }, // 右下角
            { x: 0, y: state.gridSize, inRange: false }, // 左下角
          ];
          for (let j = 0; j < piecesDragXYRanges[i].length; j++) {
            const range = piecesDragXYRanges[i][j]
            for (let k = 0; k < points.length; k++) {
              if (points[k].inRange) {
                continue;
              }
              if (
                range.x[0] <= points[k].x + pos.x &&
                points[k].x + pos.x <= range.x[1] &&
                range.y[0] <= points[k].y + pos.y &&
                points[k].y + pos.y <= range.y[1]
              ) {
                points[k].inRange = true
              }
            }
          }
          
          if (!points[0].inRange && !points[1].inRange && !points[2].inRange && !points[3].inRange) {
            return {
              x: Math.round(lastDragMove.current.x / state.gridSize) * state.gridSize,
              y: Math.round(lastDragMove.current.y / state.gridSize) * state.gridSize,
            }
          } else {
            let x = pos.x
            if (!points[0].inRange && !points[3].inRange) {
              x = Math.ceil(pos.x / state.gridSize) * state.gridSize
            }
            if (!points[1].inRange && !points[2].inRange) {
              x = Math.floor(pos.x / state.gridSize) * state.gridSize
            }
            let y = pos.y
            if (!points[0].inRange && !points[1].inRange) {
              y = Math.ceil(pos.y / state.gridSize) * state.gridSize
            }
            if (!points[2].inRange && !points[3].inRange) {
              y = Math.floor(pos.y / state.gridSize) * state.gridSize
            }
            if(!points[0].inRange && points[1].inRange && points[2].inRange && points[3].inRange){
              x = Math.ceil(lastDragMove.current.x / state.gridSize) * state.gridSize
              y = Math.ceil(lastDragMove.current.y / state.gridSize) * state.gridSize
            }
            if(points[0].inRange && !points[1].inRange && points[2].inRange && points[3].inRange){
              x = Math.floor(lastDragMove.current.x / state.gridSize) * state.gridSize
              y = Math.ceil(lastDragMove.current.y / state.gridSize) * state.gridSize
            }
            if(points[0].inRange && points[1].inRange && !points[2].inRange && points[3].inRange){
              x = Math.floor(lastDragMove.current.x / state.gridSize) * state.gridSize
              y = Math.floor(lastDragMove.current.y / state.gridSize) * state.gridSize
            }
            if(points[0].inRange && points[1].inRange && points[2].inRange && !points[3].inRange){
              x = Math.ceil(lastDragMove.current.x / state.gridSize) * state.gridSize
              y = Math.floor(lastDragMove.current.y / state.gridSize) * state.gridSize
            }
            lastDragMove.current = { x, y }
            return {
              x,
              y,
            }
          }
        }
      }
    }
    return result;
  }, [state.piecesNextPostions])

  const handleDragStart = useMemoizedFn((e: KonvaEventObject<DragEvent>) => {
    e.target.getLayer().children.forEach((child: Group) => {
      child.setZIndex(1)
    })
    e.target.setZIndex(8)
    lastDragMove.current = { x: 0, y: 0 }
  })

  const handleDragEnd = useMemoizedFn((e: KonvaEventObject<DragEvent>, pieceIndex: number) => {
    const diff = e.target.absolutePosition()
    const rowDiff = Math.round(diff.y / state.gridSize)
    const colDiff = Math.round(diff.x / state.gridSize)
    const resetDragData = () => {
      e.target.x(0)
      e.target.y(0)
    }
    resetDragData()
    if (rowDiff === 0 && colDiff === 0) {
      return
    }
    const piece = state.pieceList[pieceIndex]
    const newPosition = [piece.position[0] + rowDiff, piece.position[1] + colDiff]
    const movable = state.piecesNextPostions[pieceIndex].findIndex(nextPosition => {
      return nextPosition[0] === newPosition[0] && nextPosition[1] === newPosition[1]
    }) !== -1
    if (!movable) {
      return
    }
    const direction = [rowDiff, colDiff]
    setState(produce(draft => {
      draft.solution.push({
        pieceIndex,
        direction: direction,
      })
      draft.undoSolution = []
      draft.stepIndex++
      draft.pieceList[pieceIndex] = GameUtils.pieceCalcInBoard({
        shape: piece.shape,
        position: [piece.position[0] + direction[0], piece.position[1] + direction[1]],
        inBoard: [],
      }, state.rows, state.cols)
    }))

  })

  const restart = useMemoizedFn(() => {
    setState({
      stepIndex: 0,
      solution: [],
      undoSolution: [],
      pieceList: (currentGame.gameData as GameData).pieceList,
    })
  })

  const undo = useMemoizedFn(() => {
    const step = state.solution[state.stepIndex - 1]
    const pieceIndex = step.pieceIndex
    const piece = state.pieceList[pieceIndex]
    const stepIndex = state.stepIndex - 1
    const undoSolution = [step, ...state.undoSolution]

    const solution = state.solution.slice(0, stepIndex)
    const newPiece = GameUtils.pieceCalcInBoard({
      shape: piece.shape,
      position: [piece.position[0] - step.direction[0], piece.position[1] - step.direction[1]],
      inBoard: [],
    }, state.rows, state.cols)
    setState(produce(draft => {
      draft.stepIndex = stepIndex
      draft.undoSolution = undoSolution
      draft.solution = solution
      draft.pieceList[pieceIndex] = newPiece
    }))

  })

  const redo = useMemoizedFn(() => {
    const stepIndex = state.stepIndex + 1
    const undoSolution = state.undoSolution.slice(1)
    const step = state.undoSolution[0]
    const pieceIndex = step.pieceIndex
    const piece = state.pieceList[pieceIndex]
    const solution = [...state.solution, step]
    const newPiece = GameUtils.pieceCalcInBoard({
      shape: piece.shape,
      position: [piece.position[0] + step.direction[0], piece.position[1] + step.direction[1]],
      inBoard: [],
    }, state.rows, state.cols)
    setState(produce(draft => {
      draft.stepIndex = stepIndex
      draft.undoSolution = undoSolution
      draft.solution = solution
      draft.pieceList[pieceIndex] = newPiece
    }))

  })



  return (
    <div className="GamePlayerPage">
      <MyAlert ref={alertRef} />
      <div className='page'>
        <div className='pageHeader'>
          <IconButton
            onClick={routeBack}
            className='iconBtn'
            aria-label="back"
            size='large'
          >
            <ArrowBackIcon fontSize="large" />
          </IconButton>
          <h1>{state.name}</h1>
        </div>
        <div className='pageBody'>
          <div className='board'>
            {state.door ? (
              <div
                className='door'
                style={doorStyle}
              />
            ) : null}
            <div className='canvas'>
              <Stage
                width={state.gridSize * state.cols}
                height={state.gridSize * state.rows}
              >
                {/* 棋盘 */}
                <Layer>
                  {board.map((row, rowIndex) => (
                    row.map((grid, colIndex) => (
                      <Rect
                        key={`${rowIndex}-${colIndex}`}
                        x={colIndex * state.gridSize}
                        y={rowIndex * state.gridSize}
                        width={state.gridSize}
                        height={state.gridSize}
                        fill='#333'
                        stroke='#000'
                        strokeWidth={3}
                        cornerRadius={state.gridSize / 10}
                      />
                    ))
                  ))}
                </Layer>
                {/* 砖块 */}
                <Layer>
                  {state.pieceList.map((piece, pieceIndex) => (
                    <PieceItem
                      key={pieceIndex}
                      piece={piece}
                      color={pieceIndex === state.kingPieceIndex ? '#fffb00' : '#0ed07e'}
                      gridSize={state.gridSize}
                      draggable={state.piecesNextPostions[pieceIndex]?.length > 0}
                      onDragStart={handleDragStart}
                      dragBoundFunc={piecesDragBoundFuncs[pieceIndex]}
                      onDragEnd={(e) => handleDragEnd(e, pieceIndex)}
                      showIndex
                      pieceIndex={pieceIndex}
                    />
                  ))}
                </Layer>
              </Stage>
            </div>
          </div>
          <div className='stepActions'>
            <MyButton onClick={restart}>{t("GamePlayer.restart")}</MyButton>
            <span className='stepIndex'>{state.stepIndex}步</span>
            <MyButton onClick={undo} disabled={state.stepIndex === 0}>{t("GamePlayer.undo")}</MyButton>
            <MyButton onClick={redo} disabled={state.undoSolution.length === 0}>{t("GamePlayer.redo")}</MyButton>
          </div>
        </div>
      </div>
    </div>
  )
}