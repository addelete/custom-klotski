export const currentGame: {
  gameData?: GameData;
  game: Partial<Game>;
} = new Proxy(
  {
    gameData: undefined,
    game: {},
  },
  {
    set(target, prop, val) {
      (target as any)[prop] = val;
      localStorage.setItem('currentGame', JSON.stringify(target));
      return true;
    },
  }
);

try {
  const data = localStorage.getItem('currentGame');
  if (data) {
    const _currentGame = JSON.parse(data);
    currentGame.gameData = _currentGame.gameData;
    currentGame.game = _currentGame.game;
  }
} catch (err) {}