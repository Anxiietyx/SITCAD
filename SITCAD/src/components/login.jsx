
export function Login() {
    return (
    <>
    <body>
        <h1>This is the login page</h1>
        <form>
            <label id="Usernames">Username: </label>
            <input id='Usernames' type='text' placeholder="Text here!" required/>
            <br/>
            <br/>
            <label id='Pass'>Password: </label>
            <input id="Pass" type='password' minLength='5' placeholder="Password here!" required/>
            <br/>
            <br/>
            <button  type='submit' className="">Sign up</button>
        </form>
    </body>
    </>
    )
}

