import { useMemo } from 'react';
import { Path } from 'react-konva';
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
}

export function PieceItem({
  piece,
  color,
  gridSize,
  ...otherProps
}: PieceItemProps) {


  const shapePath = useMemo(() => {
    return GameUtils.shape2Path(piece.inBoard, gridSize, gridSize / 10);
  }, [piece, gridSize]);

  // console.log(shapePath)

  return (
    <Path
      fill={color}
      strokeWidth={3}
      stroke='black'
      data={shapePath}
      {...otherProps}
    />
  );
}