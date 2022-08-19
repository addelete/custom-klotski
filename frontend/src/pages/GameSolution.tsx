import { IconButton } from "@mui/material";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useMemoizedFn, useSetState } from "ahooks";
import { useNavigate } from "react-router-dom";
import { Layer, Rect, Stage } from 'react-konva';
import { PieceItem } from '@/src/components/PieceItem';
import GameUtils from "@/src/utils/game";
import { useEffect, useMemo } from "react";
import { MyButton } from "@/src/components/MyButton";
import { currentGame } from "@/src/stores/currentGame";
import produce from "immer";
import { useTranslation } from "react-i18next";
import './GameSolution.less'


export default function GameSolutionPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [state, setState] = useSetState<{
    stepIndex: number;
    pieceList: Piece[];
    solution: Solution;
    rows: number;
    cols: number;
    kingPieceIndex: number;
    door: Door;
    gridSize: number;
  }>({
    stepIndex: 0,
    pieceList: (currentGame.gameData as GameData).pieceList,
    solution: (currentGame.gameData as GameData).solution as Solution,
    rows: (currentGame.gameData as GameData).boardRows,
    cols: (currentGame.gameData as GameData).boardCols,
    kingPieceIndex: (currentGame.gameData as GameData).kingPieceIndex,
    door: (currentGame.gameData as GameData).door,
    gridSize: 0,
  })

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

  const routeBack = useMemoizedFn(() => {
    navigate(-1)
  })


  const prevStep = useMemoizedFn(() => {
    if (state.stepIndex > 0) {
      const stepIndex = state.stepIndex - 1
      const step = state.solution[stepIndex]
      const piece = state.pieceList[step.pieceIndex]
      setState(produce(draft => {
        draft.stepIndex = stepIndex
        draft.pieceList[step.pieceIndex] = GameUtils.pieceCalcInBoard({
          shape: piece.shape,
          position: [piece.position[0] - step.direction[0], piece.position[1] - step.direction[1]],
          inBoard: [],
        }, state.rows, state.cols)
      }))
    }
  })

  const nextStep = useMemoizedFn(() => {
    if (state.stepIndex < state.solution.length) {
      const stepIndex = state.stepIndex + 1
      const step = state.solution[stepIndex - 1]
      const piece = state.pieceList[step.pieceIndex]
      setState(produce(draft => {
        draft.stepIndex = stepIndex
        draft.pieceList[step.pieceIndex] = GameUtils.pieceCalcInBoard({
          shape: piece.shape,
          position: [piece.position[0] + step.direction[0], piece.position[1] + step.direction[1]],
          inBoard: [],
        }, state.rows, state.cols)
      }))
    }
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

  return (
    <div className="GameSolutionPage">
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
          <h1>{t("GameSolution.solution")}</h1>
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
                    />
                  ))}
                </Layer>
              </Stage>
            </div>
          </div>
          <div className='stepActions'>
            <MyButton onClick={prevStep}>{t("GameSolution.prevStep")}</MyButton>
            <span className='stepIndex'>{state.stepIndex}/{state.solution.length}</span>
            <MyButton onClick={nextStep}>{t("GameSolution.nextStep")}</MyButton>
          </div>
        </div>
      </div>
    </div>
  )
}