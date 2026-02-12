
export function Login() {
    return (
        <>
            <h1>This is the login page</h1>
            <label id="Usernames">Username: </label>
            <input id='Usernames' type='text' placeholder="Text here!" required/>
            <br/>
            <br/>
            <label id='Pass'>Password: </label>
            <input id="Pass" type='password' minLength='5' placeholder="Text here!" required/>
            
        </>
    )
}

