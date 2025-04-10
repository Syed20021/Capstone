 
import React, { useState } from "react";
import "./Login.css"; // Assuming styles are separate

const Login = ({ onLogin }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");

    const toggleForm = () => {
        setIsSignUp(!isSignUp);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isSignUp && !username) return alert("Username is required for sign up.");
        onLogin(email, password);
    };

    return (
        <div className="login-container">
            <div className="switch">
                <button onClick={() => setIsSignUp(false)} className={!isSignUp ? "active" : ""}>Sign In</button>
                <button onClick={() => setIsSignUp(true)} className={isSignUp ? "active" : ""}>Sign Up</button>
            </div>
            <div className="form-container">
                <h1>{isSignUp ? "Sign Up" : "Sign In"}</h1>
                <form onSubmit={handleSubmit}>
                    {isSignUp && <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />}
                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <button type="submit">{isSignUp ? "Register" : "Login"}</button>
                </form>
            </div>
        </div>
    );
};

export default Login;
