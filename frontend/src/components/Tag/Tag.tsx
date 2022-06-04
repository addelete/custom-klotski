import './Tag.less';

export interface TagProps {
  content: string;
  color?: string;
  bgColor?: string;
  borderColor?: string;
}

export function Tag({
  content,
  color,
  bgColor,
  borderColor,
}: TagProps) {
  return (
    <div className="Tag"
      style={{
        backgroundColor: bgColor,
        color,
        borderColor,
      }}>
      {content}
    </div>
  )
}