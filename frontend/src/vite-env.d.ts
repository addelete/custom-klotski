/// <reference types="vite/client" />

interface MouseEvent {
  layerX: number;
  layerY: number;
}

type Tag = {
  id: number;
  name: string;
}

type Game = {
  id?: number;
  name: string;
  gameShape: string;
  tags: Tag[];
  md5: string;
};

type Shape = boolean[][];

type Pos = number[];

type Piece = {
  shape: Shape;
  position: Pos;
  inBoard: Shape;
};

type Board = Shape;

type Door = {
  placement: 'left' | 'right' | 'top' | 'bottom';
  startIndex: number;
  xSize: number;
  ySize: number;
};

type Step = {
  pieceIndex: number;
  direction: [number, number];
};

type Solution = Step[];

type GameData = {
  pieceList: Piece[];
  kingPieceIndex: number;
  boardRows: number;
  boardCols: number;
  kingWinPos: Pos;
  door: Door;
  solution?: Solution;
};


