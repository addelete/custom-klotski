import { ForwardedRef, forwardRef, useImperativeHandle, useRef, useState } from "react";
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Dialog from '@mui/material/Dialog';
import Fade from '@mui/material/Fade';
import Button from "@mui/material/Button";
import { useTranslation } from "react-i18next";

export interface MyConfirmRef {
  open: (options: {
    title: string;
    message: string;
    onOk?: () => void;
    onCancel?: () => void;
  }) => void;
}

export const MyConfirm = forwardRef((props, ref: ForwardedRef<MyConfirmRef>) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const onOkRef = useRef<() => void>(() => { });
  const onCancelRef = useRef<() => void>(() => { });

  useImperativeHandle(ref, () => ({
    open: (options) => {
      setOpen(true);
      setTitle(options.title);
      setMessage(options.message);
      onOkRef.current = options.onOk ? options.onOk : () => { };
      onCancelRef.current = options.onCancel ? options.onCancel : () => { };
    },
  }));

  const handleCancel = () => {
    onCancelRef.current();
    setOpen(false);
  }

  const handleOk = () => {
    onOkRef.current();
    setOpen(false);
  }

  return (
    <Dialog
      sx={{ '& .MuiDialog-paper': { width: '80%', maxHeight: 435 } }}
      maxWidth="xs"
      TransitionComponent={Fade}
      open={open}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {message}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>
          {t('MyConfirm.cancel')}
        </Button>
        <Button onClick={handleOk} autoFocus>
          {t('MyConfirm.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  )
});