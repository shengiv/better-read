# Better Read Backend

Backend API services for the Better Read application, built with AWS Lambda and DynamoDB. The Better Read backend consists of serverless Lambda functions that provide RESTful API endpoints for book discovery, search, ratings, and personalized recommendations. All functions are designed to work with AWS API Gateway and DynamoDB.

## Development Environment

- **Runtime**: Python 3.x
- **Compute**: AWS Lambda
- **Database**: Amazon DynamoDB
- **API**: AWS API Gateway

## APIs / Lambda Functions

### 1. `get_books.py`
Retrieves a paginated list of books from the books table.

**Endpoint**: `GET /books`

**Query Parameters**:
- `limit` (optional): Number of books to return (default: 20, max: 100)
- `last_evaluated_key` (optional): Pagination token for retrieving next page

**Response**:
```json
{
  "books": [
    {
      "isbn": "string",
      "title": "string",
      "author": "string",
      "year_of_publication": number,
      "publisher": "string"
    }
  ],
  "pagination": {
    "count": number,
    "has_more": boolean,
    "last_evaluated_key": "string" // if has_more is true
  }
}
```

---

### 2. `search_books.py`
Searches for books by title using full-text search on a normalized title field.

**Endpoint**: `GET /books/search`

**Query Parameters**:
- `title` (required): Search term for book title

**Response**:
```json
{
  "books": [
    {
      "isbn": "string",
      "title": "string",
      "author": "string",
      "year_of_publication": number,
      "publisher": "string"
    }
  ],
  "search_term": "string",
  "count": number
}
```

---

### 3. `get_rating.py`
Retrieves user ratings. Supports getting a specific rating or all ratings for a user.

**Endpoint**: `GET /ratings`

**Query Parameters**:
- `user_id` (required): User identifier
- `isbn` (optional): Book ISBN for specific rating

**Response** (specific rating):
```json
{
  "user_id": "string",
  "isbn": "string",
  "rating": number,
  "created_at": "string",
  "updated_at": "string"
}
```

**Response** (all ratings):
```json
{
  "ratings": [
    {
      "user_id": "string",
      "isbn": "string",
      "rating": number,
      "created_at": "string",
      "updated_at": "string"
    }
  ],
  "count": number
}
```

---

### 4. `upsert_rating.py`
Creates or updates a user rating for a book.

**Endpoint**: `PUT /ratings`

**Request Body**:
```json
{
  "user_id": "string",
  "isbn": "string",
  "rating": number // 0-10
}
```

**Response**:
```json
{
  "message": "Rating created successfully" | "Rating updated successfully",
  "user_id": "string",
  "isbn": "string",
  "rating": number,
  "created_at": "string",
  "updated_at": "string"
}
```

---

### 5. `get_recommendations.py`
Generates personalized book recommendations based on user-rated books and similarity scores.

**Endpoint**: `POST /recommendations`

**Request Body**:
```json
{
  "books": [
    {
      "isbn": "string",
      "rating": number 
    }
  ],
  "limit_per_book": number 
}
```

**Response**:
```json
{
  "results": [
    {
      "source_book": {
        "isbn": "string",
        "title": "string",
        "user_rating": number
      },
      "similar_books": [
        {
          "isbn": "string",
          "title": "string",
          "author": "string",
          "similarity_score": number
        }
      ]
    }
  ]
}
```

---

### 6. `handle_cors.py`
Handles CORS preflight (OPTIONS) requests for all API endpoints.

**Endpoint**: `OPTIONS /*`

**Response**: Returns appropriate CORS headers based on the requested path.

**Allowed Methods by Path**:
- `/books`: GET, OPTIONS
- `/books/search`: GET, OPTIONS
- `/recommendations`: POST, OPTIONS
- `/ratings`: GET, PUT, OPTIONS

---

## Environment Variables

All Lambda functions require the following environment variables to be configured:

| Variable | Required By | Description |
|----------|-------------|-------------|
| `BOOKS_TABLE_NAME` | `get_books.py`, `search_books.py`, `get_recommendations.py` | DynamoDB table name for books |
| `RATINGS_TABLE_NAME` | `get_rating.py`, `upsert_rating.py` | DynamoDB table name for user ratings |
| `SIMILARITIES_TABLE_NAME` | `get_recommendations.py` | DynamoDB table name for book similarity scores |

## Dependencies

All Lambda functions require the following Python packages:
- `boto3` - AWS SDK for Python
- Others are Python Standard library modules, eg: `json`, `os`, `logging`, `decimal`, `datetime`

## DynamoDB Table Schemas

### Books Table
- **Partition Key**: `isbn` (String)
- **Attributes**: `title`, `author`, `year_of_publication`, `publisher`, `title_normalized`

### Ratings Table
- **Partition Key**: `user_id` (String)
- **Sort Key**: `isbn` (String)
- **Attributes**: `rating` (Number), `created_at` (String), `updated_at` (String)

### Similarities Table
- **Partition Key**: `isbn` (String)
- **Sort Key**: `similar_isbn` (String)
- **Attributes**: `similarity_score` (Number)

## Error Handling

All functions return standardized error responses:

```json
{
  "error": "Error message"
}
```

**HTTP Status Codes**:
- `200`: Success
- `400`: Bad Request 
- `404`: Not Found 
- `500`: Internal Server Error

## CORS Configuration

All endpoints include CORS headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: Content-Type`
- `Access-Control-Allow-Methods: [varies by endpoint]`

## Deployment

1. Package each Lambda function with its dependencies
2. Deploy to AWS Lambda 
3. Configure environment variables for each function
4. Set up API Gateway routes pointing to respective Lambda functions
5. Configure IAM roles with appropriate DynamoDB permissions

## IAM Permissions

Each Lambda function requires the following IAM permissions:

**DynamoDB Permissions**:
- `dynamodb:GetItem`
- `dynamodb:Query`
- `dynamodb:Scan`
- `dynamodb:PutItem`

**CloudWatch Logs**:
- `logs:CreateLogGroup`
- `logs:CreateLogStream`
- `logs:PutLogEvents`