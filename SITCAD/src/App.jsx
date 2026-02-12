import { Login } from './components/login'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Page1 } from './components/page1'
import { Home } from './components/home'
import { Layout } from './Layout'
import './App.css'



function App() {

  return (
    <Router>
      <Routes>
        <Route element={<Layout/>}>
          <Route path="/" element={<Page1/>}/>
          <Route path="/login" element={<Login/>}/>
          <Route path="/home" element={<Home/>}/>
          <Route path="/" element={<Page1/>}/>
        </Route>
      </Routes>
    </Router>
  )
}

export default App
