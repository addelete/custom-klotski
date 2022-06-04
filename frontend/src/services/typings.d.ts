export {};

interface GameDeleteReq {
  id: number;
}

interface GameDeleteRes {
  success: boolean;
  errMessage: string;
}

interface GameExportReq {
  nameFilter?: string;
  tagsFilter?: number[];
}

interface GameExportRes {
  success: boolean;
  errMessage: string;
  count: number;
}

interface GameImportRes {
  success: boolean;
  errMessage: string;
  repeatCount: number;
  count: number;
}

interface GameListReq {
  page: number;
  nameFilter?: string;
  tagsFilter?: number[];
  orderAsc?: boolean;
}

interface GameListRes {
  games: Game[];
  total: number;
}

interface GameSaveRes {
  success: boolean;
  errMessage: string;
  game: Game;
}

interface GameSolveRes {
  success: boolean;
  errMessage: string;
  solution: Solution;
}

interface TagCreateReq {
  name: string;
}

interface TagCreateRes {
  success: boolean;
  errMessage: string;
  tag: Tag;
}

interface TagDeleteReq {
  id: number;
}

interface TagDeleteRes {
  success: boolean;
  errMessage: string;
}

interface TagListRes {
  tags: Tag[];
}

declare module go {
  interface App {
    GameList: Game[];
  }
}

declare const window: Window & {
  go1: any;
  go: {
    app: {
      App: {
        TagCreate: (req: Tag) => Promise<TagCreateRes>;
        TagDelete: (req: TagDeleteReq) => Promise<TagDeleteRes>;
        TagList: () => Promise<TagListRes>;
        GameDelete: (req: GameDeleteReq) => Promise<GameDeleteRes>;
        GameExport: (req: GameExportReq) => Pormise<GameExportRes>;
        GameImport: () => Promise<GameImportRes>;
        GameList: (arg1: GameListReq) => Promise<GameListRes>;
        GameSave: (arg1: Game) => Promise<GameSaveRes>;
        GameSolve: (arg1: GameData) => Promise<GameSolveRes>;
      };
    };
  };
};

declare global {
  interface Window {
    go1: any;
    go: {
      app: {
        App: {
          TagCreate: (req: TagCreateReq) => Promise<TagCreateRes>;
          TagDelete: (req: TagDeleteReq) => Promise<TagDeleteRes>;
          TagList: () => Promise<TagListRes>;
          GameDelete: (req: GameDeleteReq) => Promise<GameDeleteRes>;
          GameExport: (req: GameExportReq) => Pormise<GameExportRes>;
          GameImport: () => Promise<GameImportRes>;
          GameList: (req: GameListReq) => Promise<GameListRes>;
          GameSave: (req: Partial<Game>) => Promise<GameSaveRes>;
          GameSolve: (req: GameData) => Promise<GameSolveRes>;
        };
      };
    };
  }
}
