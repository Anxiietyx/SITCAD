import { Link } from 'react-router-dom'
import "../index.css"

export function Navbar(){
    return(
        <>
        <div className='navbar'>
            <Link to="/">
                <button>Home</button>
            </Link>
            
            <Link to="/page1">
                <button>Page1</button>
            </Link>

            <Link to="/page2">
                <button>Page2</button>
            </Link>

            <Link to='/login'>
                <button>Login</button>
            </Link>
        </div>
        </>
    )
}