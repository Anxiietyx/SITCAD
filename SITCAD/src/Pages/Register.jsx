import { Link } from "react-router-dom"

const Register = () => {
  return (
    <div>
      <form>
        <h1>Sign Up</h1>

        <label>Email: </label>
        <input type="email"></input>
        <br/>

        <label>Password: </label>
        <input type='password'></input>

        <br/>

        <p>Have an account ?
              <Link to="/login">
                  <button type="button">Login</button>
              </Link>
        </p>

      </form>
    </div>
  );
}

export default Register
