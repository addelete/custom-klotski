
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from "@mui/material";
import { useState, forwardRef, useImperativeHandle, useRef, ForwardedRef } from "react";
import { useTranslation } from "react-i18next";
import { TagSelect } from "../TagSelect";
import './GameInfoDialog.less';

export interface GameInfo {
  name: string,
  tags: Tag[]
}
export interface GameInfoDialogRef {
  open: (options: {
    value?: GameInfo,
    onChange?: (newValue: GameInfo) => void,
    forFilter?: boolean,
  }) => void;
}

export const GameInfoDialog = forwardRef((props, ref: ForwardedRef<GameInfoDialogRef>) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [forFilter, setForFilter] = useState(false);

  const onChangeRef = useRef<(newValue: GameInfo) => void>();

  useImperativeHandle(
    ref,
    () => ({
      open: ({
        value,
        onChange,
        forFilter: _forFilter,
      }) => {
        setName(value?.name || '');
        setTags(value?.tags || []);
        setOpen(true);
        setForFilter(!!_forFilter);
        onChangeRef.current = onChange;
      }
    })
  )



  const handleClose = () => {
    setOpen(false);
  };

  const handleSubmit = () => {
    if (name || forFilter) {
      onChangeRef.current && onChangeRef.current({ name, tags });
      setOpen(false);
    }
  }


  return (
    <Dialog
      open={open}
      onClose={handleClose}
      className="GameInfoDialog"
    >
      <DialogTitle>{forFilter ? t("GameInfoDialog.filterConditions") : t("GameInfoDialog.gameInfo")}</DialogTitle>
      <DialogContent>
        <div className="GameInfoDialog__formItem">
          <div className="GameInfoDialog__formItem__label">{t("GameInfoDialog.name")}</div>
          <div className="GameInfoDialog__formItem__control">
            <TextField
              autoFocus
              variant="standard"
              autoComplete="off"
              fullWidth
              placeholder={t("GameInfoDialog.pleaseInputName")}
              value={name}
              onChange={(e) => setName(e.target.value.trim())}
            />
          </div>
        </div>
        <div className="GameInfoDialog__formItem">
          <div className="GameInfoDialog__formItem__label">{t("GameInfoDialog.tags")}</div>
          <div className="GameInfoDialog__formItem__control">
            <TagSelect value={tags} onChange={setTags} allowAdd={!forFilter} />
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          {t("GameInfoDialog.cancel")}
        </Button>
        <Button onClick={handleSubmit} color="primary">
          {t("GameInfoDialog.confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
})