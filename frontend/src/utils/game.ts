import { Md5 } from 'ts-md5/dist/md5';
export default class GameUtils {
  /**
   * 数据库的布局数据转换成布局
   */
  static gameShape2GameData(gDataStr: string) {
    try {
      const gDataObj: number[][] = JSON.parse(gDataStr);
      const boardRows = gDataObj.length - 2;
      const boardCols = gDataObj[0].length - 2;
      const kingPieceIndex = 0;
      const inBoardList: Shape[] = [];
      for (let i = 1; i < gDataObj.length - 1; i++) {
        for (let j = 1; j < gDataObj[i].length - 1; j++) {
          const value = gDataObj[i][j];
          if (value >= 0) {
            if (!inBoardList[value]) {
              inBoardList[value] = Array(boardRows)
                .fill(0)
                .map(() => Array(boardCols).fill(false));
            }
            inBoardList[value][i - 1][j - 1] = true;
          }
        }
      }
      const pieceList = inBoardList.map((shape) => {
        return GameUtils.pieceFromInBoard(shape) as Piece;
      });
      const top = gDataObj[0].slice(1, -1);
      const right = gDataObj.map((row) => row[row.length - 1]).slice(1, -1);
      const bottom = gDataObj[gDataObj.length - 1].slice(1, -1);
      const left = gDataObj.map((row) => row[0]).slice(1, -1);

      const sideMap = { top, right, bottom, left };
      let door: Door = {} as Door;
      for (const side in sideMap) {
        const sideArr = sideMap[side as 'top' | 'right' | 'bottom' | 'left'];
        if (sideArr.includes(-1)) {
          door = {
            placement: side as 'top' | 'right' | 'bottom' | 'left',
            startIndex: sideArr.indexOf(-1),
            xSize: pieceList[0].shape[0].length,
            ySize: pieceList[0].shape.length,
          };
          break;
        }
      }

      const game = GameUtils.makeGameData(boardRows, boardCols, pieceList, kingPieceIndex, door);

      return game;
    } catch (err) {
      throw err;
    }
  }

  static makeGameData(
    rows: number,
    cols: number,
    pieceList: Piece[],
    kingPieceIndex: number,
    door: Door
  ) {
    const kingPiece = pieceList[kingPieceIndex];
    let kingWinPos: Pos = [-1, -1];
    switch (door.placement) {
      case 'top':
        kingWinPos = [0, door.startIndex];
        break;
      case 'right':
        kingWinPos = [door.startIndex, cols - kingPiece.shape[0].length];
        break;
      case 'bottom':
        kingWinPos = [rows - kingPiece.shape.length, door.startIndex];
        break;
      case 'left':
        kingWinPos = [door.startIndex, 0];
        break;
    }
    const gameData: GameData = {
      boardRows: rows,
      boardCols: cols,
      pieceList,
      kingPieceIndex,
      kingWinPos,
      door,
    };
    return gameData;
  }

  static gameData2GameShape(gameData: GameData) {
    // 建立一个带有边缘的棋盘，填充-2，表示全铺上墙砖
    const boardWithSide = Array(gameData.boardRows + 2)
      .fill(0)
      .map(() => Array(gameData.boardCols + 2).fill(-2));
    // 把中间部分填充-1，表示挖出棋盘
    for (let i = 1; i < gameData.boardRows + 1; i++) {
      for (let j = 1; j < gameData.boardCols + 1; j++) {
        boardWithSide[i][j] = -1;
      }
    }
    // 把王棋的index设为0
    const pieceList = [gameData.pieceList[gameData.kingPieceIndex]];
    for (let i = 0; i < gameData.pieceList.length; i++) {
      if (i !== gameData.kingPieceIndex) {
        pieceList.push(gameData.pieceList[i]);
      }
    }
    // 把棋子覆盖的格子填充为棋子的index
    for (let i = 0; i < pieceList.length; i++) {
      const piece = pieceList[i];
      piece.shape.forEach((row, rowIndex) => {
        row.forEach((column, columnIndex) => {
          if (column) {
            boardWithSide[piece.position[0] + rowIndex + 1][piece.position[1] + columnIndex + 1] =
              i;
          }
        });
      });
    }

    // 在棋盘边缘上挖出门
    switch (gameData.door.placement) {
      case 'top':
        for (let i = 0; i < gameData.door.xSize; i++) {
          boardWithSide[0][i + gameData.door.startIndex + 1] = -1;
        }
        break;
      case 'bottom':
        for (let i = 0; i < gameData.door.xSize; i++) {
          boardWithSide[gameData.boardRows + 1][i + gameData.door.startIndex + 1] = -1;
        }
        break;
      case 'left':
        for (let i = 0; i < gameData.door.ySize; i++) {
          boardWithSide[i + gameData.door.startIndex + 1][0] = -1;
        }
        break;
      case 'right':
        for (let i = 0; i < gameData.door.ySize; i++) {
          boardWithSide[i + gameData.door.startIndex + 1][gameData.boardCols + 1] = -1;
        }
        break;
    }
    return JSON.stringify(boardWithSide);
  }

