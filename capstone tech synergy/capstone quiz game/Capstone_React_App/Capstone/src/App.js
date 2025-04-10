 
import React, { useState } from "react";
import Login from "./components/Login";

const App = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const handleLogin = (email, password) => {
        // Simple authentication (you can replace this with API auth)
        if (email && password) {
            setIsAuthenticated(true);
        } else {
            alert("Invalid login credentials.");
        }
    };

    return (
        <div>
            {!isAuthenticated ? (
                <Login onLogin={handleLogin} />
            ) : (
                <div>
                    <h1>Welcome to the Capstone App</h1>
                    <p>You are now logged in.</p>
                </div>
            )}
        </div>
    );
};

export default App;
