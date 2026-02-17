import { Link } from 'react-router-dom'

export function Navbar(){
    return(
        <>
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
        </>
    )
}