import {Link } from 'react-router-dom'

export function Navbar(){
    return(
        <>
            <Link to="/">
                <button>Home</button>
            </Link>
            <Link to="/login">
                <button>Login</button>
            </Link>

            <Link to="/">
                <button>Page1</button>
            </Link>
        </>
    )
}