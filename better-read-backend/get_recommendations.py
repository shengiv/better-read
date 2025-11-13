import json
import boto3
import os
import logging
from decimal import Decimal

# Custom JSON encoder to handle Decimal objects
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    """
    Lambda function to get personalized book recommendations
    """
    try:
        # Parse request body
        if not event.get('body'):
            return create_error_response(400, "Request body is required")
        
        try:
            body = json.loads(event['body'])
        except json.JSONDecodeError:
            return create_error_response(400, "Invalid JSON in request body")
        
        books = body.get('books', [])
        limit_per_book = body.get('limit_per_book', 5)
        
        if not books:
            return create_error_response(400, "books array is required")
        
        if limit_per_book > 20:
            limit_per_book = 20
        
        # Get DynamoDB tables
        books_table_name = os.environ['BOOKS_TABLE_NAME']
        similarities_table_name = os.environ['SIMILARITIES_TABLE_NAME']
        
        books_table = dynamodb.Table(books_table_name)
        similarities_table = dynamodb.Table(similarities_table_name)
        
        results = []
        
        # Process each input book
        for book_input in books:
            isbn = book_input.get('isbn')
            rating = book_input.get('rating', 1)
            
            if not isbn:
                continue
            
            # Get source book details
            try:
                source_book_response = books_table.get_item(Key={'isbn': isbn})
                if 'Item' not in source_book_response:
                    continue
                
                source_book = source_book_response['Item']
            except Exception as e:
                logger.error(f"Error getting source book {isbn}: {str(e)}")
                continue
            
            # Get similar books
            try:
                similar_response = similarities_table.query(
                    KeyConditionExpression='isbn = :isbn',
                    ExpressionAttributeValues={':isbn': isbn},
                    Limit=limit_per_book
                )
                
                similar_books = []
                for item in similar_response['Items']:
                    similar_isbn = item['similar_isbn']
                    similarity_score = float(item['similarity_score'])
                    
                    # Get book details for similar book
                    try:
                        book_response = books_table.get_item(Key={'isbn': similar_isbn})
                        if 'Item' in book_response:
                            book_details = book_response['Item']
                            similar_books.append({
                                'isbn': similar_isbn,
                                'title': book_details['title'],
                                'author': book_details['author'],
                                'similarity_score': similarity_score
                            })
                    except Exception as e:
                        logger.error(f"Error getting book details for {similar_isbn}: {str(e)}")
                        continue
                
                # Add to results
                results.append({
                    'source_book': {
                        'isbn': isbn,
                        'title': source_book['title'],
                        'user_rating': rating
                    },
                    'similar_books': similar_books
                })
                
            except Exception as e:
                logger.error(f"Error getting similarities for {isbn}: {str(e)}")
                continue
        
        # Create response
        result = {
            'results': results
        }
        
        return create_success_response(result)
        
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        return create_error_response(500, "Internal server error")

def create_success_response(body):
    """Create a successful API Gateway response"""
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        },
        'body': json.dumps(body, cls=DecimalEncoder)
    }

def create_error_response(status_code, message):
    """Create an error API Gateway response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        },
        'body': json.dumps({'error': message})
    }