  static gameData2Md5(gameData: GameData) {
    const data = [];
    data.push({ boardRows: gameData.boardRows });
    data.push({ boardCols: gameData.boardCols });
    data.push({ kingWinPos: gameData.kingWinPos });
    data.push({ kingPieceShape: gameData.pieceList[gameData.kingPieceIndex].shape });
    data.push({ kingPiecePosition: gameData.pieceList[gameData.kingPieceIndex].position });
    const pieceList = [...gameData.pieceList];
    pieceList.sort((a, b) => {
      return a.position[0] - b.position[0] === 0
        ? a.position[1] - b.position[1]
        : a.position[0] - b.position[0];
    });
    pieceList.forEach((piece) => {
      if (
        piece.position[0] !== gameData.kingWinPos[0] ||
        piece.position[1] !== gameData.kingWinPos[1]
      ) {
        data.push({ pieceShape: piece.shape });
        data.push({ piecePosition: piece.position });
      }
    });
    return Md5.hashStr(JSON.stringify(data));
  }

  /**
   * 为棋子计算棋盘中的位置
   */
  static pieceCalcInBoard(piece: Piece, boardRows: number, boardCols: number) {
    const board = Array(boardRows)
      .fill(0)
      .map(() => Array(boardCols).fill(false));
    let biggerThanMax = false;
    piece.shape.forEach((row, rowIndex) => {
      row.forEach((column, columnIndex) => {
        const r = piece.position[0] + rowIndex;
        const c = piece.position[1] + columnIndex;
        if (r > boardRows - 1 || c > boardCols - 1) {
          biggerThanMax = true;
        } else if (column) {
          board[rowIndex + piece.position[0]][columnIndex + piece.position[1]] = true;
        }
      });
    });
    piece.inBoard = board;
    if (biggerThanMax) {
      return GameUtils.pieceFromInBoard(board);
    }
    return piece;
  }

