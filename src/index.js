import React from 'react'
import { render } from 'react-dom'
import App from './components/App'
import { hot } from 'react-hot-loader/root';

let root = document.createElement('div');
root.id = 'root';
document.body.appendChild(root);
const Root = () => <App />;
render(<Root />, root);
