import { KonvaEventObject } from "konva/lib/Node";
import produce from "immer";
import { MyAlert, MyAlertRef } from "../components/MyAlert";
import { IconButton } from "@mui/material";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useCreation, useMemoizedFn, useSetState, useUpdateEffect } from "ahooks";
import { useNavigate } from "react-router-dom";
import { Layer, Rect, Stage } from 'react-konva';
import { PieceItem } from '@/src/components/PieceItem';
import GameUtils from "@/src/utils/game";
import { useEffect, useMemo, useRef } from "react";
import { currentGame } from "@/src/stores/currentGame";
import { useTranslation } from "react-i18next";
import './GamePlayer.less'



type Direction = [number, number];

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
  })

  const alertRef = useRef<MyAlertRef>({} as MyAlertRef)

  const startCoord = useCreation<{
    x: number;
    y: number;
  }>(() => ({
    x: 0,
    y: 0
  }), []);

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

  const handleMouseDown = useMemoizedFn((e: KonvaEventObject<MouseEvent>) => {
    startCoord.x = e.evt.layerX
    startCoord.y = e.evt.layerY
  })

  const handleMouseUp = useMemoizedFn((e: KonvaEventObject<MouseEvent>) => {
    // 根据开始位置计算棋子索引
    const rowIndex = Math.floor((startCoord.y - 2) / state.gridSize)
    const colIndex = Math.floor((startCoord.x - 2) / state.gridSize)
    const pieceIndex = state.pieceList.findIndex(piece => piece.inBoard[rowIndex][colIndex])
    if (pieceIndex === -1) {
      return
    }

    // 根据鼠标按下与抬起的坐标变化计算方向
    const xDiff = e.evt.layerX - startCoord.x
    const yDiff = e.evt.layerY - startCoord.y
    let direction: Direction;
    if (Math.abs(xDiff) > Math.abs(yDiff)) {
      direction = xDiff > 0 ? [0, 1] : [0, -1]
    } else {
      direction = yDiff > 0 ? [1, 0] : [-1, 0]
    }

    // 计算当前步骤的棋盘状态
    const board = Array(state.rows).fill(0).map(() => Array(state.cols).fill(false))
    const piece = state.pieceList[pieceIndex]

    // 把当前棋子移动后的位置放到棋盘上，如果超界则不移动
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c]) {
          const newRowIndex = r + piece.position[0] + direction[0]
          const newColIndex = c + piece.position[1] + direction[1]
          if (newRowIndex < 0 || newRowIndex >= state.rows || newColIndex < 0 || newColIndex >= state.cols) {
            console.log('out of range')
            return
          }
          board[newRowIndex][newColIndex] = true
        }
      }
    }

    // 把其他棋子放上去，如果有棋子被挡住，则不能移动
    for (let pieceI = 0; pieceI < state.pieceList.length; pieceI++) {
      if (pieceI === pieceIndex) {
        continue
      }
      const piece = state.pieceList[pieceI]
      for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
          if (piece.shape[r][c] && board[r + piece.position[0]][c + piece.position[1]]) {
            console.log('fill error')
            return
          }
        }
      }
    }

    setState(produce(draft => {
      draft.solution.push({
        pieceIndex,
        direction,
      })
      draft.stepIndex++
      draft.pieceList[pieceIndex] = GameUtils.pieceCalcInBoard({
        shape: piece.shape,
        position: [piece.position[0] + direction[0], piece.position[1] + direction[1]],
        inBoard: [],
      }, state.rows, state.cols)
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
                width={state.gridSize * state.cols + 4}
                height={state.gridSize * state.rows + 4}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
              >
                {/* 背景 */}
                <Layer>
                  <Rect
                    width={state.gridSize * state.cols + 4}
                    height={state.gridSize * state.rows + 4}
                    fill='#000'
                    cornerRadius={state.gridSize / 8}
                  />
                </Layer>
                {/* 棋盘 */}
                <Layer x={2} y={2}>
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
                <Layer x={2} y={2}>
                  {state.pieceList.map((piece, pieceIndex) => (
                    <PieceItem
                      key={pieceIndex}
                      piece={piece}
                      color={pieceIndex === state.kingPieceIndex ? '#fffb00' : '#0ed07e'}
                      gridSize={state.gridSize}
                    />
                  ))}
                </Layer>
              </Stage>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}