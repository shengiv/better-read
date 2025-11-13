
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import App from './App';
import './index.css';
import { withAuthenticator } from '@aws-amplify/ui-react';
import awsconfig from './config/aws-exports';

Amplify.configure(awsconfig);

const AppWithAuth = withAuthenticator(App);

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AppWithAuth />
  </BrowserRouter>
);