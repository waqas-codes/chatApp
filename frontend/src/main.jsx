import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import ChatProvider from './context/ChatProvider.jsx'
import { CallProvider } from './context/CallProvider.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ChatProvider>
      <CallProvider>
        <App />
      </CallProvider>
    </ChatProvider>
  </BrowserRouter>
)

