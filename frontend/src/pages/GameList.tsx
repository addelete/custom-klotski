import { useEffect, useRef } from 'react';
import { useLockFn, useMemoizedFn, useSetState } from 'ahooks';
import { IconButton, Pagination, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AppRegistrationIcon from '@mui/icons-material/AppRegistration';
import EditIcon from '@mui/icons-material/Edit';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import SortIcon from '@mui/icons-material/Sort';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined';
import InputIcon from '@mui/icons-material/Input';
import IosShareIcon from '@mui/icons-material/IosShare';
import { MyButton } from '@/src/components/MyButton';
import { Tag } from '@/src/components/Tag';
import GameService from '@/src/services/game';
import GameUtils from '@/src/utils/game';
import { GameInfoDialog, GameInfoDialogRef } from '@/src/components/GameInfoDialog';
import { MyConfirm, MyConfirmRef } from '@/src/components/MyConfirm';
import { MyAlert, MyAlertRef } from '@/src/components/MyAlert';
import produce from 'immer';
import { currentGame } from '@/src/stores/currentGame';
import { useTranslation } from 'react-i18next';
import './GameList.less'

type GameItem = {
  gameData: GameData;
  game: Game;
  cover: string;
}

const pageSize = 4;

function GameListPage() {

  const navigate = useNavigate();
  const { t } = useTranslation()

  const [state, setState] = useSetState<{
    list: GameItem[];
    total: number;
    page: number;
    nameFilter: string;
    tagsFilter: number[],
    isFilter: boolean,
    orderAsc: boolean,
  }>({
    list: [],
    total: 0,
    page: 1,
    nameFilter: '',
    tagsFilter: [],
    isFilter: false,
    orderAsc: false,
  })

  const gameInfoDialogRef = useRef<GameInfoDialogRef>({} as GameInfoDialogRef)
  const myConfirmRef = useRef<MyConfirmRef>({} as MyConfirmRef)
  const myAlertRef = useRef<MyAlertRef>({} as MyAlertRef)

  useEffect(() => {
    loadGameList()
  }, [
    state.page,
    state.nameFilter,
    state.tagsFilter,
    state.orderAsc
  ])

  const loadGameList = useLockFn(async (page = 0) => {
    const data = await GameService.list({
      page: page > 0 ? page : state.page,
      orderAsc: state.orderAsc,
      nameFilter: state.nameFilter,
      tagsFilter: state.tagsFilter,
    })
    setState({
      total: data.total,
      list: (data.games || []).map(game => {
        const gameData = GameUtils.gameShape2GameData(game.gameShape)
        const cover = GameUtils.gameData2Cover(gameData)
        return {
          gameData,
          game,
          cover,
        }
      })
    })
  })

  const routeToGameDesigner = useMemoizedFn(() => {
    currentGame.gameData = undefined
    currentGame.game = {}
    navigate('/GameDesigner')
  })

  const editGame = useMemoizedFn((gameItem: GameItem) => {
    currentGame.game = gameItem.game
    currentGame.gameData = gameItem.gameData
    navigate('/GameDesigner')
  })

  const editGameInfo = useMemoizedFn((game: Game) => {
    gameInfoDialogRef.current.open({
      value: game,
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
          myAlertRef.current.open({
            message: t(`GameList.${res.errMessage}`),
            type: 'error',
          })
          return
        }
        if (res.success) {
          const index = state.list.findIndex(item => item.game.id === game.id)
          setState(produce(draft => {
            draft.list[index].game = res.game
          }))
        }
      }
    })
  })

  const filterGame = useMemoizedFn(() => {
    if (state.isFilter) {
      setState({
        isFilter: false,
        nameFilter: '',
        tagsFilter: [],
      })
      return
    }

    gameInfoDialogRef.current.open({
      forFilter: true,
      onChange: ({
        name,
        tags,
      }) => {
        setState({
          nameFilter: name,
          tagsFilter: tags.map(tag => tag.id),
          isFilter: !!(name || tags.length > 0)
        })
      }
    })
  })


  const deleteGame = useMemoizedFn((id: number) => {
    myConfirmRef.current.open({
      title: t('GameList.deleteConfirmTitle'),
      message: t('GameList.deleteConfirmMessage'),
      onOk: async () => {
        const res = await GameService.delete({ id })
        if (!res.success && res.errMessage) {
          myAlertRef.current.open({
            message: t(`GameList.${res.errMessage}`),
            type: 'error',
          })
          return
        }
        if (res.success) {
          myAlertRef.current.open({ message: t("GameList.deleteSuccess"), type: 'success' })
          setState(produce(draft => {
            draft.list = state.list.filter(item => item.game.id !== id)
          }))
          loadGameList()
        }
      }
    })
  })

  const reload = useMemoizedFn(async () => {
    setState({ page: 1 })
    await loadGameList(1)
    myAlertRef.current.open({ message: t("GameList.refreshSuccess"), type: 'success' })
  })

  const toggleOrderAsc = useMemoizedFn(async () => {
    setState({
      orderAsc: !state.orderAsc
    })
  })

  const handlePageChange = useMemoizedFn((_, page) => {
    setState({
      page
    })
  })

  const playGame = useMemoizedFn((gameItem: GameItem) => {
    currentGame.game = gameItem.game
    currentGame.gameData = gameItem.gameData
    navigate('/GamePlayer')
  })


  const importGame = useMemoizedFn(async () => {
    const res = await GameService.impord()
    if (!res.success && res.errMessage) {
      myAlertRef.current.open({
        message: t(`GameList.${res.errMessage}`),
        type: 'error',
      })
      return
    }
    if (res.success) {
      myAlertRef.current.open({
        message: t("GameList.importSuccess", {
          count: res.count,
          repeatCount: res.repeatCount,
        }), type: 'success'
      })
      loadGameList()
    }
  })


  const exportGame = useMemoizedFn(async () => {
    const res = await GameService.expord({
      nameFilter: state.nameFilter,
      tagsFilter: state.tagsFilter,
    })
    if (!res.success && res.errMessage) {
      myAlertRef.current.open({
        message: t(`GameList.${res.errMessage}`),
        type: 'error',
      })
      return
    }
    if (res.success) {
      myAlertRef.current.open({ message: t("GameList.exportSuccess", { count: res.count }), type: 'success' })
    }
  })



  return (
    <div className="GameListPage">
      <GameInfoDialog ref={gameInfoDialogRef} />
      <MyConfirm ref={myConfirmRef} />
      <MyAlert ref={myAlertRef} />
      <div className='page'>
        <div className='pageHeader'>
          <h1>{t("GameList.gameList")}</h1>
        </div>
        <div className='pageBody'>
          <div className='toolsBar'>
            <MyButton onClick={routeToGameDesigner}>{t("GameList.createGame")}</MyButton>
            <div className='actions'>
              <Tooltip title={t("GameList.refresh")}>
                <IconButton className='btn' onClick={reload}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("GameList.sort")}>
                <IconButton className='btn' onClick={toggleOrderAsc}>
                  <SortIcon color={state.orderAsc ? 'primary' : 'inherit'} />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("GameList.filter")}>
                <IconButton className='btn' onClick={filterGame}>
                  <FilterAltIcon color={state.isFilter ? 'primary' : 'inherit'} />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("GameList.import")}>
                <IconButton className='btn' onClick={importGame}>
                  <InputIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("GameList.export")}>
                <IconButton className='btn' onClick={exportGame}>
                  <IosShareIcon />
                </IconButton>
              </Tooltip>
            </div>
          </div>
          <div className="gameList">
            {state.list.map(item => (
              <div key={item.game.id} className='gameItem'>
                <div className="cover" dangerouslySetInnerHTML={{
                  __html: item.cover
                }} />
                <div className='info'>
                  <div className="name">{item.game.name || t("GameList.unnamed")}</div>
                  <div className="tags">
                    {(item.game.tags || []).map(tag => (
                      <div key={tag.id} className="tag">
                        <Tag content={tag.name} />
                      </div>
                    ))}
                  </div>
                  <div className='actions'>
                    <Tooltip title={t("GameList.play")}>
                      <IconButton className='btn' onClick={() => playGame(item)}>
                        <PlayCircleIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t("GameList.editGame")}>
                      <IconButton
                        className='btn'
                        onClick={() => editGame(item)}
                      >
                        <AppRegistrationIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t("GameList.editInfo")}>
                      <IconButton
                        className='btn'
                        onClick={() => editGameInfo(item.game)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t("GameList.delete")}>
                      <IconButton
                        className='btn'
                        onClick={() => deleteGame(item.game.id as number)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </div>
                </div>
              </div>
            ))}
            {state.list.length === 0 ? (
              <div className='empty'>
                <div className='emptyIcon'>
                  <FeedbackOutlinedIcon sx={{ fontSize: 80 }} />
                </div>
                <div className='emptyText'>
                  {t("GameList.emptyText")}
                </div>
              </div>
            ) : null}
          </div>
          {state.total > pageSize ? (
            <div className='pagination'>
              <div>{t("GameList.total", { total: state.total })}</div>
              <Pagination
                size='large'
                count={Math.ceil(state.total / pageSize)}
                page={state.page}
                onChange={handlePageChange}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default GameListPage;