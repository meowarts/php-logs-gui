import React from 'react'
import { render } from 'react-dom'
import App from './components/App'
import { hot } from 'react-hot-loader/root';

let root = document.createElement('div');
root.id = 'root';
document.body.appendChild(root);

// We should clear the body with some CSS, like no margin, padding, etc.
document.body.style.margin = 0;
document.body.style.padding = 0;
document.body.style.overflow = 'hidden';

const Root = () => <App />;

render(<Root />, root);
