import React from 'react'
import { Link } from 'react-router-dom'

const Home = () => {
  return (
    <div>
      <h1>This is the home page</h1>
      <Link to='/'>Home</Link>
      <Link to='/page1'>page 1</Link>
      <Link to='/page2'>page 2</Link>
    </div>
  )
}

export default Home
