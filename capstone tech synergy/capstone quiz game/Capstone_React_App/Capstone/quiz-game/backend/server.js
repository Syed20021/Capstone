const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();
const { OpenAI } = require('openai');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const cors = require('cors');

// Configure middleware
app.use(express.json());
app.use(cors());

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Keep track of recently used questions by topic
const recentQuestions = {};
const MAX_RECENT_QUESTIONS = 50; // Increased from 20 to 50 to track more questions

// Function to generate quiz questions using OpenAI
async function generateQuizQuestions(topic = 'general knowledge', count = 1, temperature = 0.7) {
  try {
    // Check if we have a history for this topic
    if (!recentQuestions[topic]) {
      recentQuestions[topic] = [];
    }

    // Generate a stronger uniqueness constraint with specific instructions
    let recentQuestionsText = '';
    if (recentQuestions[topic].length > 0) {
      // Create a more detailed prompt to avoid repeats
      recentQuestionsText = `IMPORTANT: You MUST generate COMPLETELY NEW and ORIGINAL questions that are different from these recently used questions: ${JSON.stringify(recentQuestions[topic].map(q => q.question))}. 
      Do not repeat the same concepts, question structures, or answers. Create questions on different aspects of the topic.`;
    }

    // Ensure we get more questions than needed to filter out duplicates
    const requestCount = Math.min(count + 3, 8); // Ask for a few extra questions, max 8

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a creative quiz generator that creates diverse, unique questions on various topics. Each question should explore a different aspect of the topic. Return your response as a JSON object with a 'questions' array. Each question in the array should have 'question', 'options', and 'answer' fields."
        },
        {
          role: "user",
          content: `Generate ${requestCount} COMPLETELY DIFFERENT multiple-choice questions about ${topic}. 
          Ensure each question covers a unique aspect of the topic.
          Each question should have a question, an array of 4 options, and the correct answer. 
          ${recentQuestionsText}
          
          IMPORTANT GUIDELINES:
          1. Make sure each question is truly unique - don't ask similar questions with different wording
          2. Cover a wide range of subtopics within the main topic
          3. Vary the difficulty level across questions
          4. Use a mix of factual, conceptual, and analytical questions`
        }
      ],
      temperature: temperature,
    });

    // Parse the response to get the generated questions
    const content = response.choices[0].message.content;
    let parsedQuestions;
    
    try {
      // Try to parse the response as JSON directly
      const parsedContent = JSON.parse(content);
      
      // Ensure the response has a questions array
      if (Array.isArray(parsedContent)) {
        parsedQuestions = { questions: parsedContent };
      } else if (parsedContent.questions) {
        parsedQuestions = parsedContent;
      } else {
        // If the response is an object without a questions array, wrap it
        parsedQuestions = { questions: [parsedContent] };
      }
    } catch (e) {
      // If direct parsing fails, extract JSON from the text
      const jsonMatch = content.match(/\[.*\]/s) || content.match(/\{.*\}/s);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          parsedQuestions = { questions: parsed };
        } else if (parsed.questions) {
          parsedQuestions = parsed;
        } else {
          parsedQuestions = { questions: [parsed] };
        }
      } else {
        // Fallback to a default question if parsing fails
        parsedQuestions = {
          questions: [
            {
              question: "What is 2 + 2?",
              options: ["3", "4", "5", "6"],
              answer: "4"
            }
          ]
        };
      }
    }

    // Filter out questions that are too similar to previous ones
    const filteredQuestions = parsedQuestions.questions.filter(newQ => {
      // Check similarity to existing questions
      return !recentQuestions[topic].some(existingQ => {
        // Simple similarity check - convert to lowercase and compare
        const newQNormalized = newQ.question.toLowerCase().replace(/[^\w\s]/g, '');
        const existingQNormalized = existingQ.question.toLowerCase().replace(/[^\w\s]/g, '');
        
        // Direct match
        if (newQNormalized === existingQNormalized) return true;
        
        // Check for high word overlap (more than 70% similar)
        const newWords = new Set(newQNormalized.split(/\s+/));
        const existingWords = new Set(existingQNormalized.split(/\s+/));
        const commonWords = [...newWords].filter(word => existingWords.has(word));
        
        const similarity = commonWords.length / Math.max(newWords.size, existingWords.size);
        return similarity > 0.7;
      });
    });

    // If we don't have enough questions after filtering, use all
    const finalQuestions = filteredQuestions.length >= count 
      ? filteredQuestions.slice(0, count) 
      : parsedQuestions.questions.slice(0, count);

    // Add new questions to the recent questions array
    finalQuestions.forEach(q => {
      // Only add if not already in recent questions (extra check)
      if (!recentQuestions[topic].some(existing => existing.question === q.question)) {
        recentQuestions[topic].push(q);
      }
    });

    // Trim the recent questions list if it's too long
    if (recentQuestions[topic].length > MAX_RECENT_QUESTIONS) {
      recentQuestions[topic] = recentQuestions[topic].slice(-MAX_RECENT_QUESTIONS);
    }

    // Print how many questions we're tracking for this topic
    console.log(`Now tracking ${recentQuestions[topic].length} previous questions for topic: ${topic}`);

    return { questions: finalQuestions };
  } catch (error) {
    console.error('Error generating questions:', error);
    // Return a default question if there's an error
    return {
      questions: [
        {
          question: "What is 2 + 2?",
          options: ["3", "4", "5", "6"],
          answer: "4"
        }
      ]
    };
  }
}

// User Registration
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  try {
    // Check if user already exists
    const userCheck = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Insert new user
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );
    
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        email: result.rows[0].email
      }
    });
  } catch (error) {
    console.error('Error in user registration:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Find user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const user = result.rows[0];
    
    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Return user info without password
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error in user login:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Save Quiz Score
app.post('/api/scores', async (req, res) => {
  const { user_id, topic, score, total_questions } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO quiz_scores (user_id, topic, score, total_questions) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, topic, score, total_questions]
    );
    
    res.status(201).json({
      message: 'Score saved successfully',
      score: result.rows[0]
    });
  } catch (error) {
    console.error('Error saving quiz score:', error);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

// Get User's Quiz Scores
app.get('/api/scores/:user_id', async (req, res) => {
  const { user_id } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM quiz_scores WHERE user_id = $1 ORDER BY created_at DESC',
      [user_id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error retrieving user scores:', error);
    res.status(500).json({ error: 'Failed to retrieve scores' });
  }
});

// Original hardcoded endpoint
app.get('/api/quiz', (req, res) => {
  res.json({
    questions: [
      {
        question: "What is 2 + 2?",
        options: ["3", "4", "5"],
        answer: "4"
      }
    ]
  });
});

// New AI-powered endpoint
app.post('/api/ai-quiz', async (req, res) => {
  try {
    const { topic, count, refreshId, refreshCount } = req.body;
    
    // If this is a refresh request, add variation to temperature
    let temperature = 0.7;
    if (refreshId && refreshCount) {
      // Gradually increase temperature for more variation on successive refreshes
      temperature = Math.min(0.7 + (refreshCount * 0.1), 1.0);
      console.log(`Refresh request #${refreshCount} for topic "${topic}" with temperature ${temperature}`);
    }
    
    const questions = await generateQuizQuestions(topic, count, temperature);
    res.json(questions);
  } catch (error) {
    console.error('Error in AI quiz generation:', error);
    res.status(500).json({ error: 'Failed to generate quiz questions' });
  }
});

app.listen(port, () => {
  console.log(`Backend server is running on port ${port}`);
});