  /**
   * 根据在棋盘上的覆盖的位置得出棋子
   */
  static pieceFromInBoard(board: Board) {
    let minRow = board.length;
    let minColumn = board[0].length;
    let maxRow = 0;
    let maxColumn = 0;

    board.forEach((row, rowIndex) => {
      row.forEach((column, columnIndex) => {
        if (column) {
          minRow = Math.min(rowIndex, minRow);
          minColumn = Math.min(columnIndex, minColumn);
          maxRow = Math.max(rowIndex, maxRow);
          maxColumn = Math.max(columnIndex, maxColumn);
        }
      });
    });
    const shapeRows = maxRow - minRow + 1;
    const shapeCols = maxColumn - minColumn + 1;
    if (shapeRows <= 0 || shapeCols <= 0) {
      return undefined;
    }
    const piece: Piece = {
      shape: Array(shapeRows)
        .fill(0)
        .map(() => Array(shapeCols).fill(false)),
      position: [minRow, minColumn],
      inBoard: board,
    };
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minColumn; c <= maxColumn; c++) {
        if (board[r][c]) {
          piece.shape[r - minRow][c - minColumn] = true;
        }
      }
    }
    return piece;
  }

  /**
   * 布局封面
   */
  static gameData2Cover(gameData: GameData, boardSize = 210, borderSize = 10) {
    const gridSize = Math.min(
      (boardSize - borderSize * 2) / gameData.boardCols,
      (boardSize - borderSize * 2) / gameData.boardRows
    );
    const boardWidth = gridSize * gameData.boardCols + borderSize * 2;
    const boardHeight = gridSize * gameData.boardRows + borderSize * 2;
    const gridBorderRadius = gridSize / 10;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', boardWidth.toString());
    svg.setAttribute('height', boardHeight.toString());

    // 背景
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', (borderSize - 3).toString());
    bg.setAttribute('y', (borderSize - 3).toString());
    bg.setAttribute('width', (boardWidth - borderSize * 2 + 6).toString());
    bg.setAttribute('height', (boardHeight - borderSize * 2 + 6).toString());
    bg.setAttribute('fill', '#000');
    bg.setAttribute('rx', gridBorderRadius.toString());
    bg.setAttribute('ry', gridBorderRadius.toString());
    svg.appendChild(bg);
    // 门
    const doorPath = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    doorPath.setAttribute('fill', '#000');
    const door = gameData.door;
    const otherSide = 16;
    const width = door.xSize * gridSize;
    const height = door.ySize * gridSize;
    const start = door.startIndex * gridSize + borderSize;
    switch (door.placement) {
      case 'top':
        doorPath.setAttribute('y', '0');
        doorPath.setAttribute('x', start.toString());
        doorPath.setAttribute('width', width.toString());
        doorPath.setAttribute('height', otherSide.toString());
        break;
      case 'right':
        doorPath.setAttribute('y', start.toString());
        doorPath.setAttribute('x', (boardWidth - otherSide).toString());
        doorPath.setAttribute('width', otherSide.toString());
        doorPath.setAttribute('height', height.toString());
        break;
      case 'bottom':
        doorPath.setAttribute('y', (boardHeight - otherSide).toString());
        doorPath.setAttribute('x', start.toString());
        doorPath.setAttribute('width', width.toString());
        doorPath.setAttribute('height', otherSide.toString());
        break;
      case 'left':
        doorPath.setAttribute('y', start.toString());
        doorPath.setAttribute('x', '0');
        doorPath.setAttribute('width', otherSide.toString());
        doorPath.setAttribute('height', height.toString());
        break;
    }
    svg.appendChild(doorPath);
    // 棋子
    for (let i = 0; i < gameData.pieceList.length; i++) {
      const piecePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      piecePath.setAttribute(
        'd',
        GameUtils.shape2Path(
          gameData.pieceList[i].inBoard,
          gridSize,
          gridBorderRadius,
          borderSize,
          borderSize
        )
      );
      piecePath.setAttribute('fill', i === gameData.kingPieceIndex ? '#fffb00' : '#0ed07e');
      piecePath.setAttribute('stroke', '#000');
      piecePath.setAttribute('stroke-width', '2');
      svg.appendChild(piecePath);
    }

    const str = new XMLSerializer().serializeToString(svg);
    return str;
  }

  /**
   * 棋子路径
   */
  static shape2Path(
    shape: Shape,
    gridSize: number,
    gridBorderRadius: number,
    offsetX = 0,
    offsetY = 0
  ) {
    const findPiecePathStartPos = (shape: Shape): Pos | undefined => {
      for (let i = 0; i < shape.length; i++) {
        for (let j = 0; j < shape[i].length; j++) {
          if (shape[i][j]) {
            return [i, j];
          }
        }
      }
    };

    const findPiecePathNextPos = (shape: Shape, start: Pos, filter: (item: Pos) => boolean) => {
      const rows = shape.length;
      const cols = shape[0].length;
      return [
        [start[0] + 1, start[1]],
        [start[0] - 1, start[1]],
        [start[0], start[1] + 1],
        [start[0], start[1] - 1],
      ].find((item) => {
        if (!filter(item)) {
          return false;
        }
        const sides =
          item[0] === start[0]
            ? [
                [start[0] - 1, Math.min(start[1], item[1])],
                [start[0], Math.min(start[1], item[1])],
              ]
            : [
                [Math.min(start[0], item[0]), start[1] - 1],
                [Math.min(start[0], item[0]), start[1]],
              ];
        const sideTypes = sides.map((side) => {
          if (side[0] === -1 || side[0] === rows || side[1] === -1 || side[1] === cols) {
            return 0;
          }
          return shape[side[0]][side[1]] ? 1 : 0;
        });
        if (sideTypes[0] + sideTypes[1] === 1) {
          return true;
        }
      });
    };
    const points = [findPiecePathStartPos(shape) as Pos];
    while (true) {
      const last = points[points.length - 1];
      const next = findPiecePathNextPos(shape, last, (item) => {
        return points.findIndex((point) => point[0] === item[0] && point[1] === item[1]) === -1;
      });
      if (!next) {
        break;
      }
      points.push(next);
    }
    const middle = gridSize - gridBorderRadius * 2;
    const path = points.reduce((prev, currPoint, index) => {
      const prevPoint = index === 0 ? points[points.length - 1] : points[index - 1];
      const nextPoint = index === points.length - 1 ? points[0] : points[index + 1];
      const pieceBorderRadiusStart = {
        x: currPoint[1] * gridSize + gridBorderRadius * (prevPoint[1] - currPoint[1]),
        y: currPoint[0] * gridSize + gridBorderRadius * (prevPoint[0] - currPoint[0]),
      };
      const pieceBorderRadiusEnd = {
        x: currPoint[1] * gridSize + gridBorderRadius * (nextPoint[1] - currPoint[1]),
        y: currPoint[0] * gridSize + gridBorderRadius * (nextPoint[0] - currPoint[0]),
      };
      let pieceBorderRadiusPath = '';
      if (
        (currPoint[0] === prevPoint[0] && currPoint[0] === nextPoint[0]) ||
        (currPoint[1] === prevPoint[1] && currPoint[1] === nextPoint[1])
      ) {
        pieceBorderRadiusPath = `L ${pieceBorderRadiusStart.x + offsetX} ${
          pieceBorderRadiusStart.y + offsetY
        } `;
      } else {
        const pos = [
          Math.min(currPoint[0], prevPoint[0], nextPoint[0]),
          Math.min(currPoint[1], prevPoint[1], nextPoint[1]),
        ]; // 三点所决定的格子的坐标
        const sweepflag = shape[pos[0]]?.[pos[1]] ? 0 : 1; // 根据格子状态决定是否顺时针圆弧
        pieceBorderRadiusPath = `A ${gridBorderRadius} ${gridBorderRadius} 0 0 ${sweepflag} ${
          pieceBorderRadiusEnd.x + offsetX
        } ${pieceBorderRadiusEnd.y + offsetY} `;
      }

      const lineEnd = {
        x: currPoint[1] * gridSize + (middle + gridBorderRadius) * (nextPoint[1] - currPoint[1]),
        y: currPoint[0] * gridSize + (middle + gridBorderRadius) * (nextPoint[0] - currPoint[0]),
      };

      const linePath = `L ${lineEnd.x + offsetX} ${lineEnd.y + offsetY} `;
      const prefixPath =
        index === 0
          ? `M ${pieceBorderRadiusStart.x + offsetX} ${pieceBorderRadiusStart.y + offsetY} `
          : '';
      const suffixPath = index === points.length - 1 ? `Z` : '';

      return prev + prefixPath + pieceBorderRadiusPath + linePath + suffixPath;
    }, '');
    return path;
  }

  static shapeFillNum2Path(
    shapeFilledNum: number[][],
    gridSize: number,
    gridBorderRadius: number,
    offsetX = 0,
    offsetY = 0
  ) {
    const findStartPoint = (shape: number[][]): number | undefined => {
      for (let i = 0; i < shape.length; i++) {
        for (let j = 0; j < shape[i].length; j++) {
          if (shape[i][j] === 99) {
            return i * 10 + j;
          }
        }
      }
    };
    
    // path开始的点
    const startPoint = findStartPoint(shapeFilledNum);
    if(!startPoint) return ""
    const points = [startPoint];
    const pointToPos = (point: number) => {
      return [Math.floor(point / 10), point % 10];
    };
    while (true) {
      const prevPoint = points.length > 1 ? points[points.length - 2] : null;
      const currentPoint = points[points.length - 1];
      const currentPos = pointToPos(currentPoint);
      // 查出点周围的四个格子的值，越界的格子值为-1
      const grid1 = shapeFilledNum[currentPos[0] - 1]?.[currentPos[1]] || -1;
      const grid2 = shapeFilledNum[currentPos[0] - 1]?.[currentPos[1] - 1] || -1;
      const grid3 = shapeFilledNum[currentPos[0]]?.[currentPos[1] - 1] || -1;
      const grid4 = shapeFilledNum[currentPos[0]]?.[currentPos[1]] || -1;
      let nextPoint: number | null = null;
      if (grid1 + grid2 === 98 && currentPoint - 10 !== prevPoint) {
        nextPoint = currentPoint - 10;
      } else if (grid3 + grid4 === 98 && currentPoint + 10 !== prevPoint) {
        nextPoint = currentPoint + 10;
      } else if (grid2 + grid3 === 98 && currentPoint - 1 !== prevPoint) {
        nextPoint = currentPoint - 1;
      } else if (grid1 + grid4 === 98 && currentPoint + 1 !== prevPoint) {
        nextPoint = currentPoint + 1;
      }
      if (!nextPoint) {
        return '';
      }
      if (nextPoint === startPoint) {
        break;
      }
      points.push(nextPoint);
    }
    const middle = gridSize - gridBorderRadius * 2;
    let path = '';
    for (let i = 0; i < points.length; i++) {
      const prevPoint = i === 0 ? points[points.length - 1] : points[i - 1];
      const currPoint = points[i];
      const nextPoint = i === points.length - 1 ? points[0] : points[i + 1];

      const prevPos = pointToPos(prevPoint);
      const currPos = pointToPos(currPoint);
      const nextPos = pointToPos(nextPoint);

      let pathOverPoint = ''; // 过这个点的一段path，是一段圆弧或线段
      const pathOverPointStart = {
        x: currPos[1] * gridSize + gridBorderRadius * (prevPos[1] - currPos[1]),
        y: currPos[0] * gridSize + gridBorderRadius * (prevPos[0] - currPos[0]),
      };
      const pathOverPointEnd = {
        x: currPos[1] * gridSize + gridBorderRadius * (nextPos[1] - currPos[1]),
        y: currPos[0] * gridSize + gridBorderRadius * (nextPos[0] - currPos[0]),
      };
      if (nextPoint - currPoint === currPoint - prevPoint) {
        // 不拐弯
        pathOverPoint = `L ${pathOverPointStart.x + offsetX} ${pathOverPointStart.y + offsetY} `;
      } else {
        // 总结点位变化与画弧的关系
        const sweepflag =
          [
            [1, 10],
            [10, -1],
            [-1, -10],
            [-10, 1],
          ].findIndex(
            (item) => currPoint - prevPoint === item[0] && nextPoint - currPoint === item[1]
          ) > -1
            ? 1
            : 0;
        // console.log(prevPoint, currPoint, nextPoint, sweepflag);
        pathOverPoint = `A ${gridBorderRadius} ${gridBorderRadius} 0 0 ${sweepflag} ${
          pathOverPointEnd.x + offsetX
        } ${pathOverPointEnd.y + offsetY} `;
      }

      const pathOnEdgeEnd = {
        x: currPos[1] * gridSize + (middle + gridBorderRadius) * (nextPos[1] - currPos[1]),
        y: currPos[0] * gridSize + (middle + gridBorderRadius) * (nextPos[0] - currPos[0]),
      };

      const pathOnEdge = `L ${pathOnEdgeEnd.x + offsetX} ${pathOnEdgeEnd.y + offsetY} `;
      const prefixPath =
        i === 0 ? `M ${pathOverPointStart.x + offsetX} ${pathOverPointStart.y + offsetY} ` : '';
      const suffixPath = i === points.length - 1 ? `Z` : '';
      path += prefixPath + pathOverPoint + pathOnEdge + suffixPath;
    }
    return path;
  }

  /**
   * 棋子路径
   */
  static shape2PathsWithHoles(
    shape: Shape,
    gridSize: number,
    gridBorderRadius: number,
    offsetX = 0,
    offsetY = 0
  ) {
    // GameUtils.printShape(shape);
    // const shapePath = GameUtils.shape2Path(shape, gridSize, gridBorderRadius, offsetX, offsetY); // 计算底图
    const shapeFillNum: number[][] = Array(shape.length)
      .fill(0)
      .map(() => Array(shape[0].length).fill(99));
    // 找出所有的洞
    let minHoleIndex = 0;
    const replaceNum = (from: number, to: number) => {
      for (let i = 0; i < shapeFillNum.length; i++) {
        for (let j = 0; j < shapeFillNum[i].length; j++) {
          if (shapeFillNum[i][j] === from) {
            shapeFillNum[i][j] = to;
          }
        }
      }
    };
    for (let sri = 0; sri < shape.length; sri++) {
      for (let sci = 0; sci < shape[sri].length; sci++) {
        if (shape[sri][sci] === false) {
          if (sci === 0 || sri === 0) {
            shapeFillNum[sri][sci] = -1;
            continue;
          }
          const left = shapeFillNum[sri][sci - 1];
          const top = shapeFillNum[sri - 1][sci];
          const min = Math.min(left, top);
          const max = Math.max(left, top);
          if (sci === shape[sri].length - 1 || sri === shape.length - 1) {
            shapeFillNum[sri][sci] = -1;
          } else if (min === -1 || max === -1) {
            shapeFillNum[sri][sci] = -1;
          } else if (min === 99) {
            minHoleIndex++;
            shapeFillNum[sri][sci] = minHoleIndex;
          } else {
            shapeFillNum[sri][sci] = min;
          }
          if (max < 99 && max > shapeFillNum[sri][sci]) {
            replaceNum(max, shapeFillNum[sri][sci]);
          }
        }
      }
    }
    // printShapeFillNum(shapeFillNum);


    let holeShapeFillNums: number[][][] = [];
    for (let ri = 0; ri < shapeFillNum.length; ri++) {
      for (let ci = 0; ci < shapeFillNum[0].length; ci++) {
        if (shapeFillNum[ri][ci] > 0 && shapeFillNum[ri][ci] < 99) {
          if (!holeShapeFillNums[shapeFillNum[ri][ci] - 1]) {
            holeShapeFillNums[shapeFillNum[ri][ci] - 1] = Array(shapeFillNum.length)
              .fill(0)
              .map(() => Array(shapeFillNum[0].length).fill(-1));
          }
          holeShapeFillNums[shapeFillNum[ri][ci] - 1][ri][ci] = 99;
        }
      }
    }

    // holeShapeFillNums.forEach(item => printShapeFillNum(item))


    return [
      GameUtils.shapeFillNum2Path(shapeFillNum, gridSize, gridBorderRadius, offsetX, offsetY),
      ...holeShapeFillNums.map((holeShapeFillNum) =>
        GameUtils.shapeFillNum2Path(holeShapeFillNum, gridSize, gridBorderRadius, offsetX, offsetY)
      ),
    ];
  }

  static cloneShape(board: Board): Board {
    return board.map((row) => [...row]);
  }

  static door2Style(door: Door | undefined, gridSize: number) {
    if (!door) {
      return undefined;
    }
    const style: React.CSSProperties = {
      position: 'absolute',
    };
    const width = door.xSize * gridSize;
    const height = door.ySize * gridSize;
    const start = door.startIndex * gridSize + 2 + 16;
    switch (door.placement) {
      case 'top':
        style.top = 0;
        style.left = start;
        style.width = width;
        break;
      case 'right':
        style.top = start;
        style.right = 0;
        style.height = height;
        break;
      case 'bottom':
        style.bottom = 0;
        style.left = start;
        style.width = width;
        break;
      case 'left':
        style.top = start;
        style.left = 0;
        style.height = height;
        break;
    }
    return style;
  }

  static calcGridSize = (rows: number, cols: number, minGridSize = 40, maxGridSize = 80) => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const maxWidth = width - 100;
    const maxHeight = height - 200;
    const gridSize = Math.min(maxWidth / cols, maxHeight / rows);
    return Math.min(Math.max(gridSize, minGridSize), maxGridSize);
  };

  // static printShape = (shape: Shape) => {
  //   console.log('>>>>>>>>>>>>>>>>');
  //   for (let sri = 0; sri < shape.length; sri++) {
  //     let str = '';
  //     for (let sci = 0; sci < shape[sri].length; sci++) {
  //       str += shape[sri][sci] ? '  1' : '  0';
  //     }
  //     console.log(str);
  //   }
  // };
}


function printShapeFillNum(shapeFillNum: number[][]) {
      console.log('=====================');
    for (let sri = 0; sri < shapeFillNum.length; sri++) {
      let str = '';
      for (let sci = 0; sci < shapeFillNum[sri].length; sci++) {
        str +=
          shapeFillNum[sri][sci] >= 0 && shapeFillNum[sri][sci] < 10
            ? '  ' + shapeFillNum[sri][sci]
            : ' ' + shapeFillNum[sri][sci];
      }
      console.log(str);
    }

}