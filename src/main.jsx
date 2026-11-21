import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './styles.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <MantineProvider forceColorScheme="dark" theme={{ primaryColor: 'cyan', defaultRadius: 0 }}>
    <Notifications position="top-center" />
    <App />
  </MantineProvider>,
);
