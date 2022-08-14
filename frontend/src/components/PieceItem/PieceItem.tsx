import { useMemo } from 'react';
import { Group, Path, Text } from 'react-konva';
import Konva from "konva";
import GameUtils from '@/src/utils/game';

type PieceItemProps = {
  piece: Piece;
  color: string;
  gridSize: number,
  draggable?: boolean;
  onDragStart?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragMove?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  showIndex?: boolean;
  pieceIndex?: number;
  x?: number;
  y?: number;
}

export function PieceItem({
  piece,
  color,
  gridSize,
  x = 0,
  y = 0,
  showIndex,
  pieceIndex = -1,
  draggable,
  onDragStart,
  onDragMove,
  onDragEnd,
  ...otherProps
}: PieceItemProps) {

  const [shapePath, ...holePaths] = useMemo(() => {
    return GameUtils.shape2PathsWithHoles(piece.inBoard, gridSize, gridSize / 10);
  }, [piece, gridSize]);

  const dragProps = {
    draggable,
    onDragStart,
    onDragMove,
    onDragEnd,
  };

  return (
    <Group x={x} y={y} {...dragProps}>
      <Path
        fill={color}
        strokeWidth={3}
        stroke='black'
        data={shapePath}
        {...otherProps}
      />
      {holePaths.map((path, index) => (
        <Path
          key={index}
          fill="red"
          strokeWidth={3}
          stroke='black'
          data={path}
          {...otherProps}
          globalCompositeOperation='destination-out'
        />
      ))}
      {showIndex && pieceIndex >= 0 ? (
        piece.shape.map((row, ri) => (
          row.map((grid, ci) => (
            grid ? (
              <Text
                key={ri + '-' + ci}
                text={pieceIndex?.toString()}
                fontSize={gridSize / 3}
                fontFamily='Calibri'
                fill='#333333'
                y={(piece.position[0] + ri) * gridSize + gridSize / 2 - gridSize / 6}
                x={(piece.position[1] + ci) * gridSize}
                width={gridSize}
                align='center'
              />
            ) : null
          ))
        ))
      ) : null}
    </Group>
  );
}