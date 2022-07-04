import { useMemo } from 'react';
import { Layer, Path } from 'react-konva';
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
  x?: number;
  y?: number;
}

export function PieceItem({
  piece,
  color,
  gridSize,
  x = 0,
  y = 0,
  ...otherProps
}: PieceItemProps) {


  const [shapePath, ...holePaths] = useMemo(() => {
    return GameUtils.shape2PathsWithHoles(piece.inBoard, gridSize, gridSize / 10);
  }, [piece, gridSize]);

  // console.log(holePaths)
  // console.log(shapePath)

  return (
    <Layer x={x} y={y}>
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
    </Layer>
  );
}