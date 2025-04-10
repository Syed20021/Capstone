import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import Login from "./components/Login";
import "./App.css";

// Profile Component
const Profile = ({ user, onSignOut }) => {
    const [scores, setScores] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch user scores when component mounts
        if (user && user.id) {
            fetchUserScores();
        } else {
            navigate("/");
        }
    }, [user, navigate]);

    const fetchUserScores = async () => {
        try {
            const response = await fetch(`/api/scores/${user.id}`);
            
            if (response.ok) {
                const data = await response.json();
                setScores(data);
            } else {
                console.error("Failed to fetch scores");
            }
        } catch (error) {
            console.error("Error fetching scores:", error);
        } finally {
            setLoading(false);
        }
    };

    const goBack = () => {
        navigate("/home");
    };

    return (
        <div className="app-container">
            {/* Navigation Bar */}
            <nav className="navbar">
                <div className="nav-logo">Tech Synergy</div>
                <ul className="nav-links">
                    <li><a href="#" onClick={goBack}>Home</a></li>
                    <li><a href="#profile">Profile</a></li>
                </ul>
                <button className="signout-button" onClick={onSignOut}>
                    Sign Out
                </button>
            </nav>

            <main className="content">
                <div className="profile-container">
                    <h1>User Profile</h1>
                    <div className="user-info">
                        <h2>Welcome, {user.username}!</h2>
                        <p><strong>Email:</strong> {user.email}</p>
                        <p><strong>Member Since:</strong> {new Date().toLocaleDateString()}</p>
                    </div>

                    <div className="scores-container">
                        <h2>Quiz History</h2>
                        {loading ? (
                            <div className="loading-scores">
                                <div className="loading-spinner"></div>
                                <p>Loading your quiz history...</p>
                            </div>
                        ) : scores.length > 0 ? (
                            <table className="scores-table">
                                <thead>
                                    <tr>
                                        <th>Topic</th>
                                        <th>Score</th>
                                        <th>Total Questions</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scores.map((score, index) => (
                                        <tr key={index}>
                                            <td>{score.topic}</td>
                                            <td>{score.score}</td>
                                            <td>{score.total_questions}</td>
                                            <td>{new Date(score.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="no-scores-message">
                                <p>No quiz scores yet. Try taking a quiz!</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="footer">
                <p>© {new Date().getFullYear()} Capstone Quiz Game | All Rights Reserved | Kyan M | Hassnat A | Tech Synergy |</p>
            </footer>
        </div>
    );
};

const Home = ({ user, onSignOut }) => {
    const [page, setPage] = useState("home");
    const [questions, setQuestions] = useState([]);
    const [userAnswers, setUserAnswers] = useState({});
    const [score, setScore] = useState(null);
    const [categoryId, setCategoryId] = useState(null);
    const [customTopic, setCustomTopic] = useState("");
    const [currentTopic, setCurrentTopic] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshCount, setRefreshCount] = useState(0); // Track refresh attempts
    const [previousQuestions, setPreviousQuestions] = useState({}); // Track all previous questions by topic
    const navigate = useNavigate();

    useEffect(() => {
        // Check if user is logged in
        if (!user) {
            navigate("/");
        }

        // Try to restore previous questions from localStorage if available
        const storedQuestions = localStorage.getItem("previousQuestions");
        if (storedQuestions) {
            try {
                setPreviousQuestions(JSON.parse(storedQuestions));
            } catch (e) {
                console.error("Error parsing stored questions:", e);
            }
        }
    }, [user, navigate]);

    // Save previous questions to localStorage whenever it changes
    useEffect(() => {
        if (Object.keys(previousQuestions).length > 0) {
            localStorage.setItem("previousQuestions", JSON.stringify(previousQuestions));
        }
    }, [previousQuestions]);

    const fetchQuestions = async (categoryId, topic = null, isRefresh = false) => {
        setScore(null);
        
        // Only clear answers if not refreshing
        if (!isRefresh) {
            setUserAnswers({});
        }
        
        // Only update categoryId if not refreshing or if it's null
        if (!isRefresh) {
            setCategoryId(categoryId);
        }
        
        setLoading(true);
    
        try {
            // Use provided topic or convert categoryId to a topic name
            let quizTopic = topic;
            if (!quizTopic) {
                // If refreshing, use the current topic first
                if (isRefresh && currentTopic) {
                    quizTopic = currentTopic;
                } else {
                    // Otherwise determine from categoryId
                    switch(categoryId) {
                        case 19:
                            quizTopic = "Math";
                            break;
                        case 17:
                            quizTopic = "Science";
                            break;
                        case 25:
                            quizTopic = "English";
                            break;
                        case 18:
                            quizTopic = "Computer Science";
                            break;
                        default:
                            quizTopic = "general knowledge";
                    }
                }
            }
            
            // Set the current topic for display
            setCurrentTopic(quizTopic);

            // Prepare previously seen questions for this topic
            const previousQuestionsForTopic = previousQuestions[quizTopic] || [];

            // If refreshing, add a parameter to help ensure unique questions
            const requestBody = {
                topic: quizTopic,
                count: 5
            };
            
            if (isRefresh) {
                // Add timestamp and refresh count to encourage more variety
                requestBody.refreshId = Date.now();
                requestBody.refreshCount = refreshCount;
                setRefreshCount(prev => prev + 1);
                
                // For refreshes, vary the topic slightly to get more diverse questions
                if (refreshCount > 1) {
                    // Add a subtopic or related aspect to encourage uniqueness
                    const variations = [
                        `interesting facts about ${quizTopic}`,
                        `advanced concepts in ${quizTopic}`,
                        `history of ${quizTopic}`,
                        `practical applications of ${quizTopic}`,
                        `famous people in ${quizTopic}`
                    ];
                    
                    // Select a variation based on refresh count
                    const variationIndex = (refreshCount - 2) % variations.length;
                    requestBody.topic = variations[variationIndex];
                    console.log(`Using topic variation: ${requestBody.topic}`);
                }
            }
            
            // Use the AI-powered endpoint with POST request
            const response = await fetch("/api/ai-quiz", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });
    
            const data = await response.json();
    
            console.log("Fetched quiz data:", data);
    
            if (Array.isArray(data.questions)) {
                // Filter out questions that are too similar to any we've seen before
                const newQuestions = data.questions.filter(newQ => 
                    !previousQuestionsForTopic.some(oldQ => isSimilarQuestion(newQ.question, oldQ.question))
                );
                
                // If we don't have enough new questions after filtering, log and use what we have
                if (newQuestions.length < data.questions.length) {
                    console.log(`Filtered out ${data.questions.length - newQuestions.length} duplicate questions`);
                }
                
                // Use new questions if we have enough, otherwise use original questions
                const finalQuestions = newQuestions.length >= 3 ? newQuestions : data.questions;
                
                // Store these questions in our history
                setPreviousQuestions(prev => {
                    const updatedQuestions = { ...prev };
                    updatedQuestions[quizTopic] = [...(updatedQuestions[quizTopic] || []), ...finalQuestions];
                    
                    // Limit the number of stored questions per topic
                    if (updatedQuestions[quizTopic].length > 100) {
                        updatedQuestions[quizTopic] = updatedQuestions[quizTopic].slice(-100);
                    }
                    
                    return updatedQuestions;
                });
                
                setQuestions(finalQuestions);
                setPage("quiz");
            } else {
                console.error("Invalid quiz format:", data);
                alert("Failed to load quiz questions. Please try again.");
            }
        } catch (error) {
            console.error("Error fetching quiz questions:", error);
            alert("Something went wrong loading the quiz.");
        } finally {
            setLoading(false);
        }
    };

    // Improved function to check question similarity
    const isSimilarQuestion = (question1, question2) => {
        // Normalize questions: lowercase, remove punctuation, trim whitespace
        const normalize = (text) => text.toLowerCase().replace(/[^\w\s]/g, '').trim();
        
        const q1 = normalize(question1);
        const q2 = normalize(question2);
        
        // Direct match
        if (q1 === q2) return true;
        
        // Check word overlap for similarity
        const words1 = q1.split(/\s+/);
        const words2 = q2.split(/\s+/);
        
        // Count common words
        const commonWords = words1.filter(word => words2.includes(word));
        
        // Calculate Jaccard similarity (intersection over union)
        const uniqueWords = new Set([...words1, ...words2]);
        const similarity = commonWords.length / uniqueWords.size;
        
        // Consider similar if more than 60% similar
        return similarity > 0.6;
    };

    // Function to compare question sets
    const areQuestionsIdentical = (oldQuestions, newQuestions) => {
        if (oldQuestions.length !== newQuestions.length) return false;
        
        // Check if more than 50% of questions are identical
        const identicalCount = oldQuestions.filter((oldQ, index) => 
            isSimilarQuestion(oldQ.question, newQuestions[index].question)
        ).length;
        
        return identicalCount > (oldQuestions.length / 2);
    };

    // Add a clear question history function
    const clearQuestionHistory = () => {
        setPreviousQuestions({});
        localStorage.removeItem("previousQuestions");
        alert("Question history has been cleared. You'll now see fresh questions!");
    };

    const handleCustomTopicSubmit = (e) => {
        e.preventDefault();
        if (customTopic.trim() === "") {
            alert("Please enter a topic");
            return;
        }
        fetchQuestions(null, customTopic);
    };
    
    const handleAnswerChange = (index, answer) => {
        setUserAnswers({ ...userAnswers, [index]: answer });
    };

    const handleSubmit = async () => {
        let correct = 0;
        questions.forEach((q, index) => {
            if (userAnswers[index] === q.answer) correct++;
        });
        setScore(correct);

        // Save score to database
        try {
            await fetch("/api/scores", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    user_id: user.id,
                    topic: currentTopic,
                    score: correct,
                    total_questions: questions.length
                }),
            });
            console.log("Score saved successfully");
        } catch (error) {
            console.error("Error saving score:", error);
        }
    };

    const resetQuiz = () => {
        setQuestions([]);
        setUserAnswers({});
        setScore(null);
        setCategoryId(null);
        setCurrentTopic("");
        setCustomTopic("");
        setPage("home");
    };

    const goToProfile = () => {
        navigate("/profile");
    };

    return (
        <div className="app-container">
            {/* Navigation Bar */}
            <nav className="navbar">
                <div className="nav-logo">Tech Synergy</div>
                <ul className="nav-links">
                    <li><a href="#home" onClick={() => setPage("home")}>Home</a></li>
                    <li><a href="#about" onClick={() => setPage("about")}>About</a></li>
                    <li><a href="#contact" onClick={() => setPage("contact")}>Contact Us</a></li>
                    <li><a href="#profile" onClick={goToProfile}>Profile</a></li>
                </ul>
                <button className="signout-button" onClick={onSignOut}>
                    Sign Out
                </button>
            </nav>

            {/* Main Content - Dynamic Rendering */}
            <main className="content">
                {loading && (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Generating your quiz questions...</p>
                        <p className="loading-topic">Topic: {currentTopic}</p>
                    </div>
                )}

                {!loading && page === "home" && (
                    <div className="home-content">
                        <div className="welcome-box">
                            <h1>Welcome to the Quiz Game, {user.username}</h1>
                            <p>Get ready to challenge yourself with exciting questions.</p>
                            <button 
                                onClick={clearQuestionHistory} 
                                className="clear-history-button"
                            >
                                Clear Question History
                            </button>
                        </div>

                        <div className="custom-topic-box">
                            <h2>Search Your Own Topic</h2>
                            <form onSubmit={handleCustomTopicSubmit} className="custom-topic-form">
                                <input
                                    type="text"
                                    value={customTopic}
                                    onChange={(e) => setCustomTopic(e.target.value)}
                                    placeholder="Enter any topic (e.g. Dinosaurs, Space, Movies)"
                                    className="custom-topic-input"
                                />
                                <button type="submit" className="custom-topic-button">Generate Quiz</button>
                            </form>
                        </div>

                        <div className="topic-box" id="topic-section">
                            <h2>Choose Your Topic</h2>
                            <div className="topic-buttons">
                                <button onClick={() => fetchQuestions(19)}>Math</button>
                                <button onClick={() => fetchQuestions(17)}>Science</button>
                                <button onClick={() => fetchQuestions(25)}>English</button>
                                <button onClick={() => fetchQuestions(18)}>Computer Science</button>
                            </div>
                        </div>
                    </div>
                )}

                {!loading && page === "quiz" && (
                    <div className="quiz-box">
                        <h2>Quiz Time: {currentTopic}</h2>
                        <div className="quiz-content">
                            {questions.map((q, index) => (
                                <div key={index} className="question-block">
                                    <p><strong>Q{index + 1}:</strong> {q.question}</p>
                                    {q.options.map((option, i) => (
                                        <div key={i}>
                                            <label>
                                                <input
                                                    type="radio"
                                                    name={`q${index}`}
                                                    value={option}
                                                    checked={userAnswers[index] === option}
                                                    onChange={() => handleAnswerChange(index, option)}
                                                /> {option}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                        <div className="quiz-buttons">
                            <button onClick={() => fetchQuestions(categoryId, currentTopic, true)}>Refresh Questions</button>
                            <button onClick={handleSubmit}>Submit</button>
                            <button onClick={resetQuiz}>Return to Home</button>
                        </div>
                        {score !== null && <h3>Your Score: {score} / {questions.length}</h3>}
                    </div>
                )}

                {page === "about" && (
                    <div className="about-content">
                        <div className="welcome-box">
                            <h1>About Us</h1>
                            <p>Group Name: Tech Synergy.</p>
                            <p>final-year students in the Computer Programming and Analysis program at Durham College.</p>
                            <p>Group Members: Kyan Meredith and Syed Hassnat Ali</p>
                            <p>Student ID's: 100892329 and 100835471</p>
                            <p>
                                As part of our capstone project, we are developing an interactive Quiz Game
                                designed to test users' knowledge in a fun and engaging way.
                            </p>
                            <p>
                                Our goal is to create an enjoyable and educational experience while applying our
                                programming skills to a real-world project.
                            </p>
                        </div>
                    </div>
                )}

                {page === "contact" && (
                    <div className="contact-content">
                        <div className="welcome-box">
                            <h1>Contact Us</h1>
                            <p>Have any questions or feedback? Reach out to us!</p>

                            <form className="contact-form">
                                <div className="form-group">
                                    <label htmlFor="name">Name:</label>
                                    <input type="text" id="name" name="name" placeholder="Enter your name" required />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="email">Email:</label>
                                    <input type="email" id="email" name="email" placeholder="Enter your email" required />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="message">Message:</label>
                                    <textarea id="message" name="message" placeholder="Enter your message" rows="5" required></textarea>
                                </div>

                                <button type="submit" className="submit-button">Send Message</button>
                            </form>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="footer">
                <p>© {new Date().getFullYear()} Capstone Quiz Game | All Rights Reserved | Kyan M | Hassnat A | Tech Synergy |</p>
            </footer>
        </div>
    );
};

const App = () => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Check if user is already logged in
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    // Handle login
    const handleLogin = (userData) => {
        setUser(userData);
    };

    // Handle logout
    const handleSignOut = () => {
        localStorage.removeItem("user");
        setUser(null);
        navigate("/");
    };

    return (
        <Routes>
            <Route path="/" element={<Login onLogin={handleLogin} />} />
            <Route path="/home" element={user ? <Home user={user} onSignOut={handleSignOut} /> : <Login onLogin={handleLogin} />} />
            <Route path="/profile" element={user ? <Profile user={user} onSignOut={handleSignOut} /> : <Login onLogin={handleLogin} />} />
        </Routes>
    );
};

export default App;
