import React, { useEffect, useMemo, useRef } from 'react';
import { useMemoizedFn, useSetState, useUpdateEffect } from 'ahooks';
import produce from 'immer';
import { Layer, Path, Rect, Stage } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import GameUtils from '@/src/utils/game';
import GameService from '@/src/services/game';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { MyAlert, MyAlertRef } from '@/src/components/MyAlert';
import { MyConfirm, MyConfirmRef } from '@/src/components/MyConfirm';
import { GameInfoDialog, GameInfoDialogRef } from '@/src/components/GameInfoDialog';
import { MyButton } from '@/src/components/MyButton';
import { PieceItem } from '@/src/components/PieceItem';
import { currentGame } from '@/src/stores/currentGame';
import './GameDesigner.less'


interface ContextMenuData {
    x: number;
    y: number;
    pieceIndex: number;
}

function GameDesignerPage() {
    const navigate = useNavigate();

    const { t } = useTranslation();

    const [state, setState] = useSetState<{
        cols: number;
        rows: number;
        gridSize: number;
        pieceList: Piece[];
        editingPieceIndex: number;
        editingPieceDashOffset: number;
        kingPieceIndex: number;
        mouseOverPos?: Pos;
        mouseOverPosWillAction?: 'create' | 'extend' | 'cut';
        contextMenuData?: ContextMenuData,
        door?: Door;
        solveLoading: boolean;
    }>({
        cols: 4,
        rows: 5,
        gridSize: 0,
        pieceList: [],
        editingPieceIndex: -1,
        editingPieceDashOffset: 0,
        kingPieceIndex: -1,
        mouseOverPos: undefined,
        mouseOverPosWillAction: undefined,
        contextMenuData: undefined,
        door: undefined,
        solveLoading: false,
    })

    const alertRef = useRef<MyAlertRef>({} as MyAlertRef)
    const confirmRef = useRef<MyConfirmRef>({} as MyConfirmRef)
    const createGameDialogRef = useRef<GameInfoDialogRef>({} as GameInfoDialogRef)

    const doorRef = useRef<Door>({
        placement: 'bottom',
        startIndex: -1,
        xSize: 0,
        ySize: 0,
    })

    const mouseOverPosStrRef = useRef<number[]>([-1, -1])


    // 从路由中获取布局和游戏数据
    useEffect(() => {
        if (currentGame.gameData) {
            console.log('GameDesignerPage useEffect', currentGame.gameData)
            setState({
                pieceList: currentGame.gameData.pieceList,
                rows: currentGame.gameData.boardRows,
                cols: currentGame.gameData.boardCols,
                door: currentGame.gameData.door,
                kingPieceIndex: currentGame.gameData.kingPieceIndex,
            })
            doorRef.current = { ...currentGame.gameData.door }
        }
    }, [])


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
        if (state.editingPieceIndex > -1) {
            let start = 0;
            const timer = setInterval(() => {
                start += 2
                if (start >= 100) {
                    start = 0
                }
                setState({
                    editingPieceDashOffset: start
                })
            }, 100)
            return () => {
                clearInterval(timer)
            }
        }

    }, [state.editingPieceIndex])

    /**
     * 根据王棋和doorRef计算出door
     */
    useEffect(() => {
        const kingPiece = state.pieceList[state.kingPieceIndex];
        if (!kingPiece) {
            setState({ door: undefined })
            return
        }
        const placement = doorRef.current.placement
        const isSide = ['left', 'right'].includes(placement)
        const maxGrids = isSide ? state.rows : state.cols
        const ySize = kingPiece.shape.length
        const xSize = kingPiece.shape[0].length
        const pieceGrids = isSide ? ySize : xSize
        if (doorRef.current.startIndex < 0) {
            const startIndex = Math.floor((maxGrids - pieceGrids) / 2)
            setState({
                door: {
                    placement,
                    startIndex,
                    xSize,
                    ySize,
                }
            })
            doorRef.current.startIndex = startIndex;
        } else {
            const startIndex = doorRef.current.startIndex
            if (startIndex + pieceGrids > maxGrids - 1) {
                const startIndex = maxGrids - pieceGrids
                setState({
                    door: {
                        placement,
                        startIndex,
                        xSize,
                        ySize,
                    }
                })
                doorRef.current.startIndex = startIndex;
            } else {
                setState({
                    door: {
                        placement,
                        startIndex,
                        xSize,
                        ySize,
                    }
                })
                doorRef.current.startIndex = startIndex;
            }
        }
    }, [state.pieceList[state.kingPieceIndex], state.rows, state.cols])


    useUpdateEffect(() => {
        const timer = setTimeout(() => {
            const pieceList = state.pieceList.map(piece => GameUtils.pieceCalcInBoard({ ...piece }, state.rows, state.cols))
                .filter(piece => piece) as Piece[]
            setState({
                pieceList
            })
        }, 100)
        return () => {
            timer && clearTimeout(timer)
        }
    }, [state.rows, state.cols])


    const setMouseOverPos = (pos: Pos | undefined) => {
        const [rows = -1, cols = -1] = pos || []
        if (mouseOverPosStrRef.current[0] !== rows || mouseOverPosStrRef.current[1] !== cols) {
            mouseOverPosStrRef.current = [rows, cols]
            setState({
                mouseOverPos: pos
            })
        }
    }


    const handleMouseMoveBoard = useMemoizedFn((e: KonvaEventObject<MouseEvent>) => {
        const rowIndex = Math.floor((e.evt.layerY - 2) / state.gridSize);
        const colIndex = Math.floor((e.evt.layerX - 2) / state.gridSize);
        if (board[rowIndex]?.[colIndex] === undefined) {
            setMouseOverPos(undefined)
            return
        }
        setMouseOverPos([rowIndex, colIndex])

        const editingPiece = state.pieceList[state.editingPieceIndex]

        // 如果此时按着alt键，判断是否在被编辑的砖块上，如果在，下一步动作为在此砖块上消去此格，需判断此格是否可以消去
        if (e.evt.altKey) {
            if (
                !editingPiece ||
                !editingPiece.inBoard[rowIndex][colIndex]
            ) { // 如果没有被编辑的砖块或如果此格不在被编辑的砖块上，则不做任何操作
                setState({
                    mouseOverPosWillAction: undefined
                })
                return
            }
            const inBoardClone = GameUtils.cloneShape(editingPiece.inBoard)
            inBoardClone[rowIndex][colIndex] = false
            GameUtils.fillPieceHoles(inBoardClone)
            if (inBoardClone[rowIndex][colIndex]) { // 删掉的格子又被自动填上了，说明不能删
                setState({
                    mouseOverPosWillAction: undefined
                })
                return
            }

            const firstPos = [
                [rowIndex + 1, colIndex],
                [rowIndex - 1, colIndex],
                [rowIndex, colIndex + 1],
                [rowIndex, colIndex - 1],
            ].find(item => inBoardClone[item[0]]?.[item[1]])

            const fillPosStrMap: { [key: string]: boolean } = {}
            const fillPosList: Array<Pos | undefined> = [firstPos]
            while (fillPosList.length > 0) {
                const fillPos = fillPosList.shift()
                if (!fillPos) {
                    break
                }
                const fillPosStr = `${fillPos[0]},${fillPos[1]}`
                if (!fillPosStrMap[fillPosStr]) {
                    fillPosStrMap[fillPosStr] = true
                }
                const fillPosListNext = [
                    [fillPos[0] + 1, fillPos[1]],
                    [fillPos[0] - 1, fillPos[1]],
                    [fillPos[0], fillPos[1] + 1],
                    [fillPos[0], fillPos[1] - 1],
                ].filter(item => !fillPosStrMap[`${item[0]},${item[1]}`] && inBoardClone[item[0]]?.[item[1]])

                fillPosList.push(...fillPosListNext)
            }
            const realFillPosLength = inBoardClone.reduce((before, row) => before + (row.filter(grid => grid)).length, 0)
            if (Object.keys(fillPosStrMap).length === realFillPosLength) {
                setState({
                    mouseOverPosWillAction: 'cut'
                })
                return
            } else {
                setState({
                    mouseOverPosWillAction: undefined
                })
                return
            }
        }


        if (
            !board[rowIndex][colIndex] &&
            editingPiece && (
                editingPiece.inBoard[rowIndex + 1]?.[colIndex] ||
                editingPiece.inBoard[rowIndex - 1]?.[colIndex] ||
                editingPiece.inBoard[rowIndex]?.[colIndex + 1] ||
                editingPiece.inBoard[rowIndex]?.[colIndex - 1]
            )
        ) { // 如果这个格子能和编辑中的砖块连上，则下一步动作为在此格上扩展此砖块
            // 判断封闭之后是不是会导致包裹其他砖块
            const editingPieceInBoardClone = GameUtils.cloneShape(editingPiece.inBoard)
            editingPieceInBoardClone[rowIndex][colIndex] = true
            GameUtils.fillPieceHoles(editingPieceInBoardClone)
            const pieceListInBoard = GameUtils.pieceListInBoard(state.pieceList, state.rows, state.cols)
            let couldExtend = true
            for (let ri = 0; ri < editingPieceInBoardClone.length; ri++) {
                for (let ci = 0; ci < editingPieceInBoardClone[ri].length; ci++) {
                    if (editingPieceInBoardClone[ri][ci]) {
                        const pieceIndexInBoard = pieceListInBoard[ri + editingPiece.position[0]][ci + editingPiece.position[1]]
                        if (pieceIndexInBoard > -1 && pieceIndexInBoard !== state.editingPieceIndex) {
                            couldExtend = false
                            break
                        }
                    }
                }
                if (couldExtend === false) {
                    break
                }
            }
            if (couldExtend) {
                setState({
                    mouseOverPosWillAction: 'extend'
                })
                return;
            }

        }


        if (board[rowIndex][colIndex] === false) { // 如果此格在棋盘上空着，则下一步动作为在此格上创建此砖块
            setState({
                mouseOverPosWillAction: 'create'
            })
            return;
        }

        setState({
            mouseOverPosWillAction: undefined
        })
    })

    const handleMouseLeaveBoard = useMemoizedFn(() => {
        setMouseOverPos(undefined)
        setState({
            mouseOverPosWillAction: undefined
        })
    })

    const handleMouseDownBoard = useMemoizedFn((e: KonvaEventObject<MouseEvent>) => {
        if (state.contextMenuData) {
            setState({
                contextMenuData: undefined
            })
        }
        if (e.evt.button !== 0) {
            return
        }
        if (!state.mouseOverPos) {
            return
        }
        if (state.mouseOverPosWillAction === 'extend') {
            extendEditingPiece()
            return
        }
        if (state.mouseOverPosWillAction === 'create') {
            createPiece()
            return
        }
        if (state.mouseOverPosWillAction === 'cut' && e.evt.altKey) {
            cutEditingPiece()
            return
        }

        const [mRows, mCols] = state.mouseOverPos as Pos
        const pieceIndex = state.pieceList.findIndex(piece => {
            return piece.inBoard[mRows]?.[mCols]
        })
        if (pieceIndex > -1) {
            setState({
                editingPieceIndex: pieceIndex
            })
            return
        }
    })

    const handleContextMenuBoard = useMemoizedFn((e: KonvaEventObject<MouseEvent>) => {
        e.evt.preventDefault()
        const rowIndex = Math.floor((e.evt.layerY - 2) / state.gridSize);
        const colIndex = Math.floor((e.evt.layerX - 2) / state.gridSize);
        const pieceIndex = state.pieceList.findIndex(piece => piece.inBoard[rowIndex]?.[colIndex])
        if (pieceIndex > -1) {
            setState({
                contextMenuData: {
                    x: e.evt.clientX,
                    y: e.evt.clientY,
                    pieceIndex,
                }
            })
        } else {
            setState({
                contextMenuData: undefined
            })
        }

    })


    /**
     * 扩展棋子
     */
    const extendEditingPiece = useMemoizedFn(() => {
        const editingPiece = state.pieceList[state.editingPieceIndex];
        if (!editingPiece || !state.mouseOverPos || state.mouseOverPosWillAction !== 'extend') {
            return
        }
        const newInBoard = GameUtils.cloneShape(editingPiece.inBoard);
        const [mRows, mCols] = state.mouseOverPos as Pos;
        newInBoard[mRows][mCols] = true
        GameUtils.fillPieceHoles(newInBoard)
        const newPiece = GameUtils.pieceFromInBoard(newInBoard) as Piece
        setState(produce(draft => {
            draft.pieceList[state.editingPieceIndex] = newPiece
            draft.mouseOverPosWillAction = undefined
        }))
    })

    /**
     * 裁剪棋子
     */
    const cutEditingPiece = useMemoizedFn(() => {
        const editingPiece = state.pieceList[state.editingPieceIndex];
        if (!editingPiece || !state.mouseOverPos || state.mouseOverPosWillAction !== 'cut') {
            return
        }
        const newInBoard = GameUtils.cloneShape(editingPiece.inBoard);
        const [mRows, mCols] = state.mouseOverPos as Pos;
        newInBoard[mRows][mCols] = false
        const newPiece = GameUtils.pieceFromInBoard(newInBoard)
        if (!newPiece) {
            const kingPiecePos = state.pieceList[state.kingPieceIndex]?.position
            setState(produce(draft => {
                draft.pieceList.splice(state.editingPieceIndex, 1)
                if (kingPiecePos) {
                    const newKingPieceIndex = state.pieceList.findIndex(piece => piece.inBoard[kingPiecePos[0]]?.[kingPiecePos[1]])
                    draft.kingPieceIndex = newKingPieceIndex
                }
            }))

        } else {
            setState(produce(draft => {
                draft.pieceList[state.editingPieceIndex] = newPiece
            }))
        }
        setState({
            mouseOverPosWillAction: undefined,
        })
    })

    /**
     * 创建棋子
     */
    const createPiece = useMemoizedFn(() => {
        if (!state.mouseOverPos || state.mouseOverPosWillAction !== 'create') {
            return
        }

        const shape = [[true]]
        const position = state.mouseOverPos as Pos
        const piece = GameUtils.pieceCalcInBoard({
            shape,
            position,
            inBoard: []
        }, state.rows, state.cols) as Piece
        setState({
            pieceList: [...state.pieceList, piece],
            editingPieceIndex: state.pieceList.length,
            mouseOverPosWillAction: undefined
        })
    })

    /**
     * 删除棋子
     */
    const deletePiece = useMemoizedFn((pieceIndex: number) => {
        setState(produce(draft => {
            draft.pieceList.splice(pieceIndex, 1)
            draft.kingPieceIndex = state.kingPieceIndex === pieceIndex ? -1 : (state.kingPieceIndex > pieceIndex ? state.kingPieceIndex - 1 : state.kingPieceIndex)
        }))
    })


    const toggleSelectPiece = useMemoizedFn((pieceIndex: number) => {
        if (state.editingPieceIndex === pieceIndex) {
            setState({
                editingPieceIndex: -1
            })
            return
        }
        setState({
            editingPieceIndex: pieceIndex
        })
    })

    const setKingPiece = useMemoizedFn((pieceIndex: number) => {
        setState({
            kingPieceIndex: pieceIndex
        })
    })

    const handleClickOutBoard = useMemoizedFn(() => {
        setState({
            editingPieceIndex: -1,
            contextMenuData: undefined,
        })
    })


    const handleMouseDownBoardBg = useMemoizedFn((e: React.MouseEvent) => {
        e.stopPropagation()
        if (!state.door) {
            return
        }
        const { clientX, clientY } = e;
        const { top, left, width, height } = e.currentTarget.getBoundingClientRect()
        const x = clientX - left
        const y = clientY - top
        if (x >= 16 && x <= width - 16 && y >= 16 && y <= height - 16) {
            return
        }
        let placement: Door['placement'];
        let startIndex: number;
        if (x > 16 && x < width - 16 && y > 0 && y < 16) {
            placement = 'top'
            startIndex = Math.floor((x - 18) / state.gridSize)
            if (startIndex + state.door.xSize > state.cols) {
                startIndex = state.cols - state.door.xSize
            }
        } else if (x > width - 16 && x < width && y > 16 && y < height) {
            placement = 'right'
            startIndex = Math.floor((y - 18) / state.gridSize)
            if (startIndex + state.door.ySize > state.rows) {
                startIndex = state.rows - state.door.ySize
            }
        } else if (x > 16 && x < width - 16 && y > height - 16 && y < height) {
            placement = 'bottom'
            startIndex = Math.floor((x - 18) / state.gridSize)
            if (startIndex + state.door.xSize > state.cols) {
                startIndex = state.cols - state.door.xSize
            }
        } else {
            placement = 'left'
            startIndex = Math.floor((y - 18) / state.gridSize)
            if (startIndex + state.door.ySize > state.rows) {
                startIndex = state.rows - state.door.ySize
            }
        }
        setState({
            door: {
                ...state.door,
                placement,
                startIndex,
            }
        })
        doorRef.current.placement = placement
        doorRef.current.startIndex = startIndex
    })

    const makeGameData = useMemoizedFn(() => {
        if (state.pieceList.length === 0) {
            alertRef.current.open({
                message: t("GameDesigner.noPiece"),
                type: 'warning',
            })
            throw new Error('No Piece')
        }
        const kingPiece = state.pieceList[state.kingPieceIndex];
        if (!kingPiece) {
            alertRef.current.open({
                message: t("GameDesigner.noKingPiece"),
                type: 'warning',
                duration: 5000,
            })
            throw new Error('No King Piece')
        }
        const gameData = GameUtils.makeGameData(state.rows, state.cols, state.pieceList, state.kingPieceIndex, state.door as Door);
        currentGame.gameData = gameData;
        currentGame.game = {
            ...currentGame.game,
            gameShape: GameUtils.gameData2GameShape(gameData),
            md5: GameUtils.gameData2Md5(gameData),
        }
        return gameData;
    })

    /**
     * 求解布局
     */
    const solve = async () => {
        const gameData = makeGameData()
        setState({ solveLoading: true })
        const res = await GameService.solve(gameData)
        setState({
            solveLoading: false,
        })
        if (!res.success && res.errMessage) {
            alertRef.current.open({
                message: t(`GameDesigner.${res.errMessage}`),
                type: 'warning'
            })
            return
        }
        currentGame.gameData = {
            ...gameData,
            solution: res.solution,
        };
        navigate('/GameSolution')
    }

    /**
     * 跳转到试玩页面
     */
    const routerToGameRunner = () => {
        makeGameData()
        navigate('/GamePlayer')
    }


    /**
     * 布局情况
     */
    const board = useMemo(() => {
        const baseBoard = Array(state.rows).fill(0).map(() => Array(state.cols).fill(false))
        for (let i = 0; i < state.pieceList.length; i++) {
            for (let r = 0; r < state.pieceList[i].inBoard.length; r++) {
                for (let c = 0; c < state.pieceList[i].inBoard[r].length; c++) {
                    if (state.pieceList[i].inBoard[r][c]) {
                        baseBoard[r][c] = true
                    }
                }
            }
        }
        return baseBoard;
    }, [state.rows, state.cols, state.pieceList])


    /**
     * 门的样式
     */
    const doorStyle = useMemo(() => {
        return GameUtils.door2Style(state.door, state.gridSize)
    }, [state.door, state.gridSize])


    const editingPiecePath = useMemo(() => {
        const piece = state.pieceList[state.editingPieceIndex]
        if (!piece) {
            return undefined
        }
        let cloneInBoard = GameUtils.cloneShape(piece.inBoard)
        if (state.mouseOverPos && state.mouseOverPosWillAction === 'extend') {
            cloneInBoard[state.mouseOverPos[0]][state.mouseOverPos[1]] = true
        }
        if (state.mouseOverPos && state.mouseOverPosWillAction === 'cut') {
            cloneInBoard[state.mouseOverPos[0]][state.mouseOverPos[1]] = false
        }
        const isEmpty = cloneInBoard.findIndex(row => row.findIndex(grid => grid) !== -1) == -1
        if (isEmpty) {
            return undefined
        }
        return GameUtils.shape2Path(
            cloneInBoard,
            state.gridSize,
            state.gridSize / 10,
        )

    }, [state.gridSize, state.pieceList, state.editingPieceIndex, state.mouseOverPos, state.mouseOverPosWillAction])

    const changeRowsOrCols = useMemoizedFn((rowsOrCols: 'rows' | 'cols', value: string) => {
        let newValue = parseInt(value.length > 0 ? value[value.length - 1] : '2')
        if (isNaN(newValue)) {
            return
        }
        newValue = Math.min(Math.max(newValue, 2), 9)

        setState(produce(draft => {
            draft[rowsOrCols] = newValue
        }))
    })

    const routeBack = useMemoizedFn(() => {
        navigate(-1)
    })

    const save = useMemoizedFn(async () => {
        makeGameData()
        const game = currentGame.game
        if (!game.id) {
            createGameDialogRef.current.open({
                onChange: async ({
                    name,
                    tags,
                }) => {
                    const res = await GameService.save({
                        ...game,
                        name,
                        tags,
                    })
                    if (!res.success && res.errMessage) {
                        alertRef.current.open({
                            message: t(`GameDesigner.${res.errMessage}`, { name: res.game.name }),
                            type: 'error',
                            duration: 5000,
                        })
                        return
                    }
                    alertRef.current.open({
                        message: t("GameDesigner.createGameSuccess"),
                        type: 'success',
                    })
                }
            })
            return
        } else {
            const res = await GameService.save(game)
            if (!res.success && res.errMessage) {
                alertRef.current.open({
                    message: t(`GameDesigner.${res.errMessage}`),
                    type: 'error',
                })
                return
            }
            if (res.success) {
                alertRef.current.open({
                    message: t("GameDesigner.saveGameSuccess"),
                    type: 'success',
                })
            }
        }
    })

    const hideContentMenu = useMemoizedFn(() => {
        setState({
            contextMenuData: undefined
        })
    })

    const stopPropagation = useMemoizedFn((e: React.MouseEvent) => {
        e.stopPropagation()
    })

    return (
        <div className="GameDesignerPage" onMouseDown={handleClickOutBoard}>
            <MyAlert ref={alertRef} />
            <MyConfirm ref={confirmRef} />
            <GameInfoDialog ref={createGameDialogRef} />
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
                    <h1>{t("GameDesigner.designGame")}</h1>
                </div>
                <div className='pageBody'>
                    <div className='form'>
                        <div className='inputGroup'>
                            <input value={state.rows} onChange={e => changeRowsOrCols('rows', e.target.value)} />
                            <span>{t("GameDesigner.rows")}</span>
                            <input value={state.cols} onChange={e => changeRowsOrCols('cols', e.target.value)} />
                            <span>{t("GameDesigner.cols")}</span>
                        </div>
                        <MyButton
                            className='btn'
                            variant="contained"
                            onClick={solve}
                            loading={state.solveLoading}
                        >
                            {t("GameDesigner.solve")}
                        </MyButton>
                        <MyButton
                            className='btn'
                            variant="contained"
                            onClick={routerToGameRunner}
                        >
                            {t("GameDesigner.play")}
                        </MyButton>
                        <MyButton
                            className='btn'
                            variant="contained"
                            onClick={save}
                        >
                            {t("GameDesigner.save")}
                        </MyButton>
                    </div>
                    <div
                        className='board'
                        onMouseDown={handleMouseDownBoardBg}
                    >
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
                                onMouseDown={handleMouseDownBoard}
                                onMouseMove={handleMouseMoveBoard}
                                onMouseLeave={handleMouseLeaveBoard}
                                onContextMenu={handleContextMenuBoard}
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
                                {/* 操作高亮 */}
                                <Layer x={2} y={2}>
                                    {state.mouseOverPos && state.mouseOverPosWillAction === 'create' ? (
                                        <Rect
                                            x={state.mouseOverPos[1] * state.gridSize}
                                            y={state.mouseOverPos[0] * state.gridSize}
                                            width={state.gridSize}
                                            height={state.gridSize}
                                            fill={'#0ed07e'}
                                            stroke='#000'
                                            cornerRadius={state.gridSize / 10}
                                        />
                                    ) : null}
                                </Layer>
                                <Layer x={2} y={2}>
                                    {editingPiecePath ? (
                                        <>
                                            <Path
                                                y={0}
                                                x={0}
                                                strokeWidth={3}
                                                stroke='#ffffff'
                                                data={editingPiecePath}
                                                dash={[10, 10]}
                                                dashOffset={state.editingPieceDashOffset}
                                            />
                                            <Path
                                                y={0}
                                                x={0}
                                                strokeWidth={3}
                                                stroke='#000'
                                                data={editingPiecePath}
                                                dash={[10, 10]}
                                                dashOffset={state.editingPieceDashOffset + 10}
                                            />
                                        </>

                                    ) : null}

                                </Layer>
                            </Stage>

                        </div>

                        {state.contextMenuData ? (
                            <div
                                className='contextMenu'
                                style={{
                                    left: state.contextMenuData.x,
                                    top: state.contextMenuData.y,
                                }}
                                onClick={hideContentMenu}
                                onMouseDown={stopPropagation}
                            >
                                <div className='menuItem'
                                    onClick={() => setKingPiece((state.contextMenuData as ContextMenuData).pieceIndex)}>{t("GameDesigner.setAsKing")}</div>
                                <div className='menuItem'
                                    onClick={() => toggleSelectPiece((state.contextMenuData as ContextMenuData).pieceIndex)}>
                                    {t("GameDesigner.toggleEditing")}
                                </div>
                                <div className='menuItem'
                                    onClick={() => deletePiece((state.contextMenuData as ContextMenuData).pieceIndex)}>{t("GameDesigner.remove")}</div>
                            </div>
                        ) : null}
                    </div>

                    <div className='tips'>
                        <div className='line'>{t("GameDesigner.tips1")}</div>
                        <div className='line' dangerouslySetInnerHTML={{
                            __html: t("GameDesigner.tips2")
                        }} />
                        <div className='line'>{t("GameDesigner.tips3")}</div>
                        <div className='line'>{t("GameDesigner.tips4")}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GameDesignerPage;