import Snackbar from "@mui/material/Snackbar";
import MuiAlert from '@mui/material/Alert';
import Fade from '@mui/material/Fade';
import React, { ForwardedRef, forwardRef, useImperativeHandle, useState } from "react";

export interface MyAlertRef {
    open: (options: {
        message: string;
        type: 'success' | 'info' | 'warning' | 'error';
        duration?: number;
    }) => void;
}

export const MyAlert = forwardRef((props, ref: ForwardedRef<MyAlertRef>) => {
    const [open, setOpen] = useState(false);
    const [severity, setSeverity] = useState<'success' | 'info' | 'warning' | 'error'>("warning");
    const [message, setMessage] = useState("");
    const [duration, setDuration] = useState(2000);

    useImperativeHandle(ref, () => ({
        open: (options) => {
            setOpen(true);
            setMessage(options.message);
            setSeverity(options.type);
            setDuration(options.duration === undefined ? 2000 : options.duration);
        },
    }));

    const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpen(false);
    };

    return (
        <Snackbar
            TransitionComponent={Fade}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            open={open}
            autoHideDuration={duration}
            onClose={handleClose}
        >
            <MuiAlert variant="filled" onClose={handleClose} severity={severity}>
                {message}
            </MuiAlert>
        </Snackbar>
    )
});