import { Link } from "react-router-dom"

const Login = () => {
  return (
    <>
    <h3>This is the login page</h3>
    <form>
        <label>Email: </label>
        <input type='email'/>

        <br/>

        <label>Password: </label>
        <input type='password'/>
        
        <br/>

        <button type='submit'>Submit</button>

        <p>New User ?
              <Link to="/register">
                  <button type="button">Register</button>
              </Link>
        </p>
    </form>
    </>
  )
}

export default Login
