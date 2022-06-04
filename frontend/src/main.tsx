import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, MemoryRouter, Route, Routes } from "react-router-dom";
import { createTheme, ThemeProvider } from "@mui/material";
import '@/src/utils/i18n';
import '@/src/index.less'
import GameList from '@/src/pages/GameList'
import GameDesigner from '@/src/pages/GameDesigner';
import GameSolution from '@/src/pages/GameSolution';
import GamePlayer from '@/src/pages/GamePlayer';


const theme = createTheme({
    palette: {
        mode: 'dark',
    },
});


ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <HashRouter>
                <Routes>
                    <Route path="/" element={<GameList />} />
                    <Route path="/GameDesigner" element={<GameDesigner />} />
                    <Route path="/GameSolution" element={<GameSolution />} />
                    <Route path="/GamePlayer" element={<GamePlayer />} />
                </Routes>
            </HashRouter>
        </ThemeProvider>
    </React.StrictMode>
)
