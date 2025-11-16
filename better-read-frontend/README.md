# Better Read

Better Read is a cloud-based SaaS providing book recommendations to users. Users can search for books, add books they've read, and receive intelligent recommendations based on their reading preferences using machine learning algorithms.

Better Read leverages AWS serverless architecture to deliver a scalable book recommendation system. The application uses collaborative filtering with the Alternating Least Squares (ALS) algorithm to generate personalized book suggestions based on user preferences and book similarity scores.

## Tech Stack

### Frontend

- React
- Vite
- AWS Amplify Hosting
- AWS Amplify Authenticator (Cognito)

### APIs & Data Sources
- **NLB OpenWeb API**: title search, book availability info, library branch info
- **OpenLibrary / Google Books API**: book description, book cover thumbnail
- **Custom Recommendation API**: book recommendations and rating storage

## Features

- **Recommendation Page** (`Home.jsx`): View personalized recommendations based on books you've rated.
- **Discover Page** (`Discover.jsx`): Browse randomly selected books from the catalogue, refreshed instantly via a shuffle mechanism
- **Reading List** (`Profile.jsx`): Add books you've read
- **Book Details Page** (`BookDetails.jsx`): See full details of book including, title, author, book cover and NLB availability across branches

## Project Structure

```
src/
├── components/                   # Reusable UI Components (e.g. Bookcard, Navbar)
├── pages/                        # Main Pages/Views of the application (e.g. Onboarding, Home)
├── App.css                       # Styles the overall layout of the application
├── App.jsx                       # Root component configuring routes and layouts
├── index.css                     # Styles the overall look and font of the Application
├── index.html                    # Gets the fonts required from google                   
└── main.jsx                      # Entry point that mounts React and Authenticator to the DOM
```