import * as React from 'react';
import { createRoot } from 'react-dom/client';
import 'reflect-metadata';

import { App } from './app';

const root = createRoot(document.getElementById('root'));
root.render(<App />);
