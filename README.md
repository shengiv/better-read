# Better Read

Better Read is a cloud-based SaaS providing book recommendations to users. Users can search for books, add books they've read, and receive intelligent recommendations based on their reading preferences using machine learning algorithms.

Better Read leverages AWS serverless architecture to deliver a scalable book recommendation system. The application uses collaborative filtering with the Alternating Least Squares (ALS) algorithm to generate personalized book suggestions based on user preferences and book similarity scores.

## Features

- **Book Discovery**: Browse and search through a comprehensive catalog of books
- **User Preference**: Add books you've read and enjoyed
- **Personalized Recommendations**: Get book suggestions based on your reading history and preferences
- **Real-time Search**: Fast, full-text search functionality for finding books
- **Responsive UI**: Modern, user-friendly, mobile-first interface built with React

## Architecture

The application consists of three main components:

### 1. **Recommendation Pipeline** (`book-recommendation-pipeline/`)
- Automated data processing and model training pipeline
- Built with AWS Step Functions, Glue, Lambda, and EventBridge
- Processes book and rating data to generate similarity scores
- See [book-recommendation-pipeline/README.md](book-recommendation-pipeline/README.md) for details

### 2. **Backend** (`better-read-backend/`)
- Serverless API built with AWS Lambda and DynamoDB
- RESTful endpoints for books, ratings, and recommendations
- Handles CORS, pagination, and error handling
- See [better-read-backend/README.md](better-read-backend/README.md) for API documentation

### 3. **Frontend** (`better-read-frontend/`)
- React application built with Vite
- Responsive UI components for book discovery and user interactions
- See [better-read-frontend/README.md](better-read-frontend/README.md) for setup instructions

## Project Structure

```
better-read/
├── better-read-backend/          # Lambda functions and API endpoints
├── better-read-frontend/         # React frontend application
└── book-recommendation-pipeline/ # ML pipeline and data processing
```

For detailed setup and deployment instructions, please refer to the README files in each component directory:

- [Backend Setup](better-read-backend/README.md)
- [Frontend Setup](better-read-frontend/README.md)
- [ML Pipeline Setup](book-recommendation-pipeline/README.md)