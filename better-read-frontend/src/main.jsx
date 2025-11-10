
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import App from './App';
import './index.css';
import awsmobile from './aws-exports';

Amplify.configure(awsmobile);

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);