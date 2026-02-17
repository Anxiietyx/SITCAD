
import { Link } from "react-router-dom";
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from "react";
import { auth } from '../firebase/firebase'; 


function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Move handleSubmit INSIDE the Login component
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
           
            await signInWithEmailAndPassword(auth, email, password);
            console.log("User logged in successfully!");
            window.location.href = '/profile'; // Or use navigate from react-router-dom
        } catch (error) {
            console.error("Error logging in:", error.message); 
            alert(error.message); 
        }
    };


    return (
        <>
            <h3>This is the login page</h3>
            <form onSubmit={handleSubmit}>
                <label>Email: </label>
                <input
                    type='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                />

                <br />

                <label>Password: </label>
                <input
                    type='password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                />

                <br />

                <button type='submit'>Submit</button>

                <p>New User ?
                    <Link to="/register">
                        <button type="button">Register</button>
                    </Link>
                </p>

            </form>
        </>
    );
}

export default Login;
