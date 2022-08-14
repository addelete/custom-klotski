import { styled } from '@mui/material/styles';
import Button, { ButtonProps } from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

export const MyButtonBase = styled(Button)<ButtonProps>(() => ({
  color: '#000',
  fontSize: 16,
  lineHeight: 'inherit',
  backgroundColor: '#fff700',
  display: 'flex',
  height: 40,
  alignItems: 'center',
  '&:hover': {
    backgroundColor: '#fffa6c',
  },
  '&[disabled]': {
    backgroundColor: '#333333',
  }
}));

interface MyButtonProps extends ButtonProps {
  loading?: boolean;
}

export const MyButton = ({ children, loading, onClick, ...otherProps }: MyButtonProps) => {
  return (
    <MyButtonBase
      {...otherProps}
      onClick={(e) => {
        if (loading) return
        onClick && onClick(e)
      }}
    >
      {loading ? (
        <CircularProgress
          size={16}
          style={{
            marginRight: 8,
            marginLeft: -4,
          }}
          // color="black"
        />
      ) : null}{children}
    </MyButtonBase>
  );
};