# Tech Synergy: A Full-Stack Frameworks Showcase

## Project Structure
- **/quiz-game**:
  - **/frontend**: React-based interactive Quiz Game.
  - **/backend**: Node.js/Express API serving quiz data.
- **netlify.toml**: Configuration for Netlify automated deployment.

## Setup Instructions

### Backend
1. Navigate to `quiz-game/backend`
2. Run:
```sh
npm install
npm start
```
This starts the API server on port 5000.

### Frontend
1. Navigate to `quiz-game/frontend`
2. Run:
```sh
npm install
npm start
```
The React app will start on port 3000 (with API calls proxied to the backend).

### Deployment
The `netlify.toml` file is configured to build the React app for deployment.
