import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const Login = ({ onLogin }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [buttonClass, setButtonClass] = useState("form-button sign-in-btn");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        setButtonClass(isSignUp ? "form-button sign-up-btn" : "form-button sign-in-btn");
    }, [isSignUp]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (isSignUp) {
                if (!username) {
                    setError("Username is required for sign up.");
                    setLoading(false);
                    return;
                }

                // Register new user
                const response = await fetch("/api/register", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ username, email, password }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Registration failed");
                }

                // Automatically log in after registration
                handleLoginRequest(email, password);
            } else {
                // Login existing user
                handleLoginRequest(email, password);
            }
        } catch (error) {
            setError(error.message || "An error occurred");
            setLoading(false);
        }
    };

    const handleLoginRequest = async (email, password) => {
        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Login failed");
            }

            // Save user data to localStorage
            localStorage.setItem("user", JSON.stringify(data.user));
            
            // Call the parent component's onLogin function
            onLogin(data.user);
            
            // Navigate to home
            navigate("/home");
        } catch (error) {
            setError(error.message || "An error occurred");
            setLoading(false);
        }
    };

    return (
        <div className={`login-container ${isSignUp ? 'sign-up-theme' : 'sign-in-theme'}`}>
            <div className="switch">
                <button 
                    onClick={() => setIsSignUp(false)} 
                    className={!isSignUp ? "active-theme sign-in-btn" : "inactive-theme sign-up-btn"}>
                    Sign In
                </button>
                <button 
                    onClick={() => setIsSignUp(true)} 
                    className={isSignUp ? "active-theme sign-up-btn" : "inactive-theme sign-in-btn"}>
                    Sign Up
                </button>
            </div>
            <div className="form-wrapper">
                {error && <div className="error-message">{error}</div>}
                <div className={`flip-container ${isSignUp ? "flipped" : ""}`}>
                    <div className="container sign-in">
                        <div className="form-container">
                            <h1>Sign In</h1>
                            <form onSubmit={handleSubmit}>
                                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                                <button type="submit" className={buttonClass} disabled={loading}>
                                    {loading ? "Processing..." : "Login"}
                                </button>
                            </form>
                        </div>
                    </div>
                    <div className="container sign-up">
                        <div className="form-container">
                            <h1>Sign Up</h1>
                            <form onSubmit={handleSubmit}>
                                <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                                <button type="submit" className={buttonClass} disabled={loading}>
                                    {loading ? "Processing..." : "Register"}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
